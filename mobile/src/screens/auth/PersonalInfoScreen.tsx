import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Linking, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';

interface RegistrationRequirements {
  minAgeStudent: number | null;
  maxAgeStudent: number | null;
  minAgeProfessional: number | null;
  maxAgeProfessional: number | null;
  termsMessage: string | null;
  termsLink: string | null;
}

export default function PersonalInfoScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { updateUser } = useAuthStore();
  const accountType = (route.params as any)?.accountType || 'student'; // 'student' | 'professional'
  const universityName = (route.params as any)?.universityName || null;
  const organizationName = (route.params as any)?.organizationName || null;
  
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingRequirements, setLoadingRequirements] = useState(true);
  const [requirements, setRequirements] = useState<RegistrationRequirements>({
    minAgeStudent: null,
    maxAgeStudent: null,
    minAgeProfessional: null,
    maxAgeProfessional: null,
    termsMessage: null,
    termsLink: null,
  });

  useEffect(() => {
    loadRequirements();
  }, []);

  const loadRequirements = async () => {
    try {
      const response = await apiClient.get('/settings/registration-requirements');
      const data = response.data?.data || response.data;
      setRequirements(data || {});
    } catch (error) {
      console.error('Failed to load registration requirements:', error);
    } finally {
      setLoadingRequirements(false);
    }
  };

  const calculateAge = (dob: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const validateAge = (dob: Date): { valid: boolean; message?: string } => {
    const age = calculateAge(dob);
    const minAge = accountType === 'student' ? requirements.minAgeStudent : requirements.minAgeProfessional;
    const maxAge = accountType === 'student' ? requirements.maxAgeStudent : requirements.maxAgeProfessional;

    if (minAge !== null && age < minAge) {
      return {
        valid: false,
        message: `You must be at least ${minAge} years old to register as a ${accountType}.`,
      };
    }

    if (maxAge !== null && age > maxAge) {
      return {
        valid: false,
        message: `You must be ${maxAge} years old or younger to register as a ${accountType}.`,
      };
    }

    return { valid: true };
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'dismissed') {
        return; // User cancelled
      }
    }
    if (selectedDate) {
      setDateOfBirth(selectedDate);
      // Validate age immediately
      const validation = validateAge(selectedDate);
      if (!validation.valid) {
        Alert.alert('Age Restriction', validation.message);
      }
    }
  };

  const showDatePickerModal = () => {
    if (Platform.OS === 'ios') {
      setShowDatePicker(true);
    } else {
      // Android: show native date picker
      setShowDatePicker(true);
    }
  };

  const handleContinue = async () => {
    if (!name || name.trim().length < 2) {
      Alert.alert('Error', 'Please enter your name (at least 2 characters)');
      return;
    }

    if (!dateOfBirth) {
      Alert.alert('Error', 'Please select your date of birth');
      return;
    }

    // Validate age
    const validation = validateAge(dateOfBirth);
    if (!validation.valid) {
      Alert.alert('Age Restriction', validation.message);
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Terms Required', 'Please accept the terms and conditions to continue');
      return;
    }

    setLoading(true);
    try {
      // Update user profile with name and DOB
      const response = await apiClient.put('/me', {
        name: name.trim(),
        dateOfBirth: dateOfBirth.toISOString(),
      });
      
      const userData = response.data?.data || response.data;
      updateUser(userData);

      // After saving personal info, navigate to password setup if password not set
      try {
        const userResponse = await apiClient.get('/me');
        const userData = userResponse.data?.data || userResponse.data;
        const hasPassword = !!userData?.passwordHash;
        
        if (!hasPassword) {
          console.log('[PERSONAL INFO] User has no password, navigating to PasswordSetup');
          (navigation as any).replace('PasswordSetup');
        } else {
          console.log('[PERSONAL INFO] User has password, App.tsx will navigate to main app');
          // User has everything, App.tsx will automatically switch to MainNavigator
        }
      } catch (error) {
        // If we can't check, proceed to password setup
        console.error('[PERSONAL INFO] Failed to check password status:', error);
        (navigation as any).replace('PasswordSetup');
      }
    } catch (error: any) {
      console.error('Failed to save personal info:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save information');
    } finally {
      setLoading(false);
    }
  };

  const openTermsLink = () => {
    if (requirements.termsLink) {
      Linking.openURL(requirements.termsLink);
    }
  };

  const minAge = accountType === 'student' ? requirements.minAgeStudent : requirements.minAgeProfessional;
  const maxAge = accountType === 'student' ? requirements.maxAgeStudent : requirements.maxAgeProfessional;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Personal Information</Text>
      <Text style={styles.subtitle}>
        Please provide your name and date of birth to complete your registration.
      </Text>

      {/* Show detected university for students */}
      {accountType === 'student' && universityName && (
        <View style={styles.institutionBadge}>
          <Text style={styles.institutionLabel}>University</Text>
          <Text style={styles.institutionName}>✓ {universityName}</Text>
        </View>
      )}

      {/* Show detected organization for professionals */}
      {accountType === 'professional' && organizationName && (
        <View style={styles.institutionBadge}>
          <Text style={styles.institutionLabel}>Organization</Text>
          <Text style={styles.institutionName}>✓ {organizationName}</Text>
        </View>
      )}

      <Text style={styles.label}>Full Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your full name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Date of Birth *</Text>
      <TouchableOpacity
        style={styles.datePickerButton}
        onPress={showDatePickerModal}
      >
        <Text style={[styles.datePickerText, !dateOfBirth && styles.placeholder]}>
          {dateOfBirth
            ? `${dateOfBirth.toLocaleDateString()} (Age: ${calculateAge(dateOfBirth)})`
            : 'Select your date of birth'}
        </Text>
        <Text style={styles.datePickerArrow}>📅</Text>
      </TouchableOpacity>

      {minAge !== null || maxAge !== null ? (
        <Text style={styles.ageHint}>
          {minAge !== null && maxAge !== null
            ? `Age requirement: ${minAge} - ${maxAge} years`
            : minAge !== null
            ? `Minimum age: ${minAge} years`
            : `Maximum age: ${maxAge} years`}
        </Text>
      ) : null}

      {Platform.OS === 'ios' && showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerModalOverlay}>
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Date of Birth</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (dateOfBirth) {
                      setShowDatePicker(false);
                    } else {
                      Alert.alert('Required', 'Please select your date of birth');
                    }
                  }}
                >
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={dateOfBirth || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 100))}
                />
                {dateOfBirth && (
                  <View style={styles.ageDisplay}>
                    <Text style={styles.ageDisplayText}>
                      Age: {calculateAge(dateOfBirth)} years
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
      
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={dateOfBirth || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 100))}
        />
      )}

      <View style={styles.termsContainer}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setTermsAccepted(!termsAccepted)}
        >
          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
            {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.termsText}>
            I agree to the{' '}
            {requirements.termsLink ? (
              <Text style={styles.termsLink} onPress={openTermsLink}>
                Terms and Conditions
              </Text>
            ) : (
              'Terms and Conditions'
            )}
          </Text>
        </TouchableOpacity>

        {requirements.termsMessage && (
          <TouchableOpacity
            style={styles.termsMessageButton}
            onPress={() => {
              Alert.alert('Terms and Conditions', requirements.termsMessage || '', [
                { text: 'OK' },
                requirements.termsLink
                  ? {
                      text: 'View Full Terms',
                      onPress: openTermsLink,
                    }
                  : { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          >
            <Text style={styles.termsMessageLink}>Read Terms and Conditions</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, (!name || !dateOfBirth || !termsAccepted || loading) && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!name || !dateOfBirth || !termsAccepted || loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Continue'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F7FB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  datePickerButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  placeholder: {
    color: '#999',
  },
  datePickerArrow: {
    fontSize: 20,
  },
  ageHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  termsContainer: {
    marginTop: 24,
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#5C7AEA',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#5C7AEA',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  termsLink: {
    color: '#5C7AEA',
    textDecorationLine: 'underline',
  },
  termsMessageButton: {
    marginTop: 8,
  },
  termsMessageLink: {
    fontSize: 14,
    color: '#5C7AEA',
    textDecorationLine: 'underline',
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
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  datePickerCancel: {
    fontSize: 16,
    color: '#666',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  datePickerDone: {
    fontSize: 16,
    color: '#5C7AEA',
    fontWeight: '600',
  },
  datePickerContainer: {
    padding: 20,
  },
  datePickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  dateInput: {
    backgroundColor: '#F5F7FB',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  datePickerHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  ageDisplay: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    alignItems: 'center',
  },
  ageDisplayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5C7AEA',
  },
  institutionBadge: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#27AE60',
  },
  institutionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  institutionName: {
    fontSize: 16,
    color: '#27AE60',
    fontWeight: '600',
  },
});

