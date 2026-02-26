// (tabs)/index.tsx (dashboard)
import { ThemedText } from '@/components/themed-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  calculateTokens, calculateCarbonSaved, getEcoZone,
  getWeekCarbonComparison, CATEGORY_COLORS, calculateStreak,
} from '@/src/utils/ecoLogic';
import AISuggestionsCard from '@/components/ai-suggestions-card';

const CATEGORY_ICON: Record<string, string> = {
  walking:     'person-walking',
  running:     'person-running',
  cycling:     'bicycle',
  electricity: 'bolt',
  water:       'droplet',
};

function getRecentActivityLabel(activity: any) {
  if (activity.steps)       return `${activity.steps.toLocaleString()} steps`;
  if (activity.distance)    return `${activity.distance} km${activity.duration ? ` · ${activity.duration} min` : ''}`;
  if (activity.kwhSaved)    return `${activity.kwhSaved} kWh saved`;
  if (activity.litersSaved) return `${activity.litersSaved} L saved`;
  return '—';
}

export default function HomeScreen() {
  const { colors, scheme } = useAppTheme();
  const userRegion = useActivityStore(s => s.userRegion);
  const activities = useActivityStore(s => s.activities);
  const userProfile = useActivityStore(s => s.userProfile);

  const recentActivity = activities.length > 0
    ? [...activities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : undefined;

  const now = new Date();
  const startOfWeek = new Date();
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const weeklyActivities    = activities.filter(a => new Date(a.date) >= startOfWeek);
  const weeklyActivityCount = weeklyActivities.length;

  const weeklyTokens      = weeklyActivities.reduce((sum, a) => sum + calculateTokens(a), 0);
  const weeklyCarbonSaved = weeklyActivities.reduce((sum, a) => sum + calculateCarbonSaved(a, userRegion), 0);

  const activeDays       = new Set(weeklyActivities.map(a => new Date(a.date).toDateString())).size;
  const uniqueCategories = new Set(weeklyActivities.map(a => a.category)).size;

  const weeklyTarget = userProfile?.weeklyTarget ?? 500;
  const progress     = Math.min(weeklyTokens / weeklyTarget, 1);

  const firstName = userProfile?.displayName?.split(' ')[0] || 'Explorer';

  const baseScore        = Math.min((weeklyTokens / weeklyTarget) * 70, 70);
  const consistencyBonus = (activeDays / 7) * 20;
  const varietyBonus     = (uniqueCategories / 3) * 10;
  const ecoScore         = Math.round(baseScore + consistencyBonus + varietyBonus);

  const streak     = calculateStreak(activities);
  const zone       = getEcoZone(ecoScore);
  const comparison = getWeekCarbonComparison(activities, userRegion);

  const comparisonColor =
    comparison.direction === 'up'   ? '#4CAF50' :
    comparison.direction === 'down' ? '#EF5350' : colors.text;

  const comparisonArrow =
    comparison.direction === 'up'   ? '↑' :
    comparison.direction === 'down' ? '↓' : '—';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Greeting ── */}
        <View style={styles.greeting}>
          <View>
            <ThemedText style={[styles.greetingSmall, { color: colors.text }]}>Good to see you,</ThemedText>
            <ThemedText style={[styles.greetingName, { color: colors.text }]}>{firstName} 🌱</ThemedText>
          </View>
          <Pressable
            style={[styles.addBtn, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/activity/add')}
          >
            <FontAwesome6 name="plus" size={13} color="#fff" />
            <ThemedText style={styles.addBtnText}>Log</ThemedText>
          </Pressable>
        </View>

        {/* ── Hero: EcoScore ── */}
        <LinearGradient
          colors={scheme === 'dark' ? ['#1a2e1a', '#0d1f1f'] : ['#f0fdf4', '#e0f7fa']}
          style={styles.heroCard}
        >
          <View style={styles.scoreWrapper}>
            <View style={[styles.scoreCircle, { borderColor: colors.tint + '55', backgroundColor: colors.tint + '18' }]}>
              <ThemedText style={[styles.scoreLabel, { color: colors.text }]}>EcoScore</ThemedText>
              <ThemedText style={[styles.scoreNumber, { color: colors.tint }]}>{ecoScore}</ThemedText>
              <ThemedText style={[styles.scoreMax, { color: colors.text }]}>/100</ThemedText>
            </View>
            <View style={styles.heroRight}>
              <ThemedText style={[styles.zoneMessage, { color: colors.text }]}>{zone.message}</ThemedText>
              <View style={[styles.tokenPill, { backgroundColor: colors.tint + '22' }]}>
                <FontAwesome6 name="leaf" size={14} color={colors.tint} />
                <ThemedText style={[styles.tokenText, { color: colors.text }]}>{weeklyTokens} tokens</ThemedText>
              </View>
              <View style={{ width: '100%', gap: 4 }}>
                <View style={[styles.progressBg, { backgroundColor: colors.tint + '22' }]}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.tint }]} />
                </View>
                <ThemedText style={[styles.progressLabel, { color: colors.text }]}>
                  {Math.round(progress * 100)}% of weekly goal
                </ThemedText>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ── CO₂ + Comparison ── */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.co2Row}>
            <View style={styles.co2Item}>
              <ThemedText style={[styles.statLabel, { color: colors.text }]}>CO₂ Saved This Week</ThemedText>
              <ThemedText style={[styles.statValue, { color: colors.tint }]}>
                {weeklyCarbonSaved.toFixed(2)}
                <ThemedText style={[styles.statUnit, { color: colors.text }]}> kg</ThemedText>
              </ThemedText>
            </View>
            <View style={[styles.co2Divider, { backgroundColor: colors.surfaceMuted }]} />
            <View style={styles.co2Item}>
              <ThemedText style={[styles.statLabel, { color: colors.text }]}>vs Last Week</ThemedText>
              <ThemedText style={[styles.statValue, { color: comparisonColor }]}>
                {comparisonArrow} {comparison.percentage}%
              </ThemedText>
            </View>
          </View>
        </View>

        {/* ── Quick stats ── */}
        <View style={styles.quickRow}>
          <View style={[styles.quickCard, { backgroundColor: colors.surface }]}>
            <FontAwesome6 name="clipboard-list" size={16} color={colors.tint} />
            <ThemedText style={[styles.quickValue, { color: colors.text }]}>{weeklyActivityCount}</ThemedText>
            <ThemedText style={[styles.quickLabel, { color: colors.text }]}>This week</ThemedText>
          </View>
          <View style={[styles.quickCard, { backgroundColor: colors.surface }]}>
            <FontAwesome6 name="calendar-check" size={16} color={colors.tint} />
            <ThemedText style={[styles.quickValue, { color: colors.text }]}>{activeDays}</ThemedText>
            <ThemedText style={[styles.quickLabel, { color: colors.text }]}>Active days</ThemedText>
          </View>
          <View style={[styles.quickCard, { backgroundColor: colors.surface }]}>
            <FontAwesome6 name="layer-group" size={16} color={colors.tint} />
            <ThemedText style={[styles.quickValue, { color: colors.text }]}>{uniqueCategories}</ThemedText>
            <ThemedText style={[styles.quickLabel, { color: colors.text }]}>Categories</ThemedText>
          </View>
        </View>

        {/* ── Most Recent Activity ── */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardTitleRow}>
            <ThemedText type="defaultSemiBold" style={{ color: colors.text, fontSize: 15 }}>
              Most Recent
            </ThemedText>
            <Pressable onPress={() => router.push('/(tabs)/activity')}>
              <ThemedText style={{ color: colors.tint, fontSize: 13 }}>See all →</ThemedText>
            </Pressable>
          </View>
          {recentActivity ? (
            <Pressable
              style={[styles.recentRow, { borderColor: (CATEGORY_COLORS[recentActivity.category] ?? colors.tint) + '30' }]}
              onPress={() => router.push(`/activity/details?id=${recentActivity.id}`)}
            >
              <View style={[styles.recentIcon, { backgroundColor: (CATEGORY_COLORS[recentActivity.category] ?? colors.tint) + '22' }]}>
                <FontAwesome6
                  name={CATEGORY_ICON[recentActivity.category] ?? 'leaf'}
                  size={18}
                  color={CATEGORY_COLORS[recentActivity.category] ?? colors.tint}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text, fontSize: 15 }}>
                  {recentActivity.category.charAt(0).toUpperCase() + recentActivity.category.slice(1)}
                </ThemedText>
                <ThemedText style={{ color: colors.text, opacity: 0.6, fontSize: 13 }}>
                  {getRecentActivityLabel(recentActivity)}
                </ThemedText>
              </View>
              <ThemedText style={{ color: colors.text, opacity: 0.4, fontSize: 12 }}>
                {new Date(recentActivity.date).toLocaleDateString()}
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.emptyActivity, { borderColor: colors.tint + '33', backgroundColor: colors.tint + '0A' }]}
              onPress={() => router.push('/activity/add')}
            >
              <FontAwesome6 name="circle-plus" size={20} color={colors.tint} />
              <ThemedText style={{ color: colors.tint, fontSize: 14, fontWeight: '600' }}>
                Log your first activity
              </ThemedText>
            </Pressable>
          )}
        </View>

        {/* ── AI Suggestions ── */}
        <AISuggestionsCard
          activities={activities}
          weeklyTokens={weeklyTokens}
          weeklyCO2={weeklyCarbonSaved}
          activeDaysThisWeek={activeDays}
          streak={streak}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, paddingBottom: 24 },
  greeting: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 4, marginBottom: 4,
  },
  greetingSmall: { fontSize: 13, opacity: 0.55 },
  greetingName: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  heroCard: { borderRadius: 20, padding: 20 },
  scoreWrapper: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  scoreCircle: {
    width: 130, height: 130, borderRadius: 65, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center', gap: 2,
  },
  scoreLabel: { fontSize: 12, opacity: 0.6, fontWeight: '500' },
  scoreNumber: { fontSize: 44, fontWeight: '800', lineHeight: 48 },
  scoreMax: { fontSize: 12, opacity: 0.45 },
  heroRight: { flex: 1, gap: 10, alignItems: 'flex-start' },
  zoneMessage: { fontSize: 13, opacity: 0.75, lineHeight: 18 },
  tokenPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  tokenText: { fontSize: 14, fontWeight: '600' },
  progressBg: { height: 6, borderRadius: 3, width: '100%', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 11, opacity: 0.5 },
  card: { padding: 16, borderRadius: 16, gap: 12 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  co2Row: { flexDirection: 'row', alignItems: 'center' },
  co2Item: { flex: 1, gap: 4, alignItems: 'center' },
  co2Divider: { width: 1, height: 40, marginHorizontal: 8 },
  statLabel: { fontSize: 12, opacity: 0.55, textAlign: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  statUnit: { fontSize: 14, fontWeight: '400', opacity: 0.6 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickCard: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', gap: 6 },
  quickValue: { fontSize: 22, fontWeight: '700', lineHeight: 26 },
  quickLabel: { fontSize: 11, opacity: 0.5, textAlign: 'center' },
  recentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  recentIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emptyActivity: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 16, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed',
  },
});