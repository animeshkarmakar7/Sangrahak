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
      console.log('✅ ML Status:', status);
    } catch (err) {
      console.error('⚠️ ML API not available:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 Fetching forecasts from Express API...');
      const forecastsResponse = await forecastAPI.getAll({ limit: 100 });
      
      console.log('✅ Forecasts received:', forecastsResponse.forecasts.length);
      setForecasts(forecastsResponse.forecasts);

      if (forecastsResponse.forecasts.length > 0) {
        // Select the first forecast with data
        const firstValidForecast = forecastsResponse.forecasts.find(f => f.forecastData && f.forecastData.length > 0);
        if (firstValidForecast) {
          setSelectedForecast(firstValidForecast);
          console.log('📈 Selected forecast:', firstValidForecast.sku);
        }
      }

      console.log('📊 Fetching analytics...');
      const analyticsData = await forecastAPI.getAnalytics();
      setAnalytics(analyticsData);
      console.log('✅ Analytics loaded');
      
    } catch (err: any) {
      console.error('❌ Error fetching forecast data:', err);
      setError(err.message || 'Failed to load forecast data');
    } finally {
      setLoading(false);
    }
  };

  const handleRunPrediction = async () => {
    try {
      setPredicting(true);
      setError(null);
      
      console.log('🤖 Running ML prediction...');
      const result = await forecastAPI.runPrediction();
      
      if (result.success) {
        console.log(`✅ Success! Generated ${result.count} forecasts`);
        
        // Show success message
        const message = `✅ Success! Generated ${result.count} forecasts`;
        alert(message);
        
        // Wait a bit for MongoDB to be updated
        console.log('⏳ Waiting for data to be saved...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Refresh data
        console.log('🔄 Refreshing forecast data...');
        await fetchData();
      } else {
        throw new Error(result.error || 'Prediction failed');
      }
    } catch (err: any) {
      console.error('❌ Error running prediction:', err);
      setError(err.message || 'Failed to run prediction');
      alert(`❌ Failed to run prediction: ${err.message}\n\nMake sure:\n1. ML API is running on port 5001\n2. Flask server (app.py) is started\n3. Models are loaded correctly`);
    } finally {
      setPredicting(false);
    }
  };

  const handleForecastChange = async (sku: string) => {
    try {
      console.log(`🔍 Fetching forecast for SKU: ${sku}`);
      const forecast = await forecastAPI.getById(sku);
      setSelectedForecast(forecast);
      console.log('✅ Forecast loaded:', forecast);
    } catch (err) {
      console.error('❌ Error fetching forecast:', err);
      setError('Failed to load selected forecast');
    }
  };

  const getFilteredData = () => {
    if (!selectedForecast || !selectedForecast.forecastData) return [];

    const days = timeFrame === '7days' ? 7 : timeFrame === '30days' ? 30 : 90;
    const data = selectedForecast.forecastData.slice(0, days);
    
    console.log(`📊 Displaying ${data.length} days of forecast data`);
    return data;
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Icons.RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
            <button
              onClick={handleRunPrediction}
              disabled={predicting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center space-x-2"
            >
              {predicting ? (
                <>
                  <Icons.Loader className="w-4 h-4 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Icons.Zap className="w-4 h-4" />
                  <span>Run Prediction</span>
                </>
              )}
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
          <Icons.TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Forecast Data Available</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Run the ML prediction model to generate forecasts for your inventory.
          </p>
          
          {mlStatus && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm max-w-md mx-auto">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Icons.Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-blue-800 dark:text-blue-300">ML Status</span>
              </div>
              <div className="space-y-1 text-left text-blue-700 dark:text-blue-400">
                <p>ML Model: {mlStatus.ml_model_loaded ? '✅ Loaded' : '❌ Not Loaded'}</p>
                <p>Type: {mlStatus.ml_model_type}</p>
                <p>ARIMA Models: {mlStatus.arima_models_loaded ? `✅ ${mlStatus.arima_models_count} loaded` : '❌ Not Loaded'}</p>
              </div>
            </div>
          )}
          
          <button
            onClick={handleRunPrediction}
            disabled={predicting}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all shadow-lg disabled:from-gray-400 disabled:to-gray-500 flex items-center space-x-3 mx-auto text-lg font-semibold"
          >
            {predicting ? (
              <>
                <Icons.Loader className="w-6 h-6 animate-spin" />
                <span>Running Prediction...</span>
              </>
            ) : (
              <>
                <Icons.Zap className="w-6 h-6" />
                <span>Run ML Prediction</span>
              </>
            )}
          </button>
          
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Make sure Flask ML API is running on port 5001
          </p>
        </div>
      </div>
    );
  }

  const chartData = getFilteredData();

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
            title="Run ML prediction to update all forecasts"
          >
            {predicting ? (
              <>
                <Icons.Loader className="w-4 h-4 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Icons.Zap className="w-4 h-4" />
                <span>Update All</span>
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
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
            title="Refresh forecast data"
          >
            <Icons.RefreshCw className="w-4 h-4" />
          </button>
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
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {selectedForecast ? `${selectedForecast.productName} (${selectedForecast.sku})` : 'Select a product'}
              </p>
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

          {selectedForecast && chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Units', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      padding: '12px'
                    }}
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      });
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'confidence') {
                        return [`${(value * 100).toFixed(0)}%`, 'Confidence'];
                      }
                      return [value ? value.toFixed(2) : 'N/A', name === 'predicted' ? 'Predicted' : 'Actual'];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="confidence"
                    stroke="none"
                    fill="url(#colorConfidence)"
                    fillOpacity={1}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#10b981"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-center">
                <Icons.TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No forecast data available for this product</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Insights Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[600px]"
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

            {/* Forecast Summary */}
            {selectedForecast && chartData.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center space-x-2 mb-3">
                  <Icons.TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-medium text-indigo-800 dark:text-indigo-300">Forecast Summary</span>
                </div>
                <div className="space-y-2 text-sm text-indigo-700 dark:text-indigo-400">
                  <div className="flex justify-between">
                    <span>Total Predicted Demand:</span>
                    <strong>{chartData.reduce((sum, d) => sum + (d.predicted || 0), 0).toFixed(0)} units</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Daily Demand:</span>
                    <strong>{(chartData.reduce((sum, d) => sum + (d.predicted || 0), 0) / chartData.length).toFixed(1)} units</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Forecast Period:</span>
                    <strong>{chartData.length} days</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Summary */}
            {analytics && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2 mb-3">
                  <Icons.BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-800 dark:text-blue-300">System Overview</span>
                </div>
                <div className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
                  <div className="flex justify-between">
                    <span>High Priority Items:</span>
                    <strong className="text-red-600 dark:text-red-400">{analytics.insights.highPriorityCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Understock Items:</span>
                    <strong className="text-orange-600 dark:text-orange-400">{analytics.insights.understockCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Stock Level:</span>
                    <strong>{analytics.insights.avgStockLevel}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Forecasts:</span>
                    <strong>{analytics.insights.totalForecasts}</strong>
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
                  <p>Encoders: {mlStatus.encoders_loaded ? '✅ Loaded' : '❌'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <Icons.Package className="w-5 h-5" />
              <span>Top Reorders This Week</span>
            </h4>
            <div className="space-y-3">
              {analytics?.topReorders && analytics.topReorders.length > 0 ? (
                analytics.topReorders.slice(0, 5).map((item, index) => (
                  <div key={item.sku} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">#{index + 1}</span>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{item.sku}</p>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                        {item.name.length > 25 ? item.name.substring(0, 25) + '...' : item.name}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Stock: {item.currentStock}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-indigo-600 dark:text-indigo-400 text-lg">{item.predictedDemand}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">predicted</p>
                      <span className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                        item.priority === 'Very High' || item.priority === 'High'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Icons.Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No reorder data available</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <button
              onClick={fetchData}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Icons.RefreshCw className="w-4 h-4" />
              <span>Refresh Forecasts</span>
            </button>
            <button
              onClick={handleRunPrediction}
              disabled={predicting}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:bg-gray-400 flex items-center justify-center space-x-2"
            >
              {predicting ? (
                <>
                  <Icons.Loader className="w-4 h-4 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Icons.Zap className="w-4 h-4" />
                  <span>Run New Prediction</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForecastChart;