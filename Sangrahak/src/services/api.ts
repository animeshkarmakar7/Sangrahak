// src/services/api.ts
import axios from 'axios';
import { Product, Depot, Alert, KPI, TopSKU, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData: { name: string; email: string; password: string; role?: string }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
};

// Products API
export const productsAPI = {
  getAll: async (params?: {
    search?: string;
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  create: async (productData: Omit<Product, 'id' | 'lastSoldDate'>) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  update: async (id: string, productData: Partial<Product>) => {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  },

   updateStock: async (id: string, newStock: number, mode: 'set' | 'inc' | 'dec' = 'set') => {
    const response = await api.patch(`/products/${id}/stock`, { stock: newStock, mode });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get('/products/categories');
    return response.data;
  },
};

// Depots API
export const depotsAPI = {
  getAll: async () => {
    const response = await api.get('/depots');
    return response.data;
  },

  create: async (depotData: Omit<Depot, 'id'>) => {
    const response = await api.post('/depots', depotData);
    return response.data;
  },
};

// Alerts API
export const alertsAPI = {
  getAll: async (unreadOnly = false) => {
    const response = await api.get('/alerts', { params: { unreadOnly } });
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await api.put(`/alerts/${id}/read`);
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  getTopSKUs: async () => {
    const response = await api.get('/dashboard/top-skus');
    return response.data;
  },
};

// Auth utilities
export const authUtils = {
  setToken: (token: string) => {
    localStorage.setItem('token', token);
  },

  getToken: () => {
    return localStorage.getItem('token');
  },

  removeToken: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  setUser: (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
  },

  getUser: (): User | null => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
};

export default api;