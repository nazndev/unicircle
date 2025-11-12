import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import ChooseTypeScreen from '../screens/auth/ChooseTypeScreen';
import EmailScreen from '../screens/auth/EmailScreen';
import OtpVerifyScreen from '../screens/auth/OtpVerifyScreen';
import AlumniRegisterScreen from '../screens/auth/AlumniRegisterScreen';
import TeacherRegisterScreen from '../screens/auth/TeacherRegisterScreen';
import PendingApprovalScreen from '../screens/auth/PendingApprovalScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import RequestUniversityScreen from '../screens/auth/RequestUniversityScreen';
import PasswordSetupScreen from '../screens/auth/PasswordSetupScreen';
import ProfessionalOnboardingScreen from '../screens/auth/ProfessionalOnboardingScreen';
import PersonalInfoScreen from '../screens/auth/PersonalInfoScreen';
import PinLoginScreen from '../screens/auth/PinLoginScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#5C7AEA',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="PinLogin" 
        component={PinLoginScreen}
        options={{ 
          title: 'Login',
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ChooseType" 
        component={ChooseTypeScreen}
        options={{ 
          title: 'Choose Account Type',
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name="Email" 
        component={EmailScreen}
        options={({ route }) => ({ 
          title: (route.params as any)?.accountType === 'professional' ? 'Enter Email' : 'Enter University Email',
        })}
      />
      <Stack.Screen 
        name="OtpVerify" 
        component={OtpVerifyScreen}
        options={{ 
          title: 'Verify Code',
        }}
      />
      <Stack.Screen 
        name="AlumniRegister" 
        component={AlumniRegisterScreen}
        options={{ 
          title: 'Alumni Registration',
        }}
      />
      <Stack.Screen 
        name="TeacherRegister" 
        component={TeacherRegisterScreen}
        options={{ 
          title: 'Teacher Registration',
        }}
      />
      <Stack.Screen 
        name="PendingApproval" 
        component={PendingApprovalScreen}
        options={{ 
          title: 'Pending Approval',
          headerLeft: () => null, // Disable back button on this screen
        }}
      />
      <Stack.Screen 
        name="ProfileSetup" 
        component={ProfileSetupScreen}
        options={{ 
          title: 'Setup Profile',
        }}
      />
      <Stack.Screen 
        name="RequestUniversity" 
        component={RequestUniversityScreen}
        options={({ route }) => ({ 
          title: (route.params as any)?.accountType === 'professional' ? 'Request Institution' : 'Request University',
        })}
      />
      <Stack.Screen 
        name="ProfessionalOnboarding"
        component={ProfessionalOnboardingScreen}
        options={({ route }) => ({ 
          title: 'Organization Information',
        })}
      />
      <Stack.Screen 
        name="PasswordSetup" 
        component={PasswordSetupScreen}
        options={{ 
          title: 'Set Password',
        }}
      />
      <Stack.Screen 
        name="PersonalInfo" 
        component={PersonalInfoScreen}
        options={{ 
          title: 'Personal Information',
        }}
      />
    </Stack.Navigator>
  );
}

