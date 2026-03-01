// (tabs)/stats.tsx
import { ThemedText } from '@/components/themed-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import {
  calculateCarbonSaved, calculateTokens, CATEGORY_COLORS,
  getWeekRange, getWeeklyCO2Data,
} from '@/src/utils/ecoLogic';
import { ScrollView, StyleSheet, View, FlatList, Dimensions, Pressable } from 'react-native';
import { useState } from 'react';
import { FontAwesome6 } from '@expo/vector-icons';
import { CartesianChart, Bar } from 'victory-native';
import Svg, { Path } from 'react-native-svg';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH   = SCREEN_WIDTH - 32;

const CATEGORY_ICONS: Record<string, string> = {
  walking:     'person-walking',
  running:     'person-running',
  cycling:     'bicycle',
  electricity: 'bolt',
  water:       'droplet',
};

const CATEGORY_ORDER = ['walking', 'running', 'cycling', 'electricity', 'water'];

// ─── Donut chart (react-native-svg, already a dep of Victory Native) ──────────

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(
  cx: number, cy: number, outerR: number, innerR: number,
  startDeg: number, sweep: number,
): string {
  const clamped  = Math.min(sweep, 359.99);
  const largeArc = clamped > 180 ? 1 : 0;
  const o1 = polarToXY(cx, cy, outerR, startDeg);
  const o2 = polarToXY(cx, cy, outerR, startDeg + clamped);
  const i1 = polarToXY(cx, cy, innerR, startDeg + clamped);
  const i2 = polarToXY(cx, cy, innerR, startDeg);
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${i2.x} ${i2.y}`,
    'Z',
  ].join(' ');
}

interface DonutSlice { category: string; count: number; color: string; }

function DonutChart({ slices, size = 156 }: { slices: DonutSlice[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.60;
  const total  = slices.reduce((s, sl) => s + sl.count, 0);
  if (total === 0) return null;

  let deg = 0;
  return (
    <Svg width={size} height={size}>
      {slices.filter(sl => sl.count > 0).map(sl => {
        const sweep = (sl.count / total) * 360;
        const start = deg;
        deg += sweep;
        return (
          <Path
            key={sl.category}
            d={donutSlicePath(cx, cy, outerR, innerR, start, sweep)}
            fill={sl.color}
            stroke="transparent"
            strokeWidth={1.5}
          />
        );
      })}
    </Svg>
  );
}

// ─── Month helpers ─────────────────────────────────────────────────────────────

function getMonthRange(offset: number): { start: Date; end: Date; label: string; shortLabel: string } {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1, 0, 0, 0, 0);
  const end   = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
  return {
    start,
    end,
    label:      start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    shortLabel: start.toLocaleDateString('en-US', { month: 'short' }),
  };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ label, colors }: { label: string; colors: any }) {
  return (
    <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>
      {label}
    </ThemedText>
  );
}

function DotsRow({ count, active, colors }: { count: number; active: number; colors: any }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[
          styles.dot,
          i === active ? styles.dotActive : styles.dotInactive,
          { backgroundColor: i === active ? colors.tint : colors.surfaceMuted },
        ]} />
      ))}
    </View>
  );
}

function ComparisonPill({
  label, current, previous, diff, diffLabel, colors,
}: {
  label: string; current: string; previous: string;
  diff: number; diffLabel: string; colors: any;
}) {
  const neutral   = diff === 0;
  const diffColor = neutral ? colors.text : diff > 0 ? '#4CAF50' : '#EF5350';
  const arrow     = neutral ? '—' : diff > 0 ? '↑' : '↓';
  return (
    <View style={[styles.pill, { backgroundColor: colors.background }]}>
      <ThemedText style={[styles.pillLabel,    { color: colors.text }]}>{label}</ThemedText>
      <ThemedText style={[styles.pillCurrent,  { color: colors.text }]}>{current}</ThemedText>
      <ThemedText style={[styles.pillPrevious, { color: colors.text }]}>was {previous}</ThemedText>
      <ThemedText style={[styles.pillDiff,     { color: diffColor }]}>{arrow} {diffLabel}</ThemedText>
    </View>
  );
}

function StatCard({ label, value, bg, colors }: {
  label: string; value: string | number; bg?: string; colors: any;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg ?? colors.surface }]}>
      <ThemedText style={[styles.statLabel, { color: colors.text }]}>{label}</ThemedText>
      <ThemedText style={[styles.statValue, { color: colors.text }]}>{value}</ThemedText>
    </View>
  );
}

// Monthly metric cell — shows this month's value + diff badge vs last month
function MonthMetric({ label, thisVal, lastVal, unit, color, colors, decimals = 1 }: {
  label: string; thisVal: number; lastVal: number;
  unit: string; color: string; colors: any; decimals?: number;
}) {
  const diff = thisVal - lastVal;
  const diffColor = diff > 0 ? '#4CAF50' : diff < 0 ? '#EF5350' : colors.text;

  return (
    <View style={styles.monthMetricCell}>
      <ThemedText style={[styles.monthMetricLabel, { color: colors.text }]}>{label}</ThemedText>
      <ThemedText style={[styles.monthMetricValue, { color }]}>
        {thisVal > 0 ? thisVal.toFixed(decimals) : '—'}
        {thisVal > 0 ? (
          <ThemedText style={[styles.monthMetricUnit, { color: colors.text }]}> {unit}</ThemedText>
        ) : null}
      </ThemedText>
      {lastVal > 0 && thisVal > 0 && (
        <ThemedText style={[styles.monthMetricDiff, { color: diffColor }]}>
          {diff > 0 ? '↑' : diff < 0 ? '↓' : '—'} {Math.abs(diff).toFixed(decimals)} vs last
        </ThemedText>
      )}
      {lastVal === 0 && thisVal > 0 && (
        <ThemedText style={[styles.monthMetricDiff, { color: colors.text, opacity: 0.4 }]}>first entry</ThemedText>
      )}
      {thisVal === 0 && (
        <ThemedText style={[styles.monthMetricDiff, { color: colors.text, opacity: 0.35 }]}>not logged</ThemedText>
      )}
    </View>
  );
}

// Dual horizontal bar: last month (faded) vs this month (solid)
function MonthBar({ thisVal, lastVal, color, colors, thisLabel, lastLabel }: {
  thisVal: number; lastVal: number; color: string; colors: any;
  thisLabel: string; lastLabel: string;
}) {
  if (thisVal === 0 && lastVal === 0) return null;
  const max = Math.max(thisVal, lastVal, 0.01);
  const LABEL_W = 36;
  return (
    <View style={{ gap: 5 }}>
      <View style={styles.monthBarRow}>
        <ThemedText style={[styles.monthBarLabel, { color: colors.text, width: LABEL_W }]}>{lastLabel}</ThemedText>
        <View style={[styles.monthBarTrack, { backgroundColor: colors.surfaceMuted }]}>
          <View style={[styles.monthBarFill, { width: `${(lastVal / max) * 100}%`, backgroundColor: color + '55' }]} />
        </View>
      </View>
      <View style={styles.monthBarRow}>
        <ThemedText style={[styles.monthBarLabel, { color: colors.text, width: LABEL_W }]}>{thisLabel}</ThemedText>
        <View style={[styles.monthBarTrack, { backgroundColor: colors.surfaceMuted }]}>
          <View style={[styles.monthBarFill, { width: `${(thisVal / max) * 100}%`, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const { colors } = useAppTheme();
  const userRegion  = useActivityStore(s => s.userRegion);
  const activities  = useActivityStore(s => s.activities);

  const [slide1, setSlide1] = useState(0);
  const [slide2, setSlide2] = useState(0);
  const [slide3, setSlide3] = useState(0);

  // ── Week data ─────────────────────────────────────────────────────────────
  const weeklyCO2Data    = getWeeklyCO2Data(activities, userRegion, 8);
  const currentWeekLabel = weeklyCO2Data[weeklyCO2Data.length - 1]?.week;

  const currentWeek  = getWeekRange(0);
  const previousWeek = getWeekRange(1);

  const thisWeekActs = activities.filter(a => { const d = new Date(a.date); return d >= currentWeek.start  && d <= currentWeek.end;  });
  const lastWeekActs = activities.filter(a => { const d = new Date(a.date); return d >= previousWeek.start && d <= previousWeek.end; });

  const thisWeekCO2    = thisWeekActs.reduce((s, a) => s + calculateCarbonSaved(a, userRegion), 0);
  const thisWeekTokens = thisWeekActs.reduce((s, a) => s + calculateTokens(a), 0);
  const lastWeekTokens = lastWeekActs.reduce((s, a) => s + calculateTokens(a), 0);
  const thisWeekCount  = thisWeekActs.length;
  const lastWeekCount  = lastWeekActs.length;

  // CO₂ by category (for dual bars)
  const co2ThisWeek: Record<string, number> = { walking: 0, running: 0, cycling: 0, electricity: 0, water: 0 };
  const co2LastWeek: Record<string, number> = { walking: 0, running: 0, cycling: 0, electricity: 0, water: 0 };
  thisWeekActs.forEach(a => { co2ThisWeek[a.category] += calculateCarbonSaved(a, userRegion); });
  lastWeekActs.forEach(a => { co2LastWeek[a.category] += calculateCarbonSaved(a, userRegion); });

  // ── All-time data ─────────────────────────────────────────────────────────
  const totalSteps    = activities.reduce((s, a) => s + (a.steps ?? 0), 0);
  const totalDistance = activities.reduce((s, a) => s + (a.distance ?? 0), 0);
  const totalCO2      = activities.reduce((s, a) => s + calculateCarbonSaved(a, userRegion), 0);

  const stepActs     = activities.filter(a => a.steps !== undefined);
  const distActs     = activities.filter(a => a.distance !== undefined);
  const avgSteps     = stepActs.length > 0 ? Math.round(stepActs.reduce((s, a) => s + a.steps!, 0) / stepActs.length) : 0;
  const avgDist      = distActs.length > 0 ? (distActs.reduce((s, a) => s + a.distance!, 0) / distActs.length).toFixed(2) : '0.00';

  const catCounts: Record<string, number> = {};
  activities.forEach(a => { catCounts[a.category] = (catCounts[a.category] || 0) + 1; });
  const topActivity = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';

  // ── CO₂ all-time breakdown ────────────────────────────────────────────────
  const co2AllTime: Record<string, number> = { walking: 0, running: 0, cycling: 0, electricity: 0, water: 0 };
  activities.forEach(a => { co2AllTime[a.category] += calculateCarbonSaved(a, userRegion); });
  const totalCO2All = Object.values(co2AllTime).reduce((a, b) => a + b, 0);

  const dominantCat   = totalCO2All > 0 ? Object.entries(co2AllTime).sort((a, b) => b[1] - a[1])[0][0] : 'N/A';
  const dominantPct   = totalCO2All > 0 ? (co2AllTime[dominantCat] / totalCO2All) * 100 : 0;

  // ── Donut — activity count distribution ──────────────────────────────────
  const donutSlices: DonutSlice[] = CATEGORY_ORDER.map(cat => ({
    category: cat,
    count:    catCounts[cat] ?? 0,
    color:    CATEGORY_COLORS[cat] ?? colors.tint,
  }));
  const donutTotal = donutSlices.reduce((s, sl) => s + sl.count, 0);

  // ── Monthly data ──────────────────────────────────────────────────────────
  const thisMonth = getMonthRange(0);
  const lastMonth = getMonthRange(-1);

  const thisMonthActs = activities.filter(a => { const d = new Date(a.date); return d >= thisMonth.start && d <= thisMonth.end; });
  const lastMonthActs = activities.filter(a => { const d = new Date(a.date); return d >= lastMonth.start && d <= lastMonth.end; });

  // Activity counts by category, monthly
  const thisMonthCounts: Record<string, number> = { walking: 0, running: 0, cycling: 0, electricity: 0, water: 0 };
  const lastMonthCounts: Record<string, number> = { walking: 0, running: 0, cycling: 0, electricity: 0, water: 0 };
  thisMonthActs.forEach(a => { thisMonthCounts[a.category] = (thisMonthCounts[a.category] || 0) + 1; });
  lastMonthActs.forEach(a => { lastMonthCounts[a.category] = (lastMonthCounts[a.category] || 0) + 1; });

  const thisMonthTotal = thisMonthActs.length;
  const lastMonthTotal = lastMonthActs.length;

  const thisMonthTokens  = thisMonthActs.reduce((s, a) => s + calculateTokens(a), 0);
  const lastMonthTokens  = lastMonthActs.reduce((s, a) => s + calculateTokens(a), 0);
  const thisMonthCO2     = thisMonthActs.reduce((s, a) => s + calculateCarbonSaved(a, userRegion), 0);
  const lastMonthCO2     = lastMonthActs.reduce((s, a) => s + calculateCarbonSaved(a, userRegion), 0);

  // Utilities monthly
  const thisKwh      = thisMonthActs.filter(a => a.category === 'electricity').reduce((s, a) => s + (a.kwhSaved ?? 0), 0);
  const lastKwh      = lastMonthActs.filter(a => a.category === 'electricity').reduce((s, a) => s + (a.kwhSaved ?? 0), 0);
  const thisElecCO2  = thisMonthActs.filter(a => a.category === 'electricity').reduce((s, a) => s + calculateCarbonSaved(a, userRegion), 0);
  const lastElecCO2  = lastMonthActs.filter(a => a.category === 'electricity').reduce((s, a) => s + calculateCarbonSaved(a, userRegion), 0);

  const thisLitres   = thisMonthActs.filter(a => a.category === 'water').reduce((s, a) => s + (a.litersSaved ?? 0), 0);
  const lastLitres   = lastMonthActs.filter(a => a.category === 'water').reduce((s, a) => s + (a.litersSaved ?? 0), 0);
  const thisWaterCO2 = thisMonthActs.filter(a => a.category === 'water').reduce((s, a) => s + calculateCarbonSaved(a, userRegion), 0);
  const lastWaterCO2 = lastMonthActs.filter(a => a.category === 'water').reduce((s, a) => s + calculateCarbonSaved(a, userRegion), 0);

  const hasUtility = thisKwh > 0 || lastKwh > 0 || thisLitres > 0 || lastLitres > 0;
  const hasMonthlyActivity = thisMonthTotal > 0 || lastMonthTotal > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.headerArea, { backgroundColor: colors.background }]}>
        <ThemedText type="title" style={{ color: colors.text, paddingHorizontal: 16 }}>
          Your Stats
        </ThemedText>
        <ThemedText style={[styles.subtle, { color: colors.text, paddingHorizontal: 16 }]}>
          Based on all logged activities
        </ThemedText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ══════════════════════════════════════════════════════════════
            ROW 1 — All-Time  |  This Week vs Last Week
        ══════════════════════════════════════════════════════════════ */}
        <SectionLabel label="Overview" colors={colors} />
        <FlatList
          data={['alltime', 'week'] as const}
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 12} decelerationRate="fast"
          contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
          onMomentumScrollEnd={e => setSlide1(Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12)))}
          keyExtractor={i => i}
          renderItem={({ item }) => {
            if (item === 'alltime') return (
              <View style={[styles.card, styles.swipeCard, { backgroundColor: colors.surface }]}>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>All-Time</ThemedText>
                <View style={styles.bigRow}>
                  <ThemedText style={[styles.bigNum, { color: colors.text }]}>{activities.length}</ThemedText>
                  <ThemedText style={[styles.subtle, { color: colors.text }]}>activities logged</ThemedText>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.surfaceMuted }]} />
                <View style={styles.grid}>
                  <StatCard label="Total Steps"    value={totalSteps.toLocaleString()}      bg={colors.background} colors={colors} />
                  <StatCard label="Total Distance" value={`${totalDistance.toFixed(2)} km`} bg={colors.background} colors={colors} />
                  <StatCard label="Avg Steps"      value={avgSteps.toLocaleString()}         bg={colors.background} colors={colors} />
                  <StatCard label="Avg Distance"   value={`${avgDist} km`}                  bg={colors.background} colors={colors} />
                  <StatCard label="Total CO₂"      value={`${totalCO2.toFixed(2)} kg`}      bg={colors.background} colors={colors} />
                  <StatCard label="Top Activity"   value={topActivity.charAt(0).toUpperCase() + topActivity.slice(1)} bg={colors.background} colors={colors} />
                </View>
              </View>
            );

            if (item === 'week') return (
              <View style={[styles.card, styles.swipeCard, { backgroundColor: colors.surface }]}>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>This Week vs Last Week</ThemedText>

                {/* Tokens + Activities pills — CO₂ omitted (utility bills distort weekly delta) */}
                <View style={styles.pillRow}>
                  <ComparisonPill
                    label="Tokens"     current={`${thisWeekTokens}`}
                    previous={`${lastWeekTokens}`} diff={thisWeekTokens - lastWeekTokens}
                    diffLabel={`${Math.abs(thisWeekTokens - lastWeekTokens)}`} colors={colors}
                  />
                  <ComparisonPill
                    label="Activities" current={`${thisWeekCount}`}
                    previous={`${lastWeekCount}`}  diff={thisWeekCount - lastWeekCount}
                    diffLabel={`${Math.abs(thisWeekCount - lastWeekCount)}`}  colors={colors}
                  />
                </View>

                {/* CO₂ by category dual bars */}
                <ThemedText style={[styles.cardSubtitle, { color: colors.text }]}>CO₂ by category</ThemedText>
                {CATEGORY_ORDER.map(cat => {
                  const thisVal = co2ThisWeek[cat];
                  const lastVal = co2LastWeek[cat];
                  if (thisVal === 0 && lastVal === 0) return null;
                  const diff    = thisVal - lastVal;
                  const max     = Math.max(thisVal, lastVal, 0.01);
                  const clr     = CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS];
                  return (
                    <View key={cat} style={styles.catBarRow}>
                      <View style={styles.catBarLabel}>
                        <FontAwesome6 name={CATEGORY_ICONS[cat]} size={12} color={clr} />
                        <ThemedText style={[styles.catBarText, { color: colors.text }]}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </ThemedText>
                      </View>
                      <View style={styles.dualBars}>
                        <View style={[styles.dualBarTrack, { backgroundColor: colors.surfaceMuted }]}>
                          <View style={[styles.dualBarFill, { width: `${(lastVal / max) * 100}%`, backgroundColor: clr + '55' }]} />
                        </View>
                        <View style={[styles.dualBarTrack, { backgroundColor: colors.surfaceMuted }]}>
                          <View style={[styles.dualBarFill, { width: `${(thisVal / max) * 100}%`, backgroundColor: clr }]} />
                        </View>
                      </View>
                      <ThemedText style={[styles.catBarDiff, {
                        color: diff > 0 ? '#4CAF50' : diff < 0 ? '#EF5350' : colors.text,
                      }]}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                      </ThemedText>
                    </View>
                  );
                })}
                {/* Bar legend */}
                <View style={styles.barLegend}>
                  {[{ suf: '55', lbl: 'Last week' }, { suf: '', lbl: 'This week' }].map(({ suf, lbl }) => (
                    <View key={lbl} style={styles.barLegendItem}>
                      <View style={[styles.barLegendSwatch, { backgroundColor: colors.tint + suf }]} />
                      <ThemedText style={[styles.subtle, { color: colors.text, fontSize: 11 }]}>{lbl}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            );
            return null;
          }}
        />
        <DotsRow count={2} active={slide1} colors={colors} />

        {/* ══════════════════════════════════════════════════════════════
            ROW 2 — Activity Donut  |  CO₂ Breakdown
        ══════════════════════════════════════════════════════════════ */}
        <SectionLabel label="Breakdown" colors={colors} />
        <FlatList
          data={['donut', 'co2'] as const}
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 12} decelerationRate="fast"
          contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
          onMomentumScrollEnd={e => setSlide2(Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12)))}
          keyExtractor={i => i}
          renderItem={({ item }) => {
            if (item === 'donut') return (
              <View style={[styles.card, styles.swipeCard, { backgroundColor: colors.surface }]}>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Activity Distribution</ThemedText>
                <ThemedText style={[styles.subtle, { color: colors.text }]}>% of activities by category, all-time</ThemedText>

                {donutTotal === 0 ? (
                  <View style={styles.emptyState}>
                    <FontAwesome6 name="chart-pie" size={32} color={colors.text} style={{ opacity: 0.15 }} />
                    <ThemedText style={[styles.subtle, { color: colors.text, textAlign: 'center', marginTop: 8 }]}>
                      No activities yet
                    </ThemedText>
                  </View>
                ) : (
                  <View style={styles.donutLayout}>
                    {/* Donut */}
                    <View style={{ width: 156, height: 156 }}>
                      <DonutChart slices={donutSlices} size={156} />
                      {/* Centre label absolutely positioned */}
                      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
                        <ThemedText style={{ fontSize: 22, fontWeight: '800', color: colors.text, lineHeight: 26 }}>
                          {donutTotal}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 11, opacity: 0.45, color: colors.text }}>total</ThemedText>
                      </View>
                    </View>

                    {/* Legend */}
                    <View style={styles.donutLegend}>
                      {donutSlices
                        .filter(sl => sl.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .map(sl => (
                          <View key={sl.category} style={styles.donutLegendRow}>
                            <View style={[styles.legendDot, { backgroundColor: sl.color }]} />
                            <View style={{ flex: 1 }}>
                              <ThemedText style={[styles.legendText, { color: colors.text }]}>
                                {sl.category.charAt(0).toUpperCase() + sl.category.slice(1)}
                              </ThemedText>
                              <ThemedText style={[styles.subtle, { color: colors.text, fontSize: 11 }]}>
                                {sl.count} · {((sl.count / donutTotal) * 100).toFixed(0)}%
                              </ThemedText>
                            </View>
                          </View>
                        ))}
                    </View>
                  </View>
                )}
              </View>
            );

            if (item === 'co2') return (
              <View style={[styles.card, styles.swipeCard, { backgroundColor: colors.surface }]}>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>CO₂ Impact Breakdown</ThemedText>

                <View style={[styles.stackedBar, { backgroundColor: colors.surfaceMuted }]}>
                  {CATEGORY_ORDER.map(cat => {
                    const val = co2AllTime[cat];
                    if (val <= 0 || totalCO2All === 0) return null;
                    return (
                      <View key={cat} style={[styles.stackedSegment, {
                        width: `${(val / totalCO2All) * 100}%`,
                        backgroundColor: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS],
                      }]} />
                    );
                  })}
                </View>

                <View style={styles.legendList}>
                  {CATEGORY_ORDER.map(cat => {
                    const val = co2AllTime[cat];
                    if (val <= 0) return null;
                    return (
                      <View key={cat} style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] }]} />
                        <ThemedText style={[styles.legendText, { color: colors.text, flex: 1 }]}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </ThemedText>
                        <ThemedText style={[styles.legendText, { color: colors.text, opacity: 0.65 }]}>
                          {val.toFixed(2)} kg · {((val / totalCO2All) * 100).toFixed(1)}%
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>

                {totalCO2All > 0 && (
                  <View style={[styles.insightBox, { backgroundColor: colors.tint + '18' }]}>
                    <FontAwesome6 name="lightbulb" size={12} color={colors.tint} />
                    <ThemedText style={{ color: colors.text, fontSize: 13, flex: 1, lineHeight: 18 }}>
                      {dominantCat.charAt(0).toUpperCase() + dominantCat.slice(1)} drives {dominantPct.toFixed(1)}% of your total CO₂ savings.
                    </ThemedText>
                  </View>
                )}
              </View>
            );
            return null;
          }}
        />
        <DotsRow count={2} active={slide2} colors={colors} />

        {/* ══════════════════════════════════════════════════════════════
            ROW 3 — Monthly Activity  |  Monthly Utilities  |  8-Week Chart
        ══════════════════════════════════════════════════════════════ */}
        <SectionLabel label="Monthly & Trends" colors={colors} />
        <FlatList
          data={['monthActivity', 'utilities', 'trends'] as const}
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 12} decelerationRate="fast"
          contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
          onMomentumScrollEnd={e => setSlide3(Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12)))}
          keyExtractor={i => i}
          renderItem={({ item }) => {

            // ── Monthly Activity Comparison ──
            if (item === 'monthActivity') return (
              <View style={[styles.card, styles.swipeCard, { backgroundColor: colors.surface }]}>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Monthly Activity</ThemedText>
                <ThemedText style={[styles.subtle, { color: colors.text }]}>
                  {thisMonth.label} vs {lastMonth.label}
                </ThemedText>

                {!hasMonthlyActivity ? (
                  <View style={styles.emptyState}>
                    <FontAwesome6 name="calendar" size={28} color={colors.text} style={{ opacity: 0.15 }} />
                    <ThemedText style={[styles.subtle, { color: colors.text, textAlign: 'center', marginTop: 8 }]}>
                      No activities logged yet this month or last.
                    </ThemedText>
                  </View>
                ) : (
                  <View style={{ gap: 16 }}>
                    {/* Top-level summary pills */}
                    <View style={styles.pillRow}>
                      <ComparisonPill
                        label="Activities" current={`${thisMonthTotal}`}
                        previous={`${lastMonthTotal}`} diff={thisMonthTotal - lastMonthTotal}
                        diffLabel={`${Math.abs(thisMonthTotal - lastMonthTotal)}`} colors={colors}
                      />
                      <ComparisonPill
                        label="Tokens" current={`${thisMonthTokens}`}
                        previous={`${lastMonthTokens}`} diff={thisMonthTokens - lastMonthTokens}
                        diffLabel={`${Math.abs(thisMonthTokens - lastMonthTokens)}`} colors={colors}
                      />
                      <ComparisonPill
                        label="CO₂ Saved" current={`${thisMonthCO2.toFixed(1)} kg`}
                        previous={`${lastMonthCO2.toFixed(1)} kg`} diff={thisMonthCO2 - lastMonthCO2}
                        diffLabel={`${Math.abs(thisMonthCO2 - lastMonthCO2).toFixed(1)} kg`} colors={colors}
                      />
                    </View>

                    {/* Per-category count bars */}
                    <View style={{ gap: 2 }}>
                      <ThemedText style={[styles.cardSubtitle, { color: colors.text }]}>
                        Activities by category
                      </ThemedText>
                      {CATEGORY_ORDER.map(cat => {
                        const thisC = thisMonthCounts[cat] ?? 0;
                        const lastC = lastMonthCounts[cat] ?? 0;
                        if (thisC === 0 && lastC === 0) return null;
                        const diff  = thisC - lastC;
                        const max   = Math.max(thisC, lastC, 0.01);
                        const clr   = CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS];
                        return (
                          <View key={cat} style={[styles.catBarRow, { marginBottom: 6 }]}>
                            <View style={styles.catBarLabel}>
                              <FontAwesome6 name={CATEGORY_ICONS[cat]} size={12} color={clr} />
                              <ThemedText style={[styles.catBarText, { color: colors.text }]}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                              </ThemedText>
                            </View>
                            <View style={styles.dualBars}>
                              <View style={[styles.dualBarTrack, { backgroundColor: colors.surfaceMuted }]}>
                                <View style={[styles.dualBarFill, { width: `${(lastC / max) * 100}%`, backgroundColor: clr + '55' }]} />
                              </View>
                              <View style={[styles.dualBarTrack, { backgroundColor: colors.surfaceMuted }]}>
                                <View style={[styles.dualBarFill, { width: `${(thisC / max) * 100}%`, backgroundColor: clr }]} />
                              </View>
                            </View>
                            <ThemedText style={[styles.catBarDiff, {
                              color: diff > 0 ? '#4CAF50' : diff < 0 ? '#EF5350' : colors.text,
                            }]}>
                              {diff > 0 ? '+' : ''}{diff}
                            </ThemedText>
                          </View>
                        );
                      })}
                      <View style={styles.barLegend}>
                        {[{ suf: '55', lbl: lastMonth.label }, { suf: '', lbl: thisMonth.label }].map(({ suf, lbl }) => (
                          <View key={lbl} style={styles.barLegendItem}>
                            <View style={[styles.barLegendSwatch, { backgroundColor: colors.tint + suf }]} />
                            <ThemedText style={[styles.subtle, { color: colors.text, fontSize: 11 }]}>{lbl.split(' ')[0]}</ThemedText>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );

            // ── Monthly Utilities ──
            if (item === 'utilities') return (
              <View style={[styles.card, styles.swipeCard, { backgroundColor: colors.surface }]}>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Monthly Utilities</ThemedText>
                <ThemedText style={[styles.subtle, { color: colors.text }]}>
                  {thisMonth.label} vs {lastMonth.label}
                </ThemedText>

                {!hasUtility ? (
                  <View style={styles.emptyState}>
                    <FontAwesome6 name="bolt" size={28} color={colors.text} style={{ opacity: 0.15 }} />
                    <ThemedText style={[styles.subtle, { color: colors.text, textAlign: 'center', marginTop: 8 }]}>
                      No utility readings logged yet.{'\n'}Log electricity or water usage to see your monthly comparison.
                    </ThemedText>
                  </View>
                ) : (
                  <View style={{ gap: 14 }}>
                    {/* Electricity */}
                    {(thisKwh > 0 || lastKwh > 0) && (
                      <View style={[styles.utilitySection, { borderColor: CATEGORY_COLORS.electricity + '45' }]}>
                        <View style={styles.utilityHeader}>
                          <View style={[styles.utilityBubble, { backgroundColor: CATEGORY_COLORS.electricity + '22' }]}>
                            <FontAwesome6 name="bolt" size={13} color={CATEGORY_COLORS.electricity} />
                          </View>
                          <ThemedText type="defaultSemiBold" style={{ color: colors.text, fontSize: 14 }}>Electricity</ThemedText>
                        </View>
                        <View style={styles.metricRow}>
                          <MonthMetric label="kWh Saved"   thisVal={thisKwh}     lastVal={lastKwh}     unit="kWh" color={CATEGORY_COLORS.electricity} colors={colors} />
                          <View style={[styles.metricDivider, { backgroundColor: colors.surfaceMuted }]} />
                          <MonthMetric label="CO₂ Avoided" thisVal={thisElecCO2} lastVal={lastElecCO2} unit="kg"  color={CATEGORY_COLORS.electricity} colors={colors} decimals={2} />
                        </View>
                        <MonthBar thisVal={thisKwh} lastVal={lastKwh} color={CATEGORY_COLORS.electricity} colors={colors} thisLabel={thisMonth.shortLabel} lastLabel={lastMonth.shortLabel} />
                      </View>
                    )}

                    {/* Water */}
                    {(thisLitres > 0 || lastLitres > 0) && (
                      <View style={[styles.utilitySection, { borderColor: CATEGORY_COLORS.water + '45' }]}>
                        <View style={styles.utilityHeader}>
                          <View style={[styles.utilityBubble, { backgroundColor: CATEGORY_COLORS.water + '22' }]}>
                            <FontAwesome6 name="droplet" size={13} color={CATEGORY_COLORS.water} />
                          </View>
                          <ThemedText type="defaultSemiBold" style={{ color: colors.text, fontSize: 14 }}>Water</ThemedText>
                        </View>
                        <View style={styles.metricRow}>
                          <MonthMetric label="Litres Saved" thisVal={thisLitres}   lastVal={lastLitres}   unit="L"  color={CATEGORY_COLORS.water} colors={colors} decimals={0} />
                          <View style={[styles.metricDivider, { backgroundColor: colors.surfaceMuted }]} />
                          <MonthMetric label="CO₂ Avoided"  thisVal={thisWaterCO2} lastVal={lastWaterCO2} unit="kg" color={CATEGORY_COLORS.water} colors={colors} decimals={3} />
                        </View>
                        <MonthBar thisVal={thisLitres} lastVal={lastLitres} color={CATEGORY_COLORS.water} colors={colors} thisLabel={thisMonth.shortLabel} lastLabel={lastMonth.shortLabel} />
                      </View>
                    )}
                  </View>
                )}
              </View>
            );

            // ── 8-Week CO₂ Chart ──
            if (item === 'trends') return (
              <View style={[styles.card, styles.swipeCard, { backgroundColor: colors.surface, minHeight: 380 }]}>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>CO₂ Saved — 8 Weeks</ThemedText>
                <ThemedText style={[styles.subtle, { color: colors.text }]}>kg CO₂ per week, all categories</ThemedText>

                {weeklyCO2Data.every(d => d.co2 === 0) ? (
                  <View style={styles.emptyState}>
                    <FontAwesome6 name="chart-bar" size={28} color={colors.text} style={{ opacity: 0.15 }} />
                    <ThemedText style={[styles.subtle, { color: colors.text, textAlign: 'center', marginTop: 8 }]}>
                      No data yet — start logging!
                    </ThemedText>
                  </View>
                ) : (
                  <CartesianChart
                    data={weeklyCO2Data} xKey="week" yKeys={["co2"]}
                    domainPadding={{ left: 40, right: 40, top: 20 }}
                    axisOptions={{
                      tickCount: 8,
                      labelColor: colors.text + '99',
                      lineColor: colors.surfaceMuted,
                      labelOffset: { x: 0, y: 4 },
                      formatXLabel: val => { const p = String(val).split(' '); return p[1] ?? String(val); },
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

                <View style={styles.chartSummary}>
                  {[
                    { label: 'This week',  val: thisWeekCO2.toFixed(2) + ' kg' },
                    { label: 'Avg/week',   val: (weeklyCO2Data.reduce((s, d) => s + d.co2, 0) / (weeklyCO2Data.filter(d => d.co2 > 0).length || 1)).toFixed(2) + ' kg' },
                    { label: 'Best week',  val: Math.max(...weeklyCO2Data.map(d => d.co2)).toFixed(2) + ' kg' },
                  ].map(({ label, val }) => (
                    <View key={label} style={styles.chartSummaryItem}>
                      <ThemedText style={[styles.pillCurrent, { color: colors.text }]}>{val}</ThemedText>
                      <ThemedText style={[styles.subtle,      { color: colors.text }]}>{label}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            );
            return null;
          }}
        />
        <DotsRow count={3} active={slide3} colors={colors} />

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerArea:  { gap: 2, paddingTop: 18, paddingBottom: 8 },
  scroll:      { paddingBottom: 32, gap: 8, paddingTop: 8 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', letterSpacing: 0.8, opacity: 0.45, textTransform: 'uppercase', paddingHorizontal: 16, marginTop: 8 },
  subtle:      { fontSize: 13, opacity: 0.55 },
  card:        { padding: 16, borderRadius: 14, gap: 10 },
  swipeCard:   { width: CARD_WIDTH },
  divider:     { height: 1, marginVertical: 2 },

  // Big number
  bigRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  bigNum:  { fontSize: 40, fontWeight: '700', lineHeight: 44 },

  // Stat grid
  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', padding: 12, borderRadius: 10, gap: 3 },
  statLabel:{ fontSize: 12, opacity: 0.55 },
  statValue:{ fontSize: 19, fontWeight: '700', lineHeight: 23 },

  // Pills
  pillRow:    { flexDirection: 'row', gap: 8, marginTop: 2 },
  pill:       { flex: 1, padding: 11, borderRadius: 11, gap: 2 },
  pillLabel:  { fontSize: 10, opacity: 0.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  pillCurrent:{ fontSize: 16, fontWeight: '700', marginTop: 1 },
  pillPrevious:{ fontSize: 11, opacity: 0.45 },
  pillDiff:   { fontSize: 12, fontWeight: '600', marginTop: 1 },

  // Card subtitle
  cardSubtitle: { fontSize: 12, opacity: 0.5, fontWeight: '600', marginTop: 4, marginBottom: 6 },

  // Category dual bars
  catBarRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  catBarLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, width: 78 },
  catBarText:  { fontSize: 12, opacity: 0.75 },
  dualBars:    { flex: 1, gap: 3 },
  dualBarTrack:{ height: 6, borderRadius: 3, overflow: 'hidden' },
  dualBarFill: { height: '100%', borderRadius: 3 },
  catBarDiff:  { fontSize: 11, fontWeight: '700', width: 40, textAlign: 'right' },

  barLegend:     { flexDirection: 'row', gap: 14, justifyContent: 'flex-end', marginTop: 6 },
  barLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  barLegendSwatch:{ width: 10, height: 6, borderRadius: 3 },

  // Donut
  donutLayout:   { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6 },
  donutLegend:   { flex: 1, gap: 9 },
  donutLegendRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Legends
  legendList: { gap: 7, marginTop: 4 },
  legendRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot:  { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  legendText: { fontSize: 13, opacity: 0.85 },

  // Stacked bar
  stackedBar:     { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', marginTop: 2 },
  stackedSegment: { height: '100%' },

  // Insight
  insightBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10, marginTop: 2 },

  // Empty state
  emptyState: { paddingVertical: 28, alignItems: 'center', justifyContent: 'center' },

  // Monthly utility sections
  utilitySection: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  utilityHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  utilityBubble:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  metricRow:      { flexDirection: 'row', alignItems: 'stretch', gap: 0 },
  metricDivider:  { width: 1, marginHorizontal: 12 },
  monthMetricCell:{ flex: 1, gap: 2 },
  monthMetricLabel:{ fontSize: 11, opacity: 0.5 },
  monthMetricValue:{ fontSize: 19, fontWeight: '700', lineHeight: 23 },
  monthMetricUnit: { fontSize: 12, fontWeight: '400' },
  monthMetricDiff: { fontSize: 11, fontWeight: '600' },

  monthBarRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthBarLabel: { fontSize: 11, opacity: 0.5 },
  monthBarTrack: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  monthBarFill:  { height: '100%', borderRadius: 4 },

  // 8-week chart
  chartSummary:    { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.12)', marginTop: 4 },
  chartSummaryItem:{ alignItems: 'center', gap: 2 },

  // Dots
  dotsRow:    { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 2 },
  dot:        { height: 6, borderRadius: 3 },
  dotInactive:{ width: 6 },
  dotActive:  { width: 18 },
});