import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';

export default function CrushScreen() {
  const { user } = useAuthStore();
  const [crushes, setCrushes] = useState<any>({ sent: [], received: [] });

  useEffect(() => {
    loadCrushes();
  }, []);

  const loadCrushes = async () => {
    try {
      const response = await apiClient.get('/crush/mine');
      setCrushes(response.data);
    } catch (error) {
      console.error('Failed to load crushes:', error);
    }
  };

  if (user?.verificationStatus !== 'approved') {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>You must be verified to use this feature</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Crushes</Text>
      <Text style={styles.sectionTitle}>Sent ({crushes.sent?.length || 0})</Text>
      <FlatList
        data={crushes.sent || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemName}>{item.toUser?.name || 'Unknown'}</Text>
            <Text style={styles.itemStatus}>Status: {item.status}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#666',
  },
  item: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
});

