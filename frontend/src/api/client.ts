import axios, { AxiosError } from 'axios';

// __API_URL__ is injected at build/test time by Vite's define config
// (see vite.config.ts); the fallback matches the backend dev default.
declare const __API_URL__: string | undefined;

const BASE_URL: string =
  typeof __API_URL__ !== 'undefined' && __API_URL__
    ? __API_URL__
    : 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 and refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = typeof localStorage !== 'undefined'
        ? localStorage.getItem('refreshToken')
        : null;

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('accessToken', data.accessToken);
          }
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return apiClient(originalRequest);
        } catch {
          // Refresh failed — clear tokens and redirect to login
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
          }
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
