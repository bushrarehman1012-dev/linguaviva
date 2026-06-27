import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';

import TranslateScreen from './src/screens/TranslateScreen';
import LanguagesScreen from './src/screens/LanguagesScreen';
import LanguageDetailScreen from './src/screens/LanguageDetailScreen';
import PhrasesScreen from './src/screens/PhrasesScreen';
import PracticeScreen from './src/screens/PracticeScreen';
import FlashcardScreen from './src/screens/FlashcardScreen';

export type RootStackParamList = {
  Main: undefined;
  LanguageDetail: { langCode: string };
  Phrases: { langCode: string };
  Flashcard: { langCode: string };
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator<RootStackParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#E5E7EB' },
      }}
    >
      <Tab.Screen
        name="Translate"
        component={TranslateScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🌐</Text> }}
      />
      <Tab.Screen
        name="Languages"
        component={LanguagesScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📖</Text> }}
      />
      <Tab.Screen
        name="Practice"
        component={PracticeScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🎯</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="LanguageDetail" component={LanguageDetailScreen} />
        <Stack.Screen name="Phrases" component={PhrasesScreen} />
        <Stack.Screen name="Flashcard" component={FlashcardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
