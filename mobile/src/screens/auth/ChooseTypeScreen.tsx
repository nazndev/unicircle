import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../../api/client';

interface AvailableAccountTypes {
  student: boolean;
  professional: boolean;
}

export default function ChooseTypeScreen() {
  const navigation = useNavigation();
  const [availableTypes, setAvailableTypes] = useState<AvailableAccountTypes>({
    student: true,
    professional: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailableAccountTypes();
  }, []);

  const loadAvailableAccountTypes = async () => {
    try {
      const response = await apiClient.get('/settings/account-types');
      console.log('[CHOOSE TYPE] Full response:', response.data);
      
      // Handle nested response structure: { data: { success: true, data: {...} } } or { data: {...} }
      let data = response.data;
      if (data?.data && typeof data.data === 'object' && 'success' in data.data) {
        // Double nested: { data: { success: true, data: {...} } }
        data = data.data.data;
      } else if (data?.data && typeof data.data === 'object') {
        // Single nested: { data: {...} }
        data = data.data;
      } else if (data?.success && data?.data) {
        // { success: true, data: {...} }
        data = data.data;
      }
      
      console.log('[CHOOSE TYPE] Extracted data:', data);
      
      if (data) {
        // Use !== undefined to preserve false values
        setAvailableTypes({
          student: data.student !== undefined ? data.student : true,
          professional: data.professional !== undefined ? data.professional : true,
        });
        console.log('[CHOOSE TYPE] Available types set:', {
          student: data.student !== undefined ? data.student : true,
          professional: data.professional !== undefined ? data.professional : true,
        });
      }
    } catch (error) {
      console.error('[CHOOSE TYPE] Failed to load available account types:', error);
      // Default to all enabled if API fails
    } finally {
      setLoading(false);
    }
  };

  const handleStudentPress = async () => {
    try {
      // Save account type preference
      await SecureStore.setItemAsync('lastAccountType', 'student');
      console.log('[ChooseType] Saved account type: student');
      (navigation as any).navigate('Email', { accountType: 'student' });
    } catch (error) {
      console.error('[ChooseType] Error saving preference:', error);
      (navigation as any).navigate('Email', { accountType: 'student' });
    }
  };



  const handleProfessionalPress = async () => {
    try {
      // Save account type preference
      await SecureStore.setItemAsync('lastAccountType', 'professional');
      console.log('[ChooseType] Saved account type: professional');
      // Professionals register with their office email or university email
      (navigation as any).navigate('Email', { accountType: 'professional' });
    } catch (error) {
      console.error('[ChooseType] Error saving preference:', error);
      (navigation as any).navigate('Email', { accountType: 'professional' });
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#5C7AEA" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Check if any account type is available
  const hasAvailableTypes = availableTypes.student || availableTypes.professional;

  if (!hasAvailableTypes) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Ionicons name="lock-closed-outline" size={64} color="#999" />
        <Text style={styles.title}>Registration Temporarily Unavailable</Text>
        <Text style={styles.subtitle}>
          New account registrations are currently disabled. Please contact support for assistance.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Account Type</Text>
        <Text style={styles.subtitle}>Select the option that best describes you</Text>
        <Text style={styles.hintText}>
          Your selection will be remembered for faster login next time
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {availableTypes.student && (
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleStudentPress}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, styles.studentIconContainer]}>
              <Ionicons name="school-outline" size={32} color="#5C7AEA" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>I'm a Student</Text>
              <Text style={styles.optionDescription}>
                Sign in with your university email address. Quick and easy verification.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>
        )}


        {availableTypes.professional && (
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleProfessionalPress}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, styles.professionalIconContainer]}>
              <Ionicons name="briefcase-outline" size={32} color="#8B5CF6" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>I'm a Professional</Text>
              <Text style={styles.optionDescription}>
                Sign in with your organization email. Connect with professionals and alumni from your organization or university.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Your account type can be changed later in settings
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8EEFF',
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 48,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0F2F82',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4F5B7A',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#8A95B2',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 30,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0C1F5B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#D6E0FF',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  studentIconContainer: {
    backgroundColor: '#D9E4FF',
  },
  alumniIconContainer: {
    backgroundColor: '#DDF5E4',
  },
  teacherIconContainer: {
    backgroundColor: '#FFE5D4',
  },
  professionalIconContainer: {
    backgroundColor: '#E8D5F2',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#132A63',
    marginBottom: 6,
  },
  optionDescription: {
    fontSize: 14,
    color: '#5A678B',
    lineHeight: 20,
  },
  footer: {
    paddingTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6D7BA8',
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

