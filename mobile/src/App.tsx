import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from './store/authStore';
import AuthNavigator from './navigation/AuthNavigator';
import MainNavigator from './navigation/MainNavigator';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';

export default function App() {
  const { checkAuth, isAuthenticated, isLoading, user, needsPinSetup, hasDeviceBinding, countryInactiveError } = useAuthStore();
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    console.log('[APP] Component mounted, starting auth check...');
    // Only run checkAuth once on mount
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const initAuth = async () => {
      try {
        console.log('[APP] Calling checkAuth...');
        // Set a timeout to ensure isLoading doesn't stay true forever (shorter timeout for faster UX)
        timeoutId = setTimeout(() => {
          console.warn('[APP] checkAuth taking too long (>2s), forcing isLoading to false');
          useAuthStore.setState({ isLoading: false }); // Force isLoading to false if checkAuth hangs
        }, 2000); // 2 second timeout - faster for better UX
        
        await checkAuth();
        clearTimeout(timeoutId);
        console.log('[APP] checkAuth completed');
      } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('[APP] checkAuth error:', error);
        // Ensure isLoading is set to false even on error
        useAuthStore.setState({ isLoading: false });
        // Silently handle auth check errors - 401 is expected if no valid token
        // Only log unexpected errors
        if (error?.response?.status !== 401 && error?.response?.status !== 404) {
          console.warn('[APP] Unexpected auth check error:', error);
        }
      }
    };
    
    initAuth();
    
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []); // Empty dependency array - only run once on mount

  console.log('[APP] Render - isLoading:', isLoading, 'fontsLoaded:', fontsLoaded);

  // Show loading screen while checking auth
  // Don't wait for fonts - they can load asynchronously
  if (isLoading) {
    console.log('[APP] Still loading, showing loading screen');
    return (
      <View style={{ flex: 1, backgroundColor: '#2358D6', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }
  
  // Log font loading status for debugging
  if (!fontsLoaded) {
    console.log('[APP] Fonts not loaded yet, but continuing to render');
  }
  
  console.log('[APP] Render state:', { 
    isAuthenticated, 
    isLoading, 
    hasUser: !!user,
    userEmail: user?.email,
    needsPinSetup,
    hasDeviceBinding
  });

  // Show country inactive screen if country is deactivated
  if (countryInactiveError) {
    const CountryInactiveScreen = require('./screens/auth/CountryInactiveScreen').default;
    return (
      <NavigationContainer>
        <StatusBar style="auto" />
        <CountryInactiveScreen />
      </NavigationContainer>
    );
  }

  // Determine which navigator to show
  let navigator = <AuthNavigator />;
  
  if (isAuthenticated && !needsPinSetup) {
    // User is authenticated and PIN is set - show main navigator
    navigator = <MainNavigator />;
  } else if (isAuthenticated && needsPinSetup) {
    // User is authenticated but needs PIN setup - show email/OTP flow (not PIN login)
    // They need to complete registration or set up PIN first
    navigator = <AuthNavigator />;
  } else if (!isAuthenticated && hasDeviceBinding && !needsPinSetup) {
    // User has device binding and password set, but token expired - show PIN login screen
    // Only show PIN login if user actually has a password (hasDeviceBinding implies this)
    // AND they don't need PIN setup (double check to prevent showing PIN login to users without password)
    // IMPORTANT: hasDeviceBinding should only be true if we verified it with a valid token check
    navigator = <AuthNavigator initialRouteName="PinLogin" />;
  } else {
    // User not authenticated and no device binding, OR needs PIN setup - show normal auth flow (Welcome/Email screen)
    // Default to Welcome screen (first screen in AuthNavigator)
    navigator = <AuthNavigator />;
  }

  try {
    return (
      <NavigationContainer>
        <StatusBar style="auto" />
        {navigator}
      </NavigationContainer>
    );
  } catch (error: any) {
    console.error('[APP] Render error:', error);
    return (
      <View style={{ flex: 1, backgroundColor: '#2358D6', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#fff', fontSize: 18, marginBottom: 10 }}>Error Loading App</Text>
        <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>{error?.message || 'Unknown error'}</Text>
      </View>
    );
  }
}

