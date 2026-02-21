// ecoLogic.ts
import { Activity } from '@/src/store/activityStore';

export const WEEKLY_TOKEN_TARGET = 500;

// Typical CO2 intensity (kg/kWh) by region
export const REGIONAL_INTENSITY: Record<string, number> = {
  'US': 0.385,
  'UK': 0.193,
  'EU': 0.230,
  'INDIA': 0.710,
  'CHINA': 0.550,
  'GLOBAL_AVG': 0.475, // Fallback
};

// Average household baselines (per week)
export const BASELINES = {
  electricity: { kwhPerWeek: 80, label: 'avg household uses ~80 kWh/week' },
  water: { litresPerWeek: 1400, label: 'avg person uses ~1,400 L/week' },
};

// calculate tokens based on activity type and metrics (Gamified)
export function calculateTokens(activity: Activity): number {
  switch (activity.category) {
    case 'walking':
      if (activity.steps) return Math.floor(activity.steps / 100);
      // distance-only: estimate steps from distance (1km ≈ 1282 steps)
      return Math.floor((activity.distance ?? 0) * 1282 / 100);

      case 'running':
      return Math.floor((activity.distance ?? 0) * 25);

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

// Streak-boosted token calculation
export function calculateFinalTokens(activity: Activity, currentStreak: number): number {
  const baseTokens = calculateTokens(activity);
  
  // +10% per 5-day streak, capped at +50%
  const multiplier = 1 + Math.min(Math.floor(currentStreak / 5) * 0.1, 0.5);
  
  return Math.floor(baseTokens * multiplier);
}

// CO₂ logic based on activity type and metrics
export function calculateCarbonSaved(
  activity: Activity, 
  userRegion: string = 'GLOBAL_AVG'
): number {
  switch (activity.category) {
    case 'walking': {
      const distanceKm = activity.distance ?? ((activity.steps ?? 0) * 0.78) / 1000;
      return distanceKm * 0.192;
    }

    case 'running': {
      return (activity.distance ?? 0) * 0.192;
    }

    case 'cycling': {
      return (activity.distance ?? 0) * 0.25;
    }

    case 'electricity':
      // Use the region-specific intensity or fallback to global average
      const intensity = REGIONAL_INTENSITY[userRegion.toUpperCase()] || REGIONAL_INTENSITY['GLOBAL_AVG'];
      return (activity.kwhSaved ?? 0) * intensity;

    case 'water':
      // 0.003 kg CO₂ per litre (pumping + heating baseline)
      return (activity.litersSaved ?? 0) * 0.003;

    default:
      return 0;
  }
}

// determine eco zone based on score
export function getEcoZone(score: number) {
  if (score < 50) 
    return { label: 'Red', message: 'Try logging more eco-friendly activities this week 🌱' };
  
  if (score < 75) 
    return { label: 'Yellow', message: 'You’re doing well — keep your streak going 💛' };
  
  return { label: 'Green', message: 'Amazing! You’re making a real impact 🌍' };
}

// calculate active days for streaks
export function getActiveDays(activities: { date: string }[]) {
  return new Set(
    activities.map(a =>
      new Date(a.date).toDateString()
    )
  );
}

// calculate current streak of consecutive active days
export function calculateStreak(activities: { date: string }[]) {
  if (activities.length === 0) return 0;

  const activeDays = getActiveDays(activities);
  let streak = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // If today has no activity, start checking from yesterday
  if (!activeDays.has(today.toDateString())) {
    today.setDate(today.getDate() - 1);
  }

  while (true) {
    const dayString = today.toDateString();
    if (activeDays.has(dayString)) {
      streak += 1;
      today.setDate(today.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

//
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

//
export function getWeekCarbonComparison(
  activities: Activity[],
  userRegion: string = 'GLOBAL_AVG'
): {
  percentage: string;
  direction: "up" | "down" | "neutral";
} {
  const current = getWeekRange(0);
  const previous = getWeekRange(1);

  const currentTotal = activities
    .filter(a => {
      const date = new Date(a.date);
      return date >= current.start && date <= current.end;
    })
    .reduce((sum, a) => sum + calculateCarbonSaved(a, userRegion), 0);

  const previousTotal = activities
    .filter(a => {
      const date = new Date(a.date);
      return date >= previous.start && date <= previous.end;
    })
    .reduce((sum, a) => sum + calculateCarbonSaved(a, userRegion), 0);

  if (previousTotal === 0 && currentTotal === 0) {
    return { percentage: "0", direction: "neutral" };
  }

  if (previousTotal === 0 && currentTotal > 0) {
    return { percentage: "100", direction: "up" };
  }

  const diff = ((currentTotal - previousTotal) / previousTotal) * 100;

  return {
    percentage: Math.abs(diff).toFixed(1),
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "neutral"
  };
}

export function getWeeklyCO2Data(
  activities: Activity[],
  userRegion: string = 'GLOBAL_AVG',
  weeksBack: number = 8
): { week: string; co2: number; weekStart: Date }[] {
  return Array.from({ length: weeksBack }, (_, i) => {
    const range = getWeekRange(weeksBack - 1 - i);
    const co2 = activities
      .filter(a => {
        const d = new Date(a.date);
        return d >= range.start && d <= range.end;
      })
      .reduce((sum, a) => sum + calculateCarbonSaved(a, userRegion), 0);

    // Short label e.g. "Feb 9"
    const label = range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { week: label, co2: parseFloat(co2.toFixed(3)), weekStart: range.start };
  });
}
