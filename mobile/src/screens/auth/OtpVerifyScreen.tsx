import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import * as SecureStore from 'expo-secure-store';

export default function OtpVerifyScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { login } = useAuthStore();
  const email = (route.params as any)?.email || '';
  const universityName = (route.params as any)?.universityName || null;
  const organizationName = (route.params as any)?.organizationName || null;
  const institutionType = (route.params as any)?.institutionType || null;
  const accountType = (route.params as any)?.accountType || null;
  const isPasswordReset = (route.params as any)?.isPasswordReset || false;
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
      
      // Check account type preference
      const lastAccountType = await SecureStore.getItemAsync('lastAccountType');
      const isProfessional = lastAccountType === 'professional';
      
      const userData = response?.user;
      
      console.log('[OTP VERIFY] Login response:', { 
        hasPassword, 
        lastAccountType, 
        isProfessional,
        hasName: !!userData?.name,
        hasDOB: !!userData?.dateOfBirth
      });
      
      // Check if user needs personal info (name and DOB)
      const needsPersonalInfo = !userData?.name || userData.name.trim().length < 2 || !userData?.dateOfBirth;
      
      // For professionals, check if they need to select organization/university
      if (isProfessional) {
        // Check if user already has organizationId or universityId set
        const hasInstitution = userData?.organizationId || userData?.universityId;
        
        if (!hasInstitution) {
          // Navigate to professional onboarding to select organization/university
          // Pass detected institution info to prefill
          console.log('[OTP VERIFY] Professional needs to select organization/university');
          (navigation as any).replace('ProfessionalOnboarding', { 
            email,
            universityName,
            organizationName,
            institutionType,
          });
          return;
        }
      }
      
      // If this is a password reset flow, navigate to password setup after verification
      if (isPasswordReset) {
        console.log('[OTP VERIFY] Password reset flow - navigating to PasswordSetup');
        (navigation as any).replace('PasswordSetup', {
          isPasswordReset: true,
        });
        return;
      }

      // If user needs personal info, show PersonalInfo screen first
      if (needsPersonalInfo) {
        console.log('[OTP VERIFY] User needs personal info (name/DOB), navigating to PersonalInfo');
        (navigation as any).replace('PersonalInfo', { 
          accountType: lastAccountType || 'student',
          universityName: lastAccountType === 'student' ? universityName : null,
          organizationName: lastAccountType === 'professional' ? organizationName : null,
        });
        return;
      }
      
      // If user has personal info but no password, navigate to password setup
      if (!hasPassword) {
        console.log('[OTP VERIFY] User has personal info but no PIN/password, navigating to PasswordSetup');
        (navigation as any).replace('PasswordSetup');
      } else {
        console.log('[OTP VERIFY] User has all info and PIN/password, App.tsx will navigate to main app');
        // User has everything, App.tsx will automatically switch to MainNavigator
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
      <Text style={styles.title}>
        {isPasswordReset ? 'Enter Password Reset Code' : 'Enter Verification Code'}
      </Text>
      <Text style={styles.subtitle}>
        {isPasswordReset 
          ? `We sent a password reset code to ${email}`
          : `We sent a code to ${email}`}
      </Text>
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

