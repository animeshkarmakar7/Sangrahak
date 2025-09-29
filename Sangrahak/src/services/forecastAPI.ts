// src/services/forecastAPI.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export interface ForecastDataPoint {
  date: string;
  actual?: number | null;
  predicted?: number | null;
  confidence?: number | null;
}

export interface Forecast {
  id: string;
  itemId: string;
  productName: string;
  sku: string;
  currentStock: number;
  stockStatusPred: string;
  priorityPred: string;
  alert: string;
  forecastData: ForecastDataPoint[];
  updatedAt: string;
}

export interface ForecastInsights {
  highPriorityCount: number;
  understockCount: number;
  avgStockLevel: number;
  totalForecasts: number;
}

export interface TopReorder {
  sku: string;
  name: string;
  currentStock: number;
  priority: string;
  predictedDemand: number;
}

export interface ForecastAnalytics {
  insights: ForecastInsights;
  topReorders: TopReorder[];
  alerts: Array<{
    sku: string;
    productName: string;
    alert: string;
    priority: string;
  }>;
}

const forecastAPI = {
  // Get all forecasts
  getAll: async (params?: { sku?: string; limit?: number }) => {
    const response = await axios.get(`${API_BASE_URL}/forecasts`, { params });
    return response.data;
  },

  // Get forecast by SKU or Item ID
  getById: async (identifier: string): Promise<Forecast> => {
    const response = await axios.get(`${API_BASE_URL}/forecasts/${identifier}`);
    return response.data;
  },

  // Get analytics and insights
  getAnalytics: async (): Promise<ForecastAnalytics> => {
    const response = await axios.get(`${API_BASE_URL}/forecasts/analytics/insights`);
    return response.data;
  },

  // Create or update forecast
  createOrUpdate: async (forecastData: Partial<Forecast>) => {
    const response = await axios.post(`${API_BASE_URL}/forecasts`, forecastData);
    return response.data;
  }
};

export default forecastAPI;