import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';

export default function PendingApprovalScreen() {
  const { user, checkAuth } = useAuthStore();

  useEffect(() => {
    // Poll every 6 hours for approval
    const interval = setInterval(() => {
      checkAuth();
    }, 6 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verification Pending</Text>
      <Text style={styles.message}>
        Your alumni account is under review. We'll notify you within 24 hours once it's approved.
      </Text>
      <Text style={styles.status}>
        Status: {user?.verificationStatus || 'pending'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F7FB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  status: {
    fontSize: 14,
    color: '#5C7AEA',
    fontWeight: '600',
  },
});

