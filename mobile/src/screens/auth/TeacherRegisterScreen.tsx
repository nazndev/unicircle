import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Modal, FlatList } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../api/client';

interface Country {
  id: string;
  name: string;
  code: string | null;
}

interface University {
  id: string;
  name: string;
  countryId: string;
  country?: Country;
}

export default function TeacherRegisterScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { teacherRegister } = useAuthStore();
  const prefillEmail = (route.params as any)?.prefillEmail || '';
  const [formData, setFormData] = useState({
    fullName: '',
    email: prefillEmail,
    universityId: '',
    department: '',
  });
  const [selectedCountryId, setSelectedCountryId] = useState<string>('');
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [documents, setDocuments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showUniversityModal, setShowUniversityModal] = useState(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    loadCountries();
  }, []);

  useEffect(() => {
    if (selectedCountryId) {
      loadUniversities(selectedCountryId);
    } else {
      setUniversities([]);
      setSelectedUniversity(null);
      setFormData({ ...formData, universityId: '' });
    }
  }, [selectedCountryId]);

  const loadCountries = async () => {
    try {
      const response = await apiClient.get('/university/countries');
      setCountries(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Failed to load countries:', error);
      Alert.alert('Error', 'Failed to load countries');
    } finally {
      setLoadingData(false);
    }
  };

  const loadUniversities = async (countryId: string) => {
    try {
      const response = await apiClient.get(`/university?countryId=${encodeURIComponent(countryId)}`);
      const data = response.data?.data || response.data || [];
      setUniversities(data);
    } catch (error) {
      console.error('Failed to load universities:', error);
      Alert.alert('Error', 'Failed to load universities');
    }
  };

  const checkUniversityDomain = async (domain: string) => {
    try {
      const response = await apiClient.get(`/university/check-domain?domain=${encodeURIComponent(domain)}`);
      const data = response.data?.data || response.data;
      if (data?.found && data?.university) {
        // Auto-select country and university
        const countryId = data.university.country?.id || data.university.countryId;
        if (countryId) {
          setSelectedCountryId(countryId);
          setSelectedUniversity({
            id: data.university.id,
            name: data.university.name,
            countryId: countryId,
            country: data.university.country,
          });
          setFormData({ ...formData, universityId: data.university.id });
          // Load universities for the selected country to ensure dropdown is populated
          await loadUniversities(countryId);
        }
      }
    } catch (error) {
      // Silently fail - user can still manually select
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setLoading(true);
        try {
          // Upload each image to the backend
          const uploadedUrls: string[] = [];
          for (const asset of result.assets) {
            const formData = new FormData();
            const filename = asset.uri.split('/').pop() || 'image.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const mimeType = match ? `image/${match[1]}` : `image/jpeg`;

            formData.append('file', {
              uri: asset.uri,
              name: filename,
              type: mimeType,
            } as any);

            const response = await apiClient.post('/upload/alumni-document', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });

            const uploadedUrl = response.data?.data?.url || response.data?.url || response.data;
            if (uploadedUrl) {
              uploadedUrls.push(uploadedUrl);
            }
          }

          if (uploadedUrls.length > 0) {
            setDocuments([...documents, ...uploadedUrls]);
            Alert.alert('Success', `${uploadedUrls.length} document(s) uploaded successfully`);
          }
        } catch (error: any) {
          console.error('Failed to upload documents:', error);
          Alert.alert('Error', error.response?.data?.message || 'Failed to upload documents');
        } finally {
          setLoading(false);
        }
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountryId(country.id);
    setShowCountryModal(false);
    setSelectedUniversity(null);
    setFormData({ ...formData, universityId: '' });
  };
  
  // Helper to get selected country name
  const selectedCountry = countries.find(c => c.id === selectedCountryId);

  const handleUniversitySelect = (university: University) => {
    setSelectedUniversity(university);
    setFormData({ ...formData, universityId: university.id });
    setShowUniversityModal(false);
  };

  const handleRegister = async () => {
    if (!formData.fullName || !formData.email || !formData.universityId) {
      Alert.alert('Error', 'Please fill all required fields including country and university');
      return;
    }

    // Check if using university email
    const emailDomain = formData.email.split('@')[1];
    const isUniversityEmail = selectedUniversity && emailDomain && 
      selectedUniversity.name && formData.email.toLowerCase().includes(emailDomain.toLowerCase());
    
    // Documents are required only if NOT using university email
    if (!isUniversityEmail && documents.length === 0) {
      Alert.alert(
        'Documents Required',
        'Please upload verification documents (Faculty ID or Appointment Letter) for manual registration.',
        [{ text: 'OK' }]
      );
      return;
    }

    submitRegistration();
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: prefillEmail || '',
      universityId: '',
      department: '',
    });
    setSelectedCountryId('');
    setSelectedUniversity(null);
    setDocuments([]);
    setUniversities([]);
  };

  const submitRegistration = async () => {
    setLoading(true);
    try {
      await teacherRegister({
        ...formData,
        documents: documents.length > 0 ? documents : undefined,
      });
      // Reset form before navigation
      resetForm();
      // Use replace instead of navigate to prevent going back
      (navigation as any).replace('PendingApproval');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Reset form when screen comes into focus (if user navigates back)
  useFocusEffect(
    React.useCallback(() => {
      // Skip reset on initial mount
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      // Reset form when navigating back to this screen
      // This ensures clean state when user comes back from PendingApproval or any other screen
      resetForm();
    }, [])
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Teacher Registration</Text>
      <Text style={styles.subtitle}>
        Register as a faculty member. Use your university email for faster approval.
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={formData.fullName}
        onChangeText={(text) => setFormData({ ...formData, fullName: text })}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email (university email preferred)"
        value={formData.email}
        onChangeText={(text) => {
          setFormData({ ...formData, email: text });
          // Check if email domain matches a university and auto-select country/university
          if (text.includes('@')) {
            const domain = text.split('@')[1];
            checkUniversityDomain(domain);
          }
        }}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Department (optional)"
        value={formData.department}
        onChangeText={(text) => setFormData({ ...formData, department: text })}
      />

      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowCountryModal(true)}
      >
        <Text style={[styles.pickerText, !selectedCountry && styles.pickerPlaceholder]}>
          {selectedCountry?.name || 'Select Country'}
        </Text>
        <Text style={styles.pickerArrow}>▼</Text>
      </TouchableOpacity>

      {selectedCountry && (
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowUniversityModal(true)}
          disabled={universities.length === 0}
        >
          <Text style={[styles.pickerText, !selectedUniversity && styles.pickerPlaceholder]}>
            {selectedUniversity ? selectedUniversity.name : 'Select University'}
          </Text>
          <Text style={styles.pickerArrow}>▼</Text>
        </TouchableOpacity>
      )}

      {/* Check if university email is used - if so, documents not required */}
      {(() => {
        const emailDomain = formData.email.split('@')[1];
        const isUniversityEmail = selectedUniversity && emailDomain && 
          selectedUniversity.name && formData.email.toLowerCase().includes(emailDomain.toLowerCase());
        
        if (isUniversityEmail) {
          return (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ✓ University email detected. Documents not required for faster approval.
              </Text>
            </View>
          );
        }
        
        return (
          <>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Text style={styles.uploadButtonText}>
                Upload Documents (Faculty ID, Appointment Letter) *
              </Text>
            </TouchableOpacity>
            {documents.length > 0 && (
              <Text style={styles.docCount}>{documents.length} document(s) uploaded</Text>
            )}
          </>
        );
      })()}
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Submitting...' : 'Submit'}</Text>
      </TouchableOpacity>

      {/* Country Modal */}
      <Modal
        visible={showCountryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={countries}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleCountrySelect(item)}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  {selectedCountryId === item.id && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* University Modal */}
      <Modal
        visible={showUniversityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUniversityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select University</Text>
              <TouchableOpacity onPress={() => setShowUniversityModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {universities.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No universities available</Text>
              </View>
            ) : (
              <FlatList
                data={universities}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => handleUniversitySelect(item)}
                  >
                    <View>
                      <Text style={styles.modalItemText}>{item.name}</Text>
                      <Text style={styles.modalItemSubtext}>
                        {typeof item.country === 'object' && item.country !== null
                          ? item.country.name
                          : item.country || 'N/A'}
                      </Text>
                    </View>
                    {selectedUniversity?.id === item.id && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
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
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pickerButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  pickerPlaceholder: {
    color: '#999',
  },
  pickerArrow: {
    fontSize: 12,
    color: '#999',
  },
  uploadButton: {
    backgroundColor: '#5C7AEA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  docCount: {
    fontSize: 12,
    color: '#27AE60',
    marginBottom: 15,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#D4EDDA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#27AE60',
  },
  infoText: {
    color: '#27AE60',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#999',
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalItemSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  checkmark: {
    fontSize: 18,
    color: '#5C7AEA',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

