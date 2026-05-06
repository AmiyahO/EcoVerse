// (tabs)/index.tsx (dashboard)
import { ThemedText } from '@/components/themed-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View, Pressable, Modal, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  calculateTokens, calculateCarbonSaved, getEcoZone,
  getWeekCarbonComparison, CATEGORY_COLORS, calculateStreak,
} from '@/src/utils/ecoLogic';
import { getCO2Equivalent } from '@/src/utils/co2Equivalents';
import AISuggestionsCard from '@/components/ai-suggestions-card';
import Svg, { Circle, G } from 'react-native-svg';
import { useState, useRef, useEffect, useMemo } from 'react';
import { CartesianChart, Line, Area, useChartPressState } from 'victory-native';
import { Circle as SkiaCircle } from '@shopify/react-native-skia';
import { Dimensions } from 'react-native';

const CATEGORY_ICON: Record<string, string> = {
  walking:     'person-walking',
  running:     'person-running',
  cycling:     'bicycle',
  electricity: 'bolt',
  water:       'droplet',
};

const RING_RADIUS = 64;
const RING_STROKE = 5;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const SIZE = 138;
const CENTER = SIZE / 2;

function getZoneColor(score: number) {
  if (score < 50) return '#EF5350';
  if (score < 75) return '#FFC107';
  return '#4CAF50';
}

function getGreeting(firstName: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${firstName} ☀️`;
  if (hour < 18) return `Hello, ${firstName} 🌿`;
  return `Good evening, ${firstName} 🌙`;
}

function getRecentActivityLabel(activity: any) {
  if (activity.steps)       return `${activity.steps.toLocaleString()} steps`;
  if (activity.distance)    return `${activity.distance} km${activity.duration ? ` · ${activity.duration} min` : ''}`;
  if (activity.kwhSaved)    return `${activity.kwhSaved} kWh saved`;
  if (activity.litersSaved) return `${activity.litersSaved} L saved`;
  return '—';
}

const MODAL_CHART_WIDTH = Dimensions.get('window').width - 64;

// ── Chart sub-components (useChartPressState must be at component top-level) ──

function SparklineChart({ sparkData, colors }: { sparkData: any[]; colors: any }) {
  const { state, isActive } = useChartPressState({ x: 0, y: { tokens: 0 } });

  const activeDay = isActive ? sparkData.find(d => d.day === state.x.value) : null;
  const activeDateStr = activeDay
    ? (() => {
        const now = new Date();
        const d   = new Date(now);
        d.setDate(now.getDate() - (30 - activeDay.day));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      })()
    : null;

  return (
    <View>
      {/* Fixed-height tooltip row — prevents layout shift */}
      <View style={{ height: 28, alignItems: 'center', justifyContent: 'center' }}>
        {isActive && activeDay && (
          <View style={{
            flexDirection: 'row', gap: 6, alignItems: 'center',
            backgroundColor: colors.tint + '18', borderRadius: 8,
            paddingHorizontal: 10, paddingVertical: 4,
          }}>
            <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.tint }}>
              {Math.round(state.y.tokens.value)} tokens
            </ThemedText>
            {activeDateStr && (
              <ThemedText style={{ fontSize: 11, opacity: 0.5, color: colors.text }}>
                {activeDateStr}
              </ThemedText>
            )}
          </View>
        )}
      </View>
      <View style={{ height: 155 }}>
        <CartesianChart
          data={sparkData} xKey="day" yKeys={['tokens']}
          domainPadding={{ top: 20, bottom: 8, left: 8, right: 8 }}
          chartPressState={state}
          axisOptions={{
            tickCount: { x: 5, y: 4 },
            labelColor: colors.text + '55',
            lineColor: 'transparent',
            formatXLabel: (val: number) => sparkData.find(d => d.day === val)?.label ?? '',
          }}
        >
          {({ points, chartBounds }) => (
            <>
              <Area points={points.tokens} y0={chartBounds.bottom} color={colors.tint} opacity={0.12} />
              <Line points={points.tokens} color={colors.tint} strokeWidth={2.5} curveType="natural" />
              {isActive && (
                <SkiaCircle cx={state.x.position} cy={state.y.tokens.position} r={5} color={colors.tint} />
              )}
            </>
          )}
        </CartesianChart>
      </View>
    </View>
  );
}

function HistoryChart({ snapshots, zoneColor, colors }: { snapshots: any[]; zoneColor: string; colors: any }) {
  const { state, isActive } = useChartPressState({ x: 0, y: { score: 0 } });

  const activeSnap = isActive ? snapshots[Math.round(state.x.value)] ?? null : null;

  return (
    <View>
      <View style={{ height: 28, alignItems: 'center', justifyContent: 'center' }}>
        {isActive && activeSnap && (
          <View style={{
            flexDirection: 'row', gap: 6, alignItems: 'center',
            backgroundColor: zoneColor + '18', borderRadius: 8,
            paddingHorizontal: 10, paddingVertical: 4,
          }}>
            <ThemedText style={{ fontSize: 13, fontWeight: '700', color: zoneColor }}>
              {Math.round(state.y.score.value)}/100
            </ThemedText>
            <ThemedText style={{ fontSize: 11, opacity: 0.5, color: colors.text }}>
              {activeSnap.label}
            </ThemedText>
          </View>
        )}
      </View>
      <View style={{ height: 155 }}>
        <CartesianChart
          data={snapshots.map((s: any, i: number) => ({ x: i, score: s.score, label: s.label }))}
          xKey="x" yKeys={['score']}
          domain={{ y: [0, 100] }}
          domainPadding={{ top: 10, bottom: 10, left: 8, right: 8 }}
          chartPressState={state}
          axisOptions={{
            tickCount: { x: snapshots.length, y: 5 },
            labelColor: colors.text + '55',
            lineColor: 'transparent',
            formatXLabel: (val: number) => snapshots[val]?.label ?? '',
          }}
        >
          {({ points }) => (
            <>
              <Line points={points.score} color={zoneColor} strokeWidth={2.5} curveType="natural" />
              {isActive && (
                <SkiaCircle cx={state.x.position} cy={state.y.score.position} r={5} color={zoneColor} />
              )}
            </>
          )}
        </CartesianChart>
      </View>
    </View>
  );
}


function buildSparklineData(activities: any[]) {
  const now    = new Date();
  const points: { day: number; tokens: number; label: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d     = new Date(now);
    d.setDate(now.getDate() - i);
    const key   = d.toDateString();
    const tokens = activities
      .filter(a => new Date(a.date).toDateString() === key)
      .reduce((s, a) => s + calculateTokens(a), 0);
    points.push({
      day:    30 - i,
      tokens,
      label:  i % 7 === 0 ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
    });
  }
  return points;
}

// ── EcoScore history modal ────────────────────────────────────────────────────
function EcoScoreModal({
  visible, onClose, ecoScore, zoneColor, activities, ecoScoreSnapshots, colors, scheme,
}: {
  visible: boolean; onClose: () => void;
  ecoScore: number; zoneColor: string;
  activities: any[]; ecoScoreSnapshots: any[];
  colors: any; scheme: string;
}) {
  const [tab, setTab] = useState<'sparkline' | 'history'>('sparkline');
  const slideY  = useRef(new Animated.Value(600)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, damping: 24, stiffness: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 600, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const sparkData     = useMemo(() => buildSparklineData(activities), [activities]);
  const hasSparkData  = sparkData.some(d => d.tokens > 0);
  const hasHistory    = ecoScoreSnapshots.length >= 2;
  const bgSheet       = scheme === 'dark' ? '#121F16' : '#FFFFFF';
  const tabBg         = scheme === 'dark' ? 'rgba(255,255,255,0.08)' : '#F0F0F0';

  // Peak + streak for sparkline summary
  const peakDay    = sparkData.reduce((best, d) => d.tokens > best.tokens ? d : best, sparkData[0]);
  const totalTokens30 = sparkData.reduce((s, d) => s + d.tokens, 0);
  const activeDays30  = sparkData.filter(d => d.tokens > 0).length;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={dismiss}>
      <Animated.View style={[styles.modalBackdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>

      <Animated.View style={[styles.modalSheet, { backgroundColor: bgSheet, transform: [{ translateY: slideY }] }]}>
        {/* Handle */}
        <View style={[styles.modalHandle, { backgroundColor: colors.text + '20' }]} />

        {/* Header */}
        <View style={styles.modalHeader}>
          <View>
            <ThemedText style={[styles.modalTitle, { color: colors.text }]}>EcoScore Overview</ThemedText>
            <ThemedText style={[styles.modalSub,   { color: colors.text }]}>Your eco impact at a glance</ThemedText>
          </View>
          {/* Current score badge */}
          <View style={[styles.scoreBadge, { backgroundColor: zoneColor + '18', borderColor: zoneColor + '40' }]}>
            <ThemedText style={[styles.scoreBadgeNum, { color: zoneColor }]}>{ecoScore}</ThemedText>
            <ThemedText style={[styles.scoreBadgeSub, { color: colors.text }]}>/100</ThemedText>
          </View>
        </View>

        {/* Tab switcher */}
        <View style={[styles.tabRow, { backgroundColor: tabBg }]}>
          {([
            { key: 'sparkline', label: '30-Day Tokens', icon: 'chart-line' },
            { key: 'history',   label: 'Score History', icon: 'clock-rotate-left' },
          ] as const).map(t => (
            <Pressable
              key={t.key}
              style={[styles.tab, tab === t.key && { backgroundColor: colors.tint }]}
              onPress={() => setTab(t.key)}
            >
              <FontAwesome6 name={t.icon as any} size={12} color={tab === t.key ? '#fff' : colors.text} style={{ opacity: tab === t.key ? 1 : 0.5 }} />
              <ThemedText style={[styles.tabText, { color: tab === t.key ? '#fff' : colors.text, opacity: tab === t.key ? 1 : 0.5 }]}>
                {t.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* ── Tab: 30-day sparkline ── */}
        {tab === 'sparkline' && (
          <View style={{ gap: 16 }}>
            {!hasSparkData ? (
              <View style={styles.modalEmpty}>
                <FontAwesome6 name="chart-line" size={32} color={colors.text} style={{ opacity: 0.15 }} />
                <ThemedText style={[styles.modalEmptyText, { color: colors.text }]}>
                  Log activities to see your token trend
                </ThemedText>
              </View>
            ) : (
              <>
                {/* Summary pills */}
                <View style={styles.modalPillRow}>
                  {[
                    { label: '30-day total', val: `${totalTokens30}`, icon: 'leaf' },
                    { label: 'Active days',  val: `${activeDays30}`,  icon: 'calendar-check' },
                    { label: 'Best day',     val: `${peakDay.tokens}`, icon: 'fire' },
                  ].map(({ label, val, icon }) => (
                    <View key={label} style={[styles.modalPill, { backgroundColor: colors.tint + '12' }]}>
                      <FontAwesome6 name={icon as any} size={13} color={colors.tint} />
                      <ThemedText style={[styles.modalPillVal, { color: colors.text }]}>{val}</ThemedText>
                      <ThemedText style={[styles.modalPillLabel, { color: colors.text }]}>{label}</ThemedText>
                    </View>
                  ))}
                </View>

                {/* Chart with press-to-reveal tooltip */}
                <SparklineChart sparkData={sparkData} colors={colors} />
              </>
            )}
          </View>
        )}

        {/* ── Tab: EcoScore history ── */}
        {tab === 'history' && (
          <View style={{ gap: 16 }}>
            {!hasHistory ? (
              <View style={styles.modalEmpty}>
                <FontAwesome6 name="clock-rotate-left" size={32} color={colors.text} style={{ opacity: 0.15 }} />
                <ThemedText style={[styles.modalEmptyText, { color: colors.text }]}>
                  EcoScore history builds up after your first week.{'\n'}Come back next week!
                </ThemedText>
              </View>
            ) : (
              <>
                {/* Summary pills */}
                <View style={styles.modalPillRow}>
                  {[
                    { label: 'This week', val: `${ecoScoreSnapshots.at(-1)?.score ?? ecoScore}`, icon: 'star' },
                    { label: 'Best week', val: `${Math.max(...ecoScoreSnapshots.map((s: any) => s.score))}`, icon: 'trophy' },
                    { label: 'Avg score', val: `${Math.round(ecoScoreSnapshots.reduce((s: number, x: any) => s + x.score, 0) / ecoScoreSnapshots.length)}`, icon: 'chart-line' },
                  ].map(({ label, val, icon }) => (
                    <View key={label} style={[styles.modalPill, { backgroundColor: zoneColor + '12' }]}>
                      <FontAwesome6 name={icon as any} size={13} color={zoneColor} />
                      <ThemedText style={[styles.modalPillVal, { color: colors.text }]}>{val}</ThemedText>
                      <ThemedText style={[styles.modalPillLabel, { color: colors.text }]}>{label}</ThemedText>
                    </View>
                  ))}
                </View>

                {/* Chart with press-to-reveal tooltip */}
                <HistoryChart snapshots={ecoScoreSnapshots} zoneColor={zoneColor} colors={colors} />

                {/* Score dots row */}
                <View style={styles.historyDots}>
                  {ecoScoreSnapshots.map((s: any) => (
                    <View key={s.weekKey} style={styles.historyDot}>
                      <View style={[styles.historyDotCircle, {
                        backgroundColor: s.score >= 75 ? '#4CAF50' : s.score >= 50 ? '#FFC107' : '#EF5350',
                      }]} />
                      <ThemedText style={[styles.historyDotLabel, { color: colors.text }]}>{s.label}</ThemedText>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* Close */}
        <Pressable
          style={({ pressed }) => [styles.modalClose, { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.6 : 1 }]}
          onPress={dismiss}
        >
          <ThemedText style={[styles.modalCloseText, { color: colors.text }]}>Close</ThemedText>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

export default function HomeScreen() {
  const { colors, scheme } = useAppTheme();
  const userRegion        = useActivityStore(s => s.userRegion);
  const activities        = useActivityStore(s => s.activities);
  const userProfile       = useActivityStore(s => s.userProfile);
  const ecoScoreSnapshots = useActivityStore(s => s.ecoScoreSnapshots);
  const [showEcoModal, setShowEcoModal] = useState(false);

  const recentActivity = activities.length > 0
    ? [...activities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

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
  const firstName    = userProfile?.displayName?.split(' ')[0] || 'Explorer';

  const baseScore        = Math.min((weeklyTokens / weeklyTarget) * 70, 70);
  const consistencyBonus = (activeDays / 7) * 20;
  const varietyBonus     = (uniqueCategories / 3) * 10;
  const ecoScore         = Math.min(100, Math.round(baseScore + consistencyBonus + varietyBonus));
  const zoneColor        = getZoneColor(ecoScore);
  const strokeDashoffset = CIRCUMFERENCE * (1 - ecoScore / 100);

  const streak     = calculateStreak(activities);
  const zone       = getEcoZone(ecoScore);
  // Transport-only comparison — utilities comparison is not meaningful week-on-week
  // (you might simply not have entered a bill this week, not that you used more)
  const comparison = getWeekCarbonComparison(activities, userRegion);

  const totalCarbonSaved = activities.reduce((sum, a) => sum + calculateCarbonSaved(a, userRegion), 0);
  const co2Equivalent    = getCO2Equivalent(totalCarbonSaved);

  const comparisonColor =
    comparison.direction === 'up'   ? '#4CAF50' :
    comparison.direction === 'down' ? '#EF5350' : colors.text;

  const comparisonArrow =
    comparison.direction === 'up'   ? '↑' :
    comparison.direction === 'down' ? '↓' : '—';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <EcoScoreModal
        visible={showEcoModal}
        onClose={() => setShowEcoModal(false)}
        ecoScore={ecoScore}
        zoneColor={zoneColor}
        activities={activities}
        ecoScoreSnapshots={ecoScoreSnapshots}
        colors={colors}
        scheme={scheme}
      />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Greeting ── */}
        <View style={styles.greeting}>
          <View>
            <ThemedText style={[styles.greetingName, { color: colors.text }]}>
              {getGreeting(firstName)}
            </ThemedText>
          </View>
          <Pressable
            style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.tint, opacity: pressed ? 0.75 : 1 }]}
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

            {/* Left: ring + tap hint stacked vertically */}
            <View style={{ alignItems: 'center', gap: 5 }}>
              <Pressable
                style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setShowEcoModal(true)}
              >
                <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
                  <Circle
                    cx={CENTER} cy={CENTER} r={RING_RADIUS}
                    stroke={zoneColor + '28'}
                    strokeWidth={RING_STROKE}
                    fill="none"
                  />
                  <G transform={`rotate(-90, ${CENTER}, ${CENTER})`}>
                    <Circle
                      cx={CENTER} cy={CENTER} r={RING_RADIUS}
                      stroke={zoneColor}
                      strokeWidth={RING_STROKE}
                      fill="none"
                      strokeDasharray={CIRCUMFERENCE}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </G>
                </Svg>
                <View style={[styles.scoreCircle, {
                  borderColor: zoneColor + '40',
                  backgroundColor: zoneColor + '12',
                }]}>
                  <ThemedText style={[styles.scoreLabel,  { color: colors.text }]}>EcoScore</ThemedText>
                  <ThemedText style={[styles.scoreNumber, { color: zoneColor }]}>{ecoScore}</ThemedText>
                  <ThemedText style={[styles.scoreMax,    { color: colors.text }]}>/100</ThemedText>
                </View>
              </Pressable>
              <ThemedText style={[styles.tapHint, { color: colors.text }]}>
                Tap for insights
              </ThemedText>
            </View>

            {/* Right: zone message, token pill, progress */}
            <View style={styles.heroRight}>
              <ThemedText style={[styles.zoneMessage, { color: colors.text }]}>{zone.message}</ThemedText>
              <View style={[styles.tokenPill, { backgroundColor: colors.tint + '22' }]}>
                <FontAwesome6 name="leaf" size={14} color={colors.tint} />
                <ThemedText style={[styles.tokenText, { color: colors.text }]}>{weeklyTokens} tokens</ThemedText>
              </View>
              <View style={{ width: '100%', gap: 4 }}>
                <View style={[styles.progressBg, { backgroundColor: colors.tint + '22' }]}>
                  <View style={[styles.progressFill, {
                    width: `${progress * 100}%`,
                    backgroundColor: progress >= 1 ? '#4CAF50' : colors.tint,
                  }]} />
                </View>
                <ThemedText style={[styles.progressLabel, { color: colors.text }]}>
                  {progress >= 1
                    ? '🎉 Weekly goal reached!'
                    : `${Math.round(progress * 100)}% of weekly goal`}
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
              {/* Transport-only comparison — avoids misleading utility week-on-week delta */}
              <ThemedText style={[styles.statLabel, { color: colors.text }]}>vs Last Week</ThemedText>
              {comparison.direction === 'neutral' ? (
                <ThemedText style={[styles.statValue, { color: colors.text, opacity: 0.4 }]}>—</ThemedText>
              ) : (
                <ThemedText style={[styles.statValue, { color: comparisonColor }]}>
                  {comparisonArrow} {comparison.percentage}%
                </ThemedText>
              )}
            </View>
          </View>

          {co2Equivalent && totalCarbonSaved >= 0.05 && (
            <View style={[styles.equivalentRow, { backgroundColor: colors.tint + '0E' }]}>
              <FontAwesome6 name={co2Equivalent.icon as any} size={11} color={colors.tint} />
              <ThemedText style={[styles.equivalentText, { color: colors.text }]}>
                All-time — {co2Equivalent.phrase}
              </ThemedText>
            </View>
          )}
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
              style={[styles.recentRow, { backgroundColor: (CATEGORY_COLORS[recentActivity.category] ?? colors.tint) + '10' }]}
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
  container:    { padding: 16, gap: 14, paddingBottom: 24 },
  greeting:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 4 },
  greetingName: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  addBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Hero ──
  heroCard:     { borderRadius: 20, padding: 20 },
  scoreWrapper: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  tapHint:      { fontSize: 10, opacity: 0.35, letterSpacing: 0.3 },
  scoreCircle: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center', gap: 2,
  },
  scoreLabel:   { fontSize: 12, opacity: 0.6, fontWeight: '500' },
  scoreNumber:  { fontSize: 44, fontWeight: '800', lineHeight: 48 },
  scoreMax:     { fontSize: 12, opacity: 0.45 },
  heroRight:    { flex: 1, gap: 10, alignItems: 'flex-start' },
  zoneMessage:  { fontSize: 13, opacity: 0.75, lineHeight: 18 },
  tokenPill:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  tokenText:    { fontSize: 14, fontWeight: '600' },
  progressBg:   { height: 6, borderRadius: 3, width: '100%', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel:{ fontSize: 11, opacity: 0.5 },

  // ── CO₂ card ──
  card:         { padding: 16, borderRadius: 16, gap: 12 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  co2Row:       { flexDirection: 'row', alignItems: 'center' },
  co2Item:      { flex: 1, gap: 4, alignItems: 'center' },
  co2Divider:   { width: 1, height: 40, marginHorizontal: 8 },
  statLabel:    { fontSize: 12, opacity: 0.55, textAlign: 'center' },
  statValue:    { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  statUnit:     { fontSize: 14, fontWeight: '400', opacity: 0.6 },
  equivalentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    marginTop: -4,
  },
  equivalentText: { fontSize: 12, opacity: 0.65, flexShrink: 1 },

  // ── Quick stats ──
  quickRow:   { flexDirection: 'row', gap: 10 },
  quickCard:  { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', gap: 6 },
  quickValue: { fontSize: 22, fontWeight: '700', lineHeight: 26 },
  quickLabel: { fontSize: 11, opacity: 0.5, textAlign: 'center' },

  // ── Recent activity ──
  recentRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12 },
  recentIcon:    { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emptyActivity: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },

  // ── EcoScore modal ──
  modalBackdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10 },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 11,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 36, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 24,
  },
  modalHandle:    { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:     { fontSize: 18, fontWeight: '700' },
  modalSub:       { fontSize: 12, opacity: 0.45, marginTop: 2 },
  scoreBadge:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  scoreBadgeNum:  { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  scoreBadgeSub:  { fontSize: 11, opacity: 0.45 },
  tabRow:         { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 3 },
  tab:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10 },
  tabText:        { fontSize: 13, fontWeight: '600' },
  modalPillRow:   { flexDirection: 'row', gap: 8 },
  modalPill:      { flex: 1, padding: 10, borderRadius: 12, alignItems: 'center', gap: 3 },
  modalPillVal:   { fontSize: 16, fontWeight: '700' },
  modalPillLabel: { fontSize: 10, opacity: 0.5, textAlign: 'center' },
  modalEmpty:     { height: 160, alignItems: 'center', justifyContent: 'center', gap: 12 },
  modalEmptyText: { fontSize: 13, opacity: 0.45, textAlign: 'center', lineHeight: 20 },
  modalClose:     { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14 },
  modalCloseText: { fontSize: 16, fontWeight: '600', opacity: 0.6 },
  historyDots:    { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', gap: 6 },
  historyDot:     { alignItems: 'center', gap: 3 },
  historyDotCircle: { width: 8, height: 8, borderRadius: 4 },
  historyDotLabel:  { fontSize: 9, opacity: 0.4 },
});