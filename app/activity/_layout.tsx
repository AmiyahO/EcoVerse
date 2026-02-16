// layout.tsx for activities
import { Stack } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function ActivityLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true, // Turn it on for everything in this folder
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
        headerBackTitle: 'Back', // Optional: for iOS
      }}
    >
      <Stack.Screen 
        name="add" 
        options={{ title: 'Add Activity' }} 
      />
      <Stack.Screen 
        name="details" 
        options={{ title: 'Details' }} 
      />
      <Stack.Screen 
        name="edit" 
        options={{ title: 'Edit Activity', presentation: 'modal' }} 
      />
    </Stack>
  );
}