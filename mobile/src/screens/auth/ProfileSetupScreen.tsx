import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';

export default function ProfileSetupScreen() {
  const navigation = useNavigation();
  const { completeOnboarding, user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user]);

  const handleComplete = async () => {
    if (!name || name.trim().length < 2) {
      Alert.alert('Error', 'Please enter your name (at least 2 characters)');
      return;
    }

    setLoading(true);
    try {
      // Update user profile with name
      const response = await apiClient.put('/me', { name: name.trim() });
      const userData = response.data?.data || response.data;
      updateUser(userData);

      // Complete onboarding
      await completeOnboarding();
      
      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' as never }],
      });
    } catch (error: any) {
      console.error('Failed to complete onboarding:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>
        Let others know who you are. Your name will be visible to other users.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Your Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          maxLength={100}
        />
        <Text style={styles.inputHint}>
          This will be displayed on your profile and visible to other users
        </Text>
      </View>

      {user?.university && (
        <View style={styles.universityInfo}>
          <Text style={styles.universityLabel}>University</Text>
          <View style={styles.universityBadge}>
            <Text style={styles.universityText}>✓ {user.university.name}</Text>
          </View>
        </View>
      )}

      {user?.isVerified && (
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedText}>✓ Verified</Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleComplete}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Saving...' : 'Continue to App'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  universityInfo: {
    marginBottom: 15,
  },
  universityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  universityBadge: {
    backgroundColor: '#D4EDDA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27AE60',
  },
  universityText: {
    fontSize: 14,
    color: '#27AE60',
    fontWeight: '600',
  },
  verifiedBadge: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
    marginBottom: 20,
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
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
});

