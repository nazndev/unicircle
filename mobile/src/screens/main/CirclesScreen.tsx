import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import apiClient from '../../api/client';

export default function CirclesScreen() {
  const [circles, setCircles] = useState([]);

  useEffect(() => {
    loadCircles();
  }, []);

  const loadCircles = async () => {
    try {
      const response = await apiClient.get('/groups');
      setCircles(response.data);
    } catch (error) {
      console.error('Failed to load circles:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Circles</Text>
      <FlatList
        data={circles}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: any) => (
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemDescription}>{item.description}</Text>
            <Text style={styles.itemCount}>
              {item._count?.members || 0} members
            </Text>
          </TouchableOpacity>
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
  item: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  itemCount: {
    fontSize: 12,
    color: '#999',
  },
});

