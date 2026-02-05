// Profile screen
import { View, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeStore } from '@/src/store/themeStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { calculateStreak , calculateTokens } from '@/src/utils/ecoLogic';
import { router } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';

const WEEKLY_TARGET = 500;

// Helper function to check if a date is within the current week
function isThisWeek(date: string) {
  const d = new Date(date);
  const now = new Date();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  return d >= startOfWeek;
}

export default function ProfileScreen() {
  const { colors } = useAppTheme();
  
  const activities = useActivityStore((state) => state.activities);
  const streak = calculateStreak(activities);

  const weeklyTokens = activities
    .filter((a) => a.date && isThisWeek(a.date))
    .reduce((sum, a) => sum + calculateTokens(a), 0);

  const progress =
    WEEKLY_TARGET > 0
      ? Math.min(weeklyTokens / WEEKLY_TARGET, 1)
      : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View>
        <View style={styles.headerRow}>
          <ThemedText type="title" style={{ color: colors.text }}>Profile</ThemedText>
          <Pressable onPress={() => router.push('/settings')}>
            <FontAwesome6 name="gear" size={20} color="#6b6b6b" />
          </Pressable>
        </View>

        <ThemedText style={[styles.subtle, { color: colors.text }]}>
          Your sustainability journey
        </ThemedText>
      </View>

      {/* User Card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>User Name</ThemedText>
        <ThemedText style={[styles.subtle, { color: colors.text }]}>
          {streak > 0
            ? `🌱 ${streak}-day streak active`
            : 'Log an activity to start your streak'}
        </ThemedText>
      </View>

      {/* Streak */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Consistency</ThemedText>

        <ThemedText style={[styles.big, { color: colors.text }]}>
          {streak} day{streak === 1 ? '' : 's'}
        </ThemedText>

        <ThemedText style={[styles.subtle, { color: colors.text }]}>
          Days in a row with eco-friendly actions
        </ThemedText>
      </View>

      {/* Weekly Goal */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Weekly Goal</ThemedText>

        <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceMuted }]}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progress * 100}%` },
            ]}
          />
        </View>

        <ThemedText style={[styles.subtle, { color: colors.text }]}>
          {weeklyTokens} / {WEEKLY_TARGET} EcoTokens
        </ThemedText>
      </View>

      {/* Preferences (placeholder) */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Preferences</ThemedText>

        <ThemedText style={[styles.subtle, { color: colors.text }]}>
          • Preferred activities: Walking, Cycling
        </ThemedText>
        <ThemedText style={[styles.subtle, { color: colors.text }]}>
          • Units: km, steps
        </ThemedText>
        <ThemedText style={[styles.subtle, { color: colors.text }]}>
          • Reminders: coming soon
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 30,
    gap: 16,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
  },

  subtle: {
    fontSize: 13,
    opacity: 0.6,
  },

  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(46,45,45,0.08)', // #2e2d2d14
    gap: 8,
  },

  big: {
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 36,
  },

  progressBarBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.1)', // #0000001a
    overflow: 'hidden',
    marginTop: 8,
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: '#2E7D32',
    borderRadius: 5,
  },
});

