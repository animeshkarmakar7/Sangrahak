import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from './components/Layout/Sidebar';
import Navbar from './components/Layout/Navbar';
import WelcomeBanner from './components/Dashboard/WelcomeBanner';
import KPICard from './components/Dashboard/KPICard';
import SalesChart from './components/Dashboard/SalesChart';
import TopSKUsChart from './components/Dashboard/TopSKUsChart';
import AlertsPanel from './components/Dashboard/AlertsPanel';
import InventoryTable from './components/Inventory/InventoryTable';
import DepotGrid from './components/Depots/DepotGrid';
import ForecastChart from './components/Forecasts/ForecastChart';
import ReportsPanel from './components/Reports/ReportsPanel';
import { mockKPIs } from './data/mockData';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeModule, setActiveModule] = useState('dashboard');

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
        return (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <WelcomeBanner />
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {mockKPIs.map((kpi, index) => (
                <KPICard key={index} kpi={kpi} index={index} />
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <SalesChart />
              <TopSKUsChart />
            </div>

            {/* Alerts Panel */}
            <AlertsPanel />
          </motion.div>
        );
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
}

export default App;