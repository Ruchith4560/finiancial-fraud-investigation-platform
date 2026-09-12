import axios from 'axios';
import type { ApiResponse } from '../types';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // 1. Check user manual override in localStorage
    const saved = localStorage.getItem('fraudlens_api_url');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  }

  // 2. Check build-time Vite environment variable
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. If running in cloud (Render), point to active microservice gateway
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.endsWith('.onrender.com')) {
      return 'https://finiancial-fraud-investigation-platform08.onrender.com';
    }
  }

  return '';
}

export const api = axios.create({
  baseURL: `${getApiBaseUrl()}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Dynamically attach baseURL & JWT token on every request
api.interceptors.request.use((config) => {
  const currentBase = getApiBaseUrl();
  config.baseURL = currentBase ? `${currentBase}/api/v1` : '/api/v1';

  const token = localStorage.getItem('fraudlens_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to normalize errors without aggressive redirect loops
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('fraudlens_token');
        localStorage.removeItem('fraudlens_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Helper for unwrapping ApiResponse<T>
export async function fetchApi<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const response = await promise;
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'API request failed');
  }
  return response.data.data;
}
