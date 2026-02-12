// Profile screen
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { calculateStreak , calculateTokens } from '@/src/utils/ecoLogic';
import { router } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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

const WEEK_DAYS = ['Sun', 'Mon','Tue','Wed','Thu','Fri','Sat'];

//
function getWeeklyActivityDots(activities: any[]) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0,0,0,0);

  // Array for 7 days starting from Sunday
  const dots = Array(7).fill(false);

  activities.forEach(a => {
    const d = new Date(a.date);

    if(d >= startOfWeek) {
      const dayIndex = d.getDay(); // 0=Sun, 1=Mon, ...
      dots[dayIndex] = true;
    }
  });

  return dots;
}

export default function ProfileScreen() {
  const { colors, scheme } = useAppTheme();
  const activities = useActivityStore((state) => state.activities);
  const streak = calculateStreak(activities);
  const weeklyDots = getWeeklyActivityDots(activities);

  const weeklyTokens = activities
    .filter((a) => a.date && isThisWeek(a.date))
    .reduce((sum, a) => sum + calculateTokens(a), 0);

  const progress =
    WEEKLY_TARGET > 0
      ? Math.min(weeklyTokens / WEEKLY_TARGET, 1)
      : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View>
        <View style={styles.headerRow}>
          <ThemedText type="title" style={{ color: colors.text }}>Profile</ThemedText>
          <Pressable onPress={() => router.push('/settings')}>
            <FontAwesome6 name="gear" size={20} color="#6b6b6b" />
          </Pressable>
        </View>

        <ThemedText style={[styles.subtle, { color: colors.text, paddingHorizontal: 18 }]}>
          Your sustainability journey
        </ThemedText>
      </View>
      
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false} // hides scroll bar
      >

        {/* User Card with Gradient */}
        <LinearGradient
          colors={scheme === 'dark'
            ? ['#34C9C9', '#2E7D32']
            : ['#2E7D32', '#34C9C9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { alignItems: 'center' }]}
        >
          {/* Avatar placeholder */}
          <View style={[styles.avatar, { backgroundColor: colors.surfaceMuted }]}>
            <ThemedText style={{ color: colors.text, fontSize: 24, fontWeight: '600' }}>
              U
            </ThemedText>
          </View>

          {/* Name */}
          <ThemedText type="defaultSemiBold" style={{ color: colors.text, fontSize: 18, marginTop: 8 }}>
            Username
          </ThemedText>

          {/* Tagline */}
          <ThemedText style={[styles.subtle, { color: colors.text, marginTop: 4, textAlign: 'center' }]}>
            Track Your Impact
          </ThemedText>

          {/* Member since */}
          <ThemedText style={[styles.subtle, { color: colors.text, marginTop: 4 }]}>
            Member since Feb 2026
          </ThemedText>
        </LinearGradient>

        {/* Consistency Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>
            Consistency
          </ThemedText>

          <ThemedText style={[styles.subtle, { color: colors.text }]}>
            {streak > 0
              ? `🌱 ${streak}-day streak active`
              : 'Log an activity to start your streak'}
          </ThemedText>

          <ThemedText style={[styles.subtle, { color: colors.text, marginTop: 8, fontWeight: '600', }]}>
            Days in a row with eco-friendly actions
          </ThemedText>

          {/* Streak visual */}
          <View style={styles.streakRow}>
            {WEEK_DAYS.map((day, idx) => (
              <View key={day} style={styles.streakItem}>
                <ThemedText style={{ color: colors.text, fontSize: 12 }}>
                  {day}
                </ThemedText>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: weeklyDots[idx] ? colors.tint : colors.surfaceMuted },
                  ]}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Weekly Goal */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Weekly Goal</ThemedText>

          <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceMuted }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progress * 100}%`, backgroundColor: colors.tint },
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    //paddingTop: 30,
    gap: 16,
    paddingBottom: 10,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 18,
  },

  subtle: {
    fontSize: 13,
    opacity: 0.6,
  },

  card: {
    padding: 16,
    borderRadius: 12,
    //backgroundColor: 'rgba(46,45,45,0.08)', // #2e2d2d14
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
    //backgroundColor: 'rgba(0,0,0,0.1)', // #0000001a
    overflow: 'hidden',
    marginTop: 8,
  },

  progressBarFill: {
    height: '100%',
    //backgroundColor: '#2E7D32',
    borderRadius: 5,
  },

  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  streakItem: {
    alignItems: 'center',
    gap: 5,
  },

  dot: {
    width: 14,
    height: 14,
    borderRadius: 8,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

