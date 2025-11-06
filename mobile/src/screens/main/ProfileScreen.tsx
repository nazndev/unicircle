import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete('/me');
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const handleChangeProfileMode = async (mode: string) => {
    try {
      await apiClient.put('/me/profile-mode', { profileMode: mode });
      const response = await apiClient.get('/me');
      updateUser(response.data);
      Alert.alert('Success', 'Profile mode updated');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{user?.name || 'Not set'}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Profile Mode</Text>
        <Text style={styles.value}>{user?.profileMode}</Text>
        <View style={styles.modeButtons}>
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => handleChangeProfileMode('student')}
          >
            <Text style={styles.modeButtonText}>Student</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => handleChangeProfileMode('alumni')}
          >
            <Text style={styles.modeButtonText}>Alumni</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => handleChangeProfileMode('professional')}
          >
            <Text style={styles.modeButtonText}>Professional</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Verification Status</Text>
        <Text style={[styles.value, styles.status]}>
          {user?.verificationStatus || 'pending'}
        </Text>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
        <Text style={styles.deleteButtonText}>Delete Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    padding: 20,
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
  status: {
    fontWeight: '600',
    color: '#5C7AEA',
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
  },
  modeButtonText: {
    fontSize: 14,
    color: '#5C7AEA',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#5C7AEA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
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
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

