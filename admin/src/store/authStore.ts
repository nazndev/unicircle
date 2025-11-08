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
      // Also set as cookie for API routes
      if (typeof document !== 'undefined') {
        // Set cookie with proper flags - remove Secure flag for localhost
        const isSecure = window.location.protocol === 'https:';
        const cookieString = `admin_token=${accessToken}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        document.cookie = cookieString;
        console.log('[AUTH STORE] Cookie set:', { 
          path: '/', 
          maxAge: 86400,
          secure: isSecure,
          cookieString: cookieString.substring(0, 50) + '...'
        });
        
        // Verify cookie was set
        const cookies = document.cookie.split(';').map(c => c.trim());
        const adminTokenCookie = cookies.find(c => c.startsWith('admin_token='));
        console.log('[AUTH STORE] Cookie verification:', {
          found: !!adminTokenCookie,
          allCookies: cookies.map(c => c.split('=')[0])
        });
      }
      console.log('[AUTH STORE] Token stored in localStorage and cookie');
      
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
    // Clear cookie
    if (typeof document !== 'undefined') {
      document.cookie = 'admin_token=; path=/; max-age=0';
    }
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
        // Handle network errors separately
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
          console.error('[AUTH STORE] Network Error - Backend not reachable:', {
            message: 'Cannot connect to backend server. Please ensure the backend is running on http://localhost:3000',
            baseURL: error.config?.baseURL
          });
          // Don't clear auth state on network errors - backend might just be down temporarily
          return;
        }

        console.error('[AUTH STORE] checkAuth error:', {
          message: error.message,
          status: error.response?.status,
          code: error.code,
          data: error.response?.data
        });
        // Silently handle 401/404 - these are expected when token is invalid
        if (error.response?.status === 401 || error.response?.status === 404) {
          console.log('[AUTH STORE] Token invalid or expired, clearing auth state');
          localStorage.removeItem('admin_token');
          set({ user: null, isAuthenticated: false });
        } else {
          // Only log unexpected errors
          console.warn('[AUTH STORE] Unexpected error during auth check:', error.message);
        }
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

