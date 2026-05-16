// src/utils/challengeData.ts
// Challenge definitions.
// At runtime the app tries to fetch challenges from Firestore /challenges
// (filtered to the current weekId). If Firestore is empty or unavailable,
// it falls back to CHALLENGES (the static array below), so the UI always
// has something to show.
export type ChallengeMetric = 'steps' | 'co2' | 'tokens' | 'distance' | 'kwh' | 'activities' | 'litres';

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard' | 'epic';
export type ChallengeType       = 'weekly' | 'monthly' | 'special';

export interface Challenge {
  id:            string;
  title:         string;
  description:   string;
  icon:          string;              // FontAwesome6 free solid icon name
  color:         string;             // accent colour
  difficulty:    ChallengeDifficulty;
  challengeType: ChallengeType;
  goal: {
    metric:     ChallengeMetric;
    target:     number;
    categories?: string[];
  };
  rewardTokens:  number;
  badgeLabel:    string;
}

export const CHALLENGES: Challenge[] = [
  {
    id:            'step-sprint',
    title:         'Step Sprint',
    description:   'Log 20,000 steps this week through walking or running.',
    icon:          'person-walking',
    color:         '#4CAF50',
    difficulty:    'easy',
    challengeType: 'weekly',
    goal:          { metric: 'steps', target: 20000, categories: ['walking', 'running'] },
    rewardTokens:  100,
    badgeLabel:    'Pavement Pounder',
  },
  {
    id:            'green-commuter',
    title:         'Green Commuter',
    description:   'Walk or cycle a combined 15 km this week.',
    icon:          'bicycle',
    color:         '#29B6F6',
    difficulty:    'easy',
    challengeType: 'weekly',
    goal:          { metric: 'distance', target: 15, categories: ['walking', 'cycling'] },
    rewardTokens:  90,
    badgeLabel:    'Trail Blazer',
  },
  {
    id:            'consistency-champion',
    title:         'Consistency Champion',
    description:   'Log at least one activity every day this week.',
    icon:          'fire',
    color:         '#FF7043',
    difficulty:    'medium',
    challengeType: 'weekly',
    goal:          { metric: 'activities', target: 7, categories: ['walking', 'running', 'cycling'] },
    rewardTokens:  120,
    badgeLabel:    'Iron Streak',
  },
  {
    id:            'two-wheel-hero',
    title:         'Two-Wheel Hero',
    description:   'Cycle 20 km this week.',
    icon:          'bicycle',
    color:         '#26A69A',
    difficulty:    'medium',
    challengeType: 'weekly',
    goal:          { metric: 'distance', target: 20, categories: ['cycling'] },
    rewardTokens:  110,
    badgeLabel:    'Pedal Pioneer',
  },
  {
    id:            'marathon-mood',
    title:         'Marathon Mood',
    description:   'Reach 50,000 steps this week through movement activities.',
    icon:          'shoe-prints',
    color:         '#66BB6A',
    difficulty:    'hard',
    challengeType: 'weekly',
    goal:          { metric: 'steps', target: 50000, categories: ['walking', 'running'] },
    rewardTokens:  150,
    badgeLabel:    'Step Sovereign',
  },
  {
    id:            'century-quest',
    title:         'The Century Quest',
    description:   'Log 100,000 steps this week. The ultimate movement challenge.',
    icon:          'ranking-star',
    color:         '#FF6F00',
    difficulty:    'epic',
    challengeType: 'weekly',
    goal:          { metric: 'steps', target: 100000, categories: ['walking', 'running'] },
    rewardTokens:  500,
    badgeLabel:    'Century Legend',
  },
  {
    id:            'distance-dynamo',
    title:         'Distance Dynamo',
    description:   'Cover a combined 50 km through eco-friendly movement this week.',
    icon:          'trophy',
    color:         '#FF6F00',
    difficulty:    'epic',
    challengeType: 'weekly',
    goal:          { metric: 'distance', target: 50, categories: ['walking', 'running', 'cycling'] },
    rewardTokens:  450,
    badgeLabel:    'Distance Dynamo',
  },
];

// ── Week identifier (ISO year-week, e.g. "2026-W19") ─────────────────────────
export function getCurrentWeekId(): string {
  const now    = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);
  const y = sunday.getFullYear();
  const m = String(sunday.getMonth() + 1).padStart(2, '0');
  const d = String(sunday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Calculate live progress for a challenge from this week's activities ───────
export function getChallengeProgress(ch: Challenge, weekActivities: any[]): number {
  const relevant = ch.goal.categories?.length
    ? weekActivities.filter(a => ch.goal.categories!.includes(a.category))
    : weekActivities;

  switch (ch.goal.metric) {
    case 'steps':
      return relevant.reduce((s, a) => s + (a.steps ?? 0), 0);

    case 'distance':
      return relevant.reduce((s, a) => s + (a.distance ?? (a.steps ? a.steps * 0.00078 : 0)), 0);

    case 'kwh':
      return relevant.reduce((s, a) => s + (a.kwhSaved ?? 0), 0);

    case 'litres':
      return relevant.reduce((s, a) => s + (a.litersSaved ?? 0), 0);

    case 'co2':
      // co2Saved is stored on each Activity at log time (add.tsx writes it to Firestore)
      return relevant.reduce((s, a) => s + ((a as any).co2Saved ?? 0), 0);

    case 'activities':
      // Consistency Champion variant: count unique active days (one per day counts)
      if (ch.goal.target <= 7) {
        const days = new Set(relevant.map((a: any) => a.date?.slice(0, 10)));
        return days.size;
      }
      // Eco Explorer variant: count total activity logs
      return relevant.length;

    case 'tokens':
      return relevant.reduce((s, a) => s + (a.tokensEarned ?? 0), 0);

    default:
      return 0;
  }
}

// ── Firestore fetch (returns CHALLENGES fallback if Firestore empty) ──────────
/**
 * Fetches challenges for the current week from Firestore /challenges.
 * Each document should have a `weekId` field matching getCurrentWeekId(),
 * or no `weekId` field at all (treated as always-active).
 * Falls back to the static CHALLENGES array if Firestore returns nothing.
 */
export async function fetchChallengesForWeek(): Promise<Challenge[]> {
  try {
    const { collection, getDocs, query, where, getFirestore } = await import('firebase/firestore');
    const db = getFirestore();
    const weekId = getCurrentWeekId();

    // Fetch all challenges for this weekId (includes both weekly and monthly
    // if the Cloud Function wrote monthly ones this week)
    const weekQ = query(
      collection(db, 'challenges'),
      where('weekId', '==', weekId),
    );
    const weekSnap = await getDocs(weekQ);

    if (weekSnap.docs.length > 0) {
      const all = weekSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as Challenge))
      .filter(ch => ch?.id && ch?.title && ch?.goal);
      // Sort: weekly first, then monthly, then special — keeps layout predictable
      return all.sort((a, b) => {
        const order: Record<string, number> = { weekly: 0, monthly: 1, special: 2 };
        return (order[a.challengeType] ?? 9) - (order[b.challengeType] ?? 9);
      });
    }

    // Final fallback: static local array
    return CHALLENGES;
  } catch {
    return CHALLENGES;
  }
}