// index.tsx (dashboard)
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { calculateTokens, calculateCarbonSaved, getEcoZone, getWeekCarbonComparison } from '@/src/utils/ecoLogic';

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const userRegion = useActivityStore(s => s.userRegion);
  
  const activities = useActivityStore((state) => state.activities);
  const recentActivity = activities[0];

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
    (sum, a) => sum + calculateCarbonSaved(a, userRegion),
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

  const comparison = getWeekCarbonComparison(activities);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
            <ThemedText type="title" style={{ fontSize: 24, color: colors.text, textAlign: 'center' }}>
              Your Sustainability Dashboard
            </ThemedText>

            {/* ECO SCORE (CIRCULAR HERO) */}
            <View style={styles.scoreWrapper}>
              <View style={[
                styles.scoreCircle,
                { backgroundColor: colors.tint + '22' }  // adding transparency
              ]}>
                <ThemedText style={[styles.scoreLabel, { color: colors.text }]}>EcoScore</ThemedText>
                <ThemedText style={[styles.scoreNumber, { color: colors.text }]}>{ecoScore}</ThemedText>
              </View>
              <ThemedText style={[styles.zoneText, { color: colors.text }]}>
                {zone.message}
              </ThemedText>

              {/* ECO TOKENS (PILL) */}
              <View style={[
                styles.tokenPill,
                { backgroundColor: colors.tint + '22'}
              ]}>
                <FontAwesome6 name="leaf" size={18} color={colors.tint} />
                <ThemedText style={[styles.tokenText, { color: colors.text }]}>
                  {weeklyTokens} Eco Tokens
                </ThemedText>
              </View>
            </View>

            <ThemedText style={[styles.CO2, { color: colors.text }]}>
              You've saved approx {weeklyCarbonSaved.toFixed(2)} kg CO₂e this week
            </ThemedText>

            <ThemedText style={[styles.Comparison, { color: colors.text }]}>
              {comparison.direction === "up"
                ? `↑ ${comparison.percentage}% more impact than last week`
                : comparison.direction === "down"
                ? `↓ ${comparison.percentage}% less impact than last week`
                : "No change compared to last week"}
            </ThemedText>

            {/* OTHER CARDS */}
            <View style={[
              styles.card, 
              styles.sectionBreak,
              { backgroundColor: colors.surface}
            ]} >
              <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Activities logged this week</ThemedText>
              <ThemedText style={[styles.bigNumber, { color: colors.text }]}>{weeklyActivityCount}</ThemedText>
            </View>

            <View style={[
              styles.card,
              { backgroundColor: colors.surface }
            ]}>
              <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Most Recent Activity</ThemedText>
              {recentActivity ? (
                <ThemedText style={{ color: colors.text }}>
                  {recentActivity.category.charAt(0).toUpperCase() + recentActivity.category.slice(1)}:{' '}
                  {
                    recentActivity.steps
                    ? `${recentActivity.steps} steps`
                    : recentActivity.distance
                    ? `${recentActivity.distance} km${recentActivity.duration ? ` for ${recentActivity.duration} min` : ''}`
                    : recentActivity.kwhSaved
                    ? `${recentActivity.kwhSaved} kWh saved`
                    : recentActivity.litersSaved
                    ? `${recentActivity.litersSaved} L saved`
                    : ''}
                </ThemedText>
              ) : (
                <ThemedText style={[styles.hintText, { color: colors.text + '99' }]}>No activities yet.</ThemedText>
              )}
            </View>

            <View style={[
              styles.card,
              { backgroundColor: colors.surface }
            ]}>
              <ThemedText type="link" onPress={() => router.push('/activity/add')}>
                + Add new activity
              </ThemedText>
            </View>
    </ScrollView>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  scoreLabel: {
    fontSize: 18,
    fontWeight: '400',
    opacity: 0.8,
  },

  scoreNumber: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 52,
  },

  zoneText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
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
    marginTop: 15,
  },

  tokenText: {
    fontSize: 17,
    fontWeight: '600',
  },

  /* Cards */
  card: {
    padding: 14,
    borderRadius: 12,
    gap: 4,
  },

  bigNumber: {
    fontSize: 32,
    fontWeight: '600',
  },

  hintText: {
    fontSize: 14,
    marginTop: 4,
  },

  CO2: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 4,
  },

  Comparison: {
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 20,
  },
  
  sectionBreak: {
  marginBottom: 5,
  },

});
