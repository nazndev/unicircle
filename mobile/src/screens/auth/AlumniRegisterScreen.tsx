import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import * as ImagePicker from 'expo-image-picker';

export default function AlumniRegisterScreen() {
  const navigation = useNavigation();
  const { alumniRegister } = useAuthStore();
  const [formData, setFormData] = useState({
    fullName: '',
    personalEmail: '',
    universityId: '',
  });
  const [documents, setDocuments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      // In production, upload to server and get URLs
      const urls = result.assets.map(asset => asset.uri);
      setDocuments([...documents, ...urls]);
    }
  };

  const handleRegister = async () => {
    if (!formData.fullName || !formData.personalEmail || !formData.universityId) {
      Alert.alert('Error', 'Please fill all fields');
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
      navigation.navigate('PendingApproval' as never);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

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
      <TextInput
        style={styles.input}
        placeholder="University ID"
        value={formData.universityId}
        onChangeText={(text) => setFormData({ ...formData, universityId: text })}
      />
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
});

