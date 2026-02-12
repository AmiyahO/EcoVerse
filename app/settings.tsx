// Settings screen
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useThemeStore } from '@/src/store/themeStore';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function SettingItem({
  label,
  value,
  onPress,
  iconName,
  iconColor,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  iconName?: string;
  iconColor?: string;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={styles.item}
    >
      {/* Left: Label */}
      <ThemedText style={{ color: colors.text }}>{label}</ThemedText>

      {/* Right: Value + Icon */}
      {value && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {iconName && (
            <Ionicons 
              name={iconName as any} 
              size={18} 
              color={iconColor} 
            />
          )}
          <ThemedText style={[styles.value, { color: colors.text }]}>{value}</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

export default function SettingsScreen() { 
  const { colors } = useAppTheme();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

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
        <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Account</ThemedText>
        <SettingItem label="Email" value="Signed in with Google" />
        <SettingItem label="Sign out" onPress={() => {}} />
      </View>

      {/* Preferences */}
      <View style={[
        styles.section,
        { backgroundColor: colors.surface }
      ]}>
        <ThemedText type="defaultSemiBold" style = {{color: colors.text}}>Preferences</ThemedText>

        <SettingItem
          label="Theme"
          value={mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'}
          onPress={() => {
            const next =
              mode === 'system' ? 'light' :
              mode === 'light' ? 'dark' :
              'system';
            setMode(next);
          }}
          iconName={mode === 'dark' ? 'moon' : mode === 'light' ? 'sunny' : 'phone-portrait'}
          iconColor={mode === 'dark' ? '#0e0e46' : mode === 'light' ? '#FDB813' : '#4A90E2'} 
        />

        <SettingItem label="Notifications" value="On" />
      </View>

      {/* Data */}
      <View style={[
        styles.section,
        { backgroundColor: colors.surface }
      ]}>
        <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Data</ThemedText>
        <SettingItem label="Sync status" value="Up to date" />
        <SettingItem label="Reset local data" />
      </View>

      {/* About */}
      <View style={[
        styles.section,
        { backgroundColor: colors.surface }
      ]}>
        <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>About</ThemedText>
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
