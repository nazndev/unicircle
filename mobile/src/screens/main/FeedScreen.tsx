import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import UserCard from '../../components/UserCard';

export default function FeedScreen() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const response = await apiClient.get('/posts?scope=university');
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feed</Text>
      {user?.verificationStatus !== 'approved' && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Read-only mode - verification pending</Text>
        </View>
      )}
      <FlatList
        data={posts}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: any) => (
          <View style={styles.post}>
            <UserCard
              name={item.author?.name}
              isVerified={item.author?.isVerified}
              university={item.author?.university}
              size="medium"
            />
            <Text style={styles.postContent}>{item.content}</Text>
            <View style={styles.postActions}>
              <TouchableOpacity>
                <Text style={styles.actionText}>Like ({item._count?.likes || 0})</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={styles.actionText}>Comment ({item._count?.comments || 0})</Text>
              </TouchableOpacity>
            </View>
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
  post: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  postAuthor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5C7AEA',
    marginBottom: 10,
  },
  postContent: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
  },
  postActions: {
    flexDirection: 'row',
    gap: 20,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
  },
});

