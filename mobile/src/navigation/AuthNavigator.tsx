import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import ChooseTypeScreen from '../screens/auth/ChooseTypeScreen';
import EmailScreen from '../screens/auth/EmailScreen';
import OtpVerifyScreen from '../screens/auth/OtpVerifyScreen';
import AlumniRegisterScreen from '../screens/auth/AlumniRegisterScreen';
import PendingApprovalScreen from '../screens/auth/PendingApprovalScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="ChooseType" component={ChooseTypeScreen} />
      <Stack.Screen name="Email" component={EmailScreen} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
      <Stack.Screen name="AlumniRegister" component={AlumniRegisterScreen} />
      <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </Stack.Navigator>
  );
}

