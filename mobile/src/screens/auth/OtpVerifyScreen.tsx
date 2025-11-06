import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';

export default function OtpVerifyScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { login } = useAuthStore();
  const email = (route.params as any)?.email || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await login(email, code);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' as never }],
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Verification Code</Text>
      <Text style={styles.subtitle}>We sent a code to {email}</Text>
      <TextInput
        style={styles.input}
        placeholder="123456"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
      />
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F5F7FB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 10,
  },
  button: {
    backgroundColor: '#5C7AEA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

