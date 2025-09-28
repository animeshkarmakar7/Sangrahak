// src/App.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from './components/Layout/Sidebar';
import Navbar from './components/Layout/Navbar';
import InventoryTable from './components/Inventory/InventoryTable';
import DepotGrid from './components/Depots/DepotGrid';
import ForecastChart from './components/Forecasts/ForecastChart';
import ReportsPanel from './components/Reports/ReportsPanel';
import DashboardContent from './components/Dashboard/DashboardContent';


const AppContent: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeModule, setActiveModule] = useState('dashboard');

  // Show loading spinner while checking authentication
  

  const renderMainContent = () => {
    switch (activeModule) {
      case 'inventory':
        return (
          <motion.div
            key="inventory"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <InventoryTable />
          </motion.div>
        );
      case 'depots':
        return (
          <motion.div
            key="depots"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <DepotGrid />
          </motion.div>
        );
      case 'forecasts':
        return (
          <motion.div
            key="forecasts"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ForecastChart />
          </motion.div>
        );
      case 'reports':
        return (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ReportsPanel />
          </motion.div>
        );
      case 'settings':
        return (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Settings</h2>
            <p className="text-gray-600 dark:text-gray-400">Application settings and configuration options will be available here.</p>
          </motion.div>
        );
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeItem={activeModule}
        onItemClick={setActiveModule}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {renderMainContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

// Main App component that provides the AuthProvider
export default AppContent;