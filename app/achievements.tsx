// app/achievements.tsx
import { useAppTheme } from '@/hooks/useAppTheme';
import { db } from '@/src/firebase/config';
import { useActivityStore } from '@/src/store/activityStore';
import { CHALLENGES, type Challenge } from '@/src/utils/challengeData';
import { calculateStreak } from '@/src/utils/ecoLogic';
import { getLevelInfo, getRankInfo } from '@/src/utils/levelSystem';
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');
// 2-column grid for milestones: more space for rich cards
const MILESTONE_COL = (SCREEN_W - 52) / 2;

// ── Difficulty meta ────────────────────────────────────────────────────────────
const DIFFICULTY: Record<string, { label: string; color: string; bg: string }> = {
  easy:   { label: 'Easy',   color: '#2E7D32', bg: '#E8F5E9' },
  medium: { label: 'Medium', color: '#E65100', bg: '#FFF3E0' },
  hard:   { label: 'Hard',   color: '#C62828', bg: '#FCE4EC' },
  epic:   { label: 'Epic',   color: '#4527A0', bg: '#EDE7F6' },
};

// ── Milestone definitions ──────────────────────────────────────────────────────
interface MilestoneStats {
  totalTokens:        number;
  totalActivities:    number;
  currentStreak:      number;
  totalCO2:           number;
  walkingActivities:  number;
  cyclingActivities:  number;
  electricityActivities: number;
  waterActivities:    number;
  uniqueCategories:   number;
}

interface Milestone {
  id:          string;
  title:       string;
  description: string;
  icon:        string;
  color:       string;
  /** Returns 0–1 fractional progress, clamped. Used for locked hints. */
  progress:    (s: MilestoneStats) => number;
  check:       (s: MilestoneStats) => boolean;
}

const MILESTONES: Milestone[] = [
  {
    id: 'first_step',
    title: 'First Step',
    description: 'Log your very first activity',
    icon: 'shoe-prints', color: '#4CAF50',
    progress: s => Math.min(s.totalActivities / 1, 1),
    check: s => s.totalActivities >= 1,
  },
  {
    id: 'token_100',
    title: 'Token Starter',
    description: 'Earn 100 EcoTokens',
    icon: 'leaf', color: '#43A047',
    progress: s => Math.min(s.totalTokens / 100, 1),
    check: s => s.totalTokens >= 100,
  },
  {
    id: 'token_500',
    title: 'Token Collector',
    description: 'Earn 500 EcoTokens',
    icon: 'seedling', color: '#FBC02D',
    progress: s => Math.min(s.totalTokens / 500, 1),
    check: s => s.totalTokens >= 500,
  },
  {
    id: 'token_1000',
    title: 'Token Hoarder',
    description: 'Earn 1,000 EcoTokens',
    icon: 'tree', color: '#F57F17',
    progress: s => Math.min(s.totalTokens / 1000, 1),
    check: s => s.totalTokens >= 1000,
  },
  {
    id: 'token_5000',
    title: 'EcoVerse Legend',
    description: 'Earn 5,000 EcoTokens',
    icon: 'tree-city', color: '#FF6F00',
    progress: s => Math.min(s.totalTokens / 5000, 1),
    check: s => s.totalTokens >= 5000,
  },
  {
    id: 'streak_3',
    title: 'Heat Wave',
    description: 'Keep a 3-day streak',
    icon: 'fire-flame-simple', color: '#FF7043',
    progress: s => Math.min(s.currentStreak / 3, 1),
    check: s => s.currentStreak >= 3,
  },
  {
    id: 'streak_7',
    title: 'Weekly Warrior',
    description: 'Keep a 7-day streak',
    icon: 'fire-flame-curved', color: '#F4511E',
    progress: s => Math.min(s.currentStreak / 7, 1),
    check: s => s.currentStreak >= 7,
  },
  {
    id: 'streak_30',
    title: 'Solar Flare',
    description: 'Keep a 30-day streak',
    icon: 'sun', color: '#FFB300',
    progress: s => Math.min(s.currentStreak / 30, 1),
    check: s => s.currentStreak >= 30,
  },
  {
    id: 'activities_10',
    title: 'Getting Started',
    description: 'Log 10 activities',
    icon: 'clipboard-check', color: '#29B6F6',
    progress: s => Math.min(s.totalActivities / 10, 1),
    check: s => s.totalActivities >= 10,
  },
  {
    id: 'activities_50',
    title: 'Eco Veteran',
    description: 'Log 50 activities',
    icon: 'shield', color: '#0288D1',
    progress: s => Math.min(s.totalActivities / 50, 1),
    check: s => s.totalActivities >= 50,
  },
  {
    id: 'activities_100',
    title: 'Century Club',
    description: 'Log 100 activities',
    icon: 'medal', color: '#7B1FA2',
    progress: s => Math.min(s.totalActivities / 100, 1),
    check: s => s.totalActivities >= 100,
  },
  {
    id: 'co2_1',
    title: 'Carbon Cutter',
    description: 'Save 1 kg of CO₂',
    icon: 'scissors', color: '#66BB6A',
    progress: s => Math.min(s.totalCO2 / 1, 1),
    check: s => s.totalCO2 >= 1,
  },
  {
    id: 'co2_10',
    title: 'Climate Conscious',
    description: 'Save 10 kg of CO₂',
    icon: 'earth-americas', color: '#2E7D32',
    progress: s => Math.min(s.totalCO2 / 10, 1),
    check: s => s.totalCO2 >= 10,
  },
  {
    id: 'co2_50',
    title: 'CO₂ Crusader',
    description: 'Save 50 kg of CO₂',
    icon: 'shield-halved', color: '#1B5E20',
    progress: s => Math.min(s.totalCO2 / 50, 1),
    check: s => s.totalCO2 >= 50,
  },

  // ── Per-category milestones ────────────────────────────────────────────────
  {
    id: 'walking_first',
    title: 'First Steps',
    description: 'Log your first walk',
    icon: 'person-walking', color: '#4CAF50',
    progress: s => Math.min(s.walkingActivities / 1, 1),
    check: s => s.walkingActivities >= 1,
  },
  {
    id: 'cycling_first',
    title: 'Wheel Life',
    description: 'Log your first cycle ride',
    icon: 'bicycle', color: '#29B6F6',
    progress: s => Math.min(s.cyclingActivities / 1, 1),
    check: s => s.cyclingActivities >= 1,
  },
  {
    id: 'electricity_first',
    title: 'Power Saver',
    description: 'Log your first electricity saving',
    icon: 'bolt', color: '#FFC107',
    progress: s => Math.min(s.electricityActivities / 1, 1),
    check: s => s.electricityActivities >= 1,
  },
  {
    id: 'water_first',
    title: 'Drop Counter',
    description: 'Log your first water saving',
    icon: 'droplet', color: '#26C6DA',
    progress: s => Math.min(s.waterActivities / 1, 1),
    check: s => s.waterActivities >= 1,
  },
  {
    id: 'all_categories',
    title: 'All-Rounder',
    description: 'Log at least one activity in every category',
    icon: 'layer-group', color: '#AB47BC',
    progress: s => Math.min(s.uniqueCategories / 5, 1),
    check: s => s.uniqueCategories >= 5,
  },

  // ── Streak milestones ──────────────────────────────────────────────────────
  {
    id: 'streak_14',
    title: 'Fortnight Force',
    description: 'Keep a 14-day streak',
    icon: 'fire', color: '#E64A19',
    progress: s => Math.min(s.currentStreak / 14, 1),
    check: s => s.currentStreak >= 14,
  },

  // ── Token milestones ───────────────────────────────────────────────────────
  {
    id: 'token_2500',
    title: 'Token Titan',
    description: 'Earn 2,500 EcoTokens',
    icon: 'star', color: '#FB8C00',
    progress: s => Math.min(s.totalTokens / 2500, 1),
    check: s => s.totalTokens >= 2500,
  },

  // ── CO₂ milestones ─────────────────────────────────────────────────────────
  {
    id: 'co2_100',
    title: 'Carbon Slayer',
    description: 'Save 100 kg of CO₂',
    icon: 'earth-europe', color: '#00695C',
    progress: s => Math.min(s.totalCO2 / 100, 1),
    check: s => s.totalCO2 >= 100,
  },

  // ── Activity count milestones ──────────────────────────────────────────────
  {
    id: 'activities_25',
    title: 'Consistent',
    description: 'Log 25 activities',
    icon: 'calendar-check', color: '#5C6BC0',
    progress: s => Math.min(s.totalActivities / 25, 1),
    check: s => s.totalActivities >= 25,
  },

  // ── Long-term / hard milestones ────────────────────────────────────────────
  {
    id: 'token_10000',
    title: 'Token Master',
    description: 'Earn 10,000 EcoTokens lifetime',
    icon: 'crown', color: '#F9A825',
    progress: s => Math.min(s.totalTokens / 10000, 1),
    check: s => s.totalTokens >= 10000,
  },
  {
    id: 'token_25000',
    title: 'EcoVerse Elite',
    description: 'Earn 25,000 EcoTokens lifetime',
    icon: 'shield-crown', color: '#E65100',
    progress: s => Math.min(s.totalTokens / 25000, 1),
    check: s => s.totalTokens >= 25000,
  },
  {
    id: 'streak_60',
    title: 'Unstoppable',
    description: 'Keep a 60-day streak',
    icon: 'fire-flame-curved', color: '#BF360C',
    progress: s => Math.min(s.currentStreak / 60, 1),
    check: s => s.currentStreak >= 60,
  },
  {
    id: 'streak_100',
    title: 'Centurion',
    description: 'Keep a 100-day streak',
    icon: 'infinity', color: '#880E4F',
    progress: s => Math.min(s.currentStreak / 100, 1),
    check: s => s.currentStreak >= 100,
  },
  {
    id: 'activities_200',
    title: 'Dedicated',
    description: 'Log 200 activities',
    icon: 'chart-line', color: '#00838F',
    progress: s => Math.min(s.totalActivities / 200, 1),
    check: s => s.totalActivities >= 200,
  },
  {
    id: 'activities_500',
    title: 'Eco Obsessed',
    description: 'Log 500 activities',
    icon: 'rocket', color: '#283593',
    progress: s => Math.min(s.totalActivities / 500, 1),
    check: s => s.totalActivities >= 500,
  },
  {
    id: 'co2_250',
    title: 'Climate Champion',
    description: 'Save 250 kg of CO₂',
    icon: 'earth-americas', color: '#004D40',
    progress: s => Math.min(s.totalCO2 / 250, 1),
    check: s => s.totalCO2 >= 250,
  },
  {
    id: 'co2_1000',
    title: 'Carbon Warrior',
    description: 'Save 1,000 kg of CO₂',
    icon: 'shield', color: '#1A237E',
    progress: s => Math.min(s.totalCO2 / 1000, 1),
    check: s => s.totalCO2 >= 1000,
  },
  {
    id: 'walking_marathon',
    title: 'Marathon Walker',
    description: 'Log 50 walking activities',
    icon: 'person-walking', color: '#2E7D32',
    progress: s => Math.min(s.walkingActivities / 50, 1),
    check: s => s.walkingActivities >= 50,
  },
  {
    id: 'cycling_century',
    title: 'Cycle Century',
    description: 'Log 30 cycling activities',
    icon: 'bicycle', color: '#0277BD',
    progress: s => Math.min(s.cyclingActivities / 30, 1),
    check: s => s.cyclingActivities >= 30,
  },
];

// ── Completed challenge record ─────────────────────────────────────────────────
interface CompletedChallenge {
  challengeId:  string;
  weekId:       string;
  title:        string;
  badgeLabel:   string;
  icon:         string;
  color:        string;
  difficulty?:  string;
  rewardTokens: number;
}

// ── Challenge badge tile (2-column grid, collectible medal style) ──────────────
function ChallengeBadgeCard({
  cc,
  colors: c,
  isDark,
}: {
  cc: CompletedChallenge;
  colors: any;
  isDark: boolean;
}) {
  const dc = cc.difficulty ? DIFFICULTY[cc.difficulty] : null;

  return (
    <View style={[cardStyles.tile, { backgroundColor: c.surface }]}>
      {/* Glow ring */}
      <View style={[cardStyles.glowRing, { backgroundColor: cc.color + '18', borderColor: cc.color + '40' }]}>
        {/* Inner icon circle */}
        <View style={[cardStyles.iconCircle, { backgroundColor: cc.color + '22' }]}>
          <FontAwesome6 name={cc.icon} size={28} color={cc.color} solid />
        </View>
      </View>

      {/* Badge label */}
      <Text style={[cardStyles.badgeTitle, { color: c.text }]} numberOfLines={2}>
        {cc.badgeLabel}
      </Text>

      {/* Difficulty pill */}
      {dc && (
        <View style={[cardStyles.diffPill, { backgroundColor: isDark ? dc.color + '22' : dc.bg }]}>
          <Text style={[cardStyles.diffText, { color: dc.color }]}>{dc.label}</Text>
        </View>
      )}

      {/* Week earned */}
      <Text style={[cardStyles.weekLabel, { color: c.text }]}>
        {formatWeekId(cc.weekId)}
      </Text>

      {/* Token reward */}
      <View style={[cardStyles.rewardPill, { backgroundColor: '#43A047' + '18' }]}>
        <FontAwesome6 name="leaf" size={9} color="#43A047" solid />
        <Text style={cardStyles.rewardText}>+{cc.rewardTokens}</Text>
      </View>

      {/* Colour accent bottom strip */}
      <View style={[cardStyles.bottomStrip, { backgroundColor: cc.color }]} />
    </View>
  );
}

const cardStyles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 10,
    gap: 7,
    overflow: 'hidden',
    position: 'relative',
  },
  glowRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  iconCircle: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeTitle:    { fontSize: 13, fontWeight: '800', textAlign: 'center', lineHeight: 17 },
  diffPill:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  diffText:      { fontSize: 10, fontWeight: '700' },
  weekLabel:     { fontSize: 10, opacity: 0.4, fontWeight: '500' },
  rewardPill:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  rewardText:    { fontSize: 11, fontWeight: '800', color: '#43A047' },
  bottomStrip:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 },
});

// ── Milestone badge card (2-column grid) ──────────────────────────────────────
function MilestoneBadge({
  m,
  unlocked,
  pct,
  colors: c,
  isDark,
}: {
  m: Milestone;
  unlocked: boolean;
  pct: number;  // 0–1, for locked progress hint
  colors: any;
  isDark: boolean;
}) {
  return (
    <View
      style={[
        milestoneStyles.card,
        {
          width: MILESTONE_COL,
          backgroundColor: unlocked
            ? (isDark ? m.color + '18' : m.color + '10')
            : c.surface,
          borderColor: unlocked ? m.color + '50' : c.surfaceMuted,
          borderWidth: unlocked ? 1.5 : 1,
        },
      ]}
    >
      {/* Icon area */}
      <View style={[
        milestoneStyles.iconWrap,
        {
          backgroundColor: unlocked ? m.color + '22' : (isDark ? '#ffffff0a' : '#0000000a'),
          borderColor:     unlocked ? m.color + '55' : (isDark ? '#ffffff18' : '#00000015'),
          borderStyle:     unlocked ? 'solid' : 'dashed',
        },
      ]}>
        {unlocked ? (
          <FontAwesome6 name={m.icon} size={24} color={m.color} solid />
        ) : (
          <FontAwesome6 name="lock" size={18} color={c.text + '25'} />
        )}
      </View>

      {/* Title / description */}
      <Text
        style={[milestoneStyles.title, { color: unlocked ? c.text : c.text + '55' }]}
        numberOfLines={1}
      >
        {unlocked ? m.title : '???'}
      </Text>
      <Text
        style={[milestoneStyles.desc, { color: unlocked ? c.text : c.text + '35' }]}
        numberOfLines={2}
      >
        {m.description}
      </Text>

      {/* Locked progress bar */}
      {!unlocked && pct > 0 && (
        <View style={[milestoneStyles.progressTrack, { backgroundColor: isDark ? '#ffffff10' : '#00000010' }]}>
          <View style={[milestoneStyles.progressFill, { width: `${pct * 100}%`, backgroundColor: m.color + '80' }]} />
        </View>
      )}

      {/* Unlocked checkmark */}
      {unlocked && (
        <View style={[milestoneStyles.check, { backgroundColor: m.color + '20' }]}>
          <FontAwesome6 name="check" size={9} color={m.color} />
        </View>
      )}
    </View>
  );
}

const milestoneStyles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 16,
    gap: 6,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title:         { fontSize: 13, fontWeight: '700', lineHeight: 17 },
  desc:          { fontSize: 11, lineHeight: 15 },
  progressTrack: { height: 3, width: '100%', borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  progressFill:  { height: '100%', borderRadius: 2 },
  check: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ── Main screen ────────────────────────────────────────────────────────────────
export default function AchievementsScreen() {
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';
  const { activities, userProfile } = useActivityStore();
  const auth = getAuth();
  const uid  = auth.currentUser?.uid;

  const [loading, setLoading]               = useState(true);
  const [completedChallenges, setCompleted] = useState<CompletedChallenge[]>([]);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }

    (async () => {
      try {
        const progressSnap = await getDocs(
          collection(db, 'users', uid, 'challengeProgress')
        );

        const earned: CompletedChallenge[] = [];

        for (const weekDoc of progressSnap.docs) {
          const data                           = weekDoc.data();
          const weekId: string                 = weekDoc.id;
          const completed: string[]            = data.completedIds ?? [];
          const titles: Record<string, any>    = data.challengeTitles ?? {};

          for (const challengeId of completed) {
            const cached   = titles[challengeId];
            const fallback = CHALLENGES.find(c => c.id === challengeId);
            const meta     = cached ?? fallback;

            earned.push({
              challengeId,
              weekId,
              title:        meta?.title        ?? 'Challenge',
              badgeLabel:   meta?.badgeLabel   ?? 'Completed',
              icon:         meta?.icon         ?? 'trophy',
              color:        meta?.color        ?? '#4CAF50',
              difficulty:   meta?.difficulty   ?? undefined,
              rewardTokens: meta?.rewardTokens ?? 0,
            });
          }
        }

        earned.sort((a, b) => b.weekId.localeCompare(a.weekId));
        setCompleted(earned);
      } catch (e) {
        console.warn('Achievements load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats: MilestoneStats = {
    totalTokens:     userProfile?.tokens ?? 0,
    totalActivities: activities.length,
    currentStreak:   calculateStreak(activities),
    totalCO2:        userProfile?.totalCarbonSaved ?? 0,
    walkingActivities:     activities.filter(a => a.category === 'walking').length,
    cyclingActivities:     activities.filter(a => a.category === 'cycling').length,
    electricityActivities: activities.filter(a => a.category === 'electricity').length,
    waterActivities:       activities.filter(a => a.category === 'water').length,
    uniqueCategories:      new Set(activities.map(a => a.category)).size,
  };

  const totalTokens = userProfile?.tokens ?? 0;
  const { level } = getLevelInfo(totalTokens);
  const rank       = getRankInfo(level);

  const unlockedMilestoneIds = new Set(
    MILESTONES.filter(m => m.check(stats)).map(m => m.id)
  );

  const unlockedMilestones = unlockedMilestoneIds.size;
  const totalMilestones    = MILESTONES.length;
  const totalBadges        = unlockedMilestones + completedChallenges.length;
  const totalPossible      = totalMilestones + completedChallenges.length;
  const overallPct         = totalPossible > 0
    ? Math.round((totalBadges / totalPossible) * 100)
    : 0;

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.tint} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>

      {/* ── Header + Hero + Stats — sticky above scroll ── */}
      <View style={[styles.stickyHeader, { backgroundColor: colors.background, borderBottomColor: colors.surfaceMuted }]}>
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <FontAwesome6 name="chevron-left" size={14} color={colors.text} />
          </Pressable>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Achievements</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* ── Hero banner ── */}
        <LinearGradient
          colors={isDark
            ? [rank.color + '35', rank.color + '15', colors.surface]
            : [rank.color + '25', rank.color + '08', colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroBanner, { borderColor: rank.color + '30' }]}
        >
          {/* Rank glow circle */}
          <View style={[styles.rankGlow, { backgroundColor: rank.color + '20' }]}>
            <MaterialCommunityIcons name={rank.icon as any} size={28} color={rank.color} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.heroRank, { color: rank.color }]}>
              {rank.name} · Lv {level}
            </Text>
            <Text style={[styles.heroCount, { color: colors.text }]}>
              {totalBadges} badges earned
            </Text>
          </View>

          {/* Completion arc */}
          <View style={[styles.pctBubble, { borderColor: rank.color + '40', backgroundColor: isDark ? rank.color + '20' : rank.color + '12' }]}>
            <Text style={[styles.pctNum, { color: rank.color }]}>{overallPct}%</Text>
            <Text style={[styles.pctLabel, { color: rank.color }]}>done</Text>
          </View>
        </LinearGradient>

        {/* ── Stat pills row ── */}
        <View style={styles.pillsRow}>
          {[
            { icon: 'trophy',     label: 'Challenges',  val: completedChallenges.length, color: '#FFB300' },
            { icon: 'star',       label: 'Milestones',  val: `${unlockedMilestones}/${totalMilestones}`, color: colors.tint },
            { icon: 'fire',       label: 'Streak',      val: stats.currentStreak,  color: '#FF7043' },
          ].map(p => (
            <View key={p.label} style={[styles.statPill, { backgroundColor: colors.surface }]}>
              <FontAwesome6 name={p.icon} size={14} color={p.color} solid />
              <Text style={[styles.statPillVal, { color: colors.text }]}>{p.val}</Text>
              <Text style={[styles.statPillLabel, { color: colors.text }]}>{p.label}</Text>
            </View>
          ))}
        </View>

      </View>{/* end stickyHeader */}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Challenge Badges ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Challenge Badges</Text>
          {completedChallenges.length > 0 && (
            <View style={[styles.countChip, { backgroundColor: colors.tint + '18' }]}>
              <Text style={[styles.countChipText, { color: colors.tint }]}>
                {completedChallenges.length}
              </Text>
            </View>
          )}
        </View>

        {completedChallenges.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.emptyIcon, { backgroundColor: '#FFB30015' }]}>
              <FontAwesome6 name="trophy" size={28} color="#FFB300" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No badges yet</Text>
            <Text style={[styles.emptySub, { color: colors.text }]}>
              Complete a weekly challenge in the Community tab to earn your first badge
            </Text>
          </View>
        ) : (
          <View style={styles.badgeGrid}>
            {completedChallenges.map((cc, i) => (
              <ChallengeBadgeCard
                key={`${cc.challengeId}-${cc.weekId}-${i}`}
                cc={cc}
                colors={colors}
                isDark={isDark}
              />
            ))}
            {/* Pad to even columns */}
            {completedChallenges.length % 2 !== 0 && <View style={{ flex: 1 }} />}
          </View>
        )}

        {/* ── Milestone Badges ── */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Milestones</Text>
          <View style={[styles.countChip, { backgroundColor: colors.tint + '18' }]}>
            <Text style={[styles.countChipText, { color: colors.tint }]}>
              {unlockedMilestones}/{totalMilestones}
            </Text>
          </View>
        </View>

        {/* Milestone progress bar */}
        <View style={[styles.milestoneBar, { backgroundColor: isDark ? '#ffffff10' : '#00000010' }]}>
          <View style={[
            styles.milestoneBarFill,
            { width: `${(unlockedMilestones / totalMilestones) * 100}%`, backgroundColor: colors.tint },
          ]} />
        </View>

        <View style={styles.milestoneGrid}>
          {MILESTONES.map(m => (
            <MilestoneBadge
              key={m.id}
              m={m}
              unlocked={unlockedMilestoneIds.has(m.id)}
              pct={m.progress(stats)}
              colors={colors}
              isDark={isDark}
            />
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatWeekId(weekId: string): string {
  try {
    const d = new Date(weekId + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return weekId;
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:          { flex: 1 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stickyHeader:  { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  scroll:        { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },

  // Header
  headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },

  // Hero
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  rankGlow:   { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  heroRank:   { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  heroCount:  { fontSize: 13, opacity: 0.55, marginTop: 2 },
  pctBubble:  { width: 58, height: 58, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 0 },
  pctNum:     { fontSize: 17, fontWeight: '900', lineHeight: 20 },
  pctLabel:   { fontSize: 9, fontWeight: '600', opacity: 0.8 },

  // Pills row
  pillsRow:      { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statPill:      { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  statPillVal:   { fontSize: 16, fontWeight: '800' },
  statPillLabel: { fontSize: 10, opacity: 0.5, fontWeight: '500' },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle:  { fontSize: 17, fontWeight: '700' },
  countChip:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  countChipText: { fontSize: 12, fontWeight: '700' },

  // Challenge cards
  cardList:  { gap: 8, marginBottom: 8 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },

  // Empty
  emptyCard:  { borderRadius: 16, padding: 28, alignItems: 'center', marginBottom: 8 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptySub:   { fontSize: 13, opacity: 0.5, textAlign: 'center', lineHeight: 19 },

  // Milestone grid
  milestoneBar:     { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 14 },
  milestoneBarFill: { height: '100%', borderRadius: 2 },
  milestoneGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});