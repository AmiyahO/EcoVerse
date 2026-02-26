// ecoLogic.ts
import { Activity } from '@/src/store/activityStore';

export const WEEKLY_TOKEN_TARGET = 500;

// ── CO₂ grid intensity (kg CO₂ per kWh) ─────────────────────────────────────
// Sources: IEA 2023 Electricity Statistics; Our World in Data
export const REGIONAL_INTENSITY: Record<string, number> = {
  'US':         0.386, // US EPA eGRID 2022
  'UK':         0.193, // DESNZ 2023 (dropping fast with renewables)
  'EU':         0.276, // EEA EU-27 average 2022
  'INDIA':      0.713, // CEA CO₂ baseline 2022-23
  'CHINA':      0.581, // IEA 2022 (heavy coal mix)
  'GLOBAL_AVG': 0.475, // IEA world average 2022
};

// ── Household baselines ───────────────────────────────────────────────────────
// These are used when NO previous bill reading exists.
// Electricity: ~877 kWh/month (US EIA 2022 residential average).
//   Displayed to user as "per billing cycle" not "per week" since bills are monthly.
// Water: varies enormously by region; WHO/UN global average ~150 L/person/day.
//   Assuming 2.5-person household ≈ 375 L/day ≈ ~5,250 L/fortnight ≈ ~11,000 L/month.
//   Many utilities bill every 2 months (electricity) or quarterly (water), so we
//   expose billingMonths so the UI can scale the comparison to the actual period.
export const BASELINES = {
  electricity: {
    kwhPerMonth:    290,   // avg EU/UK residential; ~877 kWh/month in US, but we use the more conservative EU figure as a global default
    billingMonths:  1,     // default; user may receive bill every 2 months
    label: 'avg household uses ~290 kWh/month (EU/UK) or ~877 kWh/month (US)',
  },
  water: {
    litresPerMonth: 11000, // avg 2.5-person household; WHO ~150 L/person/day
    billingMonths:  1,     // utilities commonly bill every 1–4 months
    label: 'avg household uses ~11,000 L/month',
  },
};

// ── Category colours ──────────────────────────────────────────────────────────
export const CATEGORY_COLORS: Record<string, string> = {
  walking:     '#4CAF50',
  running:     '#FF7043',
  cycling:     '#29B6F6',
  electricity: '#FFC107',
  water:       '#26C6DA',
};

// ── Token calculation ─────────────────────────────────────────────────────────
// Deliberately generous to keep gamification motivating.
export function calculateTokens(activity: Activity): number {
  switch (activity.category) {
    case 'walking':
      // Primary: steps-based (1 token per 100 steps)
      if (activity.steps) return Math.floor(activity.steps / 100);
      // Fallback: distance → estimated steps at ~1,282 steps/km
      return Math.floor((activity.distance ?? 0) * 1282 / 100);

    case 'running':
      // 15 tokens per km (higher intensity than walking)
      return Math.floor((activity.distance ?? 0) * 15);

    case 'cycling':
      // 10 tokens per km
      return Math.floor((activity.distance ?? 0) * 10);

    case 'electricity':
      // 5 tokens per kWh saved
      return Math.floor((activity.kwhSaved ?? 0) * 5);

    case 'water':
      // 1 token per 10 L saved
      return Math.floor((activity.litersSaved ?? 0) / 10);

    default:
      return 0;
  }
}

// ── Streak-boosted token calculation ─────────────────────────────────────────
// +10% per 5-day streak, capped at +50% (at 25+ consecutive days)
export function calculateFinalTokens(activity: Activity, currentStreak: number): number {
  const base = calculateTokens(activity);
  const multiplier = 1 + Math.min(Math.floor(currentStreak / 5) * 0.1, 0.5);
  return Math.floor(base * multiplier);
}

// ── CO₂ saved calculation ─────────────────────────────────────────────────────
// All figures represent CO₂-equivalent emissions *avoided* compared to the
// most common alternative (car travel, grid electricity, etc.).
export function calculateCarbonSaved(
  activity: Activity,
  userRegion: string = 'GLOBAL_AVG',
): number {
  switch (activity.category) {

    case 'walking': {
      // Walking avoids ~0.192 kg CO₂/km vs average car (IPCC AR6 avg car 192g/km)
      const distanceKm = activity.distance
        ?? ((activity.steps ?? 0) * 0.00078); // 0.78 m/step → km
      return distanceKm * 0.192;
    }

    case 'running': {
      // Same avoided-car baseline as walking
      return (activity.distance ?? 0) * 0.192;
    }

    case 'cycling': {
      // Cycling avoids ~0.186 kg CO₂/km vs car (conservative; some studies 0.25)
      return (activity.distance ?? 0) * 0.186;
    }

    case 'electricity': {
      // Uses region-specific grid intensity
      const intensity = REGIONAL_INTENSITY[userRegion.toUpperCase()]
        ?? REGIONAL_INTENSITY['GLOBAL_AVG'];
      return (activity.kwhSaved ?? 0) * intensity;
    }

    case 'water': {
      // Water treatment + distribution: ~0.344 kg CO₂ per m³ (0.000344 kg/L)
      // Hot-water heating adds ~0.003 kg/L on top; we use combined ~0.003 kg/L
      // as a conservative, widely-cited figure (Water Research Foundation 2017)
      return (activity.litersSaved ?? 0) * 0.003;
    }

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

  // If today has no activity yet, allow streak to start from yesterday
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

export function getWeekCarbonComparison(
  activities: Activity[],
  userRegion: string = 'GLOBAL_AVG',
): { percentage: string; direction: 'up' | 'down' | 'neutral' } {
  const current  = getWeekRange(0);
  const previous = getWeekRange(1);

  const sum = (range: { start: Date; end: Date }) =>
    activities
      .filter(a => { const d = new Date(a.date); return d >= range.start && d <= range.end; })
      .reduce((s, a) => s + calculateCarbonSaved(a, userRegion), 0);

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