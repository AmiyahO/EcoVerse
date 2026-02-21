// Stats/progress screen
import { ThemedText } from '@/components/themed-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { calculateCarbonSaved, calculateTokens, CATEGORY_COLORS, getWeekRange, getWeeklyCO2Data } from '@/src/utils/ecoLogic';
import { ScrollView, StyleSheet, View, FlatList, Dimensions } from 'react-native';
import { useState } from 'react';
import { FontAwesome6 } from '@expo/vector-icons';
import { CartesianChart, Bar } from 'victory-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 32;

const CATEGORY_ICONS: Record<string, string> = {
  walking: 'person-walking',
  running: 'person-running',
  cycling: 'bicycle',
  electricity: 'bolt',
  water: 'droplet',
};

export default function StatsScreen() {
  const { colors } = useAppTheme();
  const userRegion = useActivityStore(s => s.userRegion);
  const activities = useActivityStore((state) => state.activities);
  const [activeSlide1, setActiveSlide1] = useState(0);
  const [activeSlide2, setActiveSlide2] = useState(0);

  const weeklyCO2Data = getWeeklyCO2Data(activities, userRegion, 8);
  const currentWeekLabel = weeklyCO2Data[weeklyCO2Data.length - 1]?.week;
  
  // Week ranges
  const currentWeek = getWeekRange(0);
  const previousWeek = getWeekRange(1);

  const currentWeekActivities = activities.filter(a => {
    const d = new Date(a.date);
    return d >= currentWeek.start && d <= currentWeek.end;
  });

  const previousWeekActivities = activities.filter(a => {
    const d = new Date(a.date);
    return d >= previousWeek.start && d <= previousWeek.end;
  });

  // Week-over-week detailed breakdown
  const currentWeekCO2 = currentWeekActivities.reduce((sum, a) => sum + calculateCarbonSaved(a, userRegion), 0);
  const previousWeekCO2 = previousWeekActivities.reduce((sum, a) => sum + calculateCarbonSaved(a, userRegion), 0);
  const currentWeekTokens = currentWeekActivities.reduce((sum, a) => sum + calculateTokens(a), 0);
  const previousWeekTokens = previousWeekActivities.reduce((sum, a) => sum + calculateTokens(a), 0);
  const currentWeekCount = currentWeekActivities.length;
  const previousWeekCount = previousWeekActivities.length;

  const tokenDiff = currentWeekTokens - previousWeekTokens;
  const countDiff = currentWeekCount - previousWeekCount;

  // CO₂ by category this week vs last week
  const co2ByCategoryThisWeek: Record<string, number> = { walking: 0, running: 0, cycling: 0, electricity: 0, water: 0 };
  const co2ByCategoryLastWeek: Record<string, number> = { walking: 0, running: 0, cycling: 0, electricity: 0, water: 0 };

  currentWeekActivities.forEach(a => { co2ByCategoryThisWeek[a.category] += calculateCarbonSaved(a, userRegion); });
  previousWeekActivities.forEach(a => { co2ByCategoryLastWeek[a.category] += calculateCarbonSaved(a, userRegion); });
  
  // All-time Totals
  const totalSteps = activities.reduce((sum, a) => sum + (a.steps ?? 0), 0);
  const totalDistance = activities.reduce((sum, a) => sum + (a.distance ?? 0), 0);
  const totalCO2 = activities.reduce((sum, a) => sum + calculateCarbonSaved(a, userRegion), 0);

  const stepActivities = activities.filter(a => a.steps !== undefined);
  const avgSteps = stepActivities.length > 0
    ? Math.round(stepActivities.reduce((sum, a) => sum + a.steps!, 0) / stepActivities.length)
    : 0;

  const distanceActivities = activities.filter(a => a.distance !== undefined);
  const avgDistance = distanceActivities.length > 0
    ? (distanceActivities.reduce((sum, a) => sum + a.distance!, 0) / distanceActivities.length).toFixed(2)
    : '0.00';

  // Trends (optional: most common category)
  const categoryCounts: Record<string, number> = {};
  activities.forEach(a => {
    categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
  });
  const mostCommonActivity = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const co2ByCategory: Record<string, number> = {
    walking: 0,
    running: 0,
    cycling: 0,
    electricity: 0,
    water: 0,
  };

  activities.forEach(activity => {
    const co2 = calculateCarbonSaved(activity, userRegion);
    co2ByCategory[activity.category] += co2;
  });

  const totalCO2All = Object.values(co2ByCategory).reduce((a, b) => a + b, 0);

  let dominantCategory = 'N/A';
  let dominantPercentage = 0;

  if (totalCO2All > 0) {
    const sortedCO2 = Object.entries(co2ByCategory).sort((a, b) => b[1] - a[1]);

    dominantCategory = sortedCO2[0][0];
    dominantPercentage = (sortedCO2[0][1] / totalCO2All) * 100;
  }

  return (
  <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <ThemedText type="title" style={{ color: colors.text, paddingHorizontal: 18 }}>Your Stats</ThemedText>
      <ThemedText style={[styles.subtle, { color: colors.text, paddingHorizontal: 18 }]}>
        Based on all logged activities
      </ThemedText>
    </View>

    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32, gap: 12, paddingTop: 16 }}>

      {/* ── Row 1: All-Time + This Week vs Last Week ── */}
      <FlatList
        data={['alltime', 'week']}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12));
          setActiveSlide1(index);
        }}
        keyExtractor={(item) => item}
        renderItem={({ item }) => {
          if (item === 'alltime') return (
            <View style={[styles.card, styles.swipeCard, { backgroundColor: colors.surface }]}>
              <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>All-Time</ThemedText>
              <ThemedText style={[styles.big, { color: colors.text }]}>{activities.length}
                <ThemedText style={[styles.subtle, { color: colors.text }]}> activities</ThemedText>
              </ThemedText>
              <View style={{ height: 1, backgroundColor: colors.surfaceMuted, marginVertical: 4 }} />
              <View style={styles.grid}>
                <StatCard label="Total Steps" value={totalSteps.toLocaleString()} background={colors.background} colors={colors} />
                <StatCard label="Total Distance" value={`${totalDistance.toFixed(2)} km`} background={colors.background} colors={colors} />
                <StatCard label="Avg Steps" value={avgSteps.toLocaleString()} background={colors.background} colors={colors} />
                <StatCard label="Avg Distance" value={`${avgDistance} km`} background={colors.background} colors={colors} />
                <StatCard label="Total CO₂" value={`${totalCO2.toFixed(2)} kg`} background={colors.background} colors={colors} />
                <StatCard label="Top Activity" value={mostCommonActivity.charAt(0).toUpperCase() + mostCommonActivity.slice(1)} background={colors.background} colors={colors} />
              </View>
            </View>
          );

          if (item === 'week') return (
            <View style={[styles.card, styles.swipeCard, { backgroundColor: colors.surface }]}>
              <ThemedText type="defaultSemiBold" style={{ color: colors.text, marginBottom: 4 }}>
                This Week vs Last Week
              </ThemedText>
              <View style={styles.comparisonRow}>
                <ComparisonPill label="CO₂ Saved" current={`${currentWeekCO2.toFixed(2)} kg`} previous={`${previousWeekCO2.toFixed(2)} kg`} diff={currentWeekCO2 - previousWeekCO2} diffLabel={`${Math.abs(currentWeekCO2 - previousWeekCO2).toFixed(2)} kg`} colors={colors} />
                <ComparisonPill label="Tokens" current={`${currentWeekTokens}`} previous={`${previousWeekTokens}`} diff={tokenDiff} diffLabel={`${Math.abs(tokenDiff)}`} colors={colors} />
                <ComparisonPill label="Activities" current={`${currentWeekCount}`} previous={`${previousWeekCount}`} diff={countDiff} diffLabel={`${Math.abs(countDiff)}`} colors={colors} />
              </View>
              <ThemedText style={[styles.subtle, { color: colors.text, marginTop: 16, marginBottom: 8 }]}>CO₂ by category</ThemedText>
              {Object.entries(co2ByCategoryThisWeek).map(([cat, thisVal]) => {
                const lastVal = co2ByCategoryLastWeek[cat];
                if (thisVal === 0 && lastVal === 0) return null;
                const diff = thisVal - lastVal;
                const maxVal = Math.max(thisVal, lastVal, 0.01);
                return (
                  <View key={cat} style={styles.categoryCompRow}>
                    <View style={styles.categoryCompLabel}>
                      <FontAwesome6 name={CATEGORY_ICONS[cat]} size={13} color={CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS]} />
                      <ThemedText style={[styles.categoryCompText, { color: colors.text }]}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</ThemedText>
                    </View>
                    <View style={styles.dualBarContainer}>
                      <View style={[styles.dualBarTrack, { backgroundColor: colors.surfaceMuted }]}>
                        <View style={[styles.dualBarFill, { width: `${(lastVal / maxVal) * 100}%`, backgroundColor: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] + '50' }]} />
                      </View>
                      <View style={[styles.dualBarTrack, { backgroundColor: colors.surfaceMuted }]}>
                        <View style={[styles.dualBarFill, { width: `${(thisVal / maxVal) * 100}%`, backgroundColor: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] }]} />
                      </View>
                    </View>
                    <ThemedText style={[styles.categoryCompDiff, { color: diff > 0 ? '#4CAF50' : diff < 0 ? '#EF5350' : colors.text }]}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                    </ThemedText>
                  </View>
                );
              })}
              <View style={styles.dualBarLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.text + '30' }]} />
                  <ThemedText style={[styles.subtle, { color: colors.text }]}>Last week</ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: colors.tint }]} />
                  <ThemedText style={[styles.subtle, { color: colors.text }]}>This week</ThemedText>
                </View>
              </View>
            </View>
          );
          return null;
        }}
      />

      {/* Dots row 1 */}
      <View style={styles.dotsRow}>
        {[0, 1].map(i => (
          <View key={i} style={[
              styles.dot,
              i === activeSlide1 ? styles.dotActive : styles.dotInactive,
              { backgroundColor: activeSlide1 === i ? colors.tint : colors.surfaceMuted }
          ]} />        
        ))}
      </View>

      {/* ── Row 2: CO₂ Breakdown + 8-Week Chart ── */}
      <FlatList
        data={['breakdown', 'trends']}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12));
          setActiveSlide2(index);
        }}
        keyExtractor={(item) => item}
        renderItem={({ item }) => {
          if (item === 'breakdown') return (
            <View style={[styles.card, styles.swipeCard, { backgroundColor: colors.surface }]}>
              <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>CO₂ Impact Breakdown</ThemedText>
              <View style={[styles.stackedBar, { backgroundColor: colors.surfaceMuted }]}>
                {Object.entries(co2ByCategory).map(([category, value]) => {
                  if (value <= 0 || totalCO2All === 0) return null;
                  return <View key={category} style={[styles.stackedSegment, { width: `${(value / totalCO2All) * 100}%`, backgroundColor: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] }]} />;
                })}
              </View>
              <View style={styles.legend}>
                {Object.entries(co2ByCategory).map(([category, value]) => (
                  value > 0 && (
                    <View key={category} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] }]} />
                      <ThemedText style={[styles.legendText, { color: colors.text }]}>{category.charAt(0).toUpperCase() + category.slice(1)}</ThemedText>
                      <ThemedText style={[styles.legendText, { color: colors.text, marginLeft: 'auto' }]}>{value.toFixed(2)} kg · {((value / totalCO2All) * 100).toFixed(1)}%</ThemedText>
                    </View>
                  )
                ))}
              </View>
              {totalCO2All > 0 && (
                <View style={[styles.insightBox, { backgroundColor: colors.tint + '15' }]}>
                  <FontAwesome6 name="lightbulb" size={13} color={colors.tint} />
                  <ThemedText style={{ color: colors.text, fontSize: 13, flex: 1 }}>
                    {dominantCategory.charAt(0).toUpperCase() + dominantCategory.slice(1)} drives {dominantPercentage.toFixed(1)}% of your total CO₂ impact.
                  </ThemedText>
                </View>
              )}
            </View>
          );

          if (item === 'trends') return (
            <View style={[styles.card, styles.swipeCard, { backgroundColor: colors.surface, height: 380 }]}>
              <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>CO₂ Saved — Last 8 Weeks</ThemedText>
              <ThemedText style={[styles.subtle, { color: colors.text }]}>kg CO₂ saved per week</ThemedText>
              {weeklyCO2Data.every(d => d.co2 === 0) ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <ThemedText style={[styles.subtle, { color: colors.text }]}>No data yet — start logging activities!</ThemedText>
                </View>
              ) : (
                <CartesianChart
                  data={weeklyCO2Data}
                  xKey="week"
                  yKeys={["co2"]}
                  domainPadding={{ left: 40, right: 40, top: 20 }}
                  axisOptions={{
                    tickCount: 8,
                    labelColor: colors.text + '99',
                    lineColor: colors.surfaceMuted,
                    labelOffset: { x: 0, y: 4 },
                    formatXLabel: (val) => {
                      const parts = String(val).split(' ');
                      return parts[1] ?? String(val);
                    },
                  }}
                >
                  {({ points, chartBounds }) =>
                    points.co2.map((point, i) => (
                      <Bar key={i} points={[point]} chartBounds={chartBounds}
                        color={weeklyCO2Data[i]?.week === currentWeekLabel ? colors.tint : colors.tint + '55'}
                        roundedCorners={{ topLeft: 4, topRight: 4 }} barWidth={24}
                      />
                    ))
                  }
                </CartesianChart>
              )}
              <View style={styles.chartSummaryRow}>
                <View style={styles.chartSummaryItem}>
                  <ThemedText style={[styles.pillCurrent, { color: colors.text }]}>{currentWeekCO2.toFixed(2)} kg</ThemedText>
                  <ThemedText style={[styles.subtle, { color: colors.text }]}>This week</ThemedText>
                </View>
                <View style={styles.chartSummaryItem}>
                  <ThemedText style={[styles.pillCurrent, { color: colors.text }]}>
                    {(weeklyCO2Data.reduce((s, d) => s + d.co2, 0) / (weeklyCO2Data.filter(d => d.co2 > 0).length || 1)).toFixed(2)} kg
                  </ThemedText>
                  <ThemedText style={[styles.subtle, { color: colors.text }]}>Weekly avg</ThemedText>
                </View>
                <View style={styles.chartSummaryItem}>
                  <ThemedText style={[styles.pillCurrent, { color: colors.text }]}>{Math.max(...weeklyCO2Data.map(d => d.co2)).toFixed(2)} kg</ThemedText>
                  <ThemedText style={[styles.subtle, { color: colors.text }]}>Best week</ThemedText>
                </View>
              </View>
            </View>
          );
          return null;
        }}
      />

      {/* Dots row 2 */}
      <View style={styles.dotsRow}>
        {[0, 1].map(i => (
          <View key={i} style={[
              styles.dot,
              i === activeSlide2 ? styles.dotActive : styles.dotInactive,
              { backgroundColor: activeSlide2 === i ? colors.tint : colors.surfaceMuted }
          ]} />        
        ))}
      </View>
    </ScrollView>
  </SafeAreaView>
);
}

// ── Sub-components ──
function ComparisonPill({ label, current, previous, diff, diffLabel, colors }: {
  label: string;
  current: string;
  previous: string;
  diff: number;
  diffLabel: string;
  colors: any;
}) {
  const isUp = diff > 0;
  const isNeutral = diff === 0;
  const diffColor = isNeutral ? colors.text : isUp ? '#4CAF50' : '#EF5350';
  const arrow = isNeutral ? '—' : isUp ? '↑' : '↓';

  return (
    <View style={[styles.pill, { backgroundColor: colors.background }]}>
      <ThemedText style={[styles.pillLabel, { color: colors.text }]}>{label}</ThemedText>
      <ThemedText style={[styles.pillCurrent, { color: colors.text }]}>{current}</ThemedText>
      <ThemedText style={[styles.pillPrevious, { color: colors.text }]}>was {previous}</ThemedText>
      <ThemedText style={[styles.pillDiff, { color: diffColor }]}>
        {arrow} {diffLabel}
      </ThemedText>
    </View>
  );
}

function StatCard({ label, value, background, colors }: {
  label: string;
  value: string | number;
  background?: string;
  colors: any;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: background ?? colors.surface }]}>
      <ThemedText style={[styles.statLabel, { color: colors.text }]}>{label}</ThemedText>
      <ThemedText style={[styles.statValue, { color: colors.text }]}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { gap: 4, paddingTop: 20 },
  subtle: { fontSize: 13, opacity: 0.6 },
  big: { fontSize: 36, fontWeight: '600', lineHeight: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { padding: 16, borderRadius: 12, gap: 8 },
  statCard: { width: '48%', padding: 14, borderRadius: 12, gap: 4 },
  statLabel: { fontSize: 13, opacity: 0.6 },
  statValue: { fontSize: 20, fontWeight: '600', lineHeight: 24 },
  hintBox: { marginTop: 8, padding: 12, borderRadius: 12, alignItems: 'center' },

  // Stacked bar
  stackedBar: { flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', marginTop: 4 },
  stackedSegment: { height: '100%' },

  // Legend
  legend: { marginTop: 12, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, opacity: 0.8 },

  // Insight box
  insightBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, marginTop: 4 },

  // Comparison pills
  comparisonRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  pill: { flex: 1, padding: 12, borderRadius: 12, gap: 2 },
  pillLabel: { fontSize: 11, opacity: 0.5, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  pillCurrent: { fontSize: 17, fontWeight: '700', marginTop: 2 },
  pillPrevious: { fontSize: 11, opacity: 0.5 },
  pillDiff: { fontSize: 13, fontWeight: '600', marginTop: 2 },

  // Category comparison bars
  categoryCompRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  categoryCompLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 80 },
  categoryCompText: { fontSize: 12, opacity: 0.8 },
  dualBarContainer: { flex: 1, gap: 3 },
  dualBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  dualBarFill: { height: '100%', borderRadius: 3 },
  categoryCompDiff: { fontSize: 12, fontWeight: '600', width: 42, textAlign: 'right' },

  // Legend for dual bars
  dualBarLegend: { flexDirection: 'row', gap: 16, marginTop: 8, justifyContent: 'flex-end' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 6, borderRadius: 3 },
  chartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.15)',
    marginTop: 4,
  },
  chartSummaryItem: {
    alignItems: 'center',
    gap: 2,
  },
  swipeCard: { width: CARD_WIDTH },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 4 },
  dot: { height: 6, borderRadius: 3 },
  dotInactive: { width: 6 },
  dotActive: { width: 16 }, // pill shape when active
});
