// src/utils/levelSystem.ts
// ─────────────────────────────────────────────────────────────────────────────
// Leveling system for EcoVerse.
// Lifetime tokens act as XP.  Formula: to reach level L you need 500 * L² tokens.
// Level 1 starts at 0.  This gives easy early gains and naturally steeper
// requirements at higher levels — consistent with Gemini doc's quadratic scaling.
// ─────────────────────────────────────────────────────────────────────────────

export interface LevelInfo {
  level: number;
  /** 0–1 progress toward the next level */
  progress: number;
  /** tokens still needed to reach next level */
  tokensToNext: number;
  /** tokens required to enter the current level */
  currentLevelTokens: number;
  /** tokens required to enter the next level */
  nextLevelTokens: number;
}

export interface RankInfo {
  name: string;
  /** MaterialCommunityIcons icon name */
  icon: string;
  /** accent colour for the rank badge */
  color: string;
  /** minimum level to hold this rank */
  minLevel: number;
}

// ─── Rank definitions ────────────────────────────────────────────────────────
// 8 tiers that grow progressively more "mature" — mirroring a tree's lifecycle.
// Colours move from fresh green → deep forest → golden legend.
export const RANKS: RankInfo[] = [
  { minLevel: 1,  name: 'Seed',         icon: 'seed',             color: '#A5D6A7' },
  { minLevel: 2,  name: 'Sprout',       icon: 'sprout',           color: '#66BB6A' },
  { minLevel: 4,  name: 'Sapling',      icon: 'tree',             color: '#43A047' },
  { minLevel: 7,  name: 'Grove Keeper', icon: 'pine-tree',        color: '#2E7D32' },
  { minLevel: 11, name: 'Eco Guardian', icon: 'shield-half-full', color: '#00897B' },
  { minLevel: 16, name: 'Oak Warden',   icon: 'shield-home',      color: '#5D4037' },
  { minLevel: 21, name: 'Forest Elder', icon: 'forest',           color: '#1B5E20' },
  { minLevel: 31, name: 'Eco Legend',   icon: 'shield-crown',     color: '#F9A825' },
];

// ─── Core formula ────────────────────────────────────────────────────────────

/** Tokens required to *enter* a given level (level 1 = 0 tokens). */
export function tokensForLevel(level: number): number {
  if (level <= 1) return 0;
  return 500 * Math.pow(level - 1, 2);
}

/**
 * Given a lifetime token total, return all info needed to render the
 * level badge and XP progress bar.
 */
export function getLevelInfo(totalTokens: number): LevelInfo {
  // Derive level from inverse of formula: level = floor(sqrt(tokens / 500)) + 1
  const level = Math.max(1, Math.floor(Math.sqrt(Math.max(0, totalTokens) / 500)) + 1);

  const currentLevelTokens = tokensForLevel(level);
  const nextLevelTokens    = tokensForLevel(level + 1);

  const range    = nextLevelTokens - currentLevelTokens;
  const earned   = Math.max(0, totalTokens - currentLevelTokens);
  const progress = range > 0 ? Math.min(earned / range, 1) : 1;

  return {
    level,
    progress,
    tokensToNext:        Math.max(0, nextLevelTokens - totalTokens),
    currentLevelTokens,
    nextLevelTokens,
  };
}

/**
 * Return the rank that corresponds to the given level.
 * Iterates from the highest rank downward so the first match wins.
 */
export function getRankInfo(level: number): RankInfo {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (level >= RANKS[i].minLevel) return RANKS[i];
  }
  return RANKS[0];
}

/**
 * Quick helper: did earning `earnedTokens` on top of `previousTotal`
 * cause a level-up?  Returns the new level if yes, null if no.
 */
export function checkLevelUp(
  previousTotal: number,
  earnedTokens: number,
): number | null {
  const oldLevel = getLevelInfo(previousTotal).level;
  const newLevel = getLevelInfo(previousTotal + earnedTokens).level;
  return newLevel > oldLevel ? newLevel : null;
}