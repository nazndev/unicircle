import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function ChooseTypeScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Account Type</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Email' as never)}
      >
        <Text style={styles.buttonText}>I'm a Student</Text>
        <Text style={styles.buttonSubtext}>Login with university email</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('AlumniRegister' as never)}
      >
        <Text style={styles.buttonText}>I'm an Alumni</Text>
        <Text style={styles.buttonSubtext}>Register with documents</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },
  button: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    width: '100%',
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5C7AEA',
    marginBottom: 5,
  },
  buttonSubtext: {
    fontSize: 14,
    color: '#666',
  },
});

