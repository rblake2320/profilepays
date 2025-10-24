import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  register: async (userData: any) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Campaigns API
export const campaignsApi = {
  getAll: async (page: number = 1, limit: number = 10, status?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    const response = await api.get(`/campaigns?${params}`);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/campaigns/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/campaigns', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/campaigns/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/campaigns/${id}`);
    return response.data;
  },
  join: async (id: string) => {
    const response = await api.post(`/campaigns/${id}/join`);
    return response.data;
  },
  getMyCampaigns: async () => {
    const response = await api.get('/campaigns/my-campaigns');
    return response.data;
  },
  getParticipations: async () => {
    const response = await api.get('/campaigns/participations');
    return response.data;
  },
};

// Users API
export const usersApi = {
  getById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },
};

// Payments API
export const paymentsApi = {
  createIntent: async (amount: number, type: string, metadata?: any) => {
    const response = await api.post('/payments/create-intent', { amount, type, metadata });
    return response.data;
  },
  requestPayout: async (amount: number) => {
    const response = await api.post('/payments/payout', { amount });
    return response.data;
  },
  getMyPayments: async () => {
    const response = await api.get('/payments/my-payments');
    return response.data;
  },
};

// Files API
export const filesApi = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default api;
