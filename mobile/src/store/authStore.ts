import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/client';

interface User {
  id: string;
  email: string;
  name?: string;
  profileMode: 'student' | 'alumni' | 'professional';
  verificationStatus: 'pending' | 'approved' | 'rejected';
  university?: {
    name: string;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, code: string) => Promise<void>;
  alumniRegister: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, code: string) => {
    try {
      const response = await apiClient.post('/auth/verify-code', { email, code });
      const { accessToken, refreshToken, user } = response.data;
      
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      
      set({ user, isAuthenticated: true });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  alumniRegister: async (data: any) => {
    try {
      await apiClient.post('/auth/alumni-register', data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        const response = await apiClient.get('/me');
        set({ user: response.data, isAuthenticated: true });
      }
    } catch (error) {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  updateUser: (user: User) => {
    set({ user });
  },
}));

