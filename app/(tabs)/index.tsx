// index.tsx
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActivityStore } from '@/src/store/activityStore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { calculateTokens, calculateCarbonSaved, getEcoZone } from '@/src/utils/ecoLogic';

export default function HomeScreen() {
  const activities = useActivityStore((state) => state.activities);
  const recentActivity = activities[activities.length - 1];

  const now = new Date();
  const startOfWeek = new Date();
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const weeklyActivities = activities.filter(a =>
    new Date(a.date) >= startOfWeek
  );

  const weeklyActivityCount = weeklyActivities.length;

  const weeklyTokens = weeklyActivities.reduce(
    (sum, a) => sum + calculateTokens(a),
    0
  );

  const weeklyCarbonSaved = weeklyActivities.reduce(
    (sum, a) => sum + calculateCarbonSaved(a),
    0
  );

  const activeDays = new Set(
    weeklyActivities.map(a =>
      new Date(a.date).toDateString()
    )
  ).size;

  const uniqueCategories = new Set(
    weeklyActivities.map(a => a.category)
  ).size;

  const baseScore = Math.min(
    (weeklyTokens / 500) * 70,
    70
  );

  const consistencyBonus = (activeDays / 7) * 20;
  const varietyBonus = (uniqueCategories / 3) * 10;

  const ecoScore = Math.round(
    baseScore + consistencyBonus + varietyBonus
  );

  const zone = getEcoZone(ecoScore);


  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={{ fontSize: 24 }}>
        Your sustainability dashboard
      </ThemedText>

      {/* ECO SCORE (CIRCULAR HERO) */}
      <View style={styles.scoreWrapper}>
        <View style={styles.scoreCircle}>
          <ThemedText style={styles.scoreLabel}>EcoScore</ThemedText>
          <ThemedText style={styles.scoreNumber}>{ecoScore}</ThemedText>
        </View>
        <ThemedText style={styles.zoneText}>
          {zone.message}
        </ThemedText>

        {/* ECO TOKENS (PILL) */}
        <View style={styles.tokenPill}>
          <FontAwesome6 name="leaf" size={18} color="#2E7D32" />
          <ThemedText style={styles.tokenText}>
            {weeklyTokens} Eco Tokens
          </ThemedText>
        </View>
      </View>

      <ThemedText style={styles.CO2}>
        You've saved approx {weeklyCarbonSaved.toFixed(2)} kg CO₂e this week
      </ThemedText>

      {/* OTHER CARDS */}
      <View style={[styles.card, styles.sectionBreak]}>
        <ThemedText type="defaultSemiBold">Activities logged this week</ThemedText>
        <ThemedText style={styles.bigNumber}>{weeklyActivityCount}</ThemedText>
      </View>

      <View style={styles.card}>
        <ThemedText type="defaultSemiBold">Most Recent Activity</ThemedText>
        {recentActivity ? (
          <ThemedText>
            {recentActivity.category}:{' '}
            {recentActivity.steps
              ? `${recentActivity.steps} steps`
              : recentActivity.distance
              ? `${recentActivity.distance} km`
              : ''}
          </ThemedText>
        ) : (
          <ThemedText style={styles.hintText}>No activities yet.</ThemedText>
        )}
      </View>

      <View style={styles.card}>
        <ThemedText type="link" onPress={() => router.push('/activity/add')}>
          + Add new activity
        </ThemedText>
      </View>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 50,
    gap: 16,
  },

  /* Eco Score */
  scoreWrapper: {
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },

  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(46, 125, 50, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
  },

  scoreLabel: {
    fontSize: 18,
    opacity: 0.8,
  },

  scoreNumber: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 52,
  },

  zoneText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 15,
    opacity: 0.7,
  },

  /* Eco Tokens */
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(46, 125, 50, 0.15)',
  },

  tokenText: {
    fontSize: 20,
    fontWeight: '500',
  },

  /* Cards */
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(46, 45, 45, 0.08)',
    gap: 8,
  },

  bigNumber: {
    fontSize: 32,
    fontWeight: '600',
  },

  hintText: {
    fontSize: 14,
    color: 'gray',
    marginTop: 4,
  },

  CO2: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 4,
    marginBottom: 30,
  },
  sectionBreak: {
  marginBottom: 12,
  },

});
