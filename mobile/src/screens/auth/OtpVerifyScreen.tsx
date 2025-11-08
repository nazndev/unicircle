import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';

export default function OtpVerifyScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { login } = useAuthStore();
  const email = (route.params as any)?.email || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await login(email, code);
      // Check if user has password set
      const hasPassword = response?.hasPassword ?? false;
      
      console.log('[OTP VERIFY] Login response:', { hasPassword });
      
      // Always navigate to PIN setup if password is not set
      // This ensures professional flow: OTP → PIN Setup → Dashboard
      if (!hasPassword) {
        console.log('[OTP VERIFY] User has no PIN/password, navigating to PasswordSetup');
        // Use replace to prevent going back to OTP screen
        (navigation as any).replace('PasswordSetup');
      } else {
        console.log('[OTP VERIFY] User has PIN/password, App.tsx will navigate to main app');
        // User has PIN, App.tsx will automatically switch to MainNavigator
        // No need to navigate manually
      }
    } catch (error: any) {
      console.error('[OTP VERIFY] Verification error:', error);
      const errorMessage = error.message || 'Invalid code. Please try again.';
      Alert.alert('Verification Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      await apiClient.post('/auth/request-code', { email });
      Alert.alert('Success', 'A new verification code has been sent to your email');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to resend code';
      Alert.alert('Error', errorMessage);
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Verification Code</Text>
      <Text style={styles.subtitle}>We sent a code to {email}</Text>
      <TextInput
        style={styles.input}
        placeholder="123456"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
      />
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify'}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.resendButton}
        onPress={handleResendCode}
        disabled={resending}
      >
        <Text style={styles.resendButtonText}>
          {resending ? 'Resending...' : "Didn't receive code? Resend"}
        </Text>
      </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 10,
  },
  button: {
    backgroundColor: '#5C7AEA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 20,
    padding: 10,
  },
  resendButtonText: {
    color: '#5C7AEA',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});

