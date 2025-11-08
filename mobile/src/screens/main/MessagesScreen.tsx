import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import apiClient from '../../api/client';
import UserCard from '../../components/UserCard';

export default function MessagesScreen() {
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      const response = await apiClient.get('/match/mine');
      setMatches(response.data);
    } catch (error) {
      console.error('Failed to load matches:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messages</Text>
      <FlatList
        data={matches}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: any) => (
          <TouchableOpacity style={styles.match}>
            <UserCard
              name={item.otherUser?.name}
              isVerified={item.otherUser?.isVerified}
              university={item.otherUser?.university}
              size="medium"
            />
            {item.messages?.[0] && (
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.messages[0].content}
              </Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No matches yet. Start crushing!</Text>
        }
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
  match: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  matchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 50,
  },
});

