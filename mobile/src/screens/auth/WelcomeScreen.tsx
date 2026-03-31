import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';

export default function WelcomeScreen() {
  const navigation = useNavigation();

  // Removed auto-navigation - users should always see Welcome screen and choose account type
  // This ensures they can see all available options and make an informed choice

  const handleGetStarted = async () => {
    // Always show ChooseType screen first
    // This ensures users can see all available account types and make an informed choice
    // Even if they have a saved preference, they can change it
    navigation.navigate('ChooseType' as never);
  };

  useEffect(() => {
    console.log('[WELCOME] Screen mounted');
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
          onError={(error) => {
            console.error('[WELCOME] Image load error:', error);
          }}
          onLoad={() => {
            console.log('[WELCOME] Image loaded successfully');
          }}
        />
      </View>
      <Text style={styles.title}>Welcome to UniCircle</Text>
      <Text style={styles.subtitle}>Connect with students, alumni, professionals, and research opportunities</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={handleGetStarted}
      >
        <Text style={styles.buttonText}>Get Started</Text>
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
    backgroundColor: '#2358D6',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#5C7AEA',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#E3E8FF',
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#1C3FA0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonText: {
    color: '#2358D6',
    fontSize: 18,
    fontWeight: '700',
  },
});

