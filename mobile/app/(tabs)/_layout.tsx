import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Translate: '🔤',
    Languages: '🌍',
    Practice: '📚',
  };
  return (
    <Text style={{ fontSize: focused ? 22 : 18, opacity: focused ? 1 : 0.5 }}>
      {icons[label] ?? '•'}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1A6B3C',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { paddingBottom: 4 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="translate"
        options={{
          title: 'Translate',
          tabBarIcon: ({ focused }) => <TabIcon label="Translate" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="languages"
        options={{
          title: 'Languages',
          tabBarIcon: ({ focused }) => <TabIcon label="Languages" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          tabBarIcon: ({ focused }) => <TabIcon label="Practice" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
