import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import apiClient from '../../api/client';

interface Country {
  id: string;
  name: string;
  code: string | null;
}

export default function RequestUniversityScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { email, domain, accountType, institutionType } = route.params as { 
    email: string; 
    domain: string;
    accountType?: 'student' | 'professional';
    institutionType?: 'university' | 'organization' | 'both';
  };

  const isProfessional = accountType === 'professional';
  const isBoth = institutionType === 'both';
  const institutionLabel = isProfessional ? 'Institution' : 'University';
  const institutionPlaceholder = isProfessional 
    ? (isBoth ? 'e.g., North South University or BAT Bangladesh' : 'e.g., BAT Bangladesh')
    : 'e.g., North South University';

  const [formData, setFormData] = useState({
    institutionName: '',
    countryId: '',
    studentEmail: email || '',
  });
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [showCountryModal, setShowCountryModal] = useState(false);

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      const response = await apiClient.get('/country/active');
      console.log('[REQUEST_UNIVERSITY] API Response:', response);
      // Handle nested response structure: response.data.data.data or response.data.data
      const data = response.data?.data?.data || response.data?.data || response.data || [];
      console.log('[REQUEST_UNIVERSITY] Extracted data:', data);
      const countriesArray = Array.isArray(data) ? data : [];
      console.log('[REQUEST_UNIVERSITY] Countries array length:', countriesArray.length);
      setCountries(countriesArray);
      if (countriesArray.length === 0) {
        console.warn('[REQUEST_UNIVERSITY] No active countries found');
      }
    } catch (error) {
      console.error('[REQUEST_UNIVERSITY] Failed to load countries:', error);
      Alert.alert('Error', 'Failed to load countries. Please try again.');
    } finally {
      setLoadingCountries(false);
    }
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setFormData({ ...formData, countryId: country.id });
    setShowCountryModal(false);
  };

  const handleSubmit = async () => {
    if (!formData.institutionName || !formData.countryId || !formData.studentEmail) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!formData.studentEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/request-institution', formData);
      const successMessage = isProfessional
        ? 'Your institution request has been submitted successfully. Our admin team will review it and add your institution soon. You will be notified via email once it\'s approved.'
        : 'Your university request has been submitted successfully. Our admin team will review it and add your university soon. You will be notified via email once it\'s approved.';
      
      Alert.alert(
        'Request Submitted',
        successMessage,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to submit request';
      
      // Handle specific error cases with user-friendly messages
      if (errorMessage.includes('already pending') || errorMessage.includes('already exists')) {
        const pendingMessage = isProfessional
          ? 'A request for this institution has already been submitted and is currently under review. You will be notified via email once it\'s approved. Please check your email for updates.'
          : 'A request for this university has already been submitted and is currently under review. You will be notified via email once it\'s approved. Please check your email for updates.';
        
        Alert.alert(
          'Request Already Submitted',
          pendingMessage,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else if (errorMessage.includes('already exists in our system')) {
        const existsMessage = isProfessional
          ? 'This institution is already in our system. Please try logging in with your organization or university email.'
          : 'This university is already in our system. Please try logging in with your university email.';
        
        Alert.alert(
          isProfessional ? 'Institution Already Exists' : 'University Already Exists',
          existsMessage,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
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
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Request {institutionLabel}</Text>
      <Text style={styles.subtitle}>
        {isProfessional
          ? 'Your organization or university is not in our system. Please provide the following information to request it to be added.'
          : 'Your university is not in our system. Please provide the following information to request it to be added.'}
      </Text>

      <Text style={styles.label}>{institutionLabel} Name *</Text>
      <TextInput
        style={styles.input}
        placeholder={institutionPlaceholder}
        value={formData.institutionName}
        onChangeText={(text) => setFormData({ ...formData, institutionName: text })}
      />

      <Text style={styles.label}>Country *</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowCountryModal(true)}
      >
        <Text style={selectedCountry ? styles.inputText : styles.placeholderText}>
          {selectedCountry ? selectedCountry.name : 'Select country'}
        </Text>
      </TouchableOpacity>

      {/* Country Selection Modal */}
      <Modal
        visible={showCountryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity
                onPress={() => setShowCountryModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            {loadingCountries ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#5C7AEA" />
                <Text style={styles.loadingText}>Loading countries...</Text>
              </View>
            ) : (
              <FlatList
                data={countries}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedCountry?.id === item.id && styles.modalItemSelected,
                    ]}
                    onPress={() => handleCountrySelect(item)}
                  >
                    <Text style={styles.modalItemText}>{item.name}</Text>
                    {item.code && (
                      <Text style={styles.modalItemSubtext}>{item.code}</Text>
                    )}
                    {selectedCountry?.id === item.id && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No active countries available</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      <Text style={styles.label}>Your Email *</Text>
      <TextInput
        style={styles.input}
        placeholder={isProfessional ? "your.email@organization.com or your.email@university.edu" : "student@university.edu"}
        value={formData.studentEmail}
        onChangeText={(text) => setFormData({ ...formData, studentEmail: text })}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!email} // If email was passed, make it read-only
      />
      {domain && (
        <Text style={styles.domainHint}>Domain: {domain}</Text>
      )}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Submitting...' : 'Submit Request'}</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Note: Your request will be reviewed by our admin team. You will be notified once your {institutionLabel.toLowerCase()} is added to the system.
      </Text>
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
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 16,
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#666',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItemSelected: {
    backgroundColor: '#f0f4ff',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  modalItemSubtext: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  checkmark: {
    fontSize: 18,
    color: '#5C7AEA',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  domainHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#5C7AEA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
    lineHeight: 18,
  },
});

