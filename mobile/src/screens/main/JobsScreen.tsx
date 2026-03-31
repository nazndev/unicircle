import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';

export default function JobsScreen() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const response = await apiClient.get('/jobs');
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Jobs</Text>
      {(user?.isAlumni || user?.isTeacher || user?.verificationStatus === 'approved') && (
        <TouchableOpacity style={styles.postButton}>
          <Text style={styles.postButtonText}>Post a Job</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={jobs}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: any) => (
          <View style={styles.job}>
            <Text style={styles.jobTitle}>{item.title}</Text>
            <Text style={styles.jobDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles.jobLocation}>{item.location}</Text>
            <TouchableOpacity style={styles.applyButton}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
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
  job: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  jobDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  jobLocation: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  applyButton: {
    backgroundColor: '#27AE60',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

