import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import Ionicons from '@expo/vector-icons/Ionicons';
import HomeScreen from '../screens/main/HomeScreen';
import CrushScreen from '../screens/main/CrushScreen';
import CirclesScreen from '../screens/main/CirclesScreen';
import FeedScreen from '../screens/main/FeedScreen';
import JobsScreen from '../screens/main/JobsScreen';
import ResearchScreen from '../screens/main/ResearchScreen';
import MarketplaceScreen from '../screens/main/MarketplaceScreen';
import MessagesScreen from '../screens/main/MessagesScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export default function MainNavigator() {
  const { user, features, loadFeatures, isAuthenticated } = useAuthStore();

  // Load features when component mounts, user changes, or profile mode changes
  useEffect(() => {
    if (isAuthenticated && user) {
      // Always reload features when user or profile mode changes
      loadFeatures().catch((error) => {
        console.warn('[MainNavigator] Failed to load features:', error);
      });
    }
  }, [isAuthenticated, user?.id, user?.profileMode, loadFeatures]);

  // Force re-render when features change to update tabs
  // This ensures tabs show/hide correctly when features are loaded or updated
  useEffect(() => {
    console.log('[MainNavigator] Features updated:', features);
  }, [features]);

  // Determine tabs based on profile mode and enabled features
  // Note: React Navigation requires children, not an array, so we conditionally render

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarActiveTintColor: '#5C7AEA',
        tabBarInactiveTintColor: '#999',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Crush') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Circles' || route.name === 'Network') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Feed') {
            iconName = focused ? 'newspaper' : 'newspaper-outline';
          } else if (route.name === 'Jobs') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'Research') {
            iconName = focused ? 'flask' : 'flask-outline';
          } else if (route.name === 'Marketplace') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      {/* Home is always available */}
      <Tab.Screen name="Home" component={HomeScreen} />
      
      {/* Crush - only for students and if enabled */}
      {user?.profileMode === 'student' && features?.crush && (
        <Tab.Screen name="Crush" component={CrushScreen} />
      )}
      
      {/* Circles - if enabled */}
      {features?.circles && (
        <Tab.Screen name="Circles" component={CirclesScreen} />
      )}
      
      {/* Feed - if enabled */}
      {features?.feed && (
        <Tab.Screen name="Feed" component={FeedScreen} />
      )}
      
      {/* Research - for students/teachers and if enabled */}
      {(user?.profileMode === 'student' || user?.profileMode === 'teacher') && features?.research && (
        <Tab.Screen name="Research" component={ResearchScreen} />
      )}
      
      {/* Jobs/Career - if enabled (career feature) */}
      {features?.career && (
        <Tab.Screen name="Jobs" component={JobsScreen} />
      )}
      
      {/* Marketplace - if enabled */}
      {features?.marketplace && (
        <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
      )}
      
      {/* Messages - always available */}
      <Tab.Screen name="Messages" component={MessagesScreen} />
      
      {/* Profile - always available */}
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

