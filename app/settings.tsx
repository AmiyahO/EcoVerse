// Settings screen
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { router } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { useThemeStore, ThemeMode } from '@/src/store/themeStore';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';


function SettingItem({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={styles.item}
    >
      <ThemedText>{label}</ThemedText>
      {value && <ThemedText style={styles.value}>{value}</ThemedText>}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];


  const cycleTheme = () => {
    const order: ThemeMode[] = ['system', 'light', 'dark'];
    const next =
      order[(order.indexOf(themeMode) + 1) % order.length];
    setThemeMode(next);
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      >

      {/* Account */}
      <View style={[
        styles.section,
        { backgroundColor: colors.surface }
      ]}>
        <ThemedText type="defaultSemiBold">Account</ThemedText>
        <SettingItem label="Email" value="Signed in with Google" />
        <SettingItem label="Sign out" onPress={() => {}} />
      </View>

      {/* Preferences */}
      <View style={[
        styles.section,
        { backgroundColor: colors.surface }
      ]}>
        <ThemedText type="defaultSemiBold">Preferences</ThemedText>

        <SettingItem
          label="Theme"
          value={
            themeMode === 'system'
              ? 'System'
              : themeMode === 'light'
              ? 'Light'
              : 'Dark'
          }
          onPress={cycleTheme}
        />

        <SettingItem label="Notifications" value="On" />
      </View>

      {/* Data */}
      <View style={[
        styles.section,
        { backgroundColor: colors.surface }
      ]}>
        <ThemedText type="defaultSemiBold">Data</ThemedText>
        <SettingItem label="Sync status" value="Up to date" />
        <SettingItem label="Reset local data" />
      </View>

      {/* About */}
      <View style={[
        styles.section,
        { backgroundColor: colors.surface }
      ]}>
        <ThemedText type="defaultSemiBold">About</ThemedText>
        {/* Placeholder versions */}
        <SettingItem label="Version" value="1.0.0" /> 
        <SettingItem label="Terms of Service" onPress={() => {}} />
        <SettingItem label="Privacy Policy" onPress={() => {}} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 20,
  },
  scrollContent: {
    paddingBottom: 32,
    gap: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    // backgroundColor: 'rgba(46,45,45,0.08)', // check about how app looks in 3 theme modes
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  value: {
    fontSize: 12,
    opacity: 0.6,
  },
});
