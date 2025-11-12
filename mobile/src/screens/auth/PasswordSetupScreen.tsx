import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';

export default function PasswordSetupScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const isPasswordReset = (route.params as any)?.isPasswordReset || false;
  const { updateUser, needsPinSetup } = useAuthStore();
  
  // Ensure we're on this screen if needsPinSetup is true
  React.useEffect(() => {
    if (!needsPinSetup) {
      // PIN is already set, navigate away (App.tsx will handle)
      console.log('[PASSWORD SETUP] PIN already set, should navigate to main app');
    }
  }, [needsPinSetup]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSetPassword = async () => {
    if (!password || password.length < 4) {
      Alert.alert('Error', 'PIN must be at least 4 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    setLoading(true);
    try {
      // Set password/PIN
      await apiClient.post('/auth/set-password', {
        password,
        confirmPassword,
      });
      
      // Bind device after PIN is set
      try {
        let deviceId: string | null = null;
        if (Platform.OS === 'android') {
          deviceId = Application.getAndroidId() || null;
        } else {
          deviceId = await Application.getIosIdForVendorAsync();
        }
        
        const deviceName = Platform.OS === 'ios' ? 'iOS Device' : 'Android Device';
        
        await apiClient.post('/auth/bind-device', {
          deviceId: deviceId || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          deviceName,
          platform: Platform.OS,
        });
        console.log('[PASSWORD SETUP] Device bound successfully');
      } catch (deviceError: any) {
        console.error('[PASSWORD SETUP] Device binding failed:', deviceError);
        // Don't fail the flow if device binding fails
      }
      
      // Update user state to reflect password is set
      const userResponse = await apiClient.get('/me');
      const userData = userResponse.data?.data || userResponse.data;
      updateUser(userData);
      
      // Clear needsPinSetup flag
      useAuthStore.getState().setNeedsPinSetup(false);
      
      // If password reset, just navigate to main app (password is updated)
      if (isPasswordReset) {
        console.log('[PASSWORD SETUP] Password reset complete, App.tsx will navigate to main app');
        Alert.alert('Success', 'Your PIN has been reset successfully.');
        // App.tsx will automatically switch to MainNavigator
        return;
      }
      
      // Check if user needs to provide personal info (name, DOB, terms)
      const needsPersonalInfo = !userData?.name || userData.name.trim().length < 2 || !userData?.dateOfBirth;
      
      if (needsPersonalInfo) {
        console.log('[PASSWORD SETUP] User needs personal info, navigating to PersonalInfo');
        // Get account type from SecureStore
        const lastAccountType = await SecureStore.getItemAsync('lastAccountType');
        (navigation as any).replace('PersonalInfo', { accountType: lastAccountType || 'student' });
      } else {
        console.log('[PASSWORD SETUP] User has all info, App.tsx will navigate to main app');
        // User has all info, App.tsx will automatically switch to MainNavigator
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to set PIN';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    Alert.alert(
      'Skip PIN Setup?',
      'You can set a PIN later in settings. You\'ll need to use OTP login for now.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: async () => {
            // Still bind device even if skipping PIN
            try {
              let deviceId: string | null = null;
              if (Platform.OS === 'android') {
                deviceId = Application.getAndroidId() || null;
              } else {
                deviceId = await Application.getIosIdForVendorAsync();
              }
              
              const deviceName = Platform.OS === 'ios' ? 'iOS Device' : 'Android Device';
              
              await apiClient.post('/auth/bind-device', {
                deviceId: deviceId || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                deviceName,
                platform: Platform.OS,
              });
              console.log('[PASSWORD SETUP] Device bound successfully (skipped PIN)');
            } catch (deviceError: any) {
              console.error('[PASSWORD SETUP] Device binding failed:', deviceError);
            }
            
            // Update user state
            try {
              const userResponse = await apiClient.get('/me');
              const userData = userResponse.data?.data || userResponse.data;
              updateUser(userData);
              
              // Clear needsPinSetup flag
              useAuthStore.getState().setNeedsPinSetup(false);
              
              // If user doesn't have a name, navigate to ProfileSetup
              if (!userData?.name || userData.name.trim().length < 2) {
                console.log('[PASSWORD SETUP] User skipped PIN but has no name, navigating to ProfileSetup');
                (navigation as any).replace('ProfileSetup');
              } else {
                console.log('[PASSWORD SETUP] User skipped PIN but has name, App.tsx will navigate to main app');
                // User has name, App.tsx will automatically switch to MainNavigator
              }
            } catch (error) {
              console.error('[PASSWORD SETUP] Failed to fetch user:', error);
              useAuthStore.getState().setNeedsPinSetup(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isPasswordReset ? 'Reset Your PIN' : 'Set Your PIN'}</Text>
      <Text style={styles.subtitle}>
        {isPasswordReset 
          ? 'Enter a new PIN (4-6 digits) to replace your current one.'
          : 'Create a secure PIN (4-6 digits) for quick login. This will also bind your device for faster access.'}
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter PIN (4-6 digits)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          keyboardType={password.length <= 6 ? 'number-pad' : 'default'}
          maxLength={20}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={styles.eyeButtonText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Confirm PIN"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          keyboardType={confirmPassword.length <= 6 ? 'number-pad' : 'default'}
          maxLength={20}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Text style={styles.eyeButtonText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSetPassword}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? (isPasswordReset ? 'Resetting PIN...' : 'Setting PIN...') : (isPasswordReset ? 'Reset PIN' : 'Set PIN')}</Text>
      </TouchableOpacity>

      {!isPasswordReset && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={loading}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F5F7FB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
  },
  eyeButtonText: {
    fontSize: 20,
  },
  button: {
    backgroundColor: '#5C7AEA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 20,
    padding: 10,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#5C7AEA',
    fontSize: 16,
    fontWeight: '500',
  },
});

