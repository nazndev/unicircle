import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import Ionicons from '@expo/vector-icons/Ionicons';

interface ResearchOpportunity {
  id: string;
  title: string;
  description: string;
  researchArea: string;
  location: string;
  duration?: string;
  compensation?: string;
  teacher: {
    name: string;
    department?: string;
    university: {
      name: string;
    };
  };
  university: {
    name: string;
    country: string;
  };
  _count: {
    applications: number;
  };
  status: string;
}

export default function ResearchScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [opportunities, setOpportunities] = useState<ResearchOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async () => {
    try {
      const response = await apiClient.get('/research?status=open');
      const data = response.data?.data || response.data || [];
      setOpportunities(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load research opportunities:', error);
      Alert.alert('Error', 'Failed to load research opportunities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOpportunities();
  };

  const renderOpportunity = ({ item }: { item: ResearchOpportunity }) => (
    <TouchableOpacity
      style={styles.opportunityCard}
      onPress={() => navigation.navigate('ResearchDetail' as never, { opportunityId: item.id } as never)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.opportunityTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, item.status === 'open' && styles.statusOpen]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.researchArea}>{item.researchArea}</Text>
      
      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.infoRow}>
          <Ionicons name="school-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.university.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.teacher.name}</Text>
        </View>
        {item.location && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{item.location}</Text>
          </View>
        )}
      </View>

      {item._count?.applications > 0 && (
        <Text style={styles.applicationsCount}>
          {item._count.applications} application{item._count.applications !== 1 ? 's' : ''}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading && opportunities.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading research opportunities...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={opportunities}
        renderItem={renderOpportunity}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#999" />
            <Text style={styles.emptyText}>No research opportunities available</Text>
            <Text style={styles.emptySubtext}>
              Check back later or contact your university
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FB',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  opportunityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  opportunityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
  },
  statusOpen: {
    backgroundColor: '#D4EDDA',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#27AE60',
    textTransform: 'capitalize',
  },
  researchArea: {
    fontSize: 14,
    color: '#5C7AEA',
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
  },
  applicationsCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

