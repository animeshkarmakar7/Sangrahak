const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  create: any;
  getAll: any;
  markAsRead: any;
  update(id: string, productData: { stock: number; reorderPoint: number; price: number; sku: string; name: string; category: string; supplier: string; }) {
      throw new Error('Method not implemented.');
  }
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'An error occurred' }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Product API methods
  async getProducts(params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return this.request(`/products?${queryParams}`);
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}`);
  }

  async createProduct(productData: any) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async updateProduct(id: string, productData: any) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  async updateProductStock(id: string, quantity: number, operation: 'add' | 'subtract' | 'set' = 'set') {
    return this.request(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity, operation }),
    });
  }

  async getProductCategories() {
    return this.request('/products/categories/list');
  }

  // Depot API methods
  async getDepots() {
    return this.request('/depots');
  }

  async getDepot(id: string) {
    return this.request(`/depots/${id}`);
  }

  async createDepot(depotData: any) {
    return this.request('/depots', {
      method: 'POST',
      body: JSON.stringify(depotData),
    });
  }

  async updateDepot(id: string, depotData: any) {
    return this.request(`/depots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(depotData),
    });
  }

  async deleteDepot(id: string) {
    return this.request(`/depots/${id}`, {
      method: 'DELETE',
    });
  }

  async getDepotStats(id: string) {
    return this.request(`/depots/${id}/stats`);
  }

  async updateDepotUtilization(id: string, utilization: number) {
    return this.request(`/depots/${id}/utilization`, {
      method: 'PATCH',
      body: JSON.stringify({ utilization }),
    });
  }

  // Alert API methods
  async getAlerts(params: {
    page?: number;
    limit?: number;
    type?: string;
    severity?: string;
    isRead?: boolean;
    isResolved?: boolean;
    sortBy?: string;
    sortOrder?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return this.request(`/alerts?${queryParams}`);
  }

  async getAlert(id: string) {
    return this.request(`/alerts/${id}`);
  }

  async createAlert(alertData: any) {
    return this.request('/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
  }

  async markAlertAsRead(id: string) {
    return this.request(`/alerts/${id}/read`, {
      method: 'PATCH',
    });
  }

  async resolveAlert(id: string, resolvedBy: string, resolutionNotes?: string) {
    return this.request(`/alerts/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ resolvedBy, resolutionNotes }),
    });
  }

  async deleteAlert(id: string) {
    return this.request(`/alerts/${id}`, {
      method: 'DELETE',
    });
  }

  async getAlertStats() {
    return this.request('/alerts/stats/overview');
  }

  async markMultipleAlertsAsRead(alertIds: string[]) {
    return this.request('/alerts/bulk/read', {
      method: 'PATCH',
      body: JSON.stringify({ alertIds }),
    });
  }

  // KPI API methods
  async getKPIs() {
    return this.request('/kpis');
  }

  async getInventoryStats() {
    return this.request('/kpis/inventory');
  }

  async getSalesData(days: number = 7) {
    return this.request(`/kpis/sales?days=${days}`);
  }

  async getTopSKUs(limit: number = 5) {
    return this.request(`/kpis/top-skus?limit=${limit}`);
  }

  async getStats() {
    return this.request('/kpis/depots');
  }
}

export const apiService = new ApiService();
export default apiService;