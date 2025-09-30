import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import * as Icons from 'lucide-react';
import forecastAPI, { Forecast, ForecastAnalytics } from '../../services/forecastAPI';

const ForecastChart: React.FC = () => {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [selectedForecast, setSelectedForecast] = useState<Forecast | null>(null);
  const [analytics, setAnalytics] = useState<ForecastAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFrame, setTimeFrame] = useState('30days');
  const [predicting, setPredicting] = useState(false);
  const [mlStatus, setMlStatus] = useState<any>(null);

  useEffect(() => {
    fetchData();
    checkMLStatus();
  }, []);

  const checkMLStatus = async () => {
    try {
      const status = await forecastAPI.getMLStatus();
      setMlStatus(status);
    } catch (err) {
      console.error('ML API not available:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const forecastsResponse = await forecastAPI.getAll({ limit: 50 });
      setForecasts(forecastsResponse.forecasts);

      const analyticsData = await forecastAPI.getAnalytics();
      setAnalytics(analyticsData);

      if (forecastsResponse.forecasts.length > 0) {
        setSelectedForecast(forecastsResponse.forecasts[0]);
      }
    } catch (err: any) {
      console.error('Error fetching forecast data:', err);
      setError(err.message || 'Failed to load forecast data');
    } finally {
      setLoading(false);
    }
  };

  const handleRunPrediction = async () => {
    try {
      setPredicting(true);
      setError(null);
      
      const result = await forecastAPI.runPrediction();
      
      if (result.success) {
        alert(`✅ Success! Generated ${result.count} forecasts`);
        await fetchData();
      } else {
        throw new Error(result.error || 'Prediction failed');
      }
    } catch (err: any) {
      console.error('Error running prediction:', err);
      setError(err.message || 'Failed to run prediction');
      alert('❌ Failed to run prediction. Make sure the ML API is running on port 5001.');
    } finally {
      setPredicting(false);
    }
  };

  const handleForecastChange = async (sku: string) => {
    try {
      const forecast = await forecastAPI.getById(sku);
      setSelectedForecast(forecast);
    } catch (err) {
      console.error('Error fetching forecast:', err);
    }
  };

  const getFilteredData = () => {
    if (!selectedForecast) return [];

    const days = timeFrame === '7days' ? 7 : timeFrame === '30days' ? 30 : 90;
    return selectedForecast.forecastData.slice(-days);
  };

  const getSeverityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'very high':
      case 'high':
        return 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400';
      case 'medium':
        return 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400';
      default:
        return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Icons.Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading forecast data...</p>
        </div>
      </div>
    );
  }

  if (error && !forecasts.length) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <Icons.AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Forecasts</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={handleRunPrediction}
              disabled={predicting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              {predicting ? 'Running...' : 'Run Prediction'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!forecasts.length) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <Icons.TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Forecast Data Available</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Run the ML prediction model to generate forecasts.
          </p>
          {mlStatus && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
              <p className="text-blue-700 dark:text-blue-400">
                ML Models: {mlStatus.ml_model_loaded ? '✅ Loaded' : '❌ Not Loaded'}
              </p>
            </div>
          )}
          <button
            onClick={handleRunPrediction}
            disabled={predicting}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 flex items-center space-x-2 mx-auto"
          >
            {predicting ? (
              <>
                <Icons.Loader className="w-5 h-5 animate-spin" />
                <span>Running Prediction...</span>
              </>
            ) : (
              <>
                <Icons.Zap className="w-5 h-5" />
                <span>Run ML Prediction</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Demand Forecasting</h2>
          <p className="text-gray-600 dark:text-gray-400">AI-powered demand predictions and trend analysis</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunPrediction}
            disabled={predicting}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:bg-gray-400 flex items-center space-x-2"
            title="Run ML prediction to update forecasts"
          >
            {predicting ? (
              <>
                <Icons.Loader className="w-4 h-4 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Icons.Zap className="w-4 h-4" />
                <span>Update</span>
              </>
            )}
          </button>
          <select
            value={selectedForecast?.sku || ''}
            onChange={(e) => handleForecastChange(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
          >
            {forecasts.map(forecast => (
              <option key={forecast.sku} value={forecast.sku}>
                {forecast.productName} ({forecast.sku})
              </option>
            ))}
          </select>
          <select
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
          >
            <option value="7days">7 Days</option>
            <option value="30days">30 Days</option>
            <option value="90days">90 Days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Forecast Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-2 bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Demand Forecast Trends</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Historical vs Predicted demand</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Actual</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Predicted</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-300 rounded-full opacity-50"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Confidence</span>
              </div>
            </div>
          </div>

          {selectedForecast && (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getFilteredData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Area
                    type="monotone"
                    dataKey="confidence"
                    stroke="none"
                    fill="#a855f7"
                    fillOpacity={0.1}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#10b981"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Insights Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-2 mb-6">
            <Icons.Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Insights</h3>
          </div>

          <div className="space-y-4">
            {/* Current Product Status */}
            {selectedForecast && (
              <div className={`p-4 bg-gradient-to-r rounded-lg border ${getSeverityColor(selectedForecast.priorityPred)}`}>
                <div className="flex items-center space-x-2 mb-2">
                  {selectedForecast.priorityPred === 'High' || selectedForecast.priorityPred === 'Very High' ? (
                    <Icons.AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Icons.CheckCircle className="w-5 h-5" />
                  )}
                  <span className="font-medium">{selectedForecast.stockStatusPred}</span>
                </div>
                <p className="text-sm">
                  Priority: <strong>{selectedForecast.priorityPred}</strong>
                </p>
                <p className="text-sm mt-1">
                  Current Stock: <strong>{selectedForecast.currentStock}</strong>
                </p>
              </div>
            )}

            {/* Alert Message */}
            {selectedForecast && selectedForecast.alert !== 'Stock OK' && (
              <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center space-x-2 mb-2">
                  <Icons.AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="font-medium text-red-800 dark:text-red-300">Action Required</span>
                </div>
                <p className="text-red-700 dark:text-red-400 text-sm">
                  {selectedForecast.alert}
                </p>
              </div>
            )}

            {/* Analytics Summary */}
            {analytics && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2 mb-3">
                  <Icons.BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-800 dark:text-blue-300">System Overview</span>
                </div>
                <div className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
                  <div className="flex justify-between">
                    <span>High Priority Items:</span>
                    <strong>{analytics.insights.highPriorityCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Understock Items:</span>
                    <strong>{analytics.insights.understockCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Stock Level:</span>
                    <strong>{analytics.insights.avgStockLevel}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* ML Status */}
            {mlStatus && (
              <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 mb-2">
                  <Icons.Cpu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-800 dark:text-gray-300">ML Status</span>
                </div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <p>Model: {mlStatus.ml_model_loaded ? '✅' : '❌'} {mlStatus.ml_model_type}</p>
                  <p>ARIMA: {mlStatus.arima_models_loaded ? `✅ ${mlStatus.arima_models_count} models` : '❌'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Top Reorders This Week</h4>
            <div className="space-y-3">
              {analytics?.topReorders.slice(0, 3).map((item, index) => (
                <div key={item.sku} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{item.sku}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">{item.name.substring(0, 20)}...</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Current: {item.currentStock}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-indigo-600 dark:text-indigo-400">{item.predictedDemand}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">predicted</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.priority === 'Very High' || item.priority === 'High'
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {item.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={fetchData}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Icons.RefreshCw className="w-4 h-4" />
              <span>Refresh Forecasts</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForecastChart;