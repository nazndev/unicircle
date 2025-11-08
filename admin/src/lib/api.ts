import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  console.log('[API] Request:', { 
    url: config.url, 
    method: config.method,
    baseURL: config.baseURL 
  });
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[API] Token added to request');
    } else {
      console.log('[API] No token found in localStorage');
    }
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => {
    console.log('[API] Response:', { 
      url: response.config.url,
      status: response.status,
      hasData: !!response.data 
    });
    return response;
  },
  (error) => {
    // Handle network errors (backend not running)
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('[API] Network Error - Backend may not be running:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        message: 'Cannot connect to backend server. Please ensure the backend is running on http://localhost:3000'
      });
      // Don't redirect on network errors - let the component handle it
      return Promise.reject(error);
    }

    console.error('[API] Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      console.log('[API] 401 Unauthorized - redirecting to login');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

