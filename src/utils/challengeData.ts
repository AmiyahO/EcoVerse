// src/utils/challengeData.ts
// Static challenge definitions for the current week.
// For FYP: seed these manually in Firestore under /challenges/{id}
// or use this file as the source of truth for the UI.
// A new set can be swapped in each Sunday by updating this file.

export type ChallengeMetric = 'steps' | 'co2' | 'tokens' | 'distance' | 'kwh';

export interface Challenge {
  id:           string;
  title:        string;
  description:  string;
  icon:         string;         // FontAwesome6 free solid icon name
  color:        string;         // accent colour
  goal: {
    metric:  ChallengeMetric;
    target:  number;
    // Which activity categories contribute to this metric
    categories?: string[];
  };
  rewardTokens: number;
  badgeLabel:   string;
}

export const CHALLENGES: Challenge[] = [
  {
    id:          'step-sprint',
    title:       'Step Sprint',
    description: 'Log 20,000 steps this week through walking or running.',
    icon:        'person-walking',
    color:       '#4CAF50',
    goal:        { metric: 'steps', target: 20000, categories: ['walking', 'running'] },
    rewardTokens: 100,
    badgeLabel:  'Pavement Pounder',
  },
  {
    id:          'power-saver',
    title:       'Power Saver',
    description: 'Save 10 kWh of electricity this week.',
    icon:        'bolt',
    color:       '#FFC107',
    goal:        { metric: 'kwh', target: 10, categories: ['electricity'] },
    rewardTokens: 80,
    badgeLabel:  'Grid Guardian',
  },
  {
    id:          'green-commuter',
    title:       'Green Commuter',
    description: 'Walk or cycle a combined 15 km this week.',
    icon:        'bicycle',
    color:       '#29B6F6',
    goal:        { metric: 'distance', target: 15, categories: ['walking', 'cycling'] },
    rewardTokens: 90,
    badgeLabel:  'Trail Blazer',
  },
  {
    id:          'consistency-champion',
    title:       'Consistency Champion',
    description: 'Log at least one activity every day this week.',
    icon:        'fire',
    color:       '#FF7043',
    goal:        { metric: 'tokens', target: 7, categories: [] }, // uses activeDays logic
    rewardTokens: 120,
    badgeLabel:  'Iron Streak',
  },
  {
    id:          'water-warrior',
    title:       'Water Warrior',
    description: 'Save 500 litres of water this week.',
    icon:        'droplet',
    color:       '#26C6DA',
    goal:        { metric: 'distance', target: 500, categories: ['water'] }, // litres — handled in getChallengeProgress
    rewardTokens: 70,
    badgeLabel:  'H₂O Hero',
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
      // Green Commuter — km for walking/cycling
      if (ch.goal.categories?.includes('walking') || ch.goal.categories?.includes('cycling')) {
        return relevant.reduce((s, a) => s + (a.distance ?? (a.steps ? a.steps * 0.00078 : 0)), 0);
      }
      // Water Warrior — litres
      if (ch.goal.categories?.includes('water')) {
        return relevant.reduce((s, a) => s + (a.litersSaved ?? 0), 0);
      }
      return 0;

    case 'kwh':
      return relevant.reduce((s, a) => s + (a.kwhSaved ?? 0), 0);

    case 'co2':
      return relevant.reduce((s, a) => s + (a.co2Saved ?? 0), 0);

    case 'tokens':
      // Consistency Champion — count unique active days this week
      if (ch.id === 'consistency-champion') {
        const days = new Set(weekActivities.map(a => a.date?.slice(0, 10)));
        return days.size;
      }
      return relevant.reduce((s, a) => s + (a.tokensEarned ?? 0), 0);

    default:
      return 0;
  }
}