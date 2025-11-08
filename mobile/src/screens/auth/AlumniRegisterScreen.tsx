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

export default function AlumniRegisterScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { alumniRegister } = useAuthStore();
  const prefillEmail = (route.params as any)?.prefillEmail || '';
  const [formData, setFormData] = useState({
    fullName: '',
    personalEmail: prefillEmail,
    universityId: '',
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

  const resetForm = () => {
    setFormData({
      fullName: '',
      personalEmail: prefillEmail || '',
      universityId: '',
    });
    setSelectedCountryId('');
    setSelectedUniversity(null);
    setDocuments([]);
    setUniversities([]);
  };

  const handleRegister = async () => {
    if (!formData.fullName || !formData.personalEmail || !formData.universityId) {
      Alert.alert('Error', 'Please fill all fields including country and university');
      return;
    }

    if (documents.length === 0) {
      Alert.alert('Error', 'Please upload at least one document');
      return;
    }

    setLoading(true);
    try {
      await alumniRegister({
        ...formData,
        documents,
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
      <Text style={styles.title}>Alumni Registration</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={formData.fullName}
        onChangeText={(text) => setFormData({ ...formData, fullName: text })}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Personal Email"
        value={formData.personalEmail}
        onChangeText={(text) => setFormData({ ...formData, personalEmail: text })}
        keyboardType="email-address"
        autoCapitalize="none"
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

      <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
        <Text style={styles.uploadButtonText}>Upload Documents</Text>
      </TouchableOpacity>
      {documents.length > 0 && (
        <Text style={styles.docCount}>{documents.length} document(s) uploaded</Text>
      )}
      
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
    marginBottom: 30,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  pickerButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#666',
  },
  uploadButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#5C7AEA',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#5C7AEA',
    fontSize: 16,
    fontWeight: '600',
  },
  docCount: {
    color: '#27AE60',
    marginBottom: 15,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalItemSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    color: '#5C7AEA',
    fontWeight: 'bold',
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

