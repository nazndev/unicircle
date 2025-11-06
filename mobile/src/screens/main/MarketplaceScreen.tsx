import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';

export default function MarketplaceScreen() {
  const { user } = useAuthStore();
  const [listings, setListings] = useState([]);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      const response = await apiClient.get('/marketplace');
      setListings(response.data);
    } catch (error) {
      console.error('Failed to load listings:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Marketplace</Text>
      {user?.verificationStatus === 'approved' && (
        <TouchableOpacity style={styles.postButton}>
          <Text style={styles.postButtonText}>Post Listing</Text>
        </TouchableOpacity>
      )}
      {user?.verificationStatus !== 'approved' && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Read-only mode - verification required to post</Text>
        </View>
      )}
      <FlatList
        data={listings}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: any) => (
          <View style={styles.listing}>
            <Text style={styles.listingTitle}>{item.title}</Text>
            <Text style={styles.listingDescription} numberOfLines={2}>
              {item.description}
            </Text>
            {item.price && (
              <Text style={styles.listingPrice}>${item.price}</Text>
            )}
            <Text style={styles.listingCategory}>{item.category}</Text>
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
  postButton: {
    backgroundColor: '#5C7AEA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  banner: {
    backgroundColor: '#FFE5B4',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  bannerText: {
    color: '#856404',
    fontSize: 12,
  },
  listing: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  listingDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27AE60',
    marginBottom: 5,
  },
  listingCategory: {
    fontSize: 12,
    color: '#999',
  },
});

