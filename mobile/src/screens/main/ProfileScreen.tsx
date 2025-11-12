import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, TextInput, Image, ActivityIndicator, Platform, ActionSheetIOS } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import OptimizedImage from '../../components/OptimizedImage';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout, updateUser, loadFeatures } = useAuthStore();
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Generic field edit modal state
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldInput, setFieldInput] = useState('');
  
  // Interests edit modal state
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [interestsInput, setInterestsInput] = useState('');
  
  // Research interests edit modal state
  const [showResearchInterestsModal, setShowResearchInterestsModal] = useState(false);
  const [researchInterestsInput, setResearchInterestsInput] = useState('');
  
  // Badge management state
  const [availableBadgeTypes, setAvailableBadgeTypes] = useState<any[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadgeType, setSelectedBadgeType] = useState<string | null>(null);
  
  // Gender dropdown state
  const [showGenderModal, setShowGenderModal] = useState(false);
  const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];

  const handleDeleteAccount = () => {
    setDeleteConfirmText('');
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      Alert.alert('Error', 'Please type DELETE to confirm account deletion');
      return;
    }

    try {
      await apiClient.delete('/me');
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account');
      setShowDeleteModal(false);
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    try {
      const response = await apiClient.put('/me', { name: nameInput.trim() });
      const userData = response.data?.data || response.data;
      updateUser(userData);
      setShowNameModal(false);
      Alert.alert('Success', 'Name updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update name');
    }
  };

  const handleEditField = (fieldName: string, currentValue: string) => {
    setEditingField(fieldName);
    // Auto-fill date of birth from user data if available
    if (fieldName === 'dateOfBirth' && !currentValue && user?.dateOfBirth) {
      const dob = new Date(user.dateOfBirth);
      const formattedDate = dob.toISOString().split('T')[0]; // YYYY-MM-DD format
      setFieldInput(formattedDate);
    } else {
      setFieldInput(currentValue);
    }
    setShowFieldModal(true);
  };

  const handleSaveField = async () => {
    if (!editingField) return;

    try {
      const payload: any = {};
      
      // Handle different field types
      if (editingField === 'passingYear' || editingField === 'graduationYear') {
        const year = parseInt(fieldInput.trim());
        if (isNaN(year) || year < 1900 || year > 2100) {
          Alert.alert('Error', 'Please enter a valid year (1900-2100)');
          return;
        }
        payload[editingField] = year;
      } else if (editingField === 'dateOfBirth') {
        const date = new Date(fieldInput.trim());
        if (isNaN(date.getTime())) {
          Alert.alert('Error', 'Please enter a valid date (YYYY-MM-DD)');
          return;
        }
        payload[editingField] = date.toISOString().split('T')[0];
      } else {
        payload[editingField] = fieldInput.trim() || null;
      }

      const response = await apiClient.put('/me', payload);
      const userData = response.data?.data || response.data;
      updateUser(userData);
      setShowFieldModal(false);
      setEditingField(null);
      setFieldInput('');
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleEditInterests = () => {
    const currentInterests = user?.interests || [];
    setInterestsInput(Array.isArray(currentInterests) ? currentInterests.join(', ') : '');
    setShowInterestsModal(true);
  };

  const handleSaveInterests = async () => {
    try {
      const interestsArray = interestsInput
        .split(',')
        .map(i => i.trim())
        .filter(i => i.length > 0);

      const response = await apiClient.put('/me', { interests: interestsArray });
      const userData = response.data?.data || response.data;
      updateUser(userData);
      setShowInterestsModal(false);
      setInterestsInput('');
      Alert.alert('Success', 'Interests updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update interests');
    }
  };

  const handleEditResearchInterests = () => {
    const currentInterests = user?.researchInterests || [];
    if (Array.isArray(currentInterests)) {
      setResearchInterestsInput(currentInterests.join(', '));
    } else if (typeof currentInterests === 'object' && currentInterests !== null) {
      setResearchInterestsInput(JSON.stringify(currentInterests));
    } else {
      setResearchInterestsInput('');
    }
    setShowResearchInterestsModal(true);
  };

  const handleSaveResearchInterests = async () => {
    try {
      const interestsArray = researchInterestsInput
        .split(',')
        .map(i => i.trim())
        .filter(i => i.length > 0);

      const response = await apiClient.put('/me', { researchInterests: interestsArray });
      const userData = response.data?.data || response.data;
      updateUser(userData);
      setShowResearchInterestsModal(false);
      setResearchInterestsInput('');
      Alert.alert('Success', 'Research interests updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update research interests');
    }
  };

  const pickAndUploadImage = async (source: 'camera' | 'library') => {
    // Request permissions based on source
    if (source === 'camera') {
      // Check if camera is available
      const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
      if (!cameraStatus.granted) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Permission to access camera is required');
        }
      }
      
      // Check if camera is actually available (not simulator)
      const cameraAvailable = await ImagePicker.getCameraPermissionsAsync();
      if (!cameraAvailable.canAskAgain && !cameraAvailable.granted) {
        throw new Error('Camera is not available. Please use a physical device or choose from library.');
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access media library is required');
      }
    }

    let result;
    try {
      // Launch camera or library
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7, // Reduced quality to help reduce file size
          aspect: [1, 1], // Square aspect ratio for avatars
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7, // Reduced quality to help reduce file size
          aspect: [1, 1], // Square aspect ratio for avatars
        });
      }
    } catch (error: any) {
      // Handle camera not available error (e.g., on simulator)
      if (error.message?.includes('Camera') || error.message?.includes('simulator')) {
        throw new Error('Camera is not available on this device. Please choose from library instead.');
      }
      throw error;
    }

    if (result.canceled) {
      return null;
    }

    if (!result.assets || result.assets.length === 0) {
      return null;
    }

    // Upload to server
    const formData = new FormData();
    const uri = result.assets[0].uri;
    const filename = uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const mimeType = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append('file', {
      uri,
      name: filename,
      type: mimeType,
    } as any);

    try {
      const response = await apiClient.post('/upload/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data?.data || response.data;
      // Return URL with sizes if available
      if (data?.sizes) {
        return { url: data.url, sizes: data.sizes };
      }
      return data?.url || data;
    } catch (error: any) {
      // Handle 413 Payload Too Large error
      if (error.response?.status === 413) {
        throw new Error('Photo is too large (max 5MB). Please choose a smaller image or reduce the quality.');
      }
      throw error;
    }
  };

  const handleUploadPhoto = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) return; // Cancel
          
          try {
            setUploadingPhoto(true);
            const source = buttonIndex === 1 ? 'camera' : 'library';
            const imageResult = await pickAndUploadImage(source);
            
            if (!imageResult) {
              setUploadingPhoto(false);
              return; // User cancelled
            }

            // Handle both string URL and object with sizes
            const avatarUrl = typeof imageResult === 'string' ? imageResult : imageResult.url;
            const avatarSizes = typeof imageResult === 'object' ? imageResult.sizes : undefined;

            // The backend upload service already updates the user's avatarUrl in the database
            // Fetch the updated profile to get the correct avatarUrl
            try {
              const profileResponse = await apiClient.get('/me');
              const userData = profileResponse.data?.data || profileResponse.data;
              
              // Merge avatar sizes from upload response if available
              if (avatarSizes && userData) {
                userData.avatarSizes = avatarSizes;
              }
              
              // Ensure avatarUrl is set
              if (!userData.avatarUrl && avatarUrl) {
                userData.avatarUrl = avatarUrl;
              }
              
              console.log('[ProfileScreen] Updating user with:', { 
                avatarUrl: userData.avatarUrl, 
                hasSizes: !!userData.avatarSizes 
              });
              
              updateUser(userData);
              Alert.alert('Success', 'Profile photo updated successfully');
            } catch (apiError) {
              console.warn('[ProfileScreen] Failed to fetch updated profile, using upload response:', apiError);
              // Fallback: update with upload response
              const userUpdate: any = {
                avatarUrl: avatarUrl,
              };
              if (avatarSizes) {
                userUpdate.avatarSizes = avatarSizes;
              }
              updateUser(userUpdate);
              Alert.alert('Success', 'Profile photo updated successfully');
            }
          } catch (error: any) {
            console.error('Photo upload error:', error);
            const errorMessage = error.message || error.response?.data?.message || 'Failed to upload photo';
            
            // If camera not available, suggest using library
            if (errorMessage.includes('Camera') || errorMessage.includes('simulator')) {
              Alert.alert(
                'Camera Not Available',
                'Camera is not available on this device. Would you like to choose from library instead?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Choose from Library',
                    onPress: async () => {
                      try {
                        setUploadingPhoto(true);
                        const imageResult = await pickAndUploadImage('library');
                        if (imageResult) {
                          const avatarUrl = typeof imageResult === 'string' ? imageResult : imageResult.url;
                          const avatarSizes = typeof imageResult === 'object' ? imageResult.sizes : undefined;
                          
                          const response = await apiClient.put('/me', { avatarUrl });
                          const userData = response.data?.data || response.data;
                          if (avatarSizes) {
                            userData.avatarSizes = avatarSizes;
                          }
                          updateUser(userData);
                          Alert.alert('Success', 'Profile photo updated successfully');
                        }
                      } catch (libError: any) {
                        Alert.alert('Error', libError.message || 'Failed to upload photo');
                      } finally {
                        setUploadingPhoto(false);
                      }
                    },
                  },
                ]
              );
            } else {
              Alert.alert('Error', errorMessage);
            }
          } finally {
            setUploadingPhoto(false);
          }
        }
      );
    } else {
      // Android - use Alert
      Alert.alert(
        'Select Photo',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Take Photo',
            onPress: async () => {
              try {
                setUploadingPhoto(true);
                const imageResult = await pickAndUploadImage('camera');
                
                if (!imageResult) {
                  setUploadingPhoto(false);
                  return;
                }

                const avatarUrl = typeof imageResult === 'string' ? imageResult : imageResult.url;
                const avatarSizes = typeof imageResult === 'object' ? imageResult.sizes : undefined;

                const response = await apiClient.put('/me', { avatarUrl });
                const userData = response.data?.data || response.data;
                if (avatarSizes) {
                  userData.avatarSizes = avatarSizes;
                }
                updateUser(userData);
                Alert.alert('Success', 'Profile photo updated successfully');
              } catch (error: any) {
                console.error('Photo upload error:', error);
                let errorMessage = error.message || error.response?.data?.message || 'Failed to upload photo';
                
                // Handle file size errors
                if (error.response?.status === 413 || errorMessage.includes('413') || errorMessage.includes('too large')) {
                  errorMessage = 'Photo is too large. Please choose a smaller image (max 5MB) or compress the photo before uploading.';
                }
                
                // If camera not available, suggest using library
                if (errorMessage.includes('Camera') || errorMessage.includes('simulator')) {
                  Alert.alert(
                    'Camera Not Available',
                    'Camera is not available on this device. Would you like to choose from library instead?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Choose from Library',
                        onPress: async () => {
                          try {
                            setUploadingPhoto(true);
                            const imageResult = await pickAndUploadImage('library');
                            if (imageResult) {
                              const avatarUrl = typeof imageResult === 'string' ? imageResult : imageResult.url;
                              const avatarSizes = typeof imageResult === 'object' ? imageResult.sizes : undefined;
                              
                              const response = await apiClient.put('/me', { avatarUrl });
                              const userData = response.data?.data || response.data;
                              if (avatarSizes) {
                                userData.avatarSizes = avatarSizes;
                              }
                              updateUser(userData);
                              Alert.alert('Success', 'Profile photo updated successfully');
                            }
                          } catch (libError: any) {
                            Alert.alert('Error', libError.message || 'Failed to upload photo');
                          } finally {
                            setUploadingPhoto(false);
                          }
                        },
                      },
                    ]
                  );
                } else {
                  Alert.alert('Error', errorMessage);
                }
              } finally {
                setUploadingPhoto(false);
              }
            },
          },
          {
            text: 'Choose from Library',
            onPress: async () => {
              try {
                setUploadingPhoto(true);
                const imageResult = await pickAndUploadImage('library');
                
                if (!imageResult) {
                  setUploadingPhoto(false);
                  return;
                }

                const avatarUrl = typeof imageResult === 'string' ? imageResult : imageResult.url;
                const avatarSizes = typeof imageResult === 'object' ? imageResult.sizes : undefined;

                const response = await apiClient.put('/me', { avatarUrl });
                const userData = response.data?.data || response.data;
                if (avatarSizes) {
                  userData.avatarSizes = avatarSizes;
                }
                updateUser(userData);
                Alert.alert('Success', 'Profile photo updated successfully');
              } catch (error: any) {
                console.error('Photo upload error:', error);
                let errorMessage = error.message || error.response?.data?.message || 'Failed to upload photo';
                
                // Handle file size errors
                if (error.response?.status === 413 || errorMessage.includes('413') || errorMessage.includes('too large')) {
                  errorMessage = 'Photo is too large. Please choose a smaller image (max 5MB) or compress the photo before uploading.';
                }
                
                Alert.alert('Error', errorMessage);
              } finally {
                setUploadingPhoto(false);
              }
            },
          },
        ]
      );
    }
  };

  const handleChangeProfileMode = async (mode: string) => {
    // Don't allow changing if already in that mode
    if (user?.profileMode === mode) {
      return;
    }

    // Don't allow going back to student if already professional
    if (mode === 'student' && user?.profileMode === 'professional') {
      Alert.alert(
        'Cannot Change Mode',
        'Once you become a professional, you cannot revert to student status.'
      );
      return;
    }

    // Show confirmation dialog
    const modeLabels: { [key: string]: string } = {
      student: 'Student',
      professional: 'Professional',
    };

    Alert.alert(
      'Change Profile Mode',
      `Are you sure you want to switch to ${modeLabels[mode]} mode?${
        mode === 'professional'
          ? '\n\nThis will require verification. You will automatically become an alumni of your university.'
          : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const response = await apiClient.put('/me/profile-mode', { profileMode: mode });
              const userData = response.data?.data || response.data;
              updateUser(userData);
              
              // Reload features after profile mode change
              try {
                await loadFeatures();
              } catch (error) {
                console.warn('[PROFILE] Failed to reload features after mode change:', error);
              }
              
              if (mode === 'professional') {
                Alert.alert(
                  'Profile Mode Updated',
                  'Your profile mode has been updated to Professional. You are now an alumni of your university and can access alumni features.',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Success', 'Profile mode updated successfully');
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to update profile mode');
            }
          },
        },
      ]
    );
  };

  // Load available badge types on mount
  useEffect(() => {
    const loadAvailableBadgeTypes = async () => {
      try {
        const response = await apiClient.get('/badges/types');
        const badgeTypes = response.data?.data || response.data || [];
        setAvailableBadgeTypes(badgeTypes);
      } catch (error) {
        console.error('[PROFILE] Failed to load badge types:', error);
      }
    };
    
    if (user?.profileMode === 'professional') {
      loadAvailableBadgeTypes();
    }
  }, [user?.profileMode]);

  const handleAddBadge = async (badgeType: string) => {
    try {
      setLoadingBadges(true);
      const badgeInfo = availableBadgeTypes.find(bt => bt.type === badgeType);
      
      if (badgeInfo?.requiresVerification) {
        // For badges requiring verification, navigate to badge verification screen
        (navigation as any).navigate('BadgeVerification', { badgeType, badgeName: badgeInfo.name });
      } else {
        // For badges not requiring verification, add directly
        await apiClient.post('/badges', { badgeType });
        // Refresh user profile
        const profileResponse = await apiClient.get('/me');
        const userData = profileResponse.data?.data || profileResponse.data;
        updateUser(userData);
        Alert.alert('Success', `${badgeInfo?.name || badgeType} badge added successfully.`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add badge');
    } finally {
      setLoadingBadges(false);
      setShowBadgeModal(false);
    }
  };

  const handleRemoveBadge = async (badgeId: string, badgeType: string) => {
    Alert.alert(
      'Remove Badge',
      `Are you sure you want to remove the ${badgeType} badge?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/badges/${badgeId}`);
              // Refresh user profile
              const profileResponse = await apiClient.get('/me');
              const userData = profileResponse.data?.data || profileResponse.data;
              updateUser(userData);
              Alert.alert('Success', 'Badge removed successfully.');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to remove badge');
            }
          },
        },
      ]
    );
  };

  const getUserBadge = (badgeType: string) => {
    return user?.badges?.find(b => b.badgeType === badgeType);
  };

  const getBadgeName = (badgeType: string) => {
    const badgeInfo = availableBadgeTypes.find(bt => bt.type === badgeType);
    return badgeInfo?.name || badgeType;
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
      bounces={true}
      nestedScrollEnabled={true}
    >
      <View style={styles.header}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
            {user?.avatarUrl ? (
              <OptimizedImage
                source={user.avatarSizes ? { url: user.avatarUrl, sizes: user.avatarSizes } : user.avatarUrl}
                style={styles.profilePhoto}
                size="full"
                resizeMode="cover"
                placeholder={
                  <View style={styles.profilePhotoPlaceholder}>
                    <Ionicons name="person" size={50} color="#999" />
                  </View>
                }
              />
            ) : (
              <View style={styles.profilePhotoPlaceholder}>
                <Ionicons name="person" size={50} color="#999" />
              </View>
            )}
            {uploadingPhoto && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
            <TouchableOpacity
              style={styles.photoEditButton}
              onPress={handleUploadPhoto}
              disabled={uploadingPhoto}
            >
              <Ionicons name="camera" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.nameContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user?.name || 'No name set'}</Text>
            {user?.nameVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={18} color="#27AE60" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
            {user?.universityEmailVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="school" size={16} color="#2196F3" />
                <Text style={[styles.verifiedText, { color: '#2196F3' }]}>University Email</Text>
              </View>
            )}
            {user?.officeEmailVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="briefcase" size={16} color="#9B59B6" />
                <Text style={[styles.verifiedText, { color: '#9B59B6' }]}>Office Email</Text>
              </View>
            )}
            {user?.isAlumni && user?.alumniVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="school" size={16} color="#FF9800" />
                <Text style={[styles.verifiedText, { color: '#FF9800' }]}>Alumni Verified</Text>
              </View>
            )}
            {user?.isAlumni && !user?.alumniVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: '#F5F5F5' }]}>
                <Ionicons name="school-outline" size={16} color="#999" />
                <Text style={[styles.verifiedText, { color: '#999' }]}>Alumni (Pending Verification)</Text>
              </View>
            )}
          </View>
          {user?.university && (
            <View style={styles.universityInfo}>
              <Ionicons name="school" size={16} color="#2196F3" />
              <Text style={styles.universityText}>{user.university.name}</Text>
              {user.university.country && (
                <Text style={styles.countryText}>
                  {' • '}
                  {typeof user.university.country === 'object' && user.university.country !== null
                    ? user.university.country.name
                    : user.university.country}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{user?.name || 'Not set'}</Text>
        <View style={styles.nameActions}>
          {!user?.nameVerified && (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => {
                setNameInput(user?.name || '');
                setShowNameModal(true);
              }}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
          {!user?.nameVerified && (
            <TouchableOpacity 
              style={[styles.editButton, { marginLeft: 10 }]}
              onPress={() => {
                (navigation as any).navigate('NameVerification');
              }}
            >
              <Text style={styles.editButtonText}>Verify Name</Text>
            </TouchableOpacity>
          )}
        </View>
        {user?.nameVerified && (
          <Text style={styles.verifiedHint}>
            ✓ Your name is verified and cannot be changed
          </Text>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Personal Email</Text>
        <TouchableOpacity onPress={() => handleEditField('personalEmail', user?.personalEmail || '')}>
          <Text style={styles.value}>{user?.personalEmail || 'Not set'}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => handleEditField('personalEmail', user?.personalEmail || '')}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Secondary Contact</Text>
        <TouchableOpacity onPress={() => handleEditField('secondaryContact', user?.secondaryContact || '')}>
          <Text style={styles.value}>{user?.secondaryContact || 'Not set'}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => handleEditField('secondaryContact', user?.secondaryContact || '')}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Common Profile Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.fieldRow}>
          <Text style={styles.label}>Gender</Text>
          <TouchableOpacity onPress={() => setShowGenderModal(true)}>
            <Text style={styles.value}>{user?.gender || 'Not set'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity onPress={() => handleEditField('dateOfBirth', user?.dateOfBirth || '')}>
            <Text style={styles.value}>
              {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not set'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.label}>Mobile Number</Text>
          <TouchableOpacity onPress={() => handleEditField('phoneNumber', user?.phoneNumber || '')}>
            <Text style={styles.value}>{user?.phoneNumber || 'Not set'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.label}>Bio</Text>
          <TouchableOpacity onPress={() => handleEditField('bio', user?.bio || '')}>
            <Text style={styles.value}>{user?.bio || 'Not set'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.label}>Interests</Text>
          <TouchableOpacity onPress={() => handleEditInterests()}>
            <Text style={styles.value}>
              {user?.interests && user.interests.length > 0 
                ? user.interests.join(', ') 
                : 'Not set'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Student-Specific Information */}
      {user?.profileMode === 'student' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Information</Text>
          
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Department</Text>
            <TouchableOpacity onPress={() => handleEditField('department', user?.department || '')}>
              <Text style={styles.value}>{user?.department || 'Not set'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Programme</Text>
            <TouchableOpacity onPress={() => handleEditField('programme', user?.programme || '')}>
              <Text style={styles.value}>{user?.programme || 'Not set'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Semester</Text>
            <TouchableOpacity onPress={() => handleEditField('semester', user?.semester || '')}>
              <Text style={styles.value}>{user?.semester || 'Not set'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Expected Graduation Year</Text>
            <TouchableOpacity onPress={() => handleEditField('passingYear', user?.passingYear?.toString() || '')}>
              <Text style={styles.value}>
                {user?.passingYear ? user.passingYear.toString() : 'Not set'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Alumni-Specific Information (shown when isAlumni=true, regardless of profileMode) */}
      {user?.isAlumni && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alumni Information</Text>
          
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Graduation Year</Text>
            <TouchableOpacity onPress={() => handleEditField('graduationYear', user?.graduationYear?.toString() || '')}>
              <Text style={styles.value}>
                {user?.graduationYear ? user.graduationYear.toString() : 'Not set'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Current Status</Text>
            <TouchableOpacity onPress={() => handleEditField('currentStatus', user?.currentStatus || '')}>
              <Text style={styles.value}>{user?.currentStatus || 'Not set'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Professional Headline</Text>
            <TouchableOpacity onPress={() => handleEditField('headline', user?.headline || '')}>
              <Text style={styles.value}>{user?.headline || 'Not set'}</Text>
            </TouchableOpacity>
          </View>

          {user?.skills && Array.isArray(user.skills) && user.skills.length > 0 && (
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Skills</Text>
              <Text style={styles.value}>{user.skills.join(', ')}</Text>
            </View>
          )}
        </View>
      )}

      {/* Teacher-Specific Information */}
      {user?.isTeacher && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Teacher Information</Text>
          
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Professional Headline</Text>
            <TouchableOpacity onPress={() => handleEditField('headline', user?.headline || '')}>
              <Text style={styles.value}>{user?.headline || 'Not set'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Research Interests</Text>
            <TouchableOpacity onPress={() => handleEditResearchInterests()}>
              <Text style={styles.value}>
                {user?.researchInterests 
                  ? (Array.isArray(user.researchInterests) 
                      ? user.researchInterests.join(', ') 
                      : JSON.stringify(user.researchInterests))
                  : 'Not set'}
              </Text>
            </TouchableOpacity>
          </View>

          {user?.skills && Array.isArray(user.skills) && user.skills.length > 0 && (
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Skills</Text>
              <Text style={styles.value}>{user.skills.join(', ')}</Text>
            </View>
          )}
        </View>
      )}

      {/* Professional-Specific Information */}
      {user?.profileMode === 'professional' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Information</Text>
          
          {user?.organization && (
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Organization</Text>
              <Text style={styles.value}>
                {user.organization.name}
                {user.organization.country && (
                  <Text style={styles.countryText}>
                    {' • '}
                    {typeof user.organization.country === 'object' 
                      ? user.organization.country.name 
                      : user.organization.country}
                  </Text>
                )}
              </Text>
            </View>
          )}

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Department/Division</Text>
            <TouchableOpacity onPress={() => handleEditField('department', user?.department || '')}>
              <Text style={styles.value}>{user?.department || 'Not set'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Professional Headline</Text>
            <TouchableOpacity onPress={() => handleEditField('headline', user?.headline || '')}>
              <Text style={styles.value}>{user?.headline || 'Not set'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Current Position</Text>
            <TouchableOpacity onPress={() => handleEditField('currentStatus', user?.currentStatus || '')}>
              <Text style={styles.value}>{user?.currentStatus || 'Not set'}</Text>
            </TouchableOpacity>
          </View>

          {user?.skills && Array.isArray(user.skills) && user.skills.length > 0 && (
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Skills</Text>
              <Text style={styles.value}>{user.skills.join(', ')}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Profile Mode</Text>
        <Text style={styles.value}>{user?.profileMode}</Text>
        {user?.verificationStatus === 'pending' && (user?.profileMode === 'student') && (
          <Text style={styles.pendingText}>
            ⏳ You have a pending verification request. You will remain in Student mode until approved.
          </Text>
        )}
        <View style={styles.modeButtons}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              user?.profileMode === 'student' && styles.modeButtonActive
            ]}
            onPress={() => handleChangeProfileMode('student')}
          >
            <Text style={[
              styles.modeButtonText,
              user?.profileMode === 'student' && styles.modeButtonTextActive
            ]}>Student</Text>
          </TouchableOpacity>
          {/* Teacher is now a badge, not a profileMode */}
          <TouchableOpacity
            style={[
              styles.modeButton,
              user?.profileMode === 'professional' && styles.modeButtonActive
            ]}
            onPress={() => handleChangeProfileMode('professional')}
          >
            <Text style={[
              styles.modeButtonText,
              user?.profileMode === 'professional' && styles.modeButtonTextActive
            ]}>Professional</Text>
          </TouchableOpacity>
        </View>
      </View>

      {user?.profileMode === 'professional' && (
        <View style={styles.section}>
          <Text style={styles.label}>Badges</Text>
          <View style={styles.badgeContainer}>
            {/* Show existing badges */}
            {user?.badges && user.badges.length > 0 && (
              <>
                {user.badges.map((badge) => (
                  <View key={badge.id} style={styles.badgeItem}>
                    <View style={[styles.badgeButton, badge.verified && styles.badgeButtonActive]}>
                      <Text style={[
                        styles.badgeButtonText,
                        badge.verified && styles.badgeButtonTextActive
                      ]}>
                        {badge.verified ? '✓' : '○'} {getBadgeName(badge.badgeType)}
                      </Text>
                      {badge.verified && (
                        <Text style={styles.verifiedText}>Verified</Text>
                      )}
                      {!badge.verified && (
                        <Text style={styles.pendingText}>Pending Verification</Text>
                      )}
                    </View>
                    {!badge.verified && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                          style={styles.verifyBadgeButton}
                          onPress={() => {
                            const badgeInfo = availableBadgeTypes.find(bt => bt.type === badge.badgeType);
                            (navigation as any).navigate('BadgeVerification', { 
                              badgeId: badge.id,
                              badgeType: badge.badgeType, 
                              badgeName: getBadgeName(badge.badgeType),
                              existingDocuments: badge.documents 
                            });
                          }}
                        >
                          <Text style={styles.verifyBadgeButtonText}>Submit Documents</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeBadgeButton}
                          onPress={() => handleRemoveBadge(badge.id, badge.badgeType)}
                        >
                          <Ionicons name="close-circle" size={20} color="#E74C3C" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}
            
            {/* Show available badges to add */}
            {availableBadgeTypes
              .filter(bt => !getUserBadge(bt.type))
              .map((badgeType) => (
                <TouchableOpacity
                  key={badgeType.type}
                  style={styles.badgeButton}
                  onPress={() => handleAddBadge(badgeType.type)}
                  disabled={loadingBadges}
                >
                  <Text style={styles.badgeButtonText}>
                    + {badgeType.name}
                  </Text>
                  {badgeType.requiresVerification && (
                    <Text style={styles.badgeRequiresVerification}>Requires Verification</Text>
                  )}
                </TouchableOpacity>
              ))}
          </View>
          {loadingBadges && (
            <ActivityIndicator size="small" color="#5C7AEA" style={{ marginTop: 10 }} />
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Verification Status</Text>
        <Text style={[styles.value, styles.status]}>
          {user?.verificationStatus || 'pending'}
        </Text>
      </View>
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      {/* Name Edit Modal */}
      <Modal
        visible={showNameModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Name</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Enter your name"
              value={nameInput}
              onChangeText={setNameInput}
              autoCapitalize="words"
              maxLength={100}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowNameModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveName}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Generic Field Edit Modal */}
      <Modal
        visible={showFieldModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFieldModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit {editingField ? editingField.charAt(0).toUpperCase() + editingField.slice(1).replace(/([A-Z])/g, ' $1') : 'Field'}
            </Text>
            <TextInput
              style={styles.nameInput}
              placeholder={`Enter ${editingField || 'value'}`}
              value={fieldInput}
              onChangeText={setFieldInput}
              keyboardType={
                editingField === 'passingYear' || editingField === 'graduationYear'
                  ? 'numeric'
                  : editingField === 'phoneNumber'
                  ? 'phone-pad'
                  : editingField === 'dateOfBirth'
                  ? 'default'
                  : 'default'
              }
              maxLength={
                editingField === 'passingYear' || editingField === 'graduationYear'
                  ? 4
                  : editingField === 'phoneNumber'
                  ? 20
                  : 500
              }
            />
            {editingField === 'dateOfBirth' && (
              <Text style={styles.helpText}>Format: YYYY-MM-DD (e.g., 2000-01-15)</Text>
            )}
            {editingField === 'phoneNumber' && (
              <Text style={styles.helpText}>Include country code if needed (e.g., +1234567890)</Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowFieldModal(false);
                  setEditingField(null);
                  setFieldInput('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveField}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Interests Edit Modal */}
      <Modal
        visible={showInterestsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInterestsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Interests</Text>
            <Text style={styles.helpText}>Enter interests separated by commas (e.g., Music, Sports, Reading)</Text>
            <TextInput
              style={[styles.nameInput, { minHeight: 100, textAlignVertical: 'top' }]}
              placeholder="Enter your interests"
              value={interestsInput}
              onChangeText={setInterestsInput}
              multiline
              maxLength={500}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowInterestsModal(false);
                  setInterestsInput('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveInterests}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Research Interests Edit Modal */}
      <Modal
        visible={showResearchInterestsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResearchInterestsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Research Interests</Text>
            <Text style={styles.helpText}>Enter research areas separated by commas (e.g., AI, Machine Learning, Data Science)</Text>
            <TextInput
              style={[styles.nameInput, { minHeight: 100, textAlignVertical: 'top' }]}
              placeholder="Enter your research interests"
              value={researchInterestsInput}
              onChangeText={setResearchInterestsInput}
              multiline
              maxLength={500}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowResearchInterestsModal(false);
                  setResearchInterestsInput('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveResearchInterests}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalWarningText}>
              This action cannot be undone. All your data will be permanently deleted.
            </Text>
            <Text style={styles.modalInstructionText}>
              Type <Text style={styles.deleteText}>DELETE</Text> to confirm:
            </Text>
            <TextInput
              style={styles.deleteInput}
              placeholder="Type DELETE"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonDelete,
                  deleteConfirmText !== 'DELETE' && styles.modalButtonDisabled
                ]}
                onPress={confirmDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
              >
                <Text style={styles.modalButtonTextDelete}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Extra padding to ensure all content is scrollable above bottom nav
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  photoSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F7FB',
  },
  profilePhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F7FB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#5C7AEA',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4EDDA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27AE60',
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: '600',
  },
  universityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    gap: 6,
    flexWrap: 'wrap',
  },
  universityText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  countryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FB',
  },
  label: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
    flex: 1,
  },
  value: {
    fontSize: 16,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  subValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  editButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  editButtonText: {
    fontSize: 14,
    color: '#5C7AEA',
    fontWeight: '600',
  },
  nameActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  verifiedHint: {
    fontSize: 12,
    color: '#27AE60',
    marginTop: 8,
    fontStyle: 'italic',
  },
  status: {
    fontWeight: '600',
    color: '#5C7AEA',
  },
  pendingText: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 8,
    fontStyle: 'italic',
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modeButtonActive: {
    backgroundColor: '#5C7AEA',
    borderColor: '#5C7AEA',
  },
  modeButtonText: {
    fontSize: 14,
    color: '#5C7AEA',
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  actionButtonsContainer: {
    paddingBottom: 100, // Extra padding to ensure buttons are visible above bottom nav
  },
  logoutButton: {
    backgroundColor: '#5C7AEA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 15,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 30,
    marginHorizontal: 15,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonCancel: {
    backgroundColor: '#F5F7FB',
  },
  modalButtonSave: {
    backgroundColor: '#5C7AEA',
  },
  modalButtonTextCancel: {
    color: '#666',
    fontWeight: '600',
  },
  modalButtonTextSave: {
    color: '#fff',
    fontWeight: '600',
  },
  modalWarningText: {
    fontSize: 14,
    color: '#E74C3C',
    marginBottom: 15,
    lineHeight: 20,
  },
  modalInstructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  deleteText: {
    fontWeight: 'bold',
    color: '#E74C3C',
  },
  deleteInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  modalButtonDelete: {
    backgroundColor: '#E74C3C',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonTextDelete: {
    color: '#fff',
    fontWeight: '600',
  },
  badgeContainer: {
    marginTop: 10,
  },
  badgeButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
  },
  badgeButtonActive: {
    borderColor: '#2358d6',
    backgroundColor: '#E8F0FE',
  },
  badgeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  badgeButtonTextActive: {
    color: '#2358d6',
    fontWeight: '600',
  },
  badgeDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeBadgeButton: {
    marginLeft: 10,
    padding: 5,
  },
  verifyBadgeButton: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#5C7AEA',
    borderRadius: 6,
  },
  verifyBadgeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeRequiresVerification: {
    fontSize: 10,
    color: '#FF9800',
    marginTop: 4,
    fontStyle: 'italic',
  },
  genderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#F5F7FB',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  genderOptionSelected: {
    backgroundColor: '#E8F0FE',
    borderColor: '#5C7AEA',
  },
  genderOptionText: {
    fontSize: 16,
    color: '#333',
  },
  genderOptionTextSelected: {
    color: '#5C7AEA',
    fontWeight: '600',
  },
});
