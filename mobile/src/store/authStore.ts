import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/client';

interface User {
  id: string;
  email: string;
  name?: string;
  nameVerified?: boolean; // Name verification badge (requires document verification and admin approval)
  avatarUrl?: string;
  avatarSizes?: {
    thumbnail?: string;
    medium?: string;
    full?: string;
  };
  profileMode: 'student' | 'professional'; // Base role (teacher is a badge, not a profileMode)
  isAlumni?: boolean; // Alumni badge (automatically set when transitioning from student to professional, or when directly registering as professional with university info)
  alumniVerified?: boolean; // Alumni verification badge (true if student→professional transition, or after admin approval for direct registration)
  isTeacher?: boolean; // Teacher badge (enables research features, can be combined with professional profileMode)
  teacherVerified?: boolean; // Teacher verification badge (true if verified with university email, or after admin approval)
  verificationStatus: 'pending' | 'approved' | 'rejected';
  isVerified?: boolean;
  onboardingCompleted?: boolean;
  universityEmailVerified?: boolean; // Badge: verified with university email
  officeEmailVerified?: boolean; // Badge: verified with office email
  // Student fields
  department?: string;
  programme?: string;
  semester?: string;
  passingYear?: number;
  // Alumni fields
  graduationYear?: number;
  currentStatus?: string;
  // Common fields
  gender?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  bio?: string;
  interests?: string[];
  headline?: string;
  experience?: any;
  skills?: string[];
  researchInterests?: any;
  university?: {
    id: string;
    name: string;
    country?: string | { id: string; name: string; code: string | null; active: boolean; createdAt: string; updatedAt: string };
  };
  organization?: {
    id: string;
    name: string;
    country?: string | { id: string; name: string; code: string | null; active: boolean; createdAt: string; updatedAt: string };
  };
  badges?: Array<{
    id: string;
    badgeType: string;
    verified: boolean;
    verifiedAt?: string;
    documents?: any;
    metadata?: any;
    createdAt: string;
  }>;
  personalEmail?: string;
  secondaryContact?: string;
}

interface Features {
  marketplace?: boolean;
  career?: boolean;
  crush?: boolean;
  circles?: boolean;
  feed?: boolean;
  research?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsPinSetup: boolean; // Track if user needs to set PIN
  hasDeviceBinding: boolean; // Track if device is bound and user has password
  features: Features | null; // Profile-wise features
  countryInactiveError?: {
    message: string;
    country?: string;
  } | null;
  login: (email: string, code: string) => Promise<any>;
  passwordLogin: (email: string, password: string) => Promise<void>;
  alumniRegister: (data: any) => Promise<void>;
  teacherRegister: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (user: User) => void;
  completeOnboarding: () => Promise<void>;
  setNeedsPinSetup: (needs: boolean) => void;
  clearCountryInactiveError: () => void;
  loadFeatures: () => Promise<void>; // Load features from backend
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start as true, will be set to false after checkAuth completes
  needsPinSetup: false,
  hasDeviceBinding: false,
  features: null,
  countryInactiveError: null,

  login: async (email: string, code: string) => {
    try {
      console.log('[AUTH STORE] Verifying code for:', email);
      const response = await apiClient.post('/auth/verify-code', { email, code });
      console.log('[AUTH STORE] Response received:', { 
        hasData: !!response.data,
        hasAccessToken: !!response.data?.accessToken,
        hasUser: !!response.data?.user 
      });
      
      const data = response.data?.data || response.data;
      const { accessToken, refreshToken, user, hasPassword } = data;
      
      if (!accessToken || !refreshToken) {
        console.error('[AUTH STORE] Missing tokens in response:', data);
        throw new Error('Invalid response from server');
      }
      
      if (!user) {
        console.error('[AUTH STORE] Missing user in response:', data);
        throw new Error('Invalid response from server');
      }
      
      console.log('[AUTH STORE] Storing tokens and user data');
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      
      // Save email for next login
      if (user?.email) {
        await SecureStore.setItemAsync('lastEmail', user.email);
        console.log('[AUTH STORE] Saved last email:', user.email);
      }
      
      // Bind device on first login/registration (even if PIN not set yet)
      // This ensures device is tracked from the start
      try {
        const Application = require('expo-application').default;
        const Platform = require('react-native').Platform;
        let deviceId: string | null = null;
        if (Platform.OS === 'android') {
          deviceId = Application.getAndroidId() || null;
        } else {
          deviceId = await Application.getIosIdForVendorAsync();
        }
        
        if (deviceId) {
          const deviceName = Platform.OS === 'ios' ? 'iOS Device' : 'Android Device';
          await apiClient.post('/auth/bind-device', {
            deviceId: deviceId,
            deviceName,
            platform: Platform.OS,
          });
          console.log('[AUTH STORE] Device bound on login');
        }
      } catch (deviceError: any) {
        // Don't fail the flow if device binding fails - it's not critical
        console.warn('[AUTH STORE] Device binding failed (non-critical):', deviceError.message);
      }
      
      // Set authentication state
      // If user doesn't have password, set needsPinSetup flag
      const needsPin = !hasPassword;
      set({ 
        user, 
        isAuthenticated: true,
        needsPinSetup: needsPin,
        hasDeviceBinding: hasPassword // Only set if password exists (device will be bound after PIN setup)
      });
      console.log('[AUTH STORE] Login successful, hasPassword:', hasPassword, 'needsPinSetup:', needsPin);
      
      // Load features after login
      try {
        await get().loadFeatures();
      } catch (error) {
        console.warn('[AUTH STORE] Failed to load features after login:', error);
      }
      
      // Return response including hasPassword for navigation logic
      return { hasPassword: hasPassword ?? false };
    } catch (error: any) {
      console.error('[AUTH STORE] Login error:', error);
      console.error('[AUTH STORE] Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(errorMessage);
    }
  },

  passwordLogin: async (email: string, password: string) => {
    try {
      console.log('[AUTH STORE] Password login for:', email);
      
      // Validate inputs
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }
      if (!password || password.length < 4) {
        throw new Error('PIN must be at least 4 characters');
      }
      
      const response = await apiClient.post('/auth/password-login', { email, password });
      console.log('[AUTH STORE] Password login response received');
      
      const data = response.data?.data || response.data;
      const { accessToken, refreshToken, user } = data;
      
      if (!accessToken || !refreshToken) {
        console.error('[AUTH STORE] Missing tokens in response:', data);
        throw new Error('Invalid response from server. Please try again.');
      }
      
      if (!user) {
        console.error('[AUTH STORE] Missing user in response:', data);
        throw new Error('Invalid response from server. Please try again.');
      }
      
      console.log('[AUTH STORE] Storing tokens and user data');
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      
      // Save email for next login
      if (user?.email) {
        await SecureStore.setItemAsync('lastEmail', user.email);
        console.log('[AUTH STORE] Saved last email:', user.email);
      }
      
      // Password login means user has password, so no PIN setup needed
      // Verify device binding is still active
      let deviceBound = true; // Assume bound if password login works
      try {
        const deviceCheck = await apiClient.get('/auth/check-device');
        const deviceData = deviceCheck.data?.data || deviceCheck.data;
        deviceBound = deviceData?.isBound || false;
      } catch (error) {
        console.warn('[AUTH STORE] Could not verify device binding after password login');
      }
      
      set({ user, isAuthenticated: true, needsPinSetup: false, hasDeviceBinding: deviceBound });
      console.log('[AUTH STORE] Password login successful, deviceBound:', deviceBound);
      
      // Load features after login
      try {
        await get().loadFeatures();
      } catch (error) {
        console.warn('[AUTH STORE] Failed to load features after password login:', error);
      }
    } catch (error: any) {
      console.error('[AUTH STORE] Password login error:', error);
      console.error('[AUTH STORE] Error response:', error.response?.data);
      
      // Check for country inactive error
      const errorData = error.response?.data;
      if (errorData?.code === 'COUNTRY_INACTIVE' || errorData?.message?.includes('country has been deactivated')) {
        set({
          countryInactiveError: {
            message: errorData?.message || 'Your country has been deactivated. Please contact support for assistance.',
            country: errorData?.country,
          }
        });
        throw new Error(errorData?.message || 'Your country has been deactivated');
      }
      
      // Check for API key error
      if (errorData?.code === 'INVALID_API_KEY') {
        throw new Error('API configuration error. Please contact support.');
      }
      
      // Use error message from error object (already improved by interceptor)
      const errorMessage = error.message || error.response?.data?.message || 'Login failed. Please check your email and PIN.';
      throw new Error(errorMessage);
    }
  },

  alumniRegister: async (data: any) => {
    try {
      await apiClient.post('/auth/alumni-register', data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },

  teacherRegister: async (data: any) => {
    try {
      await apiClient.post('/auth/teacher-register', data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },

  logout: async () => {
    // Don't clear lastAccountType and lastEmail - keep them for next login
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null, isAuthenticated: false, needsPinSetup: false, hasDeviceBinding: false, features: null });
  },

  checkAuth: async () => {
    try {
      console.log('[AUTH STORE] Checking authentication...');
      set({ isLoading: true }); // Ensure loading state is set
      
      // First, quickly check if token exists (no network call needed)
      const token = await SecureStore.getItemAsync('accessToken');
      console.log('[AUTH STORE] Token found:', !!token);
      
      // If no token, immediately set loading to false and return
      if (!token) {
        console.log('[AUTH STORE] No token found - user not logged in');
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false, 
          needsPinSetup: false, 
          hasDeviceBinding: false
        });
        console.log('[AUTH STORE] Auth check complete - no token');
        return;
      }
      
      // Only make network calls if token exists
      if (token) {
        try {
          console.log('[AUTH STORE] Validating token with /me endpoint...');
          const response = await apiClient.get('/me');
          console.log('[AUTH STORE] /me response:', { 
            hasData: !!response.data,
            status: response.status 
          });
          
          const userData = response.data?.data || response.data;
          console.log('[AUTH STORE] User data:', { 
            id: userData?.id,
            email: userData?.email,
            isVerified: userData?.isVerified 
          });
          
          if (userData) {
            // Check if user has password set
            let needsPin = false;
            let hasPassword = false;
            try {
              const passwordCheck = await apiClient.get('/auth/check-password');
              const passwordData = passwordCheck.data?.data || passwordCheck.data;
              hasPassword = passwordData?.hasPassword || false;
              needsPin = !hasPassword;
            } catch (error) {
              // If check fails, assume password is set (don't block user)
              console.warn('[AUTH STORE] Could not check password status, assuming password is set');
              hasPassword = true;
            }
            
            // Check if device is bound (if user has password, check device binding)
            let deviceBound = false;
            if (hasPassword) {
              try {
                const deviceCheck = await apiClient.get('/auth/check-device');
                const deviceData = deviceCheck.data?.data || deviceCheck.data;
                deviceBound = deviceData?.isBound || false;
              } catch (error) {
                // If check fails, assume device is not bound
                console.warn('[AUTH STORE] Could not check device binding status');
                deviceBound = false;
              }
            }
            
            set({ 
              user: userData, 
              isAuthenticated: true, 
              isLoading: false,
              needsPinSetup: needsPin,
              hasDeviceBinding: deviceBound && hasPassword
            });
            console.log('[AUTH STORE] Authentication check successful - user is logged in, needsPinSetup:', needsPin, 'hasDeviceBinding:', deviceBound && hasPassword);
            
            // Load features after auth check
            try {
              await get().loadFeatures();
            } catch (error) {
              console.warn('[AUTH STORE] Failed to load features after auth check:', error);
            }
          } else {
            console.warn('[AUTH STORE] No user data in response');
            set({ user: null, isAuthenticated: false, isLoading: false, needsPinSetup: false, hasDeviceBinding: false });
          }
        } catch (error: any) {
          // Token invalid or expired - this is expected on app start if token is old
          if (error.response?.status === 401 || error.response?.status === 404) {
            console.log('[AUTH STORE] Token invalid or expired, clearing tokens (this is normal if user hasn\'t logged in recently)');
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
            set({ user: null, isAuthenticated: false, isLoading: false, needsPinSetup: false, hasDeviceBinding: false });
          } else {
            // Network or other errors - don't clear tokens, just set as not authenticated for now
            // Only log actual errors, not expected 401s
            console.warn('[AUTH STORE] Auth check failed:', {
              status: error.response?.status,
              message: error.response?.data?.message || error.message
            });
            set({ user: null, isAuthenticated: false, isLoading: false, needsPinSetup: false, hasDeviceBinding: false });
          }
        }
      }
    } catch (error) {
      // Handle SecureStore errors
      console.error('[AUTH STORE] SecureStore error:', error);
      set({ user: null, isAuthenticated: false, isLoading: false, needsPinSetup: false, hasDeviceBinding: false });
      console.log('[AUTH STORE] Auth check complete - error handled');
    }
  },

  updateUser: (userData: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : (userData as User),
    }));
  },

  completeOnboarding: async () => {
    try {
      const response = await apiClient.put('/me/complete-onboarding');
      const userData = response.data?.data || response.data;
      set({ user: userData });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to complete onboarding');
    }
  },

  setNeedsPinSetup: (needs: boolean) => {
    set({ needsPinSetup: needs });
  },

  clearCountryInactiveError: () => {
    set({ countryInactiveError: null });
  },

  loadFeatures: async () => {
    try {
      const response = await apiClient.get('/me/features');
      const featuresData = response.data?.data || response.data || {};
      
      // Ensure all feature flags are booleans
      const features: Features = {
        marketplace: featuresData.marketplace !== undefined ? !!featuresData.marketplace : true,
        career: featuresData.career !== undefined ? !!featuresData.career : true,
        crush: featuresData.crush !== undefined ? !!featuresData.crush : false,
        circles: featuresData.circles !== undefined ? !!featuresData.circles : true,
        feed: featuresData.feed !== undefined ? !!featuresData.feed : true,
        research: featuresData.research !== undefined ? !!featuresData.research : false,
      };
      
      set({ features });
      console.log('[AUTH STORE] Features loaded:', features);
    } catch (error: any) {
      console.error('[AUTH STORE] Failed to load features:', error);
      // Set default features if API fails
      const user = get().user;
      if (user) {
        const defaultFeatures: Features = {
          marketplace: true,
          career: true,
          crush: user.profileMode === 'student',
          circles: true,
          feed: true,
          research: user.isTeacher || user.profileMode === 'student',
        };
        set({ features: defaultFeatures });
      }
    }
  },
}));

