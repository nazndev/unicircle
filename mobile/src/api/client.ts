import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { generateRequestSignature, isRequestSigningEnabled } from '../utils/signature';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:3000/api';
// API key should come from environment variables (app.config.js or .env)
// Never hardcode secrets in source code
const MOBILE_API_KEY = Constants.expoConfig?.extra?.mobileApiKey || process.env.EXPO_PUBLIC_MOBILE_API_KEY || '';
// IMPORTANT: API Secret should NOT be in the app bundle in production
// For request signing, we need a way to get the secret securely
// Options: 1) Use a proxy server, 2) Use certificate pinning + server-side secret derivation
// For now, we'll use a placeholder - in production, implement proper secret management
const MOBILE_API_SECRET = Constants.expoConfig?.extra?.mobileApiSecret || '';

// Log warning if API key is missing (only in development)
if (__DEV__ && !MOBILE_API_KEY) {
  console.warn('[API CLIENT] ⚠️ MOBILE_API_KEY is not set. Mobile API endpoints will fail.');
  console.warn('[API CLIENT] Set EXPO_PUBLIC_MOBILE_API_KEY in your .env file or app.config.js');
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout for all requests
});

// Add token, API key, and request signature to requests
apiClient.interceptors.request.use(
  async (config) => {
    // Always add mobile API key for public endpoints (required for @MobileApi() endpoints)
    if (MOBILE_API_KEY) {
      config.headers['x-api-key'] = MOBILE_API_KEY;
    } else if (__DEV__) {
      // Only warn in development - in production, this should be set
      console.warn('[API CLIENT] Request to', config.url, 'without API key - may fail if endpoint requires @MobileApi()');
    }
    
    // Add JWT token if available (for authenticated requests)
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // If JWT token is present, skip request signing (JWT is sufficient)
      return config;
    }
    
    // For public endpoints (no JWT), add request signature if enabled
    if (isRequestSigningEnabled() && MOBILE_API_SECRET) {
      const timestamp = Date.now().toString();
      const method = (config.method || 'GET').toUpperCase();
      const path = config.url?.replace(API_BASE_URL, '') || config.url || '';
      const queryString = config.params ? new URLSearchParams(config.params).toString() : '';
      const body = config.data ? (typeof config.data === 'string' ? config.data : JSON.stringify(config.data)) : '';
      
      const signature = generateRequestSignature(
        method,
        path,
        queryString,
        body,
        timestamp,
        MOBILE_API_SECRET,
      );
      
      config.headers['x-timestamp'] = timestamp;
      config.headers['x-signature'] = signature;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token refresh on 401 and improve error messages
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401) {
      // Check if it's an API key error (don't try to refresh for that)
      if (error.response?.data?.code === 'INVALID_API_KEY') {
        console.error('[API CLIENT] Invalid API key. Check your MOBILE_API_KEY configuration.');
        return Promise.reject(new Error('API configuration error. Please contact support.'));
      }
      
      // Try to refresh token
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
            headers: { Authorization: `Bearer ${refreshToken}` },
          });
          const { accessToken } = response.data;
          await SecureStore.setItemAsync('accessToken', accessToken);
          error.config.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient.request(error.config);
        } catch (refreshError) {
          // Refresh failed, clear tokens
          // Don't log this as an error - it's expected if tokens are expired
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
        }
      }
      // If no refresh token or refresh failed, let the error propagate
      // but don't log it as an error - it's expected behavior
    }
    
    // Improve error messages for common cases
    if (error.response?.data) {
      const errorData = error.response.data;
      // Use server-provided message if available
      if (errorData.message) {
        error.message = errorData.message;
      }
      // Handle specific error codes
      if (errorData.code === 'INVALID_API_KEY') {
        error.message = 'API configuration error. Please contact support.';
      } else if (errorData.code === 'COUNTRY_INACTIVE') {
        error.message = errorData.message || 'Your country has been deactivated. Please contact support.';
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;

