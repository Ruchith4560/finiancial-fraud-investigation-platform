import axios from 'axios';
import type { ApiResponse } from '../types';

// Auto-detect cloud backend on Render if VITE_API_URL was not set at build time
const isRenderCloud = typeof window !== 'undefined' && window.location.hostname.endsWith('.onrender.com');
const defaultCloudUrl = isRenderCloud ? 'https://fraudlens-backend.onrender.com' : '';

const rawApiUrl = import.meta.env.VITE_API_URL || defaultCloudUrl;
const normalizedBase = rawApiUrl
  ? (rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://') ? rawApiUrl : `https://${rawApiUrl}`)
  : '';

export const api = axios.create({
  baseURL: `${normalizedBase}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fraudlens_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to normalize errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fraudlens_token');
      localStorage.removeItem('fraudlens_user');
      if (window.location.pathname !== '/login') {
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
