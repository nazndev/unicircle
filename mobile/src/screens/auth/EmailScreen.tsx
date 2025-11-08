import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';

export default function EmailScreen() {
  const navigation = useNavigation();
  const { passwordLogin } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [universityName, setUniversityName] = useState<string | null>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [checkingUniversity, setCheckingUniversity] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const userCheckTimer = useRef<NodeJS.Timeout | null>(null);

  // Load last email on mount
  useEffect(() => {
    loadLastEmail();
  }, []);

  const loadLastEmail = async () => {
    try {
      const lastEmail = await SecureStore.getItemAsync('lastEmail');
      if (lastEmail) {
        console.log('[EmailScreen] Loading last email:', lastEmail);
        setEmail(lastEmail);
        // Check if user exists and has password (this will trigger the useEffect)
        // The useEffect will automatically check and show password login if available
      }
    } catch (error) {
      console.error('[EmailScreen] Error loading last email:', error);
    }
  };

  // Check university as user types (debounced)
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const emailDomain = email.includes('@') ? email.split('@')[1] : null;
    
    if (emailDomain && emailDomain.length > 0) {
      setCheckingUniversity(true);
      debounceTimer.current = setTimeout(async () => {
        try {
          const response = await apiClient.get(`/university/check-domain?domain=${encodeURIComponent(emailDomain)}`);
          const data = response.data?.data || response.data;
          if (data?.found && data?.university) {
            setUniversityName(data.university.name);
          } else {
            setUniversityName(null);
          }
        } catch (error) {
          // Silently fail - user can still proceed
          setUniversityName(null);
        } finally {
          setCheckingUniversity(false);
        }
      }, 500); // 500ms debounce
    } else {
      setUniversityName(null);
      setCheckingUniversity(false);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [email]);

  // Check user status when email is entered (debounced)
  useEffect(() => {
    if (userCheckTimer.current) {
      clearTimeout(userCheckTimer.current);
    }

    if (email && email.includes('@') && email.length > 5) {
      setCheckingUser(true);
      userCheckTimer.current = setTimeout(async () => {
        try {
          const response = await apiClient.post('/auth/check-user', { email });
          const data = response.data?.data || response.data;
          
          setUserExists(data?.exists || false);
          setHasPassword(data?.hasPassword || false);
          
          // Auto-show password login if user exists, is verified, and has password
          if (data?.exists && data?.isVerified && data?.hasPassword) {
            setShowPasswordLogin(true);
            setIsReturningUser(false); // Don't show "incomplete registration" message for users with passwords
            console.log('[EmailScreen] Auto-showing password login for returning user');
          } else if (data?.exists && !data?.isVerified) {
            // User exists but registration incomplete
            setShowPasswordLogin(false);
            setIsReturningUser(true);
          } else {
            setShowPasswordLogin(false);
            setIsReturningUser(false);
          }
        } catch (error) {
          // Silently fail - assume user doesn't exist
          setUserExists(false);
          setHasPassword(false);
          setShowPasswordLogin(false);
        } finally {
          setCheckingUser(false);
        }
      }, 800); // 800ms debounce for user check
    } else {
      setUserExists(null);
      setHasPassword(null);
      setShowPasswordLogin(false);
      setCheckingUser(false);
    }

    return () => {
      if (userCheckTimer.current) {
        clearTimeout(userCheckTimer.current);
      }
    };
  }, [email]);

  const handlePasswordLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      await passwordLogin(email, password);
      // App.tsx will automatically switch to MainNavigator when isAuthenticated becomes true
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      if (errorMessage.includes('Password not set')) {
        setShowPasswordLogin(false);
        Alert.alert('Password Not Set', 'Please use OTP login to set your password first.');
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    // EmailScreen is specifically for student registration
    // If user wants a different account type, they should go through ChooseTypeScreen
    // So we always proceed with student registration here
    sendCodeForStudent();
  };

  const sendCodeForStudent = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    setIsReturningUser(false);
    setShowPasswordLogin(false);
    try {
      const response = await apiClient.post('/auth/request-code', { email });
      const data = response.data?.data || response.data;
      const universityName = data?.universityName || response.data?.universityName;
      const isReturning = data?.isReturningUser || response.data?.isReturningUser;
      
      if (universityName) {
        setUniversityName(universityName);
      }
      
      if (isReturning) {
        setIsReturningUser(true);
      }
      
      (navigation as any).navigate('OtpVerify', { email });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send code';
      if (errorMessage.includes('not recognized')) {
        // Show option to request university
        Alert.alert(
          'University Not Found',
          'Your university is not in our system yet. Would you like to request it to be added?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Request University',
              onPress: () => {
                const domain = email.split('@')[1];
                (navigation as any).navigate('RequestUniversity', { email, domain });
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Your University Email</Text>
      <Text style={styles.subtitle}>We'll send you a verification code</Text>
      <TouchableOpacity
        style={styles.changeAccountTypeButton}
        onPress={() => {
          (navigation as any).navigate('ChooseType');
        }}
      >
        <Text style={styles.changeAccountTypeText}>Not a student? Choose account type</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="student@university.edu"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setIsReturningUser(false);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoFocus
      />
      {checkingUniversity && (
        <Text style={styles.checkingText}>Checking university...</Text>
      )}
      {universityName && !checkingUniversity && (
        <View style={styles.universityBadge}>
          <Text style={styles.universityText}>✓ {universityName}</Text>
        </View>
      )}
      {isReturningUser && (
        <View style={styles.returningUserBadge}>
          <Text style={styles.returningUserText}>
            Welcome back! We noticed you've tried to register before. We've sent a new verification code to complete your registration.
          </Text>
        </View>
      )}
      
      {showPasswordLogin ? (
        <>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter password or PIN"
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
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handlePasswordLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login with Password'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => setShowPasswordLogin(false)}
          >
            <Text style={styles.linkButtonText}>Use OTP instead</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRequestCode}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Code'}</Text>
          </TouchableOpacity>
          {/* Only show "Login with Password" if user exists, is verified, and has password */}
          {userExists && hasPassword && !checkingUser && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => {
                setShowPasswordLogin(true);
              }}
              disabled={loading}
            >
              <Text style={styles.linkButtonText}>Login with Password</Text>
            </TouchableOpacity>
          )}
        </>
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
    fontSize: 16,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 20,
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
  linkButton: {
    marginTop: 15,
    padding: 10,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#5C7AEA',
    fontSize: 14,
    fontWeight: '500',
  },
  universityBadge: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#27AE60',
  },
  universityText: {
    color: '#27AE60',
    fontSize: 14,
    fontWeight: '600',
  },
  checkingText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 10,
    textAlign: 'center',
  },
  returningUserBadge: {
    backgroundColor: '#FFF3CD',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  returningUserText: {
    color: '#856404',
    fontSize: 13,
    lineHeight: 18,
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
  changeAccountTypeButton: {
    marginBottom: 15,
    padding: 10,
    alignItems: 'center',
  },
  changeAccountTypeText: {
    color: '#5C7AEA',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

