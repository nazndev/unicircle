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
      {user?.university && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>University:</Text>
          <Text style={styles.infoValue}>
            {user.university.name}
            {user.university.country && (
              <Text style={styles.countryText}>
                {' '}({typeof user.university.country === 'object' ? user.university.country.name : user.university.country})
              </Text>
            )}
          </Text>
        </View>
      )}
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
  infoContainer: {
    marginTop: 20,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  countryText: {
    fontSize: 14,
    color: '#5C7AEA',
    fontWeight: '400',
  },
});

