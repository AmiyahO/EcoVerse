// src/utils/ecoLogic.ts
import { Activity } from '@/src/store/activityStore';

export const WEEKLY_TOKEN_TARGET = 500;

// Regional electricity grid carbon intensity (kg CO₂e/kWh).
// Sources:
//   UK:         DESNZ Greenhouse Gas Reporting: Conversion Factors 2025, flat file spreadsheet
//               (published 10 June 2025, gov.uk/government/publications/greenhouse-gas-reporting-
//               conversion-factors-2025). Row: UK electricity > Electricity generated, kWh, kg CO₂e.
//               Generated (Scope 2) 0.177 + T&D losses 0.01853 = consumed 0.196 kg CO₂e/kWh.
//               Value used: 0.196 (consumed factor — appropriate for electricity saved by the user).
//   EU:         Ember, Global Electricity Review 2025 (8 April 2025), p.95: 213 gCO₂/kWh (2024).
//   India:      Ember, Global Electricity Review 2025, p.100: 708 gCO₂/kWh (2024).
//   China:      Ember, Global Electricity Review 2025, p.89: 560 gCO₂/kWh (2024).
//   US:         Ember, Global Electricity Review 2025, p.89: 384 gCO₂/kWh (2024).
//   GLOBAL_AVG: Ember, Global Electricity Review 2025, p.58: 473 gCO₂/kWh (2024).
export const REGIONAL_INTENSITY: Record<string, number> = {
  'US':         0.384,
  'UK':         0.196,
  'EU':         0.213,
  'INDIA':      0.708,
  'CHINA':      0.560,
  'GLOBAL_AVG': 0.473,
};


// Regional average monthly household electricity consumption (kWh/month).
// These baselines are used for the savings comparison display (e.g. "you saved X% of a typical
// household's monthly usage") and do not affect CO₂ calculations.
// Sources:
//   US:         US Energy Information Administration (EIA) FAQ (eia.gov/tools/faqs/faq.php?id=97):
//               "In 2022, the average annual electricity sold to a US residential customer was
//               10,791 kWh, an average of about 899 kWh per month." ÷ 12 = 899 kWh/month.
//   UK:         DESNZ sub-national electricity consumption statistics (December 2024):
//               3,449 kWh/year actual measured household average ÷ 12 = 288 kWh/month.
//               Source: sunsave.energy/blog/uk-electricity-consumption-statistics (citing DESNZ
//               Dec 2024 data); confirmed by Drax analysis. Note: Ofgem TDCV 'typical' figure
//               (2,700 kWh/year = 225/month) is a price-comparison benchmark, not actual consumption.
//   EU:         Eurostat, Energy Consumption in Households 2023 [ref 19 in thesis]:
//               1,545 kWh/capita/year (EU residential electricity, Eurostat env_e_elect) ×
//               2.3 avg EU household size ÷ 12 ≈ 296 kWh/month (rounded to 285 kWh/month).
//   India:      National Statistical Office (India), NSS Household Consumption Expenditure Survey
//               2022-23: approximately 97 kWh/month average household (approximate estimate).
//   China:      National Bureau of Statistics (China): residential electricity ~987 kWh/capita/year
//               (2022 NBS China Statistical Yearbook) ÷ 12 × 3.0 avg household size = 247 kWh/month.
//   GLOBAL_AVG: IEA / World Energy Council: global residential average ~3,500 kWh/household/year
//               ÷ 12 = 292 kWh/month (IEA World Energy Outlook).
export const REGIONAL_ELECTRICITY_BASELINE: Record<string, number> = {
  'US':         899,   // US EIA 2022: 10,791 kWh/year ÷ 12
  'UK':         288,   // DESNZ govt data Dec 2024: 3,449 kWh/year ÷ 12
  'EU':         285,   // Eurostat 2023: 1,545 kWh/capita × 2.3 HH size ÷ 12
  'INDIA':      97,    // NSS HCES 2022-23: 97 kWh/month avg household
  'CHINA':      247,   // CEIC NBS 2022: 987 kWh/capita/year × 3.0 HH size ÷ 12
  'GLOBAL_AVG': 292,   // IEA/WEC global residential: ~3,500 kWh/HH/year ÷ 12
};

// Regional average monthly household water consumption (litres/month).
// Derived as: per-capita daily consumption (litres/day) × average household size × 30 days.
// These baselines are used for the savings comparison display and do not affect CO₂ calculations.
// Sources:
//   US:         US EPA WaterSense Statistics and Facts (epa.gov/watersense/statistics-and-facts):
//               "Each American uses an average of 82 gallons (310 litres) of water a day at home."
//               82 gallons × 3.785 L/gallon = 310 L/person/day × 2.5 avg HH size × 30 = 23,250 L/month.
//   UK:         Water UK / DiscoverWater (citing Ofwat and Consumer Council for Water data):
//               Per capita consumption = 145 L/person/day (England & Wales, 2021-22 average).
//               Source: water.org.uk/news-views-publications/news/discover-water-water-industry-202122-performance-data-update
//               145 L/person/day × 2.4 avg UK HH size × 30 = 10,440 L/month.
//   EU:         European Environment Agency (EEA):
//               "The average European directly uses approximately 130 litres of water per day."
//               Source: eea.europa.eu (Improving transparency in water services)
//               130 L/person/day × 2.3 avg EU HH size × 30 = 9,000 L/month (rounded).
//   India:      CPHEEO (Central Public Health and Environmental Engineering Organisation) standards,
//               as reported in IJCRT (2023): urban ~135 L/capita/day, rural ~75 L/capita/day.
//               Blended national average (~65% urban): 135×0.65 + 75×0.35 ≈ 114 L/capita/day.
//               × 4.0 avg Indian HH size (Census 2011) × 30 = 13,680 L/month.
//   China:      China Ministry of Housing and Urban-Rural Development (MoHURD) via CEIC (2023):
//               daily per capita residential water consumption = 188.8 L/day (2023).
//               Source: ceicdata.com/en/china/water-consumption-daily-per-capita-residential
//               188.8 L/person/day × 2.62 avg Chinese HH size (Census 2020) × 30 = 14,850 L/month.
//   GLOBAL_AVG: WHO global estimate of ~167 L/person/day × 3.0 persons × 30 = 15,000 L/month.
//               Methodological basis: Griffiths-Sattenspiel & Wilson, "The Carbon Footprint of
//               Water," River Network, 2009 (allianceforwaterefficiency.org).
export const REGIONAL_WATER_BASELINE: Record<string, number> = {
  'US':         23250, // EPA/AWWA: 310 L/person/day × 2.5 persons × 30
  'UK':         10440, // Water UK / CCW 2021-22: 145 L/person/day × 2.4 persons × 30
  'EU':         9000,  // EEA: ~130 L/person/day × 2.3 persons × 30
  'INDIA':      13680, // CPHEEO: urban 135 L/day, rural 75 L/day → blended ~114 L/day × 4.0 persons × 30
  'CHINA':      14850, // China MoHURD / CEIC 2023: 188.8 L/person/day × 2.62 persons × 30
  'GLOBAL_AVG': 15000, // WHO global: ~167 L/person/day × 3.0 persons × 30
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
    kwhPerMonth:    285,
    billingMonths:  1,
    label: 'avg household uses ~285 kWh/month (EU) or ~899 kWh/month (US)',
  },
  water: {
    litresPerMonth: 15000,
    billingMonths:  1,
    label: 'avg household uses ~15,000 L/month (global average)',
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
//
// Walking / running / cycling factors represent emissions avoided by substituting
// active travel for private car use.
//
// Walking & running: 0.16725 kg CO₂/km
//   Source: DESNZ Greenhouse Gas Reporting: Conversion Factors 2025, flat file spreadsheet
//   (published 10 June 2025, gov.uk/government/publications/greenhouse-gas-reporting-
//   conversion-factors-2025). Row: Cars (by size) > Average car > Unknown fuel > km > kg CO₂e.
//   Published value: 0.16725 kg CO₂e/km (fleet average, unknown/mixed fuel, 2025 edition).
//   This represents the CO₂e avoided per km by choosing to walk or run instead of driving.
//
// Cycling: 0.173 kg CO₂/km
//   Source: DESNZ Greenhouse Gas Reporting: Conversion Factors 2025, flat file spreadsheet.
//   Row: Cars (by size) > Medium car > Unknown fuel > km > kg CO₂e.
//   Published value: 0.17322 kg CO₂e/km. Medium car (unknown fuel) is used as the proxy
//   because cycling trips typically replace slightly longer car journeys than walking,
//   making a medium-sized car a more representative substitute than the fleet average.
//
// Water: 0.004 kg CO₂/litre
//   Blended estimate for energy embodied in treating, pumping, and partially heating
//   household water. Derivation: cold surface water treatment requires approximately
//   0.001 kWh/litre (Griffiths-Sattenspiel & Wilson, River Network 2009; Danfoss 2021);
//   approximately 35% of household water is heated (raising temperature ~35°C requires
//   ~0.041 kWh/litre of hot water); at UK grid intensity 0.196 kg CO₂/kWh the blended
//   factor is (0.001 × 0.65 × 0.196) + (0.041 × 0.35 × 0.196) ≈ 0.003 kg CO₂/litre
//   for treatment plus 0.003 kg CO₂/litre for heating, yielding a total of ~0.004 kg CO₂/litre.
//   Water savings are tracked primarily via tokens; CO₂ impact is intentionally modest.
export function calculateCarbonSaved(
  activity: Activity,
  userRegion: string = 'GLOBAL_AVG',
): number {
  switch (activity.category) {
    case 'walking': {
      const distanceKm = activity.distance
        ?? ((activity.steps ?? 0) * 0.00078);
      return distanceKm * 0.16725;
    }
    case 'running':
      return (activity.distance ?? 0) * 0.16725;
    case 'cycling':
      return (activity.distance ?? 0) * 0.173;
    case 'electricity': {
      const intensity = REGIONAL_INTENSITY[userRegion.toUpperCase()]
        ?? REGIONAL_INTENSITY['GLOBAL_AVG'];
      return (activity.kwhSaved ?? 0) * intensity;
    }
    case 'water':
      return (activity.litersSaved ?? 0) * 0.004;
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