// src/services/aiSuggestions.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORY_COLORS } from '../utils/ecoLogic';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const CACHE_KEY    = 'eco_ai_suggestions';
const COOLDOWN_KEY = 'eco_ai_cooldown'; // epoch ms when cooldown expires
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const COOLDOWN_MS  = 60 * 60 * 1000;       // 60 min after a 429

export interface AISuggestion {
  icon: string;
  title: string;
  body: string;
}

// Maps FA6 icon name → colour, using your existing CATEGORY_COLORS where possible
export const ICON_COLOR_MAP: Record<string, string> = {
  'person-walking': CATEGORY_COLORS.walking,     // green
  'person-running': CATEGORY_COLORS.running,     // orange-red
  'bicycle':        CATEGORY_COLORS.cycling,     // sky blue
  'bolt':           CATEGORY_COLORS.electricity, // amber
  'droplet':        CATEGORY_COLORS.water,       // cyan
  'leaf':           CATEGORY_COLORS.walking,     // green fallback
  'fire':           '#FF7043',
  'sun':            '#FFC107',
  'recycle':        '#4CAF50',
  'house':          '#26C6DA',
};

interface CacheEntry {
  tips: AISuggestion[];
  generatedAt: number;
  dataHash: string;
}

export interface ActivitySummary {
  topCategory: string;
  topCategoryCount: number;
  totalActivities: number;
  weeklyTokens: number;
  weeklyCO2: number;
  activeDaysThisWeek: number;
  streak: number;
  missingCategories: string[];
  categoryCounts: Record<string, number>;
}

function hashActivityData(s: ActivitySummary): string {
  return `${s.topCategory}-${s.totalActivities}-${s.weeklyTokens}-${s.missingCategories.join(',')}`;
}

export function buildActivitySummary(
  activities: any[],
  weeklyTokens: number,
  weeklyCO2: number,
  activeDaysThisWeek: number,
  streak: number,
): ActivitySummary {
  const ALL_CATEGORIES = ['walking', 'running', 'cycling', 'electricity', 'water'];
  const categoryCounts: Record<string, number> = {};
  activities.forEach(a => {
    categoryCounts[a.category] = (categoryCounts[a.category] ?? 0) + 1;
  });
  const sorted = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  const loggedCategories = new Set(activities.map(a => a.category));
  return {
    topCategory: sorted[0]?.[0] ?? 'none',
    topCategoryCount: sorted[0]?.[1] ?? 0,
    totalActivities: activities.length,
    weeklyTokens,
    weeklyCO2,
    activeDaysThisWeek,
    streak,
    missingCategories: ALL_CATEGORIES.filter(c => !loggedCategories.has(c)),
    categoryCounts,
  };
}

// ── Prompt ────────────────────────────────────────────────────────────────────
function buildPrompt(s: ActivitySummary): string {
  const ICON_FOR_CATEGORY: Record<string, string> = {
    walking: 'person-walking', running: 'person-running', cycling: 'bicycle',
    electricity: 'bolt', water: 'droplet',
  };
  const ALL_ICONS = ['person-walking', 'person-running', 'bicycle', 'bolt', 'droplet', 'leaf', 'fire', 'recycle', 'house', 'sun'];

  const breakdownLines = Object.entries(s.categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, n]) => `  • ${cat}: ${n} session${n !== 1 ? 's' : ''} logged`)
    .join('\n') || '  • No activities logged yet';

  const missingLine = s.missingCategories.length > 0
    ? `Categories never tried: ${s.missingCategories.join(', ')}`
    : 'All categories tracked — great variety!';

  const topIcon = ICON_FOR_CATEGORY[s.topCategory] ?? 'leaf';

  return `You are a friendly eco-coach inside EcoVerse, a sustainability tracking app. Write exactly 3 personalised eco tips for this user.

USER STATS
- Most logged activity: ${s.topCategory} (${s.topCategoryCount} sessions total — this is a past count, NOT a target)
- All logged activities:\n${breakdownLines}
- CO₂ saved this week: ${s.weeklyCO2.toFixed(2)} kg
- Active days this week: ${s.activeDaysThisWeek}/7
- Current streak: ${s.streak} day${s.streak !== 1 ? 's' : ''}
- Weekly tokens: ${s.weeklyTokens}
- ${missingLine}

RULES — read carefully before writing:
1. Tip 1 MUST be about "${s.topCategory}" — but focus on the ENVIRONMENTAL IMPACT of this habit (e.g. CO₂ saved vs driving, how it helps), NOT on encouraging them to do it more or log more sessions. They already do it regularly.
2. Tip 2: If they have untried categories, gently suggest one and explain its eco benefit. If all categories are tracked, give a consistency or variety insight.
3. Tip 3: A specific, practical eco tip unrelated to their tracked activities — e.g. food waste, home energy, recycling, seasonal habits. Make it feel fresh.
4. Each tip body: 1-2 sentences MAX. No fluff. Specific and encouraging.
5. Titles: 3-5 words. No colons.
6. NEVER say "log more", "walk more", "try to do X more times", or reference the session count as a goal.
7. Plain text only — no markdown, no asterisks, no bullet points.
8. Use icon "${topIcon}" for Tip 1. Choose the best icon for Tips 2 and 3 from: ${ALL_ICONS.join(', ')}.
9. Respond with ONLY a JSON array. No preamble, no explanation, no code fences.

OUTPUT (copy this structure exactly):
[
  {"icon": "${topIcon}", "title": "...", "body": "..."},
  {"icon": "...", "title": "...", "body": "..."},
  {"icon": "...", "title": "...", "body": "..."}
]`;
}

// ── Main fetch ────────────────────────────────────────────────────────────────
export async function fetchAISuggestions(
  summary: ActivitySummary,
  forceRefresh = false,
): Promise<{ tips: AISuggestion[]; fromCache: boolean; rateLimited: boolean }> {
  const dataHash = hashActivityData(summary);

  // 1. Check 429 cooldown — skip API call entirely if cooling down
  if (!forceRefresh) {
    try {
      const cooldownRaw = await AsyncStorage.getItem(COOLDOWN_KEY);
      if (cooldownRaw) {
        const cooldownUntil = parseInt(cooldownRaw, 10);
        if (Date.now() < cooldownUntil) {
          const cachedTips = await getCachedTips();
          return { tips: cachedTips ?? getPlaceholderTips(summary), fromCache: !!cachedTips, rateLimited: true };
        }
      }
    } catch { /* ignore */ }
  }

  // 2. Check data cache
  if (!forceRefresh) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: CacheEntry = JSON.parse(raw);
        const age = Date.now() - cached.generatedAt;
        if (age < CACHE_TTL_MS && cached.dataHash === dataHash) {
          return { tips: cached.tips, fromCache: true, rateLimited: false };
        }
      }
    } catch { /* ignore */ }
  }

  if (!GEMINI_API_KEY) {
    return { tips: getPlaceholderTips(summary), fromCache: false, rateLimited: false };
  }

  // 3. Call Gemini
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(summary) }] }],
          generationConfig: { temperature: 0.75, maxOutputTokens: 512 },
        }),
      }
    );

    if (response.status === 429) {
      await AsyncStorage.setItem(COOLDOWN_KEY, String(Date.now() + COOLDOWN_MS));
      const cachedTips = await getCachedTips();
      return { tips: cachedTips ?? getPlaceholderTips(summary), fromCache: !!cachedTips, rateLimited: true };
    }

    if (!response.ok) {
      console.warn('Gemini error:', response.status);
      return { tips: getPlaceholderTips(summary), fromCache: false, rateLimited: false };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    const start = text.indexOf('[');
    const end = text.lastIndexOf(']') + 1;
    if (start === -1 || end === 0) throw new Error('No JSON array in response');

    const parsed = JSON.parse(text.substring(start, end));
    if (!Array.isArray(parsed) || parsed.length < 1) throw new Error('Empty array');

    const tips: AISuggestion[] = parsed.slice(0, 3).map((t: any) => ({
      icon: t.icon ?? 'leaf',
      title: t.title ?? 'Eco Tip',
      body: t.body ?? '',
    }));

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ tips, generatedAt: Date.now(), dataHash }));
    return { tips, fromCache: false, rateLimited: false };
  } catch (e) {
    console.warn('AI fetch failed:', e);
    return { tips: getPlaceholderTips(summary), fromCache: false, rateLimited: false };
  }
}

async function getCachedTips(): Promise<AISuggestion[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) return (JSON.parse(raw) as CacheEntry).tips;
  } catch { /* ignore */ }
  return null;
}

// ── Placeholder tips ─────────────────────────────────────────────────────────
// Data-aware, eco-impact framed — feel like "AI-lite" not error messages
function getPlaceholderTips(s: ActivitySummary): AISuggestion[] {
  const tips: AISuggestion[] = [];

  // Tip 1 — eco impact of top category, NOT "do more"
  const topTips: Record<string, AISuggestion> = {
    walking: {
      icon: 'person-walking',
      title: 'Swap a short car trip',
      body: 'Walking a 2km journey instead of driving saves roughly 0.4kg CO₂. Your walking habit is already making that switch.',
    },
    running: {
      icon: 'person-running',
      title: 'Running replaces drives',
      body: 'Every run you do instead of driving a similar distance cuts around 0.19kg CO₂ per km. That adds up fast over a month.',
    },
    cycling: {
      icon: 'bicycle',
      title: 'Cycling beats driving',
      body: 'Each 5km cycled instead of driven saves roughly 1.25kg CO₂. Your cycling sessions are one of the highest-impact habits you can build.',
    },
    electricity: {
      icon: 'bolt',
      title: 'Shift to off-peak hours',
      body: 'Running high-energy appliances (washing machine, dishwasher) during off-peak hours reduces grid demand and lowers your effective emissions.',
    },
    water: {
      icon: 'droplet',
      title: 'Cold wash saves energy',
      body: 'Washing at 30°C instead of 60°C uses 40% less energy. Your water awareness is already lowering your household footprint.',
    },
    none: {
      icon: 'leaf',
      title: 'Log your first activity',
      body: 'Start tracking today to see your CO₂ impact grow. Even one walk or a kWh saved makes a difference.',
    },
  };
  tips.push(topTips[s.topCategory] ?? topTips.none);

  // Tip 2 — missing category or consistency insight
  if (s.missingCategories.includes('electricity')) {
    tips.push({
      icon: 'bolt',
      title: 'Your biggest CO₂ lever',
      body: 'Household electricity is often the largest single source of home emissions. Logging your kWh savings reveals your true impact.',
    });
  } else if (s.missingCategories.includes('water')) {
    tips.push({
      icon: 'droplet',
      title: 'Water has a carbon cost',
      body: 'Pumping and treating water uses energy. A 5-minute shower reduction saves around 50 litres and its associated CO₂.',
    });
  } else if (s.missingCategories.includes('cycling')) {
    tips.push({
      icon: 'bicycle',
      title: 'One cycle trip matters',
      body: 'Cycling just once a week instead of driving can save over 5kg CO₂ per month — one of the easiest swaps available.',
    });
  } else {
    tips.push({
      icon: 'fire',
      title: s.activeDaysThisWeek >= 5 ? 'Great consistency' : 'Build your streak',
      body: s.activeDaysThisWeek >= 5
        ? `${s.activeDaysThisWeek} active days this week — you're in the top tier. Keep it going to hold your EcoScore consistency bonus.`
        : 'Logging on quieter days, even just one small action, keeps your streak alive and boosts your consistency score.',
    });
  }

  // Tip 3 — broader, rotates weekly so it never feels stale
  const weekIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % 4;
  const broader: AISuggestion[] = [
    { icon: 'house', title: 'Standby power adds up', body: 'Devices on standby can account for 10% of home electricity. Unplugging idle chargers and screens is a consistent small saving.' },
    { icon: 'recycle', title: 'Food waste emits CO₂', body: 'Around a third of all food produced is wasted, generating methane in landfill. Meal planning is one of the highest-impact household habits.' },
    { icon: 'sun', title: 'Use daylight first', body: 'Keeping blinds open and relying on natural light before switching on artificial lighting is a free, daily saving.' },
    { icon: 'house', title: 'Draught-proof your home', body: 'Sealing gaps around doors and windows can cut heating bills by up to 10%, reducing both cost and CO₂ year-round.' },
  ];
  tips.push(broader[weekIndex]);

  return tips;
}