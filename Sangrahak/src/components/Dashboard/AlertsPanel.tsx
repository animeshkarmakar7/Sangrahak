import React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { mockAlerts } from '../../data/mockData';

const AlertsPanel: React.FC = () => {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'low-stock':
        return Icons.PackageX;
      case 'demand-spike':
        return Icons.TrendingUp;
      case 'capacity-warning':
        return Icons.AlertTriangle;
      case 'anomaly':
        return Icons.Zap;
      default:
        return Icons.Bell;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
      default:
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Alerts</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Real-time system notifications</p>
        </div>
        <button className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
          View All
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {mockAlerts.map((alert, index) => {
          const AlertIcon = getAlertIcon(alert.type);
          
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + index * 0.1 }}
              className={`p-4 rounded-xl border-l-4 ${getSeverityColor(alert.severity)} hover:shadow-sm transition-all cursor-pointer`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  alert.severity === 'high' 
                    ? 'bg-red-100 dark:bg-red-900/20' 
                    : alert.severity === 'medium' 
                    ? 'bg-yellow-100 dark:bg-yellow-900/20' 
                    : 'bg-blue-100 dark:bg-blue-900/20'
                }`}>
                  <AlertIcon className={`w-4 h-4 ${
                    alert.severity === 'high' 
                      ? 'text-red-600 dark:text-red-400' 
                      : alert.severity === 'medium' 
                      ? 'text-yellow-600 dark:text-yellow-400' 
                      : 'text-blue-600 dark:text-blue-400'
                  }`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">{alert.title}</h4>
                    {!alert.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 leading-relaxed">
                    {alert.description}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(alert.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      alert.severity === 'high' 
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
                        : alert.severity === 'medium' 
                        ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' 
                        : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default AlertsPanel;