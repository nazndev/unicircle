import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function CountryInactiveScreen() {
  const { countryInactiveError, clearCountryInactiveError, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    clearCountryInactiveError();
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle" size={80} color="#FF6B6B" />
      </View>
      
      <Text style={styles.title}>Country Deactivated</Text>
      
      <Text style={styles.message}>
        {countryInactiveError?.message || 'Your country has been deactivated. Please contact support for assistance.'}
      </Text>

      {countryInactiveError?.country && (
        <View style={styles.countryBadge}>
          <Text style={styles.countryText}>
            <Ionicons name="flag-outline" size={16} color="#666" /> {countryInactiveError.country}
          </Text>
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>What does this mean?</Text>
        <Text style={styles.infoText}>
          Your country has been temporarily deactivated on our platform. This may be due to regulatory changes or platform updates.
        </Text>
        <Text style={styles.infoText}>
          Please contact our support team for more information and assistance.
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.contactButton} onPress={() => {
        // TODO: Open support contact
        console.log('Contact support');
      }}>
        <Ionicons name="mail-outline" size={20} color="#5C7AEA" />
        <Text style={styles.contactButtonText}>Contact Support</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F7FB',
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  countryBadge: {
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 30,
  },
  countryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  contactButtonText: {
    color: '#5C7AEA',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

