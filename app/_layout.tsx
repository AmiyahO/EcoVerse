// layout for the root navigator
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
// import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeStore } from '@/src/store/themeStore';

// export const unstable_settings = {
//   anchor: '(tabs)',
// };

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const themeMode = useThemeStore((s) => s.mode);

  const resolvedScheme =
    themeMode === 'system' ? systemScheme : themeMode;

  return (
    <ThemeProvider value={resolvedScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="activity/add" options={{ title: 'Add Activity' }} />
        <Stack.Screen name="activity/details" options={{ title: 'Details' }} />
        {/* add for edit screen when its created */}
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>

      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
