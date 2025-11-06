import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import HomeScreen from '../screens/main/HomeScreen';
import CrushScreen from '../screens/main/CrushScreen';
import CirclesScreen from '../screens/main/CirclesScreen';
import FeedScreen from '../screens/main/FeedScreen';
import JobsScreen from '../screens/main/JobsScreen';
import MarketplaceScreen from '../screens/main/MarketplaceScreen';
import MessagesScreen from '../screens/main/MessagesScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export default function MainNavigator() {
  const { user } = useAuthStore();

  // Determine tabs based on profile mode
  const getTabs = () => {
    if (user?.profileMode === 'professional') {
      return (
        <>
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Network" component={CirclesScreen} />
          <Tab.Screen name="Feed" component={FeedScreen} />
          <Tab.Screen name="Jobs" component={JobsScreen} />
          <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
          <Tab.Screen name="Messages" component={MessagesScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </>
      );
    } else if (user?.profileMode === 'alumni') {
      return (
        <>
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Circles" component={CirclesScreen} />
          <Tab.Screen name="Feed" component={FeedScreen} />
          <Tab.Screen name="Jobs" component={JobsScreen} />
          <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
          <Tab.Screen name="Messages" component={MessagesScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </>
      );
    } else {
      // Student
      return (
        <>
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Crush" component={CrushScreen} />
          <Tab.Screen name="Circles" component={CirclesScreen} />
          <Tab.Screen name="Feed" component={FeedScreen} />
          <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
          <Tab.Screen name="Messages" component={MessagesScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </>
      );
    }
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#5C7AEA',
        tabBarInactiveTintColor: '#999',
      }}
    >
      {getTabs()}
    </Tab.Navigator>
  );
}

