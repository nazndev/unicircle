import React, { useEffect } from 'react';
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
    // Only run checkAuth once on mount
    let mounted = true;
    
    const initAuth = async () => {
      try {
        await checkAuth();
      } catch (error: any) {
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
    };
  }, []); // Empty dependency array - only run once on mount

  // Show loading screen while checking auth or loading fonts
  if (isLoading || !fontsLoaded) {
    return null; // Splash screen will show (from app.json)
  }
  
  console.log('[APP] Render state:', { 
    isAuthenticated, 
    isLoading, 
    hasUser: !!user,
    userEmail: user?.email 
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
    navigator = <AuthNavigator initialRouteName="PinLogin" />;
  } else {
    // User not authenticated and no device binding, OR needs PIN setup - show normal auth flow (Email screen)
    navigator = <AuthNavigator />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {navigator}
    </NavigationContainer>
  );
}

