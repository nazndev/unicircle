import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface UserCardProps {
  name?: string;
  isVerified?: boolean;
  university?: {
    name: string;
    country?: string;
  };
  showUniversity?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function UserCard({ 
  name, 
  isVerified, 
  university, 
  showUniversity = true,
  size = 'medium' 
}: UserCardProps) {
  const nameSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;
  const badgeSize = size === 'small' ? 10 : 12;

  return (
    <View style={styles.container}>
      <View style={styles.nameRow}>
        <Text style={[styles.name, { fontSize: nameSize }]}>
          {name || 'Unknown User'}
        </Text>
        {isVerified && (
          <View style={[styles.verifiedBadge, { paddingHorizontal: badgeSize === 10 ? 6 : 8 }]}>
            <Text style={[styles.verifiedText, { fontSize: badgeSize }]}>✓</Text>
          </View>
        )}
      </View>
      {showUniversity && university && (
        <Text style={[styles.university, { fontSize: nameSize - 2 }]}>
          {university.name}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    fontWeight: '600',
    color: '#333',
  },
  verifiedBadge: {
    backgroundColor: '#D4EDDA',
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27AE60',
  },
  verifiedText: {
    color: '#27AE60',
    fontWeight: '700',
  },
  university: {
    color: '#666',
    marginTop: 2,
  },
});

