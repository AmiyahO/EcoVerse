// Stats/progress screen
import { ThemedText } from '@/components/themed-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { calculateCarbonSaved, getWeekCarbonComparison } from '@/src/utils/ecoLogic';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function StatsScreen() {
  const { colors } = useAppTheme();
  const activities = useActivityStore((state) => state.activities);
  const comparison = getWeekCarbonComparison(activities);

  // Totals
  const totalSteps = activities.reduce((sum, a) => sum + (a.steps ?? 0), 0);
  const totalDistance = activities.reduce((sum, a) => sum + (a.distance ?? 0), 0);
  const totalCO2 = activities.reduce((sum, a) => sum + calculateCarbonSaved(a), 0);

  // Averages
  // Only include activities that have steps for avgSteps
  const stepActivities = activities.filter(a => a.steps !== undefined);
  const avgSteps =
    stepActivities.length > 0
      ? Math.round(stepActivities.reduce((sum, a) => sum + a.steps!, 0) / stepActivities.length)
      : 0;

  // Only include activities that have distance for avgDistance
  const distanceActivities = activities.filter(a => a.distance !== undefined);
  const avgDistance =
    distanceActivities.length > 0
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
    const co2 = calculateCarbonSaved(activity);
    co2ByCategory[activity.category] += co2;
  });

  const totalCO2All = Object.values(co2ByCategory).reduce((a, b) => a + b, 0);

  let dominantCategory = 'N/A';
  let dominantValue = 0;
  let dominantPercentage = 0;

  if (totalCO2All > 0) {
    const sortedCO2 = Object.entries(co2ByCategory)
      .sort((a, b) => b[1] - a[1]);

    dominantCategory = sortedCO2[0][0];
    dominantValue = sortedCO2[0][1];
    dominantPercentage = (dominantValue / totalCO2All) * 100;
  }

  const CATEGORY_COLORS = {
    walking: '#66BB6A',
    running: '#43A047',
    cycling: '#2E7D32',
    electricity: '#FBC02D',
    water: '#29B6F6',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background}]}>
        <ThemedText type="title" style={{ color: colors.text, paddingHorizontal: 18 }}>Your Stats</ThemedText>
        <ThemedText style={[styles.subtle, { color: colors.text, paddingHorizontal: 18}]}>Based on all logged activities</ThemedText>
      </View>
      
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        >

        {/* Total Activities */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Total Activities</ThemedText>
          <ThemedText style={[styles.big, { color: colors.text }]}>{activities.length}</ThemedText>
        </View>

        {/* Totals */}
        <View style={[styles.grid]}>
          <StatCard label="Total Steps" value={totalSteps} background={colors.surface} colors={colors} />
          <StatCard label="Total Distance" value={`${totalDistance.toFixed(2)} km`} background={colors.surface} colors={colors} />
          <StatCard label="Avg Steps" value={avgSteps} background={colors.surface} colors={colors} />
          <StatCard label="Avg Distance" value={`${avgDistance} km`} background={colors.surface} colors={colors} />
          <StatCard label="Total CO₂ Saved" value={`${totalCO2.toFixed(2)} kg`} background={colors.surface} colors={colors} />
          <StatCard label="Most Common Activity" value={mostCommonActivity.charAt(0).toUpperCase() + mostCommonActivity.slice(1)} background={colors.surface} colors={colors} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>
            CO₂ Saved by Category
          </ThemedText>

          {/* Stacked Bar */}
          <View style={[styles.stackedBar, { backgroundColor: colors.surfaceMuted }]}>
            {Object.entries(co2ByCategory).map(([category, value]) => {
              if (value <= 0 || totalCO2All === 0) return null;

              const widthPercent = (value / totalCO2All) * 100;

              return (
                <View
                  key={category}
                  style={[
                    styles.stackedSegment, 
                    {
                      width: `${widthPercent}%`,
                      backgroundColor: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS],
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {Object.entries(co2ByCategory).map(([category, value]) => (
              value > 0 && (
                <View key={category} style={styles.legendRow}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] },
                    ]}
                  />
                  <ThemedText style={[styles.legendText, { color: colors.text }]}>
                    {category.charAt(0).toUpperCase() + category.slice(1)} · {value.toFixed(2)} kg
                  </ThemedText>
                </View>
              )
            ))}
          </View>

          {totalCO2All > 0 && (
            <View style={{ marginTop: 12 }}>
              <ThemedText style={{ color: colors.text, fontSize: 13, opacity: 0.8 }}>
                {dominantCategory.charAt(0).toUpperCase() + dominantCategory.slice(1)} contributes the most to your total impact
                ({dominantPercentage.toFixed(2)}%).
              </ThemedText>
            </View>
          )}
        </View>

        {/* Week-over-Week CO₂ Comparison Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>
            CO₂ Comparison (Week-over-Week)
          </ThemedText>

          {/* Visual bar */}
          <View style={[styles.comparisonBarContainer, { backgroundColor: colors.surfaceMuted }]}>
            <View
              style={[
                styles.comparisonBar,
                {
                  width: `${Math.min(Number(comparison.percentage), 100)}%`,
                  backgroundColor: comparison.direction === 'up' ? '#6fff52' : '#fc0000',
                },
              ]}
            />
          </View>

          {/* Label */}
          <ThemedText style={{ color: colors.text, marginTop: 6 }}>
            {comparison.direction === 'up'
              ? `↑ ${comparison.percentage}% more impact than last week`
              : comparison.direction === 'down'
              ? `↓ ${comparison.percentage}% less impact than last week`
              : 'No change compared to last week'}
          </ThemedText>
        </View>

        <View style={[styles.hintBox, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }]}>
          <ThemedText style={[styles.subtle, { color: colors.text + '99' }]}>
            More insights, trends and graphs coming soon 🌱
          </ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, background, colors }: { label: string; value: string | number; background?: string; colors: any }) {
  return (
    <View style={[styles.statCard, background ? { backgroundColor: background } : { backgroundColor: colors.surface }]}>
      <ThemedText style={[styles.statLabel, { color: colors.text }]}>{label}</ThemedText>
      <ThemedText style={[styles.statValue, { color: colors.text }]}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16,
    //paddingTop: 50,
  },
  header: { 
    gap: 4,
    paddingTop: 20,
  },
  subtle: { 
    fontSize: 13, 
    opacity: 0.6 
  },
  big: { 
    fontSize: 36, 
    fontWeight: '600', 
    lineHeight: 40 
  },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  statCard: {
    width: '48%',
    padding: 14,
    borderRadius: 12,
    gap: 4,
  },
  statLabel: { 
    fontSize: 13, 
    opacity: 0.6 
  },
  statValue: { 
    fontSize: 20, 
    fontWeight: '600', 
    lineHeight: 24 
  },
  hintBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
  },
  stackedBar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 12,
  },

  stackedSegment: {
    height: '100%',
  },

  legend: {
    marginTop: 12,
    gap: 6,
  },

  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  legendText: {
    fontSize: 13,
    opacity: 0.8,
  },

  scrollContent: {
    paddingBottom: 70,
    gap: 16,
  },

  comparisonBarContainer: {
    width: '100%',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },

  comparisonBar: {
    height: '100%',
    borderRadius: 6,
  },
});
