// app/achievements.tsx
// Displays two sections:
//   1. Challenge Badges  — one badge per completed challenge, pulled from all
//      challengeProgress sub-collection documents (all weeks of history).
//   2. Milestone Badges  — static achievements unlocked by cumulative stats
//      (total tokens, streak, activity count, CO₂ saved).
//
// Designed as a push-navigated screen, accessible from the Profile tab.

import { useAppTheme } from '@/hooks/useAppTheme';
import { db } from '@/src/firebase/config';
import { useActivityStore } from '@/src/store/activityStore';
import { CHALLENGES, type Challenge } from '@/src/utils/challengeData';
import { calculateStreak } from '@/src/utils/ecoLogic';
import { FontAwesome6 } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');
const BADGE_SIZE = (SCREEN_W - 56) / 3; // 3-column grid with 20px side padding + 8px gaps

// ── Difficulty colours (mirrors community.tsx) ────────────────────────────────
const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  easy:   { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
  medium: { bg: '#FFF3E0', text: '#E65100', border: '#FFCC80' },
  hard:   { bg: '#FCE4EC', text: '#C62828', border: '#EF9A9A' },
  epic:   { bg: '#EDE7F6', text: '#4527A0', border: '#CE93D8' },
};

// ── Milestone definitions ─────────────────────────────────────────────────────
interface Milestone {
  id:          string;
  title:       string;
  description: string;
  icon:        string;
  color:       string;
  check:       (stats: MilestoneStats) => boolean;
}

interface MilestoneStats {
  totalTokens:     number;
  totalActivities: number;
  currentStreak:   number;
  totalCO2:        number;
}

const MILESTONES: Milestone[] = [
  {
    id: 'first_step',
    title: 'First Step',
    description: 'Log your very first activity.',
    icon: 'seedling', color: '#4CAF50',
    check: s => s.totalActivities >= 1,
  },
  {
    id: 'token_100',
    title: 'Token Starter',
    description: 'Earn 100 EcoTokens in total.',
    icon: 'leaf', color: '#43A047',
    check: s => s.totalTokens >= 100,
  },
  {
    id: 'token_500',
    title: 'Token Collector',
    description: 'Earn 500 EcoTokens in total.',
    icon: 'star', color: '#FBC02D',
    check: s => s.totalTokens >= 500,
  },
  {
    id: 'token_1000',
    title: 'Token Hoarder',
    description: 'Earn 1,000 EcoTokens in total.',
    icon: 'star', color: '#F57F17',
    check: s => s.totalTokens >= 1000,
  },
  {
    id: 'token_5000',
    title: 'EcoVerse Legend',
    description: 'Earn 5,000 EcoTokens. Incredible.',
    icon: 'trophy', color: '#FF6F00',
    check: s => s.totalTokens >= 5000,
  },
  {
    id: 'streak_3',
    title: 'Heat Wave',
    description: 'Keep a 3-day streak.',
    icon: 'fire', color: '#FF7043',
    check: s => s.currentStreak >= 3,
  },
  {
    id: 'streak_7',
    title: 'Weekly Warrior',
    description: 'Keep a 7-day streak.',
    icon: 'fire-flame-curved', color: '#F4511E',
    check: s => s.currentStreak >= 7,
  },
  {
    id: 'streak_30',
    title: 'Solar Flare',
    description: 'Keep a 30-day streak.',
    icon: 'sun', color: '#FFB300',
    check: s => s.currentStreak >= 30,
  },
  {
    id: 'activities_10',
    title: 'Getting Started',
    description: 'Log 10 activities.',
    icon: 'bolt', color: '#29B6F6',
    check: s => s.totalActivities >= 10,
  },
  {
    id: 'activities_50',
    title: 'Eco Veteran',
    description: 'Log 50 activities.',
    icon: 'circle-check', color: '#0288D1',
    check: s => s.totalActivities >= 50,
  },
  {
    id: 'activities_100',
    title: 'Century Club',
    description: 'Log 100 activities.',
    icon: 'medal', color: '#7B1FA2',
    check: s => s.totalActivities >= 100,
  },
  {
    id: 'co2_1',
    title: 'Carbon Cutter',
    description: 'Save 1 kg of CO₂.',
    icon: 'leaf', color: '#66BB6A',
    check: s => s.totalCO2 >= 1,
  },
  {
    id: 'co2_10',
    title: 'Climate Conscious',
    description: 'Save 10 kg of CO₂.',
    icon: 'globe', color: '#2E7D32',
    check: s => s.totalCO2 >= 10,
  },
  {
    id: 'co2_50',
    title: 'CO₂ Crusader',
    description: 'Save 50 kg of CO₂.',
    icon: 'earth-americas', color: '#1B5E20',
    check: s => s.totalCO2 >= 50,
  },
];

// ── Completed challenge record ─────────────────────────────────────────────────
interface CompletedChallenge {
  challengeId: string;
  weekId:      string;
  title:       string;
  badgeLabel:  string;
  icon:        string;
  color:       string;
  difficulty?: string;
  rewardTokens: number;
}

// ── Badge component ────────────────────────────────────────────────────────────
function Badge({
  icon,
  color,
  label,
  sublabel,
  difficulty,
  locked,
  colors: c,
}: {
  icon:       string;
  color:      string;
  label:      string;
  sublabel?:  string;
  difficulty?: string;
  locked:     boolean;
  colors:     any;
}) {
  const dc = difficulty ? DIFFICULTY_COLORS[difficulty] : null;

  return (
    <View style={[badgeStyles.item, { width: BADGE_SIZE }]}>
      <View
        style={[
          badgeStyles.iconWrap,
          {
            backgroundColor: locked ? (c.surfaceMuted ?? '#eee') : color + '18',
            borderColor:     locked ? (c.surfaceMuted ?? '#ddd') : color + '55',
            borderStyle:     locked ? 'dashed' : 'solid',
          },
        ]}
      >
        {locked ? (
          <FontAwesome6 name="lock" size={20} color={c.text + '40'} />
        ) : (
          <FontAwesome6 name={icon} size={22} color={color} solid />
        )}

        {/* Difficulty pip for challenge badges */}
        {!locked && dc && (
          <View style={[badgeStyles.pip, { backgroundColor: dc.border }]} />
        )}
      </View>

      <Text
        style={[badgeStyles.label, { color: locked ? c.text + '50' : c.text }]}
        numberOfLines={2}
      >
        {locked ? '???' : label}
      </Text>

      {sublabel ? (
        <Text style={[badgeStyles.sublabel, { color: c.text + '55' }]} numberOfLines={1}>
          {locked ? '' : sublabel}
        </Text>
      ) : null}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function AchievementsScreen() {
  const { colors } = useAppTheme();
  const { activities, userProfile } = useActivityStore();
  const auth = getAuth();
  const uid  = auth.currentUser?.uid;

  const [loading, setLoading]                   = useState(true);
  const [completedChallenges, setCompleted]     = useState<CompletedChallenge[]>([]);

  // ── Load all historical completions from Firestore ───────────────────────────
  useEffect(() => {
    if (!uid) { setLoading(false); return; }

    (async () => {
      try {
        const progressSnap = await getDocs(
          collection(db, 'users', uid, 'challengeProgress')
        );

        const earned: CompletedChallenge[] = [];

        for (const weekDoc of progressSnap.docs) {
          const data = weekDoc.data();
          const weekId: string      = weekDoc.id;
          const completed: string[] = data.completedIds ?? [];
          const titles: Record<string, any> = data.challengeTitles ?? {};

          for (const challengeId of completed) {
            // Try to resolve metadata from cached titles (written at join time),
            // then fall back to the static CHALLENGES array for FYP fallback.
            const cached = titles[challengeId];
            const fallback = CHALLENGES.find(c => c.id === challengeId);
            const meta = cached ?? fallback;

            earned.push({
              challengeId,
              weekId,
              title:        meta?.title      ?? 'Challenge',
              badgeLabel:   meta?.badgeLabel ?? 'Completed',
              icon:         meta?.icon       ?? 'trophy',
              color:        meta?.color      ?? '#4CAF50',
              difficulty:   meta?.difficulty ?? undefined,
              rewardTokens: meta?.rewardTokens ?? 0,
            });
          }
        }

        // Newest completions first
        earned.sort((a, b) => b.weekId.localeCompare(a.weekId));
        setCompleted(earned);
      } catch (e) {
        console.warn('Achievements load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  // ── Milestone stats ───────────────────────────────────────────────────────────
  const stats: MilestoneStats = {
    totalTokens:     userProfile?.tokens ?? 0,
    totalActivities: activities.length,
    currentStreak:   calculateStreak(activities),
    totalCO2:        userProfile?.totalCarbonSaved ?? 0,
  };

  const unlockedMilestoneIds = new Set(
    MILESTONES.filter(m => m.check(stats)).map(m => m.id)
  );

  const unlockedCount  = unlockedMilestoneIds.size + completedChallenges.length;
  const totalBadges    = MILESTONES.length + completedChallenges.length;

  // ── Render ────────────────────────────────────────────────────────────────────
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Achievements</Text>
          <View style={[styles.countPill, { backgroundColor: colors.tint + '18' }]}>
            <Text style={[styles.countText, { color: colors.tint }]}>
              {unlockedCount} / {totalBadges}
            </Text>
          </View>
        </View>

        <Text style={[styles.headerSub, { color: colors.text }]}>
          Badges you've earned across challenges and milestones
        </Text>

        {/* ── Challenge Badges ─────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Challenge Badges
        </Text>

        {completedChallenges.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🏆</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No badges yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.text }]}>
              Complete a weekly challenge to earn your first badge
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {completedChallenges.map((cc, i) => (
              <Badge
                key={`${cc.challengeId}-${cc.weekId}-${i}`}
                icon={cc.icon}
                color={cc.color}
                label={cc.badgeLabel}
                sublabel={`Week of ${formatWeekId(cc.weekId)}`}
                difficulty={cc.difficulty}
                locked={false}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* ── Milestone Badges ─────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 28 }]}>
          Milestones
        </Text>
        <Text style={[styles.sectionSub, { color: colors.text }]}>
          {unlockedMilestoneIds.size} of {MILESTONES.length} unlocked
        </Text>

        <View style={styles.grid}>
          {MILESTONES.map(m => (
            <Badge
              key={m.id}
              icon={m.icon}
              color={m.color}
              label={m.title}
              sublabel={m.description}
              locked={!unlockedMilestoneIds.has(m.id)}
              colors={colors}
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
  // "2026-05-11" → "11 May 2026"
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
  scroll:        { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title:      { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerSub:  { fontSize: 13, opacity: 0.5, marginBottom: 24 },
  countPill:  { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  countText:  { fontSize: 13, fontWeight: '700' },

  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  sectionSub:   { fontSize: 12, opacity: 0.5, marginBottom: 14 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },

  emptyCard:  { borderRadius: 16, padding: 28, alignItems: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptySub:   { fontSize: 13, opacity: 0.5, textAlign: 'center', lineHeight: 18 },
});

const badgeStyles = StyleSheet.create({
  item:     { alignItems: 'center', gap: 6 },
  iconWrap: {
    width: BADGE_SIZE - 12,
    height: BADGE_SIZE - 12,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pip: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  label:    { fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 14 },
  sublabel: { fontSize: 9, textAlign: 'center', lineHeight: 12 },
});