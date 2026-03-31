import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';

export default function PinLoginScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { passwordLogin, updateUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const routeEmail = (route.params as any)?.email;
    if (routeEmail) {
      setEmail(routeEmail);
      SecureStore.setItemAsync('lastEmail', routeEmail).catch(() => {});
      return;
    }
    // Load last email from SecureStore
    const loadLastEmail = async () => {
      try {
        const lastEmail = await SecureStore.getItemAsync('lastEmail');
        if (lastEmail) {
          setEmail(lastEmail);
        }
      } catch (error) {
        console.error('[PIN LOGIN] Error loading last email:', error);
      }
    };
    loadLastEmail();
  }, [route.params]);

  const handlePasswordLogin = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!password || password.length < 4) {
      Alert.alert('Error', 'Please enter your PIN (at least 4 characters)');
      return;
    }

    setLoading(true);
    try {
      await passwordLogin(email, password);
      // Navigation will be handled by App.tsx based on auth state
      // Small delay to ensure state is updated
      setTimeout(() => {
        // App.tsx will handle navigation automatically
      }, 100);
    } catch (error: any) {
      // Error message is already user-friendly from authStore
      const errorMessage = error.message || error.response?.data?.message || 'Invalid email or PIN. Please try again.';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgetPin = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email first');
      return;
    }
    try {
      setLoading(true);
      await apiClient.post('/auth/forget-password', { email });
      Alert.alert(
        'Reset Code Sent',
        'A password reset code has been sent to your email. Please check your inbox and use the code to reset your password via OTP login.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to OTP verify screen with password reset flag
              (navigation as any).navigate('OtpVerify', {
                email,
                isPasswordReset: true,
              });
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleUseDifferentAccount = () => {
    // Clear stored email and navigate to Welcome screen
    SecureStore.deleteItemAsync('lastEmail').then(() => {
      (navigation as any).navigate('Welcome');
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Enter your PIN to continue</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="your.email@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>PIN</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your PIN"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            keyboardType={password.length <= 6 ? 'number-pad' : 'default'}
            maxLength={20}
            autoFocus
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.eyeButtonText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handlePasswordLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={handleForgetPin}
        disabled={loading}
      >
        <Text style={styles.linkButtonText}>Forgot PIN?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={handleUseDifferentAccount}
        disabled={loading}
      >
        <Text style={styles.linkButtonText}>Use Different Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F7FB',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  eyeButton: {
    padding: 15,
  },
  eyeButtonText: {
    fontSize: 18,
  },
  button: {
    backgroundColor: '#5C7AEA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#5C7AEA',
    fontSize: 14,
    fontWeight: '600',
  },
});

