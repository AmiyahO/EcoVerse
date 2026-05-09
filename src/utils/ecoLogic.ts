// src/utils/ecoLogic.ts
import { Activity } from '@/src/store/activityStore';

export const WEEKLY_TOKEN_TARGET = 500;

export const REGIONAL_INTENSITY: Record<string, number> = {
  'US':         0.386,
  'UK':         0.193,
  'EU':         0.276,
  'INDIA':      0.713,
  'CHINA':      0.581,
  'GLOBAL_AVG': 0.475,
};

// Regional average monthly household electricity consumption (kWh/month).
// Sources: IEA Electricity Information 2023, Eurostat Energy Statistics 2023,
//          US EIA Residential Energy Consumption Survey 2020.
export const REGIONAL_ELECTRICITY_BASELINE: Record<string, number> = {
  'US':         877,   // US EIA: ~877 kWh/month average household
  'UK':         242,   // Ofgem / BEIS: ~242 kWh/month average household
  'EU':         290,   // Eurostat: ~290 kWh/month EU average
  'INDIA':      90,    // IEA: ~90 kWh/month (urban average)
  'CHINA':      250,   // NBSC: ~250 kWh/month average household
  'GLOBAL_AVG': 350,   // IEA global residential average
};

// Regional average monthly household water consumption (litres/month).
// Sources: WHO/UNICEF JMP 2023, Eurostat Water Statistics.
export const REGIONAL_WATER_BASELINE: Record<string, number> = {
  'US':         15000, // AWWA: ~500 L/day per household → 15 000/month
  'UK':         9000,  // Ofwat: ~300 L/day → 9 000/month
  'EU':         9000,  // Eurostat: ~300 L/day EU average
  'INDIA':      6000,  // WHO: ~200 L/day urban
  'CHINA':      7500,  // 250 L/day average
  'GLOBAL_AVG': 11000, // WHO global estimate
};

/** Returns regional monthly baseline for the given category and region. */
export function getRegionalBaseline(
  category: 'electricity' | 'water',
  region: string,
): number {
  const key = region.toUpperCase();
  if (category === 'electricity') {
    return REGIONAL_ELECTRICITY_BASELINE[key] ?? REGIONAL_ELECTRICITY_BASELINE['GLOBAL_AVG'];
  }
  return REGIONAL_WATER_BASELINE[key] ?? REGIONAL_WATER_BASELINE['GLOBAL_AVG'];
}

// Keep BASELINES for any existing import references — forwards to regional lookup.
export const BASELINES = {
  electricity: {
    kwhPerMonth:    290,
    billingMonths:  1,
    label: 'avg household uses ~290 kWh/month (EU/UK) or ~877 kWh/month (US)',
  },
  water: {
    litresPerMonth: 11000,
    billingMonths:  1,
    label: 'avg household uses ~11,000 L/month',
  },
};

export const CATEGORY_COLORS: Record<string, string> = {
  walking:     '#4CAF50',
  running:     '#FF7043',
  cycling:     '#29B6F6',
  electricity: '#FFC107',
  water:       '#26C6DA',
};

// ── Token calculation ─────────────────────────────────────────────────────────
export function calculateTokens(activity: Activity): number {
  switch (activity.category) {
    case 'walking':
      if (activity.steps) return Math.floor(activity.steps / 100);
      return Math.floor((activity.distance ?? 0) * 1282 / 100);
    case 'running':
      return Math.floor((activity.distance ?? 0) * 15);
    case 'cycling':
      return Math.floor((activity.distance ?? 0) * 10);
    case 'electricity':
      return Math.floor((activity.kwhSaved ?? 0) * 5);
    case 'water':
      return Math.floor((activity.litersSaved ?? 0) / 10);
    default:
      return 0;
  }
}

export function calculateFinalTokens(activity: Activity, currentStreak: number): number {
  const base = calculateTokens(activity);
  const multiplier = 1 + Math.min(Math.floor(currentStreak / 5) * 0.1, 0.5);
  return Math.floor(base * multiplier);
}

// ── CO₂ saved calculation ─────────────────────────────────────────────────────
export function calculateCarbonSaved(
  activity: Activity,
  userRegion: string = 'GLOBAL_AVG',
): number {
  switch (activity.category) {
    case 'walking': {
      const distanceKm = activity.distance
        ?? ((activity.steps ?? 0) * 0.00078);
      return distanceKm * 0.192;
    }
    case 'running':
      return (activity.distance ?? 0) * 0.192;
    case 'cycling':
      return (activity.distance ?? 0) * 0.186;
    case 'electricity': {
      const intensity = REGIONAL_INTENSITY[userRegion.toUpperCase()]
        ?? REGIONAL_INTENSITY['GLOBAL_AVG'];
      return (activity.kwhSaved ?? 0) * intensity;
    }
    case 'water':
      return (activity.litersSaved ?? 0) * 0.003;
    default:
      return 0;
  }
}

// ── EcoScore zone ─────────────────────────────────────────────────────────────
export function getEcoZone(score: number) {
  if (score < 50)
    return { label: 'Red',    message: 'Try logging more eco-friendly activities this week' };
  if (score < 75)
    return { label: 'Yellow', message: 'You\'re doing well — keep your streak going' };
  return   { label: 'Green',  message: 'Amazing! You\'re making a real impact 🌍' };
}

// ── EcoScore calculation (matches dashboard formula exactly) ─────────────────
export function calculateEcoScore(
  activities: Activity[],
  weeklyTarget: number,
  userRegion: string = 'GLOBAL_AVG',
): number {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const weeklyActivities = activities.filter(a => {
    const d = new Date(a.date);
    return d >= startOfWeek && d <= endOfWeek;
  });

  const weeklyTokens     = weeklyActivities.reduce((s, a) => s + calculateTokens(a), 0);
  const activeDays       = new Set(weeklyActivities.map(a => new Date(a.date).toDateString())).size;
  const uniqueCategories = new Set(weeklyActivities.map(a => a.category)).size;

  const baseScore        = Math.min((weeklyTokens / (weeklyTarget || 500)) * 70, 70);
  const consistencyBonus = (activeDays / 7) * 20;
  const varietyBonus     = (uniqueCategories / 3) * 10;
  return Math.min(100, Math.round(baseScore + consistencyBonus + varietyBonus));
}

// ── Streak helpers ────────────────────────────────────────────────────────────
export function getActiveDays(activities: { date: string }[]) {
  return new Set(activities.map(a => new Date(a.date).toDateString()));
}

export function calculateStreak(activities: { date: string }[]) {
  if (activities.length === 0) return 0;

  const activeDays = getActiveDays(activities);
  let streak = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!activeDays.has(today.toDateString())) {
    today.setDate(today.getDate() - 1);
  }

  while (activeDays.has(today.toDateString())) {
    streak += 1;
    today.setDate(today.getDate() - 1);
  }

  return streak;
}

// ── Week range helpers ────────────────────────────────────────────────────────
export function getWeekRange(offset: number = 0) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() - (7 * offset));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// ── Week CO₂ comparison ──────────────────────────────────────
export function getWeekCarbonComparison(
  activities: Activity[],
  userRegion: string = 'GLOBAL_AVG',
): { percentage: string; direction: 'up' | 'down' | 'neutral' } {
  const current  = getWeekRange(0);
  const previous = getWeekRange(1);

  const sum = (range: { start: Date; end: Date }) =>
    activities       .filter(a => { const d = new Date(a.date); return d >= range.start && d <= range.end; })       .reduce((s, a) => s + calculateCarbonSaved(a, userRegion), 0);

  const currentTotal  = sum(current);
  const previousTotal = sum(previous);

  if (previousTotal === 0 && currentTotal === 0) return { percentage: '0', direction: 'neutral' };
  if (previousTotal === 0)                        return { percentage: '100', direction: 'up' };

  const diff = ((currentTotal - previousTotal) / previousTotal) * 100;
  return {
    percentage: Math.abs(diff).toFixed(1),
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
  };
}

export function getWeeklyCO2Data(
  activities: Activity[],
  userRegion: string = 'GLOBAL_AVG',
  weeksBack: number = 8,
): { week: string; co2: number; weekStart: Date }[] {
  return Array.from({ length: weeksBack }, (_, i) => {
    const range = getWeekRange(weeksBack - 1 - i);
    const co2 = activities
      .filter(a => { const d = new Date(a.date); return d >= range.start && d <= range.end; })
      .reduce((sum, a) => sum + calculateCarbonSaved(a, userRegion), 0);
    const label = range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { week: label, co2: parseFloat(co2.toFixed(3)), weekStart: range.start };
  });
}

// ── Persist weeklyEcoScore to Firestore ───────────────────────────────────────
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/src/firebase/config';

export async function persistWeeklyEcoScore(
  activities: Activity[],
  weeklyTarget: number,
  userRegion: string = 'GLOBAL_AVG',
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    const score = calculateEcoScore(activities, weeklyTarget, userRegion);
    const user  = auth.currentUser;

    // Write score to user doc (source of truth)
    await updateDoc(doc(db, 'users', uid), {
      weeklyEcoScore:          score,
      weeklyEcoScoreUpdatedAt: new Date().toISOString(),
    });

    // Mirror public fields to /leaderboard for cross-user queries
    // setDoc with merge so showOnLeaderboard (written by settings) is preserved
    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'leaderboard', uid), {
      weeklyEcoScore: score,
      displayName:    user?.displayName ?? null,
      photoURL:       user?.photoURL ?? null,
      updatedAt:      new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    // Non-critical — leaderboard will show stale value until next save
    console.warn('persistWeeklyEcoScore failed:', e);
  }
}