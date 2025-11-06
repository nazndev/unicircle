import { create } from 'zustand';
import api from '@/lib/api';

export type AdminRole = 'super_admin' | 'admin' | 'moderator';

interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role: AdminRole;
  universityId?: string;
}

interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  hasPermission: (requiredRole: AdminRole[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    console.log('[AUTH STORE] Login attempt:', { email, passwordLength: password?.length });
    try {
      console.log('[AUTH STORE] Calling API:', '/auth/admin/login');
      const response = await api.post('/auth/admin/login', { email, password });
      console.log('[AUTH STORE] API Response:', { 
        status: response.status,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        fullResponse: response.data
      });
      
      // Handle both wrapped and unwrapped responses
      const responseData = response.data?.data || response.data;
      console.log('[AUTH STORE] Extracted responseData:', responseData);
      
      const { accessToken, user } = responseData;
      console.log('[AUTH STORE] Extracted data:', { 
        hasAccessToken: !!accessToken,
        hasUser: !!user,
        userRole: user?.role 
      });
      
      if (!accessToken) {
        console.error('[AUTH STORE] No access token in response!');
        throw new Error('No access token received');
      }
      
      localStorage.setItem('admin_token', accessToken);
      console.log('[AUTH STORE] Token stored in localStorage');
      
      set({ user, isAuthenticated: true });
      console.log('[AUTH STORE] State updated:', { 
        isAuthenticated: true, 
        userEmail: user?.email,
        userRole: user?.role 
      });
    } catch (error: any) {
      console.error('[AUTH STORE] Login error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        fullError: error
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      try {
        console.log('[AUTH STORE] Checking auth with token...');
        const response = await api.get('/me');
        console.log('[AUTH STORE] checkAuth response:', { 
          status: response.status,
          hasData: !!response.data 
        });
        
        // Handle wrapped response
        const responseData = response.data?.data || response.data;
        const user = responseData;
        
        console.log('[AUTH STORE] User from checkAuth:', { 
          role: user?.role,
          email: user?.email 
        });
        
        if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'moderator') {
          // Map to AdminUser format
          const adminUser: AdminUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            universityId: user.universityId,
          };
          set({ user: adminUser, isAuthenticated: true });
          console.log('[AUTH STORE] Auth check successful');
        } else {
          console.log('[AUTH STORE] User does not have admin role');
          localStorage.removeItem('admin_token');
          set({ user: null, isAuthenticated: false });
        }
      } catch (error: any) {
        console.error('[AUTH STORE] checkAuth error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        localStorage.removeItem('admin_token');
        set({ user: null, isAuthenticated: false });
      }
    } else {
      console.log('[AUTH STORE] No token found, skipping checkAuth');
    }
  },

  hasPermission: (requiredRole: AdminRole[]) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return requiredRole.includes(user.role);
  },
}));

