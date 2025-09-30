// src/services/forecastAPI.ts
import axios from 'axios';

const EXPRESS_API_URL = 'http://localhost:5000/api';
const ML_API_URL = 'http://localhost:5001/api/ml';

export interface ForecastDataPoint {
  date: string;
  predicted: number;
  actual?: number | null;
  confidence?: number;
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

export interface ForecastResponse {
  forecasts: Forecast[];
  total: number;
}

export interface TopReorderItem {
  sku: string;
  name: string;
  currentStock: number;
  priority: string;
  predictedDemand: number;
}

export interface ForecastInsights {
  highPriorityCount: number;
  understockCount: number;
  avgStockLevel: number;
  totalForecasts: number;
}

export interface ForecastAlert {
  sku: string;
  productName: string;
  alert: string;
  priority: string;
}

export interface ForecastAnalytics {
  insights: ForecastInsights;
  topReorders: TopReorderItem[];
  alerts: ForecastAlert[];
}

export interface MLStatus {
  ml_model_loaded: boolean;
  ml_model_type: string;
  encoders_loaded: boolean;
  arima_models_loaded: boolean;
  arima_models_count: number;
}

export interface PredictionResponse {
  success: boolean;
  message?: string;
  count?: number;
  forecast?: Forecast;
  error?: string;
}

class ForecastAPI {
  // Get all forecasts from Express API (MongoDB)
  async getAll(params?: { limit?: number; sortBy?: string }): Promise<ForecastResponse> {
    try {
      const response = await axios.get(`${EXPRESS_API_URL}/forecasts`, { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching forecasts:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch forecasts');
    }
  }

  // Get forecast by SKU or Item ID from Express API
  async getById(identifier: string): Promise<Forecast> {
    try {
      const response = await axios.get(`${EXPRESS_API_URL}/forecasts/${identifier}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching forecast:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch forecast');
    }
  }

  // Get forecast analytics from Express API
  async getAnalytics(): Promise<ForecastAnalytics> {
    try {
      const response = await axios.get(`${EXPRESS_API_URL}/forecasts/analytics/insights`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch analytics');
    }
  }

  // Trigger ML prediction for all items (Flask ML API)
  async runPrediction(): Promise<PredictionResponse> {
    try {
      const response = await axios.post(`${ML_API_URL}/predict`);
      return response.data;
    } catch (error: any) {
      console.error('Error running prediction:', error);
      throw new Error(error.response?.data?.error || 'Failed to run prediction');
    }
  }

  // Trigger ML prediction for a single item (Flask ML API)
  async runPredictionForItem(itemId: string): Promise<PredictionResponse> {
    try {
      const response = await axios.post(`${ML_API_URL}/predict/${itemId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error running prediction for item:', error);
      throw new Error(error.response?.data?.error || 'Failed to run prediction for item');
    }
  }

  // Check ML model status (Flask ML API)
  async getMLStatus(): Promise<MLStatus> {
    try {
      const response = await axios.get(`${ML_API_URL}/status`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching ML status:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch ML status');
    }
  }

  // Check ML API health (Flask ML API)
  async checkMLHealth(): Promise<{ status: string; timestamp: string; models_loaded: boolean }> {
    try {
      const response = await axios.get(`${ML_API_URL}/../health`);
      return response.data;
    } catch (error: any) {
      console.error('Error checking ML health:', error);
      throw new Error('ML API is not responding');
    }
  }

  // Create or update forecast manually (Express API)
  async createOrUpdate(forecastData: Partial<Forecast>): Promise<{ message: string; forecast: Forecast }> {
    try {
      const response = await axios.post(`${EXPRESS_API_URL}/forecasts`, forecastData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating/updating forecast:', error);
      throw new Error(error.response?.data?.message || 'Failed to save forecast');
    }
  }
}

export default new ForecastAPI();