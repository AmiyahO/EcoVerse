// src/services/aiSuggestions.ts
// Calls Gemini 1.5 Flash (free tier) to generate personalised eco tips.
// Tips are cached in AsyncStorage for 24h so we don't burn API calls on every render.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORY_COLORS } from '../utils/ecoLogic';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const CACHE_KEY = 'eco_ai_suggestions';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface AISuggestion {
  icon: string;       // FontAwesome6 icon name
  title: string;
  body: string;
}

interface CacheEntry {
  tips: AISuggestion[];
  generatedAt: number; // epoch ms
  dataHash: string;    // re-generate if activity data changes meaningfully
}

// Simple hash of the data so tips refresh when the user logs new activities
function hashActivityData(summary: ActivitySummary): string {
  return `${summary.topCategory}-${summary.totalActivities}-${summary.weeklyTokens}-${summary.missingCategories.join(',')}`;
}

interface ActivitySummary {
  topCategory: string;
  topCategoryCount: number;
  totalActivities: number;
  weeklyTokens: number;
  weeklyCO2: number;
  activeDaysThisWeek: number;
  streak: number;
  missingCategories: string[]; // categories never logged
  categoryCounts: Record<string, number>;
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
  const topCategory = sorted[0]?.[0] ?? 'none';
  const topCategoryCount = sorted[0]?.[1] ?? 0;

  const loggedCategories = new Set(activities.map(a => a.category));
  const missingCategories = ALL_CATEGORIES.filter(c => !loggedCategories.has(c));

  return {
    topCategory,
    topCategoryCount,
    totalActivities: activities.length,
    weeklyTokens,
    weeklyCO2,
    activeDaysThisWeek,
    streak,
    missingCategories,
    categoryCounts,
  };
}

function buildPrompt(summary: ActivitySummary): string {
  const categoryDescriptions: Record<string, string> = {
    walking: 'walking (steps/distance)',
    running: 'running',
    cycling: 'cycling',
    electricity: 'electricity saving (kWh)',
    water: 'water saving (litres)',
  };

  const categoryList = Object.entries(summary.categoryCounts)
    .map(([cat, count]) => `${cat}: ${count} times`)
    .join(', ') || 'no activities yet';

  const missing = summary.missingCategories.length > 0
    ? summary.missingCategories.map(c => categoryDescriptions[c]).join(', ')
    : 'none — great variety!';

  return `You are an eco-coach for EcoVerse, a sustainability tracking app. Generate exactly 3 short, personalised, actionable eco tips for this user based on their data.

User's activity data (last 30 days):
- Top activity: ${summary.topCategory} (logged ${summary.topCategoryCount} times)
- Activity breakdown: ${categoryList}
- Weekly tokens earned: ${summary.weeklyTokens}
- CO₂ saved this week: ${summary.weeklyCO2.toFixed(2)} kg
- Active days this week: ${summary.activeDaysThisWeek}/7
- Current streak: ${summary.streak} days
- Categories never tried: ${missing}

Rules:
1. Keep each tip to 1-2 short sentences max. Be specific and encouraging, not generic.
2. At least one tip should relate to their most common activity.
3. If they have missing categories, suggest trying one naturally.
4. DO NOT use markdown, asterisks, bullet points, or formatting — plain text only.
5. Respond ONLY with a JSON array of exactly 3 objects in a flat arrray. No preamble, no explanation.
6. Use ONLY the following JSON structure: [{"icon": "...", "title": "...", "body": "..."}]

JSON format:
[
  { "icon": "person-walking", "title": "Short title (3-5 words)", "body": "One or two encouraging sentences." },
  { "icon": "bolt", "title": "Short title", "body": "One or two encouraging sentences." },
  { "icon": "leaf", "title": "Short title", "body": "One or two encouraging sentences." }
]

Use only these icon names: person-walking, person-running, bicycle, bolt, droplet, leaf, fire, sun, recycle, house.`;
}

export async function fetchAISuggestions(
  summary: ActivitySummary,
  forceRefresh = false,
): Promise<AISuggestion[]> {
  const dataHash = hashActivityData(summary);

  // Check cache
  if (!forceRefresh) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: CacheEntry = JSON.parse(raw);
        const age = Date.now() - cached.generatedAt;
        // Use cache if < 24h old AND data hasn't changed meaningfully
        if (age < CACHE_TTL_MS && cached.dataHash === dataHash) {
          return cached.tips;
        }
      }
    } catch {
      // Cache read failed — proceed to fetch
    }
  }

  if (!GEMINI_API_KEY) {
    console.warn('EXPO_PUBLIC_GEMINI_API_KEY not set — returning placeholder tips');
    return getPlaceholderTips(summary);
  }

  const prompt = buildPrompt(summary);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.json();

    // Check if it's just a rate limit (Quota)
    if (response.status === 429) {
      console.warn('Gemini quota reached. Using placeholders.'); 
      // console.warn shows a small yellow toast, NOT a red screen.
    } else {
      // For other errors, maybe keep a log for yourself
      console.log('AI Fetch Issue:', errorBody.error?.message);
    }
    return getPlaceholderTips(summary);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  let tips: AISuggestion[] = [];
  try {
    // 1. Find the first '[' and the last ']' to extract ONLY the array
    const startBracket = text.indexOf('[');
    const endBracket = text.lastIndexOf(']') + 1;
    
    if (startBracket === -1 || endBracket === 0) {
      throw new Error('No JSON array found in response');
    }

    const jsonString = text.substring(startBracket, endBracket);
    const parsed = JSON.parse(jsonString);

    if (Array.isArray(parsed) && parsed.length >= 1) {
      tips = parsed.slice(0, 3).map((t: any) => ({
        icon: t.icon ?? 'leaf',
        title: t.title ?? 'Eco Tip',
        body: t.body ?? '',
      }));
    }
  } catch (e) {
    console.warn('Failed to parse Gemini response. Raw text:', text);
    return getPlaceholderTips(summary);
  }

  // Write to cache
  try {
    const entry: CacheEntry = { tips, generatedAt: Date.now(), dataHash };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Cache write failed — non-fatal
  }

  return tips;
}

// Shown before API key is configured or if the API call fails
function getPlaceholderTips(summary: ActivitySummary): AISuggestion[] {
  const tips: AISuggestion[] = [];

  if (summary.topCategory === 'walking' || summary.topCategory === 'running') {
    tips.push({
      icon: 'person-walking',
      title: 'Keep up the pace',
      body: `You've logged ${summary.topCategoryCount} ${summary.topCategory} activities — great habit! Try adding cycling for extra variety.`,
    });
  } else if (summary.topCategory === 'cycling') {
    tips.push({
      icon: 'bicycle',
      title: 'Cycling champion',
      body: `${summary.topCategoryCount} cycling sessions logged. Consider tracking your electricity savings too for a fuller picture.`,
    });
  } else {
    tips.push({
      icon: 'leaf',
      title: 'Build your streak',
      body: 'Log at least one activity every day this week to build your streak and boost your EcoScore.',
    });
  }

  if (summary.missingCategories.includes('electricity')) {
    tips.push({
      icon: 'bolt',
      title: 'Track energy savings',
      body: 'Electricity savings often have the biggest CO₂ impact. Log your next bill to see how much you\'re saving.',
    });
  } else {
    tips.push({
      icon: 'bolt',
      title: 'Energy impact',
      body: 'Your electricity tracking is contributing to your CO₂ savings. Try reducing usage during peak hours for extra impact.',
    });
  }

  if (summary.missingCategories.includes('water')) {
    tips.push({
      icon: 'droplet',
      title: 'Add water savings',
      body: 'You haven\'t tried water conservation yet. Even small reductions in daily usage add up over a month.',
    });
  } else {
    tips.push({
      icon: 'droplet',
      title: 'Water consistency',
      body: `You're saving water regularly — great work. Set a weekly litre target to stay motivated.`,
    });
  }

  return tips;
}
