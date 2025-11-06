import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function HomeScreen() {
  const { user } = useAuthStore();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Welcome back, {user?.name || 'User'}!</Text>
      {user?.verificationStatus !== 'approved' && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Verification pending - under 24h manual review</Text>
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly Reveal</Text>
        <Text style={styles.cardText}>Check back Friday for new matches!</Text>
      </View>
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
    color: '#333',
    marginBottom: 20,
  },
  banner: {
    backgroundColor: '#FFE5B4',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  bannerText: {
    color: '#856404',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 14,
    color: '#666',
  },
});

