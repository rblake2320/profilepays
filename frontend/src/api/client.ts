import axios, { AxiosError } from 'axios';

// Resolve API base URL: works in both Vite (import.meta.env) and Jest (process.env)
function getBaseUrl(): string {
  // In Vite build/dev environment
  if (typeof window !== 'undefined' && (window as any).__VITE_API_URL__) {
    return (window as any).__VITE_API_URL__;
  }
  // In Jest/Node environment
  if (typeof process !== 'undefined' && process.env.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }
  return '/api';
}

// Vite replaces this at build time via define config
declare const __API_URL__: string;
const BASE_URL: string = (() => {
  try {
    // This will be replaced by Vite's define plugin
    return typeof __API_URL__ !== 'undefined' ? __API_URL__ : getBaseUrl();
  } catch {
    return getBaseUrl();
  }
})();

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
  (error) => Promise.reject(error),
);

// Coalesce concurrent expiry responses; refresh tokens rotate on every successful refresh.
let pendingRefresh: Promise<string> | null = null;
// Response interceptor: handle 401 and refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
      originalRequest._retry = true;

      const refreshToken = typeof localStorage !== 'undefined'
        ? localStorage.getItem('refreshToken')
        : null;

      if (refreshToken) {
        try {
          if (!pendingRefresh) {
            pendingRefresh = axios.post(`${BASE_URL}/auth/refresh`, { refreshToken }).then(({data})=>{
              localStorage.setItem('accessToken', data.accessToken);
              localStorage.setItem('refreshToken', data.refreshToken);
              return data.accessToken as string;
            }).finally(()=>{pendingRefresh=null});
          }
          const accessToken=await pendingRefresh;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
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
  },
);

export default apiClient;
