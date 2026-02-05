// layout.tsx for the bottom tab navigator
import { Tabs } from 'expo-router';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
// import React from 'react';
import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeStore } from '@/src/store/themeStore';

export default function TabLayout() {
  const systemScheme = useColorScheme();
  const themeMode = useThemeStore((s) => s.mode);

  const resolvedScheme = 
    themeMode === 'system' ? systemScheme : themeMode;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: 
        Colors[resolvedScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="leaf" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Log',
          tabBarIcon: ({ color, size }) => <Ionicons name="clipboard" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
