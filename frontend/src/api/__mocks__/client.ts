// Mock for api/client - used in Jest tests to avoid import.meta.env issues
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export default apiClient;
