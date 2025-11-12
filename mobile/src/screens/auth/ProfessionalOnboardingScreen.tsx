import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import apiClient from '../../api/client';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';

interface Country {
  id: string;
  name: string;
  code: string | null;
}

interface Institution {
  id: string;
  name: string;
  domain: string | null;
  countryId: string;
  country?: Country;
  type: 'university' | 'organization';
}

export default function ProfessionalOnboardingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const email = (route.params as any)?.email || '';
  const universityName = (route.params as any)?.universityName || null;
  const organizationName = (route.params as any)?.organizationName || null;
  const institutionType = (route.params as any)?.institutionType || null;
  
  // Debug: Log received params
  useEffect(() => {
    console.log('[PROFESSIONAL ONBOARDING] Screen mounted with params:', {
      email,
      universityName,
      organizationName,
      institutionType,
    });
  }, []);
  const [selectedCountryId, setSelectedCountryId] = useState<string>('');
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showInstitutionModal, setShowInstitutionModal] = useState(false);
  const [documents, setDocuments] = useState<string[]>([]);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [isAlumni, setIsAlumni] = useState<boolean | null>(null); // null = not asked yet, true/false = user's choice
  const [isAutoDetected, setIsAutoDetected] = useState(false); // Track if institution was auto-detected from email domain
  const [showAlumniConnection, setShowAlumniConnection] = useState(false); // Show option to connect as alumni even when organization is selected
  const [selectedAlumniUniversity, setSelectedAlumniUniversity] = useState<Institution | null>(null);
  const [alumniDocuments, setAlumniDocuments] = useState<string[]>([]);
  const [uploadingAlumniDocuments, setUploadingAlumniDocuments] = useState(false);
  const [selectingForAlumni, setSelectingForAlumni] = useState(false); // Track if modal is open for alumni selection

  useEffect(() => {
    loadCountries();
  }, []);

  // Prefill institution from email domain when institutions are loaded (only if not already auto-detected)
  useEffect(() => {
    if (isAutoDetected) {
      // Already auto-detected, don't override
      return;
    }
    
    if (institutions.length > 0 && !selectedInstitution) {
      // Try to find matching institution from email domain
      if (email && email.includes('@')) {
        const emailDomain = email.split('@')[1];
        const matchingInstitution = institutions.find(
          (inst) => inst.domain && emailDomain.toLowerCase() === inst.domain.toLowerCase()
        );
        
        if (matchingInstitution) {
          console.log('[PROFESSIONAL ONBOARDING] Prefilling institution from institutions list:', matchingInstitution.name);
          setSelectedInstitution(matchingInstitution);
          setIsAutoDetected(true); // Mark as auto-detected since it matches email domain
          // Set country if not already set
          if (!selectedCountryId && matchingInstitution.countryId) {
            setSelectedCountryId(matchingInstitution.countryId);
          }
        } else if (universityName || organizationName) {
          // Try to find by name if domain doesn't match
          const nameToMatch = institutionType === 'university' ? universityName : organizationName;
          const matchingByName = institutions.find(
            (inst) => inst.name.toLowerCase() === nameToMatch?.toLowerCase()
          );
          
          if (matchingByName) {
            console.log('[PROFESSIONAL ONBOARDING] Prefilling institution by name:', matchingByName.name);
            setSelectedInstitution(matchingByName);
            setIsAutoDetected(true); // Mark as auto-detected since it was passed from previous screen
            if (!selectedCountryId && matchingByName.countryId) {
              setSelectedCountryId(matchingByName.countryId);
            }
          }
        }
      }
    }
  }, [institutions, email, universityName, organizationName, institutionType, selectedInstitution, selectedCountryId, isAutoDetected]);

  useEffect(() => {
    if (selectedCountryId) {
      loadInstitutions(selectedCountryId);
    } else {
      setInstitutions([]);
      setSelectedInstitution(null);
    }
  }, [selectedCountryId]);

  const loadCountries = async () => {
    try {
      const response = await apiClient.get('/country/active');
      const data = response.data?.data?.data || response.data?.data || response.data || [];
      setCountries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load countries:', error);
      Alert.alert('Error', 'Failed to load countries');
    } finally {
      setLoadingData(false);
    }
  };

  const loadInstitutions = async (countryId: string, forAlumni: boolean = false) => {
    setLoadingData(true);
    try {
      if (forAlumni) {
        // When selecting university for alumni connection, only load universities
        const universitiesResponse = await apiClient.get(`/university?countryId=${encodeURIComponent(countryId)}`).catch(() => ({ data: { data: [] } }));
        const universities = (universitiesResponse.data?.data || universitiesResponse.data || []) as any[];
        const combined: Institution[] = universities.map((u: any) => ({
          id: u.id,
          name: u.name,
          domain: u.domain,
          countryId: u.countryId || countryId,
          country: u.country,
          type: 'university' as const,
        }));
        combined.sort((a, b) => a.name.localeCompare(b.name));
        setInstitutions(combined);
      } else {
        // Load both universities and organizations for the selected country
        const [universitiesResponse, organizationsResponse] = await Promise.all([
          apiClient.get(`/university?countryId=${encodeURIComponent(countryId)}`).catch(() => ({ data: { data: [] } })),
          apiClient.get(`/organization?countryId=${encodeURIComponent(countryId)}`).catch(() => ({ data: { data: [] } })),
        ]);

        const universities = (universitiesResponse.data?.data || universitiesResponse.data || []) as any[];
        const organizations = (organizationsResponse.data?.data || organizationsResponse.data || []) as any[];

        // Combine and format
        const combined: Institution[] = [
          ...universities.map((u: any) => ({
            id: u.id,
            name: u.name,
            domain: u.domain,
            countryId: u.countryId || countryId,
            country: u.country,
            type: 'university' as const,
          })),
          ...organizations.map((o: any) => ({
            id: o.id,
            name: o.name,
            domain: o.domain,
            countryId: o.countryId || countryId,
            country: o.country,
            type: 'organization' as const,
          })),
        ];

        // Sort by name
        combined.sort((a, b) => a.name.localeCompare(b.name));
        setInstitutions(combined);
      }
    } catch (error) {
      console.error('Failed to load institutions:', error);
      Alert.alert('Error', 'Failed to load institutions');
    } finally {
      setLoadingData(false);
    }
  };

  // Auto-detect country and institution from email domain - run immediately on mount
  useEffect(() => {
    if (email && email.includes('@')) {
      const domain = email.split('@')[1];
      console.log('[PROFESSIONAL ONBOARDING] Auto-detecting institution from email domain:', domain);
      checkDomainAndAutoSelect(domain);
    } else if (email) {
      console.warn('[PROFESSIONAL ONBOARDING] Email does not contain @:', email);
    }
  }, [email]);

  const checkDomainAndAutoSelect = async (domain: string) => {
    try {
      console.log('[PROFESSIONAL ONBOARDING] Checking domain:', domain);
      
      // Check organization FIRST (professionals typically use organization emails)
      const orgResponse = await apiClient.get(`/organization/check-domain?domain=${encodeURIComponent(domain)}`).catch((err) => {
        console.log('[PROFESSIONAL ONBOARDING] Organization check failed:', err);
        return null;
      });
      
      if (orgResponse?.data?.data?.found || orgResponse?.data?.found) {
        const organization = (orgResponse.data?.data?.organization || orgResponse.data?.organization) as any;
        const countryId = organization.country?.id || organization.countryId;
        if (countryId) {
          console.log('[PROFESSIONAL ONBOARDING] Organization found:', organization.name, 'Country:', countryId);
          setSelectedCountryId(countryId);
          setSelectedInstitution({
            id: organization.id,
            name: organization.name,
            domain: organization.domain,
            countryId: countryId,
            country: organization.country,
            type: 'organization',
          });
          setIsAutoDetected(true); // Mark as auto-detected - user cannot change
          await loadInstitutions(countryId);
          console.log('[PROFESSIONAL ONBOARDING] Auto-detection complete - organization locked');
          return; // Organization found, don't check university
        }
      }

      // Check university (professionals can also use university emails)
      const universityResponse = await apiClient.get(`/university/check-domain?domain=${encodeURIComponent(domain)}`).catch((err) => {
        console.log('[PROFESSIONAL ONBOARDING] University check failed:', err);
        return null;
      });
      
      if (universityResponse?.data?.data?.found || universityResponse?.data?.found) {
        const university = (universityResponse.data?.data?.university || universityResponse.data?.university) as any;
        const countryId = university.country?.id || university.countryId;
        if (countryId) {
          console.log('[PROFESSIONAL ONBOARDING] University found:', university.name, 'Country:', countryId);
          setSelectedCountryId(countryId);
          setSelectedInstitution({
            id: university.id,
            name: university.name,
            domain: university.domain,
            countryId: countryId,
            country: university.country,
            type: 'university',
          });
          setIsAutoDetected(true); // Mark as auto-detected - user cannot change
          await loadInstitutions(countryId);
          console.log('[PROFESSIONAL ONBOARDING] Auto-detection complete - university locked');
          return;
        }
      }
      
      console.log('[PROFESSIONAL ONBOARDING] No institution found for domain:', domain, '- user can manually select');
    } catch (error) {
      console.error('[PROFESSIONAL ONBOARDING] Error in checkDomainAndAutoSelect:', error);
      // Silently fail - user can manually select
    }
  };

  const handleCountrySelect = (country: Country) => {
    if (isAutoDetected) {
      // Don't allow changing country if auto-detected
      Alert.alert('Cannot Change', 'This information was detected from your email domain and cannot be changed.');
      return;
    }
    setSelectedCountryId(country.id);
    setShowCountryModal(false);
    setSelectedInstitution(null);
  };

  const handleInstitutionSelect = (institution: Institution) => {
    // If selecting for alumni connection, only allow universities
    if (selectingForAlumni) {
      // Ensure only universities can be selected for alumni
      if (institution.type !== 'university') {
        Alert.alert('Invalid Selection', 'Please select a university for alumni connection.');
        return;
      }
      // Allow same university (user can be alumni and work at the same university)
      setSelectedAlumniUniversity(institution);
      setSelectingForAlumni(false);
      setShowInstitutionModal(false);
      return;
    }
    
    // Selecting main institution (organization or university)
    if (isAutoDetected && institution.id !== selectedInstitution?.id) {
      // Don't allow changing institution if auto-detected
      Alert.alert('Cannot Change', 'This information was detected from your email domain and cannot be changed.');
      return;
    }
    
    setSelectedInstitution(institution);
    setShowInstitutionModal(false);
    // Reset alumni question when institution changes
    if (institution.type === 'university') {
      setIsAlumni(null);
    } else {
      setIsAlumni(null); // Clear alumni question for organizations
      setShowAlumniConnection(false); // Reset alumni connection option
      setSelectedAlumniUniversity(null);
      setAlumniDocuments([]);
    }
  };

  const pickDocuments = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setUploadingDocuments(true);
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

            const uploadResponse = await apiClient.post('/upload', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });

            const uploadedUrl = uploadResponse.data?.data?.url || uploadResponse.data?.url;
            if (uploadedUrl) {
              uploadedUrls.push(uploadedUrl);
            }
          }

          setDocuments([...documents, ...uploadedUrls]);
          Alert.alert('Success', `${uploadedUrls.length} document(s) uploaded successfully`);
        } catch (error: any) {
          console.error('Failed to upload documents:', error);
          Alert.alert('Error', 'Failed to upload documents. Please try again.');
        } finally {
          setUploadingDocuments(false);
        }
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
    }
  };

  const removeDocument = (index: number) => {
    const newDocuments = documents.filter((_, i) => i !== index);
    setDocuments(newDocuments);
  };

  const handleContinue = async () => {
    if (!selectedInstitution) {
      Alert.alert('Error', 'Please select an organization or university');
      return;
    }

    // If university selected and user is alumni, documents are required
    if (selectedInstitution.type === 'university' && isAlumni === true && documents.length === 0) {
      Alert.alert(
        'Documents Required',
        'To verify your alumni status, please upload documents (university ID, certificate, transcript, etc.).',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upload Documents', onPress: pickDocuments },
        ]
      );
      return;
    }

    // If university selected but alumni question not answered
    if (selectedInstitution.type === 'university' && isAlumni === null) {
      Alert.alert('Please Answer', 'Please indicate if you are an alumni of this university.');
      return;
    }

    proceedWithContinue();
  };

  const proceedWithContinue = async () => {
    if (!selectedInstitution) {
      return;
    }

    setLoading(true);
    try {
      // Update user with selected institution
      if (selectedInstitution.type === 'university') {
        const updateData: any = {
          universityId: selectedInstitution.id,
          organizationId: null,
          profileMode: 'professional',
        };

        // If user is alumni, set isAlumni flag and include documents
        if (isAlumni === true) {
          updateData.isAlumni = true;
          updateData.alumniVerified = false; // Unverified by default, needs document verification
          if (documents.length > 0) {
            updateData.documents = documents;
          }
        }

        await apiClient.put('/me', updateData);
      } else {
        const updateData: any = {
          organizationId: selectedInstitution.id,
          profileMode: 'professional',
        };

        // If organization selected but user also wants to connect as university alumni
        if (selectedAlumniUniversity && showAlumniConnection) {
          updateData.isAlumni = true;
          updateData.alumniVerified = false; // Unverified by default, needs document verification
          updateData.universityId = selectedAlumniUniversity.id; // Set university ID for alumni connection
          if (alumniDocuments.length > 0) {
            updateData.documents = alumniDocuments;
          }
        } else {
          updateData.universityId = null; // Clear university if not connecting as alumni
        }

        await apiClient.put('/me', updateData);
      }

      // Check if user needs personal info (name and DOB) before password setup
      try {
        const userResponse = await apiClient.get('/me');
        const userData = userResponse.data?.data || userResponse.data;
        const needsPersonalInfo = !userData?.name || userData.name.trim().length < 2 || !userData?.dateOfBirth;
        
        if (needsPersonalInfo) {
          console.log('[PROFESSIONAL ONBOARDING] User needs personal info, navigating to PersonalInfo');
          (navigation as any).replace('PersonalInfo', { accountType: 'professional' });
        } else {
          console.log('[PROFESSIONAL ONBOARDING] User has personal info, navigating to PasswordSetup');
          (navigation as any).replace('PasswordSetup');
        }
      } catch (error) {
        // If we can't check user data, proceed to password setup
        console.error('[PROFESSIONAL ONBOARDING] Failed to check user data:', error);
        (navigation as any).replace('PasswordSetup');
      }
    } catch (error: any) {
      console.error('Failed to update institution:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save selection');
    } finally {
      setLoading(false);
    }
  };

  const selectedCountry = countries.find(c => c.id === selectedCountryId);

  if (loadingData) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#5C7AEA" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>
        {isAutoDetected ? 'Review Organization Information' : 'Select Your Organization'}
      </Text>
      <Text style={styles.subtitle}>
        {isAutoDetected 
          ? 'We\'ve detected your organization from your email domain. Please review and confirm the information below.'
          : 'Choose the organization or university you\'re affiliated with. This helps us connect you with the right community.'}
      </Text>

      <TouchableOpacity
        style={[styles.pickerButton, isAutoDetected && styles.pickerButtonDisabled]}
        onPress={() => {
          if (isAutoDetected) {
            Alert.alert('Cannot Change', 'This information was detected from your email domain and cannot be changed.');
            return;
          }
          setShowCountryModal(true);
        }}
        disabled={isAutoDetected}
      >
        <Text style={[styles.pickerText, !selectedCountry && styles.pickerPlaceholder, isAutoDetected && styles.pickerTextDisabled]}>
          {selectedCountry?.name || 'Select Country'}
        </Text>
        {!isAutoDetected && <Text style={styles.pickerArrow}>▼</Text>}
        {isAutoDetected && <Text style={styles.pickerLockIcon}>🔒</Text>}
      </TouchableOpacity>
      {isAutoDetected && selectedCountry && (
        <Text style={styles.autoDetectedHint}>Detected from your email domain - cannot be changed</Text>
      )}

      {selectedCountry && (
        <>
          <TouchableOpacity
            style={[styles.pickerButton, (institutions.length === 0 || isAutoDetected) && styles.pickerButtonDisabled]}
            onPress={async () => {
              if (isAutoDetected) {
                Alert.alert('Cannot Change', 'This information was detected from your email domain and cannot be changed.');
                return;
              }
              setSelectingForAlumni(false);
              // Reload institutions for main selection (both universities and organizations)
              if (selectedCountryId) {
                await loadInstitutions(selectedCountryId, false);
              }
              setShowInstitutionModal(true);
            }}
            disabled={institutions.length === 0 || isAutoDetected}
          >
            <Text style={[styles.pickerText, !selectedInstitution && styles.pickerPlaceholder, isAutoDetected && styles.pickerTextDisabled]}>
              {selectedInstitution ? selectedInstitution.name : 'Select Organization or University'}
            </Text>
            {!isAutoDetected && <Text style={styles.pickerArrow}>▼</Text>}
            {isAutoDetected && <Text style={styles.pickerLockIcon}>🔒</Text>}
          </TouchableOpacity>
          {isAutoDetected && selectedInstitution && (
            <Text style={styles.autoDetectedHint}>Detected from your email domain - cannot be changed</Text>
          )}
        </>
      )}

      {selectedInstitution && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedLabel}>Selected:</Text>
          <Text style={styles.selectedName}>{selectedInstitution.name}</Text>
          <Text style={styles.selectedType}>
            {selectedInstitution.type === 'university' ? '🏫 University' : '🏢 Organization'}
          </Text>
        </View>
      )}

      {/* Alumni question for university selection */}
      {selectedInstitution?.type === 'university' && isAlumni === null && (
        <View style={styles.alumniQuestionSection}>
          <Text style={styles.alumniQuestionTitle}>Are you an alumni of this university?</Text>
          <Text style={styles.alumniQuestionSubtitle}>
            If you're an alumni, you'll need to verify your status with documents.
          </Text>
          <View style={styles.alumniButtons}>
            <TouchableOpacity
              style={[
                styles.alumniButton,
                isAlumni === true ? styles.alumniButtonYes : styles.alumniButtonNo,
                isAlumni === true && styles.alumniButtonSelected,
              ]}
              onPress={() => setIsAlumni(true)}
            >
              <Text style={[
                styles.alumniButtonText,
                isAlumni === true && styles.alumniButtonTextSelected,
              ]}>
                Yes, I'm an Alumni
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.alumniButton,
                isAlumni === false ? styles.alumniButtonYes : styles.alumniButtonNo,
                isAlumni === false && styles.alumniButtonSelected,
              ]}
              onPress={() => setIsAlumni(false)}
            >
              <Text style={[
                styles.alumniButtonText,
                isAlumni === false && styles.alumniButtonTextSelected,
              ]}>
                No, I'm a Current Student/Teacher
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Document upload for university selection (alumni verification) */}
      {selectedInstitution?.type === 'university' && isAlumni === true && (
        <View style={styles.documentSection}>
          <Text style={styles.documentTitle}>Alumni Verification Documents</Text>
          <Text style={styles.documentSubtitle}>
            Upload documents to verify your alumni status (university ID, certificate, transcript, etc.)
          </Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickDocuments}
            disabled={uploadingDocuments}
          >
            <Text style={styles.uploadButtonText}>
              {uploadingDocuments ? 'Uploading...' : 'Upload Documents'}
            </Text>
          </TouchableOpacity>
          {documents.length > 0 && (
            <View style={styles.documentsList}>
              <Text style={styles.documentsTitle}>{documents.length} document(s) uploaded:</Text>
              {documents.map((doc, index) => (
                <View key={index} style={styles.documentItem}>
                  <Text style={styles.documentUrl} numberOfLines={1}>
                    Document {index + 1}
                  </Text>
                  <TouchableOpacity onPress={() => removeDocument(index)}>
                    <Text style={styles.removeDocument}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Alumni connection option for professionals with organization */}
      {selectedInstitution?.type === 'organization' && (
        <View style={styles.alumniConnectionSection}>
          <Text style={styles.alumniConnectionTitle}>Connect as University Alumni</Text>
          <Text style={styles.alumniConnectionSubtitle}>
            Are you also an alumni of a university? You can connect your university alumni status to your profile.
          </Text>
          {!showAlumniConnection && (
            <TouchableOpacity
              style={styles.alumniConnectionButton}
              onPress={() => setShowAlumniConnection(true)}
            >
              <Text style={styles.alumniConnectionButtonText}>Yes, Connect University</Text>
            </TouchableOpacity>
          )}
          {showAlumniConnection && (
            <>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={async () => {
                  setSelectingForAlumni(true);
                  // Load only universities for alumni selection
                  if (selectedCountryId) {
                    await loadInstitutions(selectedCountryId, true);
                  } else if (selectedInstitution?.countryId) {
                    await loadInstitutions(selectedInstitution.countryId, true);
                  }
                  setShowInstitutionModal(true);
                }}
              >
                <Text style={[styles.pickerText, !selectedAlumniUniversity && styles.pickerPlaceholder]}>
                  {selectedAlumniUniversity ? selectedAlumniUniversity.name : 'Select University'}
                </Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>
              {selectedAlumniUniversity && (
                <View style={styles.documentSection}>
                  <Text style={styles.documentTitle}>Alumni Verification Documents</Text>
                  <Text style={styles.documentSubtitle}>
                    Upload documents to verify your alumni status (university ID, certificate, transcript, etc.)
                  </Text>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={async () => {
                      try {
                        const result = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                          allowsMultipleSelection: true,
                        });

                        if (!result.canceled && result.assets.length > 0) {
                          setUploadingAlumniDocuments(true);
                          try {
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

                              const uploadResponse = await apiClient.post('/upload/alumni-document', formData, {
                                headers: {
                                  'Content-Type': 'multipart/form-data',
                                },
                              });

                              const uploadedUrl = uploadResponse.data?.data?.url || uploadResponse.data?.url;
                              if (uploadedUrl) {
                                uploadedUrls.push(uploadedUrl);
                              }
                            }
                            setAlumniDocuments([...alumniDocuments, ...uploadedUrls]);
                            Alert.alert('Success', 'Documents uploaded successfully');
                          } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.message || 'Failed to upload documents');
                          } finally {
                            setUploadingAlumniDocuments(false);
                          }
                        }
                      } catch (error) {
                        console.error('Error picking documents:', error);
                      }
                    }}
                    disabled={uploadingAlumniDocuments}
                  >
                    <Text style={styles.uploadButtonText}>
                      {uploadingAlumniDocuments ? 'Uploading...' : 'Upload Documents'}
                    </Text>
                  </TouchableOpacity>
                  {alumniDocuments.length > 0 && (
                    <View style={styles.documentsList}>
                      <Text style={styles.documentsTitle}>{alumniDocuments.length} document(s) uploaded:</Text>
                      {alumniDocuments.map((doc, index) => (
                        <View key={index} style={styles.documentItem}>
                          <Text style={styles.documentUrl} numberOfLines={1}>
                            Document {index + 1}
                          </Text>
                          <TouchableOpacity onPress={() => {
                            setAlumniDocuments(alumniDocuments.filter((_, i) => i !== index));
                          }}>
                            <Text style={styles.removeDocument}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
              <TouchableOpacity
                style={styles.removeAlumniConnectionButton}
                onPress={() => {
                  setShowAlumniConnection(false);
                  setSelectedAlumniUniversity(null);
                  setAlumniDocuments([]);
                }}
              >
                <Text style={styles.removeAlumniConnectionButtonText}>Remove University Connection</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, (!selectedInstitution || loading) && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!selectedInstitution || loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Continue'}</Text>
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

      {/* Institution Modal */}
      <Modal
        visible={showInstitutionModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setSelectingForAlumni(false);
          setShowInstitutionModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectingForAlumni ? 'Select University' : 'Select Organization or University'}
              </Text>
              <TouchableOpacity onPress={() => {
                setSelectingForAlumni(false);
                setShowInstitutionModal(false);
              }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {institutions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No institutions available for this country</Text>
              </View>
            ) : (
              <FlatList
                data={institutions}
                keyExtractor={(item) => `${item.type}-${item.id}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => handleInstitutionSelect(item)}
                  >
                    <View style={styles.modalItemContent}>
                      <Text style={styles.modalItemText}>
                        {item.type === 'university' ? '🏫 ' : '🏢 '}
                        {item.name}
                      </Text>
                      <Text style={styles.modalItemSubtext}>
                        {typeof item.country === 'object' && item.country !== null
                          ? item.country.name
                          : 'N/A'}
                      </Text>
                    </View>
                    {((selectingForAlumni && selectedAlumniUniversity?.id === item.id) ||
                      (!selectingForAlumni && selectedInstitution?.id === item.id)) && (
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
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
  pickerButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#F5F5F5',
  },
  pickerTextDisabled: {
    color: '#666',
  },
  pickerLockIcon: {
    fontSize: 14,
    color: '#999',
  },
  autoDetectedHint: {
    fontSize: 12,
    color: '#5C7AEA',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 10,
  },
  selectedInfo: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#5C7AEA',
  },
  selectedLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedType: {
    fontSize: 14,
    color: '#5C7AEA',
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
  modalItemContent: {
    flex: 1,
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
  documentSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  documentSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    lineHeight: 18,
  },
  uploadButton: {
    backgroundColor: '#5C7AEA',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  documentsList: {
    marginTop: 10,
  },
  documentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F5F7FB',
    borderRadius: 8,
    marginBottom: 5,
  },
  documentUrl: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  removeDocument: {
    fontSize: 18,
    color: '#ef4444',
    fontWeight: 'bold',
    paddingHorizontal: 10,
  },
  alumniQuestionSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  alumniQuestionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  alumniQuestionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  alumniButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  alumniButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
  },
  alumniButtonYes: {
    backgroundColor: '#E3F2FD',
    borderColor: '#5C7AEA',
  },
  alumniButtonNo: {
    backgroundColor: '#F5F7FB',
    borderColor: '#E0E0E0',
  },
  alumniButtonSelected: {
    backgroundColor: '#5C7AEA',
    borderColor: '#5C7AEA',
  },
  alumniButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  alumniButtonTextSelected: {
    color: '#fff',
  },
  alumniConnectionSection: {
    backgroundColor: '#F0F7FF',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#5C7AEA',
  },
  alumniConnectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  alumniConnectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  alumniConnectionButton: {
    backgroundColor: '#5C7AEA',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  alumniConnectionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  removeAlumniConnectionButton: {
    marginTop: 10,
    padding: 10,
    alignItems: 'center',
  },
  removeAlumniConnectionButtonText: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: '600',
  },
});

