// layout for the root navigator
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
// import 'react-native-reanimated';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useThemeStore } from '@/src/store/themeStore';

// export const unstable_settings = {
//   anchor: '(tabs)',
// };

export default function RootLayout() {
const { scheme } = useAppTheme();
  const themeMode = useThemeStore((s) => s.mode);

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="activity/add" options={{ title: 'Add Activity' }} />
        <Stack.Screen name="activity/details" options={{ title: 'Details' }} />
        {/* add for edit screen when its created */}
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>

      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
