import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function NameVerificationScreen() {
  const navigation = useNavigation();
  const { user, updateUser } = useAuthStore();
  const [documents, setDocuments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadDocument(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadDocument = async (uri: string) => {
    try {
      setUploading(true);
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'document.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('file', {
        uri,
        name: filename,
        type: mimeType,
      } as any);

      const response = await apiClient.post('/upload/name-verification-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const documentUrl = response.data?.data?.url || response.data?.url;
      if (documentUrl) {
        setDocuments([...documents, documentUrl]);
        Alert.alert('Success', 'Document uploaded successfully');
      }
    } catch (error: any) {
      console.error('Error uploading document:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = (index: number) => {
    Alert.alert(
      'Remove Document',
      'Are you sure you want to remove this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setDocuments(documents.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (documents.length === 0) {
      Alert.alert('Documents Required', 'Please upload at least one document for name verification.');
      return;
    }

    Alert.alert(
      'Submit Name Verification',
      'Are you sure you want to submit these documents for name verification? Once verified, you will not be able to change your name.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setSubmitting(true);
              const response = await apiClient.put('/me', {
                nameVerificationDocuments: documents,
              });
              const userData = response.data?.data || response.data;
              updateUser(userData);
              Alert.alert(
                'Success',
                'Name verification request submitted successfully. Our admin team will review your documents and notify you once verified.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to submit name verification');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (user?.nameVerified) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.verifiedContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#27AE60" />
          <Text style={styles.verifiedTitle}>Name Verified</Text>
          <Text style={styles.verifiedText}>
            Your name has been verified. You cannot change your name anymore.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Name Verification</Text>
        <Text style={styles.subtitle}>
          Submit documents to verify your name. Once verified, you will receive a verified badge and will not be able to change your name.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accepted Documents</Text>
        <Text style={styles.documentList}>
          • Office ID card with name{'\n'}
          • Business card{'\n'}
          • Certificate (degree, diploma, etc.){'\n'}
          • National ID (NID){'\n'}
          • Passport{'\n'}
          • Driver's license{'\n'}
          • Any official document showing your name
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload Documents</Text>
        <Text style={styles.hint}>
          Upload at least one document that clearly shows your name. You can upload multiple documents for better verification.
        </Text>

        <View style={styles.documentsContainer}>
          {documents.map((doc, index) => (
            <View key={index} style={styles.documentItem}>
              <Image source={{ uri: doc }} style={styles.documentImage} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeDocument(index)}
              >
                <Ionicons name="close-circle" size={24} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#5C7AEA" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={32} color="#5C7AEA" />
                <Text style={styles.uploadButtonText}>Add Document</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, (documents.length === 0 || submitting) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={documents.length === 0 || submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit for Verification</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  documentList: {
    fontSize: 14,
    color: '#666',
    lineHeight: 24,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  documentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  documentItem: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  documentImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  uploadButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#5C7AEA',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FB',
  },
  uploadButtonText: {
    fontSize: 12,
    color: '#5C7AEA',
    marginTop: 5,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#5C7AEA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    margin: 20,
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  verifiedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  verifiedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27AE60',
    marginTop: 20,
    marginBottom: 10,
  },
  verifiedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

