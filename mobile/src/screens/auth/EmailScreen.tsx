import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';

export default function EmailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { passwordLogin } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // Initialize with route params immediately, fallback to 'student' if null
  // Read route params inside useState to ensure we get the latest value
  const [accountType, setAccountType] = useState<string>(() => {
    const routeAccountType = (route.params as any)?.accountType;
    console.log('[EmailScreen] Initial accountType from route params:', routeAccountType);
    return routeAccountType || 'student';
  }); // 'student' | 'professional'
  const [universityName, setUniversityName] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [institutionType, setInstitutionType] = useState<'university' | 'organization' | null>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [checkingUniversity, setCheckingUniversity] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [existingProfileMode, setExistingProfileMode] = useState<string | null>(null);
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const [forcePinLogin, setForcePinLogin] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const userCheckTimer = useRef<NodeJS.Timeout | null>(null);

  // Load account type from route params or SecureStore
  useEffect(() => {
    loadAccountType();
  }, []);

  // Update account type when screen comes into focus (e.g., when navigating from ChooseTypeScreen)
  useFocusEffect(
    React.useCallback(() => {
      const currentRouteAccountType = (route.params as any)?.accountType;
      console.log('[EmailScreen] Screen focused, route accountType:', currentRouteAccountType, 'current state:', accountType);
      if (currentRouteAccountType) {
        console.log('[EmailScreen] Updating account type from route params:', currentRouteAccountType);
        setAccountType(currentRouteAccountType);
      } else {
        // If no route param, check SecureStore
        SecureStore.getItemAsync('lastAccountType').then((saved) => {
          if (saved && saved !== accountType) {
            console.log('[EmailScreen] Updating account type from SecureStore:', saved);
            setAccountType(saved);
          }
        });
      }
    }, [route.params])
  );

  // Also update immediately when route params change (for immediate UI update)
  useEffect(() => {
    const currentRouteAccountType = (route.params as any)?.accountType;
    if (currentRouteAccountType && currentRouteAccountType !== accountType) {
      console.log('[EmailScreen] Route params changed, updating accountType immediately:', currentRouteAccountType);
      setAccountType(currentRouteAccountType);
    }
  }, [(route.params as any)?.accountType]);

  // Update navigation title dynamically based on accountType
  useLayoutEffect(() => {
    const title = accountType === 'professional' ? 'Enter Professional Email' : 'Enter University Email';
    (navigation as any).setOptions({ title });
  }, [accountType, navigation]);

  const loadAccountType = async () => {
    // Check route params first (they take priority)
    const routeAccountType = (route.params as any)?.accountType;
    if (routeAccountType) {
      console.log('[EmailScreen] Account type from route params:', routeAccountType);
      setAccountType(routeAccountType);
      return;
    }
    
    // If account type not in route params, try to load from SecureStore
    try {
      const savedAccountType = await SecureStore.getItemAsync('lastAccountType');
      if (savedAccountType) {
        console.log('[EmailScreen] Loaded account type from SecureStore:', savedAccountType);
        setAccountType(savedAccountType);
      } else {
        console.log('[EmailScreen] No account type found, defaulting to student');
        setAccountType('student'); // Default to student if nothing is set
      }
    } catch (error) {
      console.error('[EmailScreen] Error loading account type:', error);
      setAccountType('student'); // Default to student on error
    }
  };

  // Load last email on mount
  useEffect(() => {
    loadLastEmail();
  }, []);

  const loadLastEmail = async () => {
    try {
      // Only load last email if we're not coming from ChooseType screen
      // This prevents prefilling when user explicitly chooses a new account type
      const routeAccountType = (route.params as any)?.accountType;
      if (!routeAccountType) {
        const lastEmail = await SecureStore.getItemAsync('lastEmail');
        if (lastEmail) {
          console.log('[EmailScreen] Loading last email:', lastEmail);
          setEmail(lastEmail);
          // Check if user exists and has password (this will trigger the useEffect)
          // The useEffect will automatically check and show password login if available
        }
      } else {
        // If coming from ChooseType, clear the email to start fresh
        console.log('[EmailScreen] Starting fresh for account type:', routeAccountType);
        setEmail('');
      }
    } catch (error) {
      console.error('[EmailScreen] Error loading last email:', error);
    }
  };

  // Check university or organization as user types (debounced)
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const emailDomain = email.includes('@') ? email.split('@')[1] : null;
    
    if (emailDomain && emailDomain.length > 0) {
      setCheckingUniversity(true);
      debounceTimer.current = setTimeout(async () => {
        try {
          // First check university
          const universityResponse = await apiClient.get(`/university/check-domain?domain=${encodeURIComponent(emailDomain)}`);
          const universityData = universityResponse.data?.data || universityResponse.data;
          if (universityData?.found && universityData?.university) {
            setUniversityName(universityData.university.name);
            setOrganizationName(null);
            setInstitutionType('university');
          } else {
            // If not a university, check organization only for professional flow
            if (accountType === 'professional') {
              try {
                const orgResponse = await apiClient.get(`/organization/check-domain?domain=${encodeURIComponent(emailDomain)}`);
                const orgData = orgResponse.data?.data || orgResponse.data;
                if (orgData?.found && orgData?.organization) {
                  setOrganizationName(orgData.organization.name);
                  setUniversityName(null);
                  setInstitutionType('organization');
                } else {
                  setUniversityName(null);
                  setOrganizationName(null);
                  setInstitutionType(null);
                }
              } catch (orgError) {
                // Organization endpoint might not exist yet, silently fail
                setUniversityName(null);
                setOrganizationName(null);
                setInstitutionType(null);
              }
            } else {
              // Student flow: don't check organizations
              setUniversityName(null);
              setOrganizationName(null);
              setInstitutionType(null);
            }
          }
        } catch (error) {
          // Silently fail - user can still proceed
          setUniversityName(null);
          setOrganizationName(null);
          setInstitutionType(null);
        } finally {
          setCheckingUniversity(false);
        }
      }, 500); // 500ms debounce
    } else {
      setUniversityName(null);
      setOrganizationName(null);
      setInstitutionType(null);
      setCheckingUniversity(false);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [email, accountType]);

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
          setExistingProfileMode(data?.profileMode || null);
          
          console.log('[EmailScreen] User check result:', {
            exists: data?.exists,
            isVerified: data?.isVerified,
            hasPassword: data?.hasPassword,
            profileMode: data?.profileMode,
            accountType,
          });
          
          // Check for account type mismatch
          const hasAccountTypeMismatch = data?.exists && data?.profileMode && 
            ((data.profileMode === 'professional' && accountType === 'student') ||
             (data.profileMode === 'student' && accountType === 'professional'));
          
          // Auto-show password login if user exists, is verified, and has password
          if (data?.exists && data?.isVerified && data?.hasPassword && !hasAccountTypeMismatch) {
            setShowPasswordLogin(false);
            setIsReturningUser(false); // Don't show "incomplete registration" message for users with passwords
            setForcePinLogin(true);
            SecureStore.setItemAsync('lastEmail', email).catch(() => {});
            console.log('[EmailScreen] PIN login required for returning user with password');
          } else if (data?.exists && !data?.isVerified && !hasAccountTypeMismatch) {
            // User exists but registration incomplete (and no account type mismatch)
            setShowPasswordLogin(false);
            setIsReturningUser(true);
            setForcePinLogin(false);
            console.log('[EmailScreen] User exists but not verified - showing welcome back message');
          } else if (data?.exists && data?.isVerified && !data?.hasPassword && !hasAccountTypeMismatch) {
            // User exists and is verified but no password set - allow them to send code
            setShowPasswordLogin(false);
            setIsReturningUser(false);
            setForcePinLogin(false);
            console.log('[EmailScreen] User exists and verified but no password - allow send code');
          } else {
            setShowPasswordLogin(false);
            setIsReturningUser(false); // Clear returning user message if there's a mismatch
            setForcePinLogin(false);
            console.log('[EmailScreen] User does not exist or has account type mismatch');
          }
        } catch (error) {
          // Silently fail - assume user doesn't exist
          setUserExists(false);
          setHasPassword(false);
          setShowPasswordLogin(false);
          setForcePinLogin(false);
        } finally {
          setCheckingUser(false);
        }
      }, 800); // 800ms debounce for user check
    } else {
      setUserExists(null);
      setHasPassword(null);
      setExistingProfileMode(null);
      setShowPasswordLogin(false);
      setCheckingUser(false);
    }

    return () => {
      if (userCheckTimer.current) {
        clearTimeout(userCheckTimer.current);
      }
    };
  }, [email, accountType]);

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

    // If this email is already a professional account, block student flow
    if (userExists && existingProfileMode === 'professional' && accountType === 'student') {
      Alert.alert(
        'Registered as Professional',
        'This email is already registered as a professional account. Please change account type to continue.',
        [
          {
            text: 'Change Account Type',
            onPress: () => (navigation as any).navigate('ChooseType'),
          },
          { text: 'OK' },
        ],
      );
      return;
    }

    // If this email is already a student account, block professional flow
    if (userExists && existingProfileMode === 'student' && accountType === 'professional') {
      Alert.alert(
        'Registered as Student',
        'This email is already registered as a student account. Please change account type to continue.',
        [
          {
            text: 'Change Account Type',
            onPress: () => (navigation as any).navigate('ChooseType'),
          },
          { text: 'OK' },
        ],
      );
      return;
    }

    if (forcePinLogin) {
      Alert.alert(
        'Login with PIN',
        'This email already has a PIN set. Please login using your PIN.',
        [
          {
            text: 'Go to PIN Login',
            onPress: async () => {
              await SecureStore.setItemAsync('lastEmail', email);
              (navigation as any).navigate('PinLogin', { email });
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    setLoading(true);
    setIsReturningUser(false);
    setShowPasswordLogin(false);
    try {
      const response = await apiClient.post('/auth/request-code', { email });
      const data = response.data?.data || response.data;
      const universityName = data?.universityName || response.data?.universityName;
      const organizationName = data?.organizationName || response.data?.organizationName;
      const institutionType = data?.institutionType || response.data?.institutionType;
      const isReturning = data?.isReturningUser || response.data?.isReturningUser;
      
      if (universityName) {
        setUniversityName(universityName);
        setOrganizationName(null);
        setInstitutionType('university');
      } else if (organizationName) {
        setOrganizationName(organizationName);
        setUniversityName(null);
        setInstitutionType('organization');
      }
      
      if (isReturning) {
        setIsReturningUser(true);
      }
      
      // Pass detected institution info to next screen
      (navigation as any).navigate('OtpVerify', { 
        email,
        universityName: universityName || data?.universityName,
        organizationName: organizationName || data?.organizationName,
        institutionType: institutionType || data?.institutionType,
        accountType,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send code';
      if (errorMessage.includes('not recognized')) {
        // Show appropriate message based on account type
        const isProfessional = accountType === 'professional';
        const institutionType = isProfessional ? 'organization or university' : 'university';
        const title = isProfessional ? 'Institution Not Found' : 'University Not Found';
        const message = isProfessional 
          ? 'Your organization or university is not in our system yet. Would you like to request it to be added?'
          : 'Your university is not in our system yet. Would you like to request it to be added?';
        const buttonText = isProfessional ? 'Request Institution' : 'Request University';
        
        Alert.alert(
          title,
          message,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: buttonText,
              onPress: () => {
                const domain = email.split('@')[1];
                (navigation as any).navigate('RequestUniversity', { 
                  email, 
                  domain,
                  accountType,
                  institutionType: isProfessional ? 'both' : 'university',
                });
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

  const handleForgotPin = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email first');
      return;
    }
    try {
      setLoading(true);
      await apiClient.post('/auth/forget-password', { email });
      Alert.alert(
        'Reset Code Sent',
        'A password reset code has been sent to your email. Please check your inbox and use the code to reset your PIN via OTP login.',
        [
          {
            text: 'OK',
            onPress: () => {
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

  // Determine title and placeholder based on account type
  const getTitle = () => {
    console.log('[EmailScreen] getTitle called with accountType:', accountType);
    if (accountType === 'professional') {
      return 'Enter Your Email';
    }
    // Default to student
    return 'Enter Your University Email';
  };

  const getPlaceholder = () => {
    if (accountType === 'professional') {
      return 'email@organization.com or email@university.edu';
    }
    // Default to student
    return 'student@university.edu';
  };

  const getChangeAccountTypeText = () => {
    if (accountType === 'professional') {
      return 'Not a professional? Choose account type';
    }
    // Default to student
    return 'Not a student? Choose account type';
  };


  return (
    <View style={styles.container}>
      <Text style={styles.title}>{getTitle()}</Text>
      <Text style={styles.subtitle}>
        {accountType === 'professional' 
          ? "We'll send you a verification code to your organization or university email"
          : "We'll send you a verification code"}
      </Text>
      <TouchableOpacity
        style={styles.changeAccountTypeButton}
        onPress={() => {
          (navigation as any).navigate('ChooseType');
        }}
      >
        <Text style={styles.changeAccountTypeText}>{getChangeAccountTypeText()}</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder={getPlaceholder()}
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setIsReturningUser(false);
          setForcePinLogin(false);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoFocus
      />
      {checkingUniversity && (
        <Text style={styles.checkingText}>
          {accountType === 'professional' ? 'Checking email domain...' : 'Checking university...'}
        </Text>
      )}
      {universityName && !checkingUniversity && (
        <View style={styles.universityBadge}>
          <Text style={styles.universityText}>✓ {universityName}</Text>
        </View>
      )}
      {organizationName && !checkingUniversity && accountType === 'professional' && (
        <View style={styles.universityBadge}>
          <Text style={styles.universityText}>✓ {organizationName}</Text>
        </View>
      )}
      {userExists === true && existingProfileMode === 'professional' && accountType === 'student' && !checkingUser && (
        <View style={styles.warningBadge}>
          <Text style={styles.warningText}>
            ⚠️ This email is already registered as a professional account. Please change account type to continue.
          </Text>
        </View>
      )}
      {userExists === true && existingProfileMode === 'student' && accountType === 'professional' && !checkingUser && (
        <View style={styles.warningBadge}>
          <Text style={styles.warningText}>
            ⚠️ This email is already registered as a student account. Please change account type to continue.
          </Text>
        </View>
      )}
      {isReturningUser && 
       !(userExists === true && existingProfileMode === 'professional' && accountType === 'student') &&
       !(userExists === true && existingProfileMode === 'student' && accountType === 'professional') && (
        <View style={styles.returningUserBadge}>
          <Text style={styles.returningUserText}>
            Welcome back! We noticed you've tried to register before. We've sent a new verification code to complete your registration.
          </Text>
        </View>
      )}
      
      {forcePinLogin ? (
        <View style={styles.pinLoginContainer}>
          <Text style={styles.pinLoginTitle}>PIN Login Required</Text>
          <Text style={styles.pinLoginMessage}>
            This email already has a PIN set. Please login using your PIN or reset it if you forgot.
          </Text>
          <TouchableOpacity
            style={styles.pinButton}
            onPress={async () => {
              await SecureStore.setItemAsync('lastEmail', email);
              (navigation as any).navigate('PinLogin', { email });
            }}
            disabled={loading}
          >
            <Text style={styles.pinButtonText}>Login with PIN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pinLinkButton}
            onPress={handleForgotPin}
            disabled={loading}
          >
            <Text style={styles.pinLinkButtonText}>Forgot PIN?</Text>
          </TouchableOpacity>
        </View>
      ) : showPasswordLogin ? (
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
            <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={handleForgotPin}
            disabled={loading}
          >
            <Text style={styles.linkButtonText}>Forgot PIN?</Text>
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
            style={[
              styles.button, 
              (loading || 
                (userExists === true && existingProfileMode === 'professional' && accountType === 'student') ||
                (userExists === true && existingProfileMode === 'student' && accountType === 'professional')
              ) && styles.buttonDisabled
            ]}
            onPress={handleRequestCode}
            disabled={
              loading || 
              (userExists === true && existingProfileMode === 'professional' && accountType === 'student') ||
              (userExists === true && existingProfileMode === 'student' && accountType === 'professional')
            }
          >
            <Text style={styles.buttonText}>
              {loading 
                ? 'Sending...' 
                : (userExists === true && existingProfileMode === 'professional' && accountType === 'student') || 
                  (userExists === true && existingProfileMode === 'student' && accountType === 'professional')
                  ? 'Change Account Type First' 
                  : 'Send Code'}
            </Text>
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
  pinLoginContainer: {
    backgroundColor: '#EEF2FF',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C5D0FF',
    marginTop: 10,
  },
  pinLoginTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3949AB',
    marginBottom: 8,
  },
  pinLoginMessage: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 16,
  },
  pinButton: {
    backgroundColor: '#5C7AEA',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pinLinkButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  pinLinkButtonText: {
    color: '#5C7AEA',
    fontSize: 14,
    fontWeight: '500',
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
  warningBadge: {
    backgroundColor: '#FFE5E5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  warningText: {
    color: '#CC0000',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});

