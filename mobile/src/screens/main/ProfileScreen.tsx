import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, TextInput, Image, ActivityIndicator, Platform, ActionSheetIOS } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import OptimizedImage from '../../components/OptimizedImage';

export default function ProfileScreen() {
  const { user, logout, updateUser, loadFeatures } = useAuthStore();
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

    // Don't allow going back to student if already alumni/teacher
    if (mode === 'student' && (user?.profileMode === 'alumni' || user?.profileMode === 'teacher')) {
      Alert.alert(
        'Cannot Change Mode',
        'Once you graduate or become a teacher, you cannot revert to student status.'
      );
      return;
    }

    // Show confirmation dialog
    const modeLabels: { [key: string]: string } = {
      student: 'Student',
      alumni: 'Alumni',
      teacher: 'Teacher',
    };

    Alert.alert(
      'Change Profile Mode',
      `Are you sure you want to switch to ${modeLabels[mode]} mode?${
        mode === 'alumni' || mode === 'teacher'
          ? '\n\nThis will require admin verification. You will remain in Student mode until your verification is approved.'
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
              
              if (mode === 'alumni' || mode === 'teacher') {
                Alert.alert(
                  'Verification Request Submitted',
                  'Your request to switch to ' + modeLabels[mode] + ' mode has been submitted. You will remain in Student mode until admin approves your verification. You will be notified once approved.',
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
          <Text style={styles.name}>{user?.name || 'No name set'}</Text>
          {user?.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          )}
        </View>
        {user?.university && (
          <View style={styles.universityBadge}>
            <Text style={styles.universityText}>🏛️ {user.university.name}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{user?.name || 'Not set'}</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => {
            setNameInput(user?.name || '');
            setShowNameModal(true);
          }}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email}</Text>
      </View>
      {user?.university && (
        <View style={styles.section}>
          <Text style={styles.label}>University</Text>
          <Text style={styles.value}>{user.university.name}</Text>
          {user.university.country && (
            <Text style={styles.subValue}>
              {typeof user.university.country === 'object' && user.university.country !== null
                ? user.university.country.name
                : user.university.country}
            </Text>
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
          <TouchableOpacity
            style={[
              styles.modeButton,
              user?.profileMode === 'alumni' && styles.modeButtonActive
            ]}
            onPress={() => handleChangeProfileMode('alumni')}
          >
            <Text style={[
              styles.modeButtonText,
              user?.profileMode === 'alumni' && styles.modeButtonTextActive
            ]}>Alumni</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              user?.profileMode === 'teacher' && styles.modeButtonActive
            ]}
            onPress={() => handleChangeProfileMode('teacher')}
          >
            <Text style={[
              styles.modeButtonText,
              user?.profileMode === 'teacher' && styles.modeButtonTextActive
            ]}>Teacher</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  verifiedBadge: {
    backgroundColor: '#D4EDDA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27AE60',
  },
  verifiedText: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: '600',
  },
  universityBadge: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  universityText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
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
  label: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: '#333',
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
});
