// (tabs)/stats.tsx
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import {
  calculateCarbonSaved, calculateTokens, CATEGORY_COLORS,
  getWeeklyCO2Data, getWeekRange,
} from '@/src/utils/ecoLogic';
import { FontAwesome6 } from '@expo/vector-icons';
import { Circle as SkiaCircle } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, GestureResponderEvent, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Bar, CartesianChart } from 'victory-native';

// ─── Constants ─────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH   = SCREEN_WIDTH - 32;
// CartesianChart (Victory Native / Skia) REQUIRES an explicit pixel height —
// it cannot infer height from flex. Without this the chart is invisible.
const CHART_HEIGHT = 220;

const CATEGORY_ICONS: Record<string, string> = {
  walking:     'person-walking',
  running:     'person-running',
  cycling:     'bicycle',
  electricity: 'bolt',
  water:       'droplet',
};

const CATEGORY_ORDER = ['walking', 'running', 'cycling', 'electricity', 'water'] as const;

// ─── Date helpers ──────────────────────────────────────────────────────────────

function parseActivityDate(dateStr: string): Date { return new Date(dateStr); }

function getMonthRange(offset: number) {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1, 0, 0, 0, 0);
  const end   = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
  return {
    start, end,
    label:      start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    shortLabel: start.toLocaleDateString('en-US', { month: 'short' }),
  };
}

// ─── Donut chart ───────────────────────────────────────────────────────────────

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, sweep: number) {
  const clamped  = Math.min(sweep, 359.99);
  const largeArc = clamped > 180 ? 1 : 0;
  const o1 = polarToXY(cx, cy, outerR, startDeg);
  const o2 = polarToXY(cx, cy, outerR, startDeg + clamped);
  const i1 = polarToXY(cx, cy, innerR, startDeg + clamped);
  const i2 = polarToXY(cx, cy, innerR, startDeg);
  return [
    `M ${o1.x} ${o1.y}`, `A ${outerR} ${outerR} 0 ${largeArc} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`, `A ${innerR} ${innerR} 0 ${largeArc} 0 ${i2.x} ${i2.y}`, 'Z',
  ].join(' ');
}

interface DonutSlice { category: string; count: number; color: string; }

const DonutChart = memo(function DonutChart({ slices, size = 140 }: { slices: DonutSlice[]; size?: number }) {
  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 4, innerR = outerR * 0.62;
  const total = slices.reduce((s, sl) => s + sl.count, 0);
  if (total === 0) return null;
  let deg = 0;
  return (
    <Svg width={size} height={size}>
      {slices.filter(sl => sl.count > 0).map(sl => {
        const sweep = (sl.count / total) * 360;
        const start = deg; deg += sweep;
        return (
          <Path key={sl.category}
            d={donutSlicePath(cx, cy, outerR, innerR, start, sweep)}
            fill={sl.color} stroke="transparent" strokeWidth={2} />
        );
      })}
    </Svg>
  );
});

// ─── 8-week CO₂ bar chart ─────────────────────────────────────────────────────
//
// Why Victory Native's built-in press system doesn't work reliably here
// -----------------------------------------------------------------------
// Victory Native's chartPressState uses a pan gesture that only fires after the
// gesture ACTIVATES — on Android this requires the finger to move a few pixels
// past the recognition threshold. A clean static tap often gets cancelled before
// the gesture activates, so matchedIndex / the tooltip never updates.
// gestureLongPressDelay={0} helps but doesn't fully solve it for static taps.
//
// Definitive fix: transparent responder overlay
// -----------------------------------------------
// CartesianChart is used for rendering only (no chartPressState passed).
// A transparent View covers the chart area and captures touches via the React
// Native responder system (onStartShouldSetResponder / onResponderGrant /
// onResponderMove). On every touch, we compute the bar index directly from the
// touch X coordinate and the chart geometry — instant, no gesture delay,
// works on first tap, works on drag. The active bar gets a tint overlay and a
// dot indicator rendered as a second Bar + SkiaCircle inside the canvas.
//
// Bar slot geometry: Victory Native places N bars evenly across
// (chartWidth − 2 × domainPad). Slot width = available / N.
// Index = clamp(floor((touchX − domainPad) / slotWidth), 0, N−1).

// domainPadding matches the value passed to CartesianChart below
const DOMAIN_PAD = 18;

function WeeklyCO2Chart({ weeklyCO2Data, currentWeekLabel, colors }: {
  weeklyCO2Data: { week: string; co2: number }[];
  currentWeekLabel: string;
  colors: any;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const activePoint = activeIdx !== null ? weeklyCO2Data[activeIdx] ?? null : null;
  const chartWidthRef = useRef<number>(0);

  const maxCO2    = useMemo(() => Math.max(...weeklyCO2Data.map(d => d.co2), 0.1), [weeklyCO2Data]);
  const currentIdx = weeklyCO2Data.length - 1;
  const n          = weeklyCO2Data.length;

  // Compute the bar index from a raw touch X coordinate.
  // Victory Native distributes bars evenly across (chartWidth - 2 * domainPad).
  // Each slot is that available width / n. We use the slot midpoint to pick the bar.
  const indexFromX = useCallback((touchX: number): number => {
    const available  = chartWidthRef.current - DOMAIN_PAD * 2;
    const slotWidth  = available / n;
    // Each bar centre is at: DOMAIN_PAD + (i + 0.5) * slotWidth
    // Nearest bar = floor((touchX - DOMAIN_PAD) / slotWidth)
    const idx = Math.floor((touchX - DOMAIN_PAD) / slotWidth);
    return Math.max(0, Math.min(n - 1, idx));
  }, [n]);

  const handleTouch = useCallback((e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    setActiveIdx(indexFromX(x));
  }, [indexFromX]);

  const handleRelease = useCallback(() => {
    // Keep tooltip visible after release — user taps elsewhere to dismiss
  }, []);

  return (
    <View>
      {/* Tooltip row — fixed height, no layout shift */}
      <View style={styles.tooltipRow}>
        {activePoint ? (
          <View style={[styles.tooltipBubble, { backgroundColor: colors.tint + '22' }]}>
            <View style={[styles.tooltipDot, { backgroundColor: colors.tint }]} />
            <ThemedText style={[styles.tooltipVal, { color: colors.tint }]}>
              {activePoint.co2.toFixed(3)} kg CO₂
            </ThemedText>
            <ThemedText style={[styles.tooltipWeek, { color: colors.text }]}>
              {activePoint.week}
            </ThemedText>
            {activePoint.co2 === 0 && (
              <ThemedText style={[styles.tooltipWeek, { color: colors.text, marginLeft: 4 }]}>
                · no data
              </ThemedText>
            )}
          </View>
        ) : (
          <ThemedText style={[styles.tooltipHint, { color: colors.text }]}>
            Tap any bar to inspect
          </ThemedText>
        )}
      </View>

      {/* Chart + transparent touch overlay — MUST have explicit height for Skia */}
      <View
        style={{ height: CHART_HEIGHT, width: '100%' }}
        onLayout={e => { chartWidthRef.current = e.nativeEvent.layout.width; }}
      >
        <CartesianChart
          data={weeklyCO2Data}
          xKey="week"
          yKeys={['co2']}
          domain={{ y: [0, maxCO2 * 1.2] }}
          domainPadding={{ left: DOMAIN_PAD, right: DOMAIN_PAD, top: 14 }}
          axisOptions={{
            tickCount: { x: 8, y: 4 },
            labelColor: colors.text + '88',
            lineColor:  colors.surfaceMuted + 'AA',
            labelOffset: { x: 0, y: 6 },
            formatXLabel: (val: string) => {
              const p = String(val).split(' ');
              return p[1] ?? String(val);
            },
          }}
        >
          {({ points, chartBounds }) => (
            <>
              {/* All bars — faded */}
              <Bar
                points={points.co2}
                chartBounds={chartBounds}
                roundedCorners={{ topLeft: 5, topRight: 5 }}
                barWidth={28}
                color={colors.tint + '44'}
              />
              {/* Current week — full tint */}
              {points.co2[currentIdx] && (
                <Bar
                  points={[points.co2[currentIdx]]}
                  chartBounds={chartBounds}
                  roundedCorners={{ topLeft: 5, topRight: 5 }}
                  barWidth={28}
                  color={colors.tint}
                />
              )}
              {/* Selected bar — full tint on any non-current bar so it matches
                  the current-week bar brightness. The dot is the sole indicator
                  of selection, keeping the visual language unambiguous. */}
              {activeIdx !== null && activeIdx !== currentIdx && points.co2[activeIdx] && (
                <Bar
                  points={[points.co2[activeIdx]]}
                  chartBounds={chartBounds}
                  roundedCorners={{ topLeft: 5, topRight: 5 }}
                  barWidth={28}
                  color={colors.tint}
                />
              )}
              {/* Dot — always shown on the active bar, including current week */}
              {activeIdx !== null && points.co2[activeIdx] && (
                <SkiaCircle
                  cx={points.co2[activeIdx].x}
                  cy={(points.co2[activeIdx].y ?? 0) - 8}
                  r={4}
                  color="#FFFFFF"
                />
              )}
              {activeIdx !== null && points.co2[activeIdx] && (
                <SkiaCircle
                  cx={points.co2[activeIdx].x}
                  cy={(points.co2[activeIdx].y ?? 0) - 8}
                  r={6}
                  color={colors.tint + '55'}
                />
              )}
            </>
          )}
        </CartesianChart>

        {/* Transparent touch layer — sits on top of the chart, captures all taps
            and drags. Uses the responder system (not GestureHandler) so it
            cooperates with the parent horizontal ScrollView correctly. */}
        <View
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleTouch}
          onResponderMove={handleTouch}
          onResponderRelease={handleRelease}
        />
      </View>
    </View>
  );
}

// ─── Shared sub-components ─────────────────────────────────────────────────────

const DotsRow = memo(function DotsRow({ count, active, colors }: { count: number; active: number; colors: any }) {
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
});

function SectionHeader({ label, colors }: { label: string; colors: any }) {
  return <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>{label}</ThemedText>;
}

function StatTile({ icon, value, label, color, colors }: {
  icon: string; value: string; label: string; color: string; colors: any;
}) {
  return (
    <View style={[styles.statTile, { backgroundColor: colors.background }]}>
      <View style={[styles.statTileIcon, { backgroundColor: color + '20' }]}>
        <FontAwesome6 name={icon} size={13} color={color} />
      </View>
      <ThemedText style={[styles.statTileValue, { color: colors.text }]}>{value}</ThemedText>
      <ThemedText style={[styles.statTileLabel, { color: colors.text }]}>{label}</ThemedText>
    </View>
  );
}

const ComparisonPill = memo(function ComparisonPill({ label, current, previous, diff, diffLabel, colors }: {
  label: string; current: string; previous: string; diff: number; diffLabel: string; colors: any;
}) {
  const neutral   = diff === 0;
  const diffColor = neutral ? colors.text : diff > 0 ? '#4CAF50' : '#EF5350';
  const arrow     = neutral ? '—' : diff > 0 ? '↑' : '↓';
  return (
    <View style={[styles.pill, { backgroundColor: colors.background }]}>
      <ThemedText style={[styles.pillLabel,   { color: colors.text }]}>{label}</ThemedText>
      <ThemedText style={[styles.pillCurrent, { color: colors.text }]}>{current}</ThemedText>
      <ThemedText style={[styles.pillPrev,    { color: colors.text }]}>was {previous}</ThemedText>
      <ThemedText style={[styles.pillDiff,    { color: diffColor }]}>{arrow} {diffLabel}</ThemedText>
    </View>
  );
});

const CategoryDualBar = memo(function CategoryDualBar({ cat, thisVal, lastVal, colors }: {
  cat: string; thisVal: number; lastVal: number; colors: any;
}) {
  const diff = thisVal - lastVal;
  const max  = Math.max(thisVal, lastVal, 0.01);
  const clr  = CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS];
  return (
    <View style={styles.catRow}>
      <View style={styles.catLabel}>
        <FontAwesome6 name={CATEGORY_ICONS[cat]} size={11} color={clr} />
        <ThemedText style={[styles.catLabelText, { color: colors.text }]}>
          {cat.charAt(0).toUpperCase() + cat.slice(1)}
        </ThemedText>
      </View>
      <View style={styles.dualBars}>
        <View style={[styles.dualTrack, { backgroundColor: colors.surfaceMuted }]}>
          <View style={[styles.dualFill, { width: `${(lastVal / max) * 100}%`, backgroundColor: clr + '55' }]} />
        </View>
        <View style={[styles.dualTrack, { backgroundColor: colors.surfaceMuted }]}>
          <View style={[styles.dualFill, { width: `${(thisVal / max) * 100}%`, backgroundColor: clr }]} />
        </View>
      </View>
      <ThemedText style={[styles.catDiff, {
        color: diff > 0 ? '#4CAF50' : diff < 0 ? '#EF5350' : colors.text,
      }]}>
        {diff > 0 ? '+' : ''}{diff.toFixed(2)}
      </ThemedText>
    </View>
  );
});

const MonthMetric = memo(function MonthMetric({ label, thisVal, lastVal, unit, color, colors, decimals = 1 }: {
  label: string; thisVal: number; lastVal: number; unit: string; color: string; colors: any; decimals?: number;
}) {
  const diff = thisVal - lastVal;
  const diffColor = diff > 0 ? '#4CAF50' : diff < 0 ? '#EF5350' : colors.text;
  return (
    <View style={styles.mmCell}>
      <ThemedText style={[styles.mmLabel, { color: colors.text }]}>{label}</ThemedText>
      <ThemedText style={[styles.mmValue, { color }]}>
        {thisVal > 0 ? thisVal.toFixed(decimals) : '—'}
        {thisVal > 0 && <ThemedText style={[styles.mmUnit, { color: colors.text }]}> {unit}</ThemedText>}
      </ThemedText>
      {lastVal > 0 && thisVal > 0 && (
        <ThemedText style={[styles.mmDiff, { color: diffColor }]}>
          {diff > 0 ? '↑' : diff < 0 ? '↓' : '—'} {Math.abs(diff).toFixed(decimals)} vs last
        </ThemedText>
      )}
      {/* "first entry" was confusing — replaced with "new this month" */}
      {lastVal === 0 && thisVal > 0 && (
        <ThemedText style={[styles.mmDiff, { color: colors.tint, opacity: 0.8 }]}>✦ new this month</ThemedText>
      )}
      {thisVal === 0 && (
        <ThemedText style={[styles.mmDiff, { color: colors.text, opacity: 0.35 }]}>not logged</ThemedText>
      )}
    </View>
  );
});

const MonthBar = memo(function MonthBar({ thisVal, lastVal, color, colors, thisLabel, lastLabel }: {
  thisVal: number; lastVal: number; color: string; colors: any; thisLabel: string; lastLabel: string;
}) {
  if (thisVal === 0 && lastVal === 0) return null;
  const max = Math.max(thisVal, lastVal, 0.01);
  return (
    <View style={{ gap: 5 }}>
      {[{ val: lastVal, lbl: lastLabel, alpha: '55' }, { val: thisVal, lbl: thisLabel, alpha: '' }].map(({ val, lbl, alpha }) => (
        <View key={lbl} style={styles.mBar}>
          <ThemedText style={[styles.mBarLabel, { color: colors.text, width: 34 }]}>{lbl}</ThemedText>
          <View style={[styles.mBarTrack, { backgroundColor: colors.surfaceMuted }]}>
            <View style={[styles.mBarFill, { width: `${(val / max) * 100}%`, backgroundColor: color + alpha }]} />
          </View>
        </View>
      ))}
    </View>
  );
});

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const { colors, isDark } = useAppTheme();
  const userRegion  = useActivityStore(s => s.userRegion);
  const activities  = useActivityStore(s => s.activities);
  const userProfile = useActivityStore(s => s.userProfile);

  const [slide1, setSlide1] = useState(0);
  const [slide2, setSlide2] = useState(0);
  const [slide3, setSlide3] = useState(0);

  // ── Pre-compute dates + CO₂/tokens once ──────────────────────────────────
  const activitiesEnriched = useMemo(
    () => activities.map(a => ({
      ...a,
      _date:   parseActivityDate(a.date),
      _co2:    calculateCarbonSaved(a, userRegion),
      _tokens: calculateTokens(a),
    })),
    [activities, userRegion],
  );

  // ── Boundaries ────────────────────────────────────────────────────────────
  const currentWeek  = useMemo(() => getWeekRange(0),  []);
  const previousWeek = useMemo(() => getWeekRange(1),  []);
  const thisMonth    = useMemo(() => getMonthRange(0),  []);
  const lastMonth    = useMemo(() => getMonthRange(-1), []);

  // ── Filtered buckets ──────────────────────────────────────────────────────
  const thisWeekActs  = useMemo(() => activitiesEnriched.filter(a => a._date >= currentWeek.start  && a._date <= currentWeek.end),  [activitiesEnriched, currentWeek]);
  const lastWeekActs  = useMemo(() => activitiesEnriched.filter(a => a._date >= previousWeek.start && a._date <= previousWeek.end), [activitiesEnriched, previousWeek]);
  const thisMonthActs = useMemo(() => activitiesEnriched.filter(a => a._date >= thisMonth.start    && a._date <= thisMonth.end),    [activitiesEnriched, thisMonth]);
  const lastMonthActs = useMemo(() => activitiesEnriched.filter(a => a._date >= lastMonth.start    && a._date <= lastMonth.end),    [activitiesEnriched, lastMonth]);

  // ── All-time ──────────────────────────────────────────────────────────────
  const totalCO2 = userProfile?.totalCarbonSaved ?? activitiesEnriched.reduce((s, a) => s + a._co2, 0);

  // Authoritative token total — from Firestore via userProfile.tokens (same source as
  // profile.tsx). Do NOT recalculate from activities: calculateTokens() omits the streak
  // multiplier that was baked in at save time, producing a different (lower) number.
  const totalTokens = userProfile?.tokens ?? 0;

  const { totalSteps, totalDistance, avgSteps, avgDist, catCounts, topActivity } = useMemo(() => {
    const stepActs = activitiesEnriched.filter(a => a.steps    !== undefined);
    const distActs = activitiesEnriched.filter(a => a.distance !== undefined);
    const catCounts: Record<string, number> = {};
    activitiesEnriched.forEach(a => { catCounts[a.category] = (catCounts[a.category] || 0) + 1; });
    return {
      totalSteps:    activitiesEnriched.reduce((s, a) => s + (a.steps    ?? 0), 0),
      totalDistance: activitiesEnriched.reduce((s, a) => s + (a.distance ?? 0), 0),
      avgSteps: stepActs.length > 0 ? Math.round(stepActs.reduce((s, a) => s + a.steps!, 0) / stepActs.length) : 0,
      avgDist:  distActs.length > 0 ? (distActs.reduce((s, a) => s + a.distance!, 0) / distActs.length).toFixed(1) : '0.0',
      catCounts,
      topActivity: Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A',
    };
  }, [activitiesEnriched]);

  const { co2AllTime, totalCO2All, dominantCat, dominantPct } = useMemo(() => {
    const co2AllTime: Record<string, number> = { walking: 0, running: 0, cycling: 0, electricity: 0, water: 0 };
    activitiesEnriched.forEach(a => { co2AllTime[a.category] += a._co2; });
    const totalCO2All = Object.values(co2AllTime).reduce((a, b) => a + b, 0);
    const dominantCat = totalCO2All > 0 ? Object.entries(co2AllTime).sort((a, b) => b[1] - a[1])[0][0] : 'N/A';
    const dominantPct = totalCO2All > 0 ? (co2AllTime[dominantCat] / totalCO2All) * 100 : 0;
    return { co2AllTime, totalCO2All, dominantCat, dominantPct };
  }, [activitiesEnriched]);

  const donutSlices: DonutSlice[] = useMemo(
    () => CATEGORY_ORDER.map(cat => ({ category: cat, count: catCounts[cat] ?? 0, color: CATEGORY_COLORS[cat] ?? colors.tint })),
    [catCounts, colors.tint],
  );
  const donutTotal = donutSlices.reduce((s, sl) => s + sl.count, 0);

  // ── Week aggregates ───────────────────────────────────────────────────────
  const thisWeekCO2    = useMemo(() => thisWeekActs.reduce((s, a) => s + a._co2, 0),    [thisWeekActs]);
  const thisWeekTokens = useMemo(() => thisWeekActs.reduce((s, a) => s + a._tokens, 0), [thisWeekActs]);
  const lastWeekTokens = useMemo(() => lastWeekActs.reduce((s, a) => s + a._tokens, 0), [lastWeekActs]);
  const thisWeekCount  = thisWeekActs.length;
  const lastWeekCount  = lastWeekActs.length;

  const co2ThisWeek = useMemo(() => { const acc: Record<string, number> = { walking: 0, running: 0, cycling: 0, electricity: 0, water: 0 }; thisWeekActs.forEach(a => { acc[a.category] += a._co2; }); return acc; }, [thisWeekActs]);
  const co2LastWeek = useMemo(() => { const acc: Record<string, number> = { walking: 0, running: 0, cycling: 0, electricity: 0, water: 0 }; lastWeekActs.forEach(a => { acc[a.category] += a._co2; }); return acc; }, [lastWeekActs]);

  // ── Month aggregates ──────────────────────────────────────────────────────
  const thisMonthTotal  = thisMonthActs.length;
  const lastMonthTotal  = lastMonthActs.length;
  const thisMonthTokens = useMemo(() => thisMonthActs.reduce((s, a) => s + a._tokens, 0), [thisMonthActs]);
  const lastMonthTokens = useMemo(() => lastMonthActs.reduce((s, a) => s + a._tokens, 0), [lastMonthActs]);
  const thisMonthCO2    = useMemo(() => thisMonthActs.reduce((s, a) => s + a._co2, 0),    [thisMonthActs]);
  const lastMonthCO2    = useMemo(() => lastMonthActs.reduce((s, a) => s + a._co2, 0),    [lastMonthActs]);

  const co2ThisMonth = useMemo(() => { const acc: Record<string, number> = { walking: 0, running: 0, cycling: 0, electricity: 0, water: 0 }; thisMonthActs.forEach(a => { acc[a.category] += a._co2; }); return acc; }, [thisMonthActs]);
  const co2LastMonth = useMemo(() => { const acc: Record<string, number> = { walking: 0, running: 0, cycling: 0, electricity: 0, water: 0 }; lastMonthActs.forEach(a => { acc[a.category] += a._co2; }); return acc; }, [lastMonthActs]);

  const { thisKwh, lastKwh, thisElecCO2, lastElecCO2, thisLitres, lastLitres, thisWaterCO2, lastWaterCO2 } = useMemo(() => {
    const eT = thisMonthActs.filter(a => a.category === 'electricity');
    const eL = lastMonthActs.filter(a => a.category === 'electricity');
    const wT = thisMonthActs.filter(a => a.category === 'water');
    const wL = lastMonthActs.filter(a => a.category === 'water');
    return {
      thisKwh:      eT.reduce((s, a) => s + (a.kwhSaved    ?? 0), 0), lastKwh:      eL.reduce((s, a) => s + (a.kwhSaved    ?? 0), 0),
      thisElecCO2:  eT.reduce((s, a) => s + a._co2, 0),               lastElecCO2:  eL.reduce((s, a) => s + a._co2, 0),
      thisLitres:   wT.reduce((s, a) => s + (a.litersSaved ?? 0), 0), lastLitres:   wL.reduce((s, a) => s + (a.litersSaved ?? 0), 0),
      thisWaterCO2: wT.reduce((s, a) => s + a._co2, 0),               lastWaterCO2: wL.reduce((s, a) => s + a._co2, 0),
    };
  }, [thisMonthActs, lastMonthActs]);

  const hasUtility         = thisKwh > 0 || lastKwh > 0 || thisLitres > 0 || lastLitres > 0;
  const hasMonthlyActivity = thisMonthTotal > 0 || lastMonthTotal > 0;

  // ── 8-week chart data ─────────────────────────────────────────────────────
  const weeklyCO2Data    = useMemo(() => getWeeklyCO2Data(activities, userRegion, 8), [activities, userRegion]);
  const currentWeekLabel = weeklyCO2Data[weeklyCO2Data.length - 1]?.week ?? '';
  const weeklyAvg  = weeklyCO2Data.reduce((s, d) => s + d.co2, 0) / (weeklyCO2Data.filter(d => d.co2 > 0).length || 1);
  const weeklyBest = Math.max(...weeklyCO2Data.map(d => d.co2), 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ═══════════════════════════════════════════════════
          HERO — sticky, sits above the scroll view
      ═══════════════════════════════════════════════════ */}
      <LinearGradient
        colors={isDark ? [colors.tint + 'CC', colors.tint + '88'] : [colors.tint + 'EE', colors.tint + 'AA']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
          <View style={styles.heroTopRow}>
            <View>
              <ThemedText style={styles.heroEyebrow}>Your Stats</ThemedText>
              <ThemedText style={styles.heroLabel}>Total CO₂ Saved</ThemedText>
            </View>
            <View style={[styles.heroBadge, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
              <FontAwesome6 name="list-check" size={12} color="#6EE7B7" />
              <ThemedText style={styles.heroBadgeText}>{activities.length} logged</ThemedText>
            </View>
          </View>

          <View style={styles.heroNumRow}>
            <ThemedText style={styles.heroNum}>{totalCO2.toFixed(2)}</ThemedText>
            <ThemedText style={styles.heroUnit}>kg CO₂</ThemedText>
          </View>

          {/*
            Hero chips — three at-a-glance highlights.
            Steps removed: steps aren't tracked for all activity types (electricity,
            water log no steps) so spotlighting steps misrepresents the full picture.
            Replaced with total EcoTokens which reflects every logged activity.
          */}
          <View style={styles.heroChips}>
            {[
              { icon: 'leaf',   label: `${totalTokens.toLocaleString()} tokens` },
              { icon: 'route',   label: `${totalDistance.toFixed(1)} km` },
              { icon: 'trophy',  label: topActivity !== 'N/A' ? topActivity.charAt(0).toUpperCase() + topActivity.slice(1) : 'No data' },
            ].map(({ icon, label }) => (
              <View key={label} style={[styles.heroChip, { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
                <FontAwesome6 name={icon} size={11} color="#6EE7B7" />
                <ThemedText style={styles.heroChipText}>{label}</ThemedText>
              </View>
            ))}
          </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} nestedScrollEnabled>
        {/* ═══════════════════════════════════════════════════
            FEATURED CHART — full-width, prominent
        ═══════════════════════════════════════════════════ */}
        <View style={[styles.card, { backgroundColor: colors.surface, marginHorizontal: 16 }]}>
          <View style={styles.cardHeaderRow}>
            <View>
              <ThemedText style={[styles.cardTitle, { color: colors.text }]}>CO₂ Saved — 8 Weeks</ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: colors.text }]}>kg per week · brightest bar = this week</ThemedText>
            </View>
            <View style={[styles.thisWeekBadge, { backgroundColor: colors.tint + '22' }]}>
              <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.tint }}>
                {thisWeekCO2.toFixed(2)} kg
              </ThemedText>
              <ThemedText style={{ fontSize: 10, color: colors.text, opacity: 0.5 }}>this week</ThemedText>
            </View>
          </View>

          {weeklyCO2Data.every(d => d.co2 === 0) ? (
            <View style={styles.emptyState}>
              <FontAwesome6 name="chart-bar" size={30} color={colors.text} style={{ opacity: 0.12 }} />
              <ThemedText style={[styles.emptyText, { color: colors.text }]}>No data yet — start logging!</ThemedText>
            </View>
          ) : (
            <WeeklyCO2Chart
              weeklyCO2Data={weeklyCO2Data}
              currentWeekLabel={currentWeekLabel}
              colors={colors}
            />
          )}

          <View style={[styles.chartSummaryRow, { borderTopColor: colors.surfaceMuted }]}>
            {[
              { label: 'This week', val: thisWeekCO2.toFixed(2) + ' kg', icon: 'calendar-week' },
              { label: 'Avg/week',  val: weeklyAvg.toFixed(2)  + ' kg', icon: 'chart-line'    },
              { label: 'Best week', val: weeklyBest.toFixed(2) + ' kg', icon: 'star'           },
            ].map(({ label, val, icon }) => (
              <View key={label} style={styles.chartSummaryItem}>
                <FontAwesome6 name={icon} size={11} color={colors.tint} style={{ marginBottom: 2 }} />
                <ThemedText style={[styles.chartSummaryVal,   { color: colors.text }]}>{val}</ThemedText>
                <ThemedText style={[styles.chartSummaryLabel, { color: colors.text }]}>{label}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════
            ROW 1 — All-time detail  |  This week vs last
        ═══════════════════════════════════════════════════ */}
        <SectionHeader label="Overview" colors={colors} />
        <ScrollView
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 12} decelerationRate="fast"
          contentContainerStyle={styles.cardRow}
          onMomentumScrollEnd={e => setSlide1(Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12)))}
        >
          {/* All-time detail */}
          <View style={[styles.card, styles.swipeCard, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.cardTitle, { color: colors.text }]}>All-Time Detail</ThemedText>
            <View style={styles.tileGrid}>
              <StatTile icon="shoe-prints"      value={totalSteps.toLocaleString()}      label="Total Steps"    color={CATEGORY_COLORS.walking}      colors={colors} />
              <StatTile icon="route"            value={`${totalDistance.toFixed(1)} km`} label="Total Distance" color={CATEGORY_COLORS.running}      colors={colors} />
              <StatTile icon="person-walking"   value={avgSteps.toLocaleString()}        label="Avg Steps"      color={CATEGORY_COLORS.cycling}      colors={colors} />
              <StatTile icon="map-location-dot" value={`${avgDist} km`}                  label="Avg Distance"   color={CATEGORY_COLORS.electricity}  colors={colors} />
            </View>

            {totalCO2All > 0 && (
              <View style={{ gap: 8, marginTop: 2 }}>
                <ThemedText style={[styles.cardSubtitle, { color: colors.text }]}>CO₂ by category (all-time)</ThemedText>
                <View style={[styles.stackedBar, { backgroundColor: colors.surfaceMuted }]}>
                  {CATEGORY_ORDER.map(cat => {
                    const val = co2AllTime[cat];
                    if (val <= 0) return null;
                    return <View key={cat} style={[styles.stackedSeg, {
                      width: `${(val / totalCO2All) * 100}%`,
                      backgroundColor: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS],
                    }]} />;
                  })}
                </View>
                <View style={styles.legendGrid}>
                  {CATEGORY_ORDER.filter(cat => co2AllTime[cat] > 0).map(cat => (
                    <View key={cat} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] }]} />
                      <ThemedText style={[styles.legendText, { color: colors.text, flex: 1 }]}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </ThemedText>
                      <ThemedText style={[styles.legendPct, { color: colors.text }]}>
                        {((co2AllTime[cat] / totalCO2All) * 100).toFixed(0)}%
                      </ThemedText>
                    </View>
                  ))}
                </View>
                {dominantCat !== 'N/A' && (
                  <View style={[styles.insightBox, { backgroundColor: colors.tint + '15' }]}>
                    <FontAwesome6 name="lightbulb" size={12} color={colors.tint} />
                    <ThemedText style={{ color: colors.text, fontSize: 12, flex: 1, lineHeight: 18 }}>
                      {dominantCat.charAt(0).toUpperCase() + dominantCat.slice(1)} drives {dominantPct.toFixed(1)}% of your CO₂ savings.
                    </ThemedText>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* This week vs last */}
          <View style={[styles.card, styles.swipeCard, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.cardTitle, { color: colors.text }]}>This Week vs Last</ThemedText>
            <View style={styles.pillRow}>
              <ComparisonPill label="Tokens"     current={`${thisWeekTokens}`} previous={`${lastWeekTokens}`} diff={thisWeekTokens - lastWeekTokens} diffLabel={`${Math.abs(thisWeekTokens - lastWeekTokens)}`} colors={colors} />
              <ComparisonPill label="Activities" current={`${thisWeekCount}`}  previous={`${lastWeekCount}`}  diff={thisWeekCount  - lastWeekCount}  diffLabel={`${Math.abs(thisWeekCount  - lastWeekCount)}`}  colors={colors} />
            </View>
            <ThemedText style={[styles.cardSubtitle, { color: colors.text }]}>CO₂ by category</ThemedText>
            {CATEGORY_ORDER.map(cat => {
              const t = co2ThisWeek[cat], l = co2LastWeek[cat];
              if (t === 0 && l === 0) return null;
              return <CategoryDualBar key={cat} cat={cat} thisVal={t} lastVal={l} colors={colors} />;
            })}
            <View style={styles.barLegend}>
              {[{ s: '55', lbl: 'Last week' }, { s: '', lbl: 'This week' }].map(({ s, lbl }) => (
                <View key={lbl} style={styles.barLegendItem}>
                  <View style={[styles.barSwatch, { backgroundColor: colors.tint + s }]} />
                  <ThemedText style={{ fontSize: 11, color: colors.text, opacity: 0.6 }}>{lbl}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        <DotsRow count={2} active={slide1} colors={colors} />

        {/* ═══════════════════════════════════════════════════
            ROW 2 — Activity mix (donut)  |  CO₂ breakdown
        ═══════════════════════════════════════════════════ */}
        <SectionHeader label="Breakdown" colors={colors} />
        <ScrollView
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 12} decelerationRate="fast"
          contentContainerStyle={styles.cardRow}
          onMomentumScrollEnd={e => setSlide2(Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12)))}
        >
          {/* Donut */}
          <View style={[styles.card, styles.swipeCard, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.cardTitle, { color: colors.text }]}>Activity Mix</ThemedText>
            <ThemedText style={[styles.cardSubtitle, { color: colors.text }]}>All-time distribution by category</ThemedText>
            {donutTotal === 0 ? (
              <View style={styles.emptyState}>
                <FontAwesome6 name="chart-pie" size={32} color={colors.text} style={{ opacity: 0.12 }} />
                <ThemedText style={[styles.emptyText, { color: colors.text }]}>No activities yet</ThemedText>
              </View>
            ) : (
              <View style={styles.donutLayout}>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <DonutChart slices={donutSlices} size={140} />
                  <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
                    <ThemedText style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>{donutTotal}</ThemedText>
                    <ThemedText style={{ fontSize: 10, opacity: 0.4, color: colors.text }}>total</ThemedText>
                  </View>
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                  {donutSlices.filter(sl => sl.count > 0).sort((a, b) => b.count - a.count).map(sl => (
                    <View key={sl.category} style={styles.donutLegendRow}>
                      <View style={[styles.legendDot, { backgroundColor: sl.color }]} />
                      <ThemedText style={[styles.legendText, { color: colors.text, flex: 1 }]}>
                        {sl.category.charAt(0).toUpperCase() + sl.category.slice(1)}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.text, opacity: 0.55 }}>
                        {sl.count} · {((sl.count / donutTotal) * 100).toFixed(0)}%
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* CO₂ breakdown */}
          <View style={[styles.card, styles.swipeCard, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.cardTitle, { color: colors.text }]}>CO₂ Breakdown</ThemedText>
            {totalCO2All === 0 ? (
              <View style={styles.emptyState}>
                <FontAwesome6 name="leaf" size={32} color={colors.text} style={{ opacity: 0.12 }} />
                <ThemedText style={[styles.emptyText, { color: colors.text }]}>No data yet</ThemedText>
              </View>
            ) : (
              <>
                <View style={[styles.stackedBar, { backgroundColor: colors.surfaceMuted }]}>
                  {CATEGORY_ORDER.map(cat => {
                    const val = co2AllTime[cat];
                    if (val <= 0) return null;
                    return <View key={cat} style={[styles.stackedSeg, {
                      width: `${(val / totalCO2All) * 100}%`,
                      backgroundColor: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS],
                    }]} />;
                  })}
                </View>
                <View style={{ gap: 8, marginTop: 4 }}>
                  {CATEGORY_ORDER.map(cat => {
                    const val = co2AllTime[cat];
                    if (val <= 0) return null;
                    const pct = (val / totalCO2All) * 100;
                    const clr = CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS];
                    return (
                      <View key={cat} style={styles.co2Row}>
                        <View style={[styles.co2IconBubble, { backgroundColor: clr + '20' }]}>
                          <FontAwesome6 name={CATEGORY_ICONS[cat]} size={11} color={clr} />
                        </View>
                        <ThemedText style={[styles.legendText, { color: colors.text, flex: 1 }]}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </ThemedText>
                        <View style={{ alignItems: 'flex-end' }}>
                          <ThemedText style={{ fontSize: 13, fontWeight: '700', color: clr }}>{val.toFixed(2)} kg</ThemedText>
                          <ThemedText style={{ fontSize: 11, color: colors.text, opacity: 0.45 }}>{pct.toFixed(1)}%</ThemedText>
                        </View>
                      </View>
                    );
                  })}
                </View>
                {dominantCat !== 'N/A' && (
                  <View style={[styles.insightBox, { backgroundColor: colors.tint + '15' }]}>
                    <FontAwesome6 name="lightbulb" size={12} color={colors.tint} />
                    <ThemedText style={{ color: colors.text, fontSize: 12, flex: 1, lineHeight: 18 }}>
                      {dominantCat.charAt(0).toUpperCase() + dominantCat.slice(1)} drives {dominantPct.toFixed(1)}% of your total CO₂ savings.
                    </ThemedText>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
        <DotsRow count={2} active={slide2} colors={colors} />

        {/* ═══════════════════════════════════════════════════
            ROW 3 — Monthly activity  |  Monthly utilities
        ═══════════════════════════════════════════════════ */}
        <SectionHeader label="Monthly" colors={colors} />
        <ScrollView
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 12} decelerationRate="fast"
          contentContainerStyle={styles.cardRow}
          onMomentumScrollEnd={e => setSlide3(Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12)))}
        >
          {/* Monthly activity */}
          <View style={[styles.card, styles.swipeCard, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.cardTitle, { color: colors.text }]}>Monthly Activity</ThemedText>
            <ThemedText style={[styles.cardSubtitle, { color: colors.text }]}>{thisMonth.label} vs {lastMonth.label}</ThemedText>
            {!hasMonthlyActivity ? (
              <View style={styles.emptyState}>
                <FontAwesome6 name="calendar" size={28} color={colors.text} style={{ opacity: 0.12 }} />
                <ThemedText style={[styles.emptyText, { color: colors.text }]}>No activities this or last month yet.</ThemedText>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                <View style={styles.pillRow}>
                  <ComparisonPill label="Activities" current={`${thisMonthTotal}`}              previous={`${lastMonthTotal}`}              diff={thisMonthTotal  - lastMonthTotal}  diffLabel={`${Math.abs(thisMonthTotal - lastMonthTotal)}`}             colors={colors} />
                  <ComparisonPill label="Tokens"     current={`${thisMonthTokens}`}             previous={`${lastMonthTokens}`}             diff={thisMonthTokens - lastMonthTokens} diffLabel={`${Math.abs(thisMonthTokens - lastMonthTokens)}`}            colors={colors} />
                  <ComparisonPill label="CO₂ Saved"  current={`${thisMonthCO2.toFixed(1)} kg`} previous={`${lastMonthCO2.toFixed(1)} kg`} diff={thisMonthCO2    - lastMonthCO2}    diffLabel={`${Math.abs(thisMonthCO2 - lastMonthCO2).toFixed(1)} kg`}  colors={colors} />
                </View>
                <View style={{ gap: 2 }}>
                  <ThemedText style={[styles.cardSubtitle, { color: colors.text }]}>CO₂ by category</ThemedText>
                  {CATEGORY_ORDER.map(cat => {
                    const t = co2ThisMonth[cat] ?? 0, l = co2LastMonth[cat] ?? 0;
                    if (t === 0 && l === 0) return null;
                    return <CategoryDualBar key={cat} cat={cat} thisVal={t} lastVal={l} colors={colors} />;
                  })}
                  <View style={styles.barLegend}>
                    {[{ s: '55', lbl: lastMonth.label }, { s: '', lbl: thisMonth.label }].map(({ s, lbl }) => (
                      <View key={lbl} style={styles.barLegendItem}>
                        <View style={[styles.barSwatch, { backgroundColor: colors.tint + s }]} />
                        <ThemedText style={{ fontSize: 11, color: colors.text, opacity: 0.6 }}>{lbl.split(' ')[0]}</ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Monthly utilities */}
          <View style={[styles.card, styles.swipeCard, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.cardTitle, { color: colors.text }]}>Monthly Utilities</ThemedText>
            <ThemedText style={[styles.cardSubtitle, { color: colors.text }]}>{thisMonth.label} vs {lastMonth.label}</ThemedText>
            {!hasUtility ? (
              <View style={styles.emptyState}>
                <FontAwesome6 name="bolt" size={28} color={colors.text} style={{ opacity: 0.12 }} />
                <ThemedText style={[styles.emptyText, { color: colors.text }]}>
                  No utility readings logged yet.{'\n'}Log electricity or water to see monthly comparison.
                </ThemedText>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {(thisKwh > 0 || lastKwh > 0) && (
                  <View style={[styles.utilSection, { borderColor: CATEGORY_COLORS.electricity + '40' }]}>
                    <View style={styles.utilHeader}>
                      <View style={[styles.utilBubble, { backgroundColor: CATEGORY_COLORS.electricity + '20' }]}>
                        <FontAwesome6 name="bolt" size={12} color={CATEGORY_COLORS.electricity} />
                      </View>
                      <ThemedText style={{ fontWeight: '700', color: colors.text, fontSize: 13 }}>Electricity</ThemedText>
                    </View>
                    <View style={styles.metricRow}>
                      <MonthMetric label="kWh Saved"   thisVal={thisKwh}     lastVal={lastKwh}     unit="kWh" color={CATEGORY_COLORS.electricity} colors={colors} />
                      <View style={[styles.metricDiv, { backgroundColor: colors.surfaceMuted }]} />
                      <MonthMetric label="CO₂ Avoided" thisVal={thisElecCO2} lastVal={lastElecCO2} unit="kg"  color={CATEGORY_COLORS.electricity} colors={colors} decimals={2} />
                    </View>
                    <MonthBar thisVal={thisKwh} lastVal={lastKwh} color={CATEGORY_COLORS.electricity} colors={colors} thisLabel={thisMonth.shortLabel} lastLabel={lastMonth.shortLabel} />
                  </View>
                )}
                {(thisLitres > 0 || lastLitres > 0) && (
                  <View style={[styles.utilSection, { borderColor: CATEGORY_COLORS.water + '40' }]}>
                    <View style={styles.utilHeader}>
                      <View style={[styles.utilBubble, { backgroundColor: CATEGORY_COLORS.water + '20' }]}>
                        <FontAwesome6 name="droplet" size={12} color={CATEGORY_COLORS.water} />
                      </View>
                      <ThemedText style={{ fontWeight: '700', color: colors.text, fontSize: 13 }}>Water</ThemedText>
                    </View>
                    <View style={styles.metricRow}>
                      <MonthMetric label="Litres Saved" thisVal={thisLitres}   lastVal={lastLitres}   unit="L"  color={CATEGORY_COLORS.water} colors={colors} decimals={0} />
                      <View style={[styles.metricDiv, { backgroundColor: colors.surfaceMuted }]} />
                      <MonthMetric label="CO₂ Avoided"  thisVal={thisWaterCO2} lastVal={lastWaterCO2} unit="kg" color={CATEGORY_COLORS.water} colors={colors} decimals={3} />
                    </View>
                    <MonthBar thisVal={thisLitres} lastVal={lastLitres} color={CATEGORY_COLORS.water} colors={colors} thisLabel={thisMonth.shortLabel} lastLabel={lastMonth.shortLabel} />
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
        <DotsRow count={2} active={slide3} colors={colors} />

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll:   { paddingBottom: 32, gap: 0 },
  cardRow:  { gap: 12, paddingHorizontal: 16 },

  // ── Hero ──
  hero:         { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24, marginBottom: 16, gap: 10 },
  heroTopRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroEyebrow:  { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  heroLabel:    { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.78)' },
  heroBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  heroBadgeText:{ fontSize: 12, color: '#E6F2E8', fontWeight: '600' },
  heroNumRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  heroNum:      { fontSize: 52, fontWeight: '800', color: '#FFFFFF', lineHeight: 58 },
  heroUnit:     { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.68)' },
  heroChips:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  heroChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  heroChipText: { fontSize: 12, color: '#E6F2E8', fontWeight: '500' },

  // ── Section label ──
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.9, opacity: 0.45, textTransform: 'uppercase', paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },

  // ── Cards ──
  card:          { padding: 16, borderRadius: 16, gap: 12 },
  swipeCard:     { width: CARD_WIDTH },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle:     { fontSize: 15, fontWeight: '700' },
  cardSubtitle:  { fontSize: 12, opacity: 0.5, fontWeight: '500' },
  thisWeekBadge: { alignItems: 'center', padding: 8, borderRadius: 10, gap: 1 },

  // ── Stat tiles ──
  tileGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statTile:      { width: '47%', padding: 12, borderRadius: 12, gap: 5 },
  statTileIcon:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statTileValue: { fontSize: 17, fontWeight: '700', lineHeight: 21 },
  statTileLabel: { fontSize: 11, opacity: 0.5, fontWeight: '500' },

  // ── Comparison pills ──
  pillRow:    { flexDirection: 'row', gap: 8 },
  pill:       { flex: 1, padding: 10, borderRadius: 12, gap: 2 },
  pillLabel:  { fontSize: 9, opacity: 0.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  pillCurrent:{ fontSize: 15, fontWeight: '700', marginTop: 1 },
  pillPrev:   { fontSize: 10, opacity: 0.45 },
  pillDiff:   { fontSize: 11, fontWeight: '600', marginTop: 1 },

  // ── Dual category bars ──
  catRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  catLabel:    { flexDirection: 'row', alignItems: 'center', gap: 5, width: 76 },
  catLabelText:{ fontSize: 12, opacity: 0.75 },
  dualBars:    { flex: 1, gap: 3 },
  dualTrack:   { height: 6, borderRadius: 3, overflow: 'hidden' },
  dualFill:    { height: '100%', borderRadius: 3 },
  catDiff:     { fontSize: 11, fontWeight: '700', width: 40, textAlign: 'right' },

  barLegend:    { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 4 },
  barLegendItem:{ flexDirection: 'row', alignItems: 'center', gap: 5 },
  barSwatch:    { width: 10, height: 6, borderRadius: 3 },

  // ── Stacked bar + legend ──
  stackedBar:  { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' },
  stackedSeg:  { height: '100%' },
  legendGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6, width: '47%' },
  legendDot:   { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  legendText:  { fontSize: 12, opacity: 0.85 },
  legendPct:   { fontSize: 11, opacity: 0.5 },

  // ── CO₂ breakdown rows ──
  co2Row:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  co2IconBubble:{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  // ── Donut layout ──
  donutLayout:   { flexDirection: 'row', alignItems: 'center', gap: 16 },
  donutLegendRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },

  // ── Insight box ──
  insightBox:{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10 },

  // ── Empty state ──
  emptyState:{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 13, opacity: 0.5, textAlign: 'center', lineHeight: 20 },

  // ── Chart tooltip ──
  tooltipRow:    { height: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  tooltipBubble: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  tooltipDot:    { width: 7, height: 7, borderRadius: 4 },
  tooltipVal:    { fontSize: 13, fontWeight: '700' },
  tooltipWeek:   { fontSize: 11, opacity: 0.55 },
  tooltipHint:   { fontSize: 12, opacity: 0.3, fontStyle: 'italic' },

  // ── Monthly utilities ──
  utilSection:{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  utilHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  utilBubble: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  metricRow:  { flexDirection: 'row', alignItems: 'stretch' },
  metricDiv:  { width: 1, marginHorizontal: 12 },
  mmCell:     { flex: 1, gap: 2 },
  mmLabel:    { fontSize: 11, opacity: 0.5 },
  mmValue:    { fontSize: 18, fontWeight: '700', lineHeight: 22 },
  mmUnit:     { fontSize: 11, fontWeight: '400' },
  mmDiff:     { fontSize: 11, fontWeight: '600' },
  mBar:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mBarLabel:  { fontSize: 11, opacity: 0.5 },
  mBarTrack:  { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  mBarFill:   { height: '100%', borderRadius: 3 },

  // ── Chart summary ──
  chartSummaryRow:  { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, marginTop: 4 },
  chartSummaryItem: { alignItems: 'center', gap: 2 },
  chartSummaryVal:  { fontSize: 14, fontWeight: '700' },
  chartSummaryLabel:{ fontSize: 11, opacity: 0.5 },

  // ── Dots ──
  dotsRow:    { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8, marginBottom: 4 },
  dot:        { height: 6, borderRadius: 3 },
  dotInactive:{ width: 6 },
  dotActive:  { width: 18 },
});