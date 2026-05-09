// app/leveling.tsx
// Accessed from profile.tsx via router.push('/leveling')
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { getLevelInfo, getRankInfo, RANKS, tokensForLevel } from '@/src/utils/levelSystem';

const { width: SCREEN_W } = Dimensions.get('window');

// ── All rank tiers with token ranges ─────────────────────────────────────────
// Derived from RANKS so this file stays in sync with levelSystem.ts
function buildTierRows() {
  return RANKS.map((rank, i) => {
    const nextRank = RANKS[i + 1];
    const minTokens = tokensForLevel(rank.minLevel);
    const maxTokens = nextRank ? tokensForLevel(nextRank.minLevel) - 1 : null;
    const maxLevel  = nextRank ? nextRank.minLevel - 1 : null;
    return { rank, minLevel: rank.minLevel, maxLevel, minTokens, maxTokens };
  });
}

// ── Animated XP bar ───────────────────────────────────────────────────────────
function XPBar({ progress, color }: { progress: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: progress, duration: 900, useNativeDriver: false }).start();
  }, [progress]);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={xpStyles.track}>
      <Animated.View style={[xpStyles.fill, { width, backgroundColor: color }]} />
    </View>
  );
}

const xpStyles = StyleSheet.create({
  track: { height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.08)' },
  fill:  { height: '100%', borderRadius: 5 },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function LevelingScreen() {
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';
  const userProfile = useActivityStore(s => s.userProfile);

  const totalTokens = userProfile?.tokens ?? 0;
  const { level, progress, tokensToNext, nextLevelTokens } = getLevelInfo(totalTokens);
  const rank = getRankInfo(level);
  const tierRows = buildTierRows();

  // Entry animation
  const heroAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(heroAnim, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }).start();
  }, []);

  const heroScale = heroAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const heroOpacity = heroAnim;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Back button */}
      <View style={styles.navRow}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={14} color={colors.text} />
          <Text style={[styles.backLabel, { color: colors.text }]}>Profile</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero card ───────────────────────────────────────────────────── */}
        <Animated.View style={{ transform: [{ scale: heroScale }], opacity: heroOpacity }}>
          <LinearGradient
            colors={isDark
              ? [rank.color + 'AA', rank.color + '33', colors.surface]
              : [rank.color + '55', rank.color + '18', colors.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { borderColor: rank.color + '40' }]}
          >
            {/* Large emoji */}
            <Text style={styles.rankEmoji}>{rank.emoji}</Text>

            {/* Rank + level */}
            <View style={[styles.rankBadge, { backgroundColor: rank.color + '25', borderColor: rank.color + '60' }]}>
              <Text style={[styles.rankBadgeText, { color: rank.color }]}>{rank.name}</Text>
            </View>

            <Text style={[styles.levelBig, { color: colors.text }]}>Level {level}</Text>
            <Text style={[styles.tokenCount, { color: rank.color }]}>
              {totalTokens.toLocaleString()} tokens
            </Text>

            {/* XP bar */}
            <View style={styles.xpSection}>
              <XPBar progress={progress} color={rank.color} />
              <View style={styles.xpLabels}>
                <Text style={[styles.xpLabel, { color: colors.text }]}>
                  {tokensToNext.toLocaleString()} to Level {level + 1}
                </Text>
                <Text style={[styles.xpPct, { color: rank.color }]}>
                  {Math.round(progress * 100)}%
                </Text>
              </View>
            </View>

            {/* Next rank teaser */}
            {(() => {
              const nextRank = getRankInfo(level + 1);
              if (nextRank.name === rank.name) return null;
              return (
                <View style={[styles.nextRankHint, { backgroundColor: nextRank.color + '15' }]}>
                  <Text style={styles.nextRankEmoji}>{nextRank.emoji}</Text>
                  <Text style={[styles.nextRankText, { color: nextRank.color }]}>
                    Next rank: {nextRank.name}
                  </Text>
                </View>
              );
            })()}
          </LinearGradient>
        </Animated.View>

        {/* ── Section label ───────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>All Ranks</Text>

        {/* ── Tier list ────────────────────────────────────────────────────── */}
        {tierRows.map((tier, idx) => {
          const isCurrentTier =
            level >= tier.minLevel && (tier.maxLevel === null || level <= tier.maxLevel);
          const isPastTier =
            tier.maxLevel !== null && level > tier.maxLevel;

          return (
            <TierRow
              key={tier.rank.name}
              tier={tier}
              isCurrentTier={isCurrentTier}
              isPastTier={isPastTier}
              currentLevel={level}
              totalTokens={totalTokens}
              colors={colors}
              isDark={isDark}
              progress={progress}
            />
          );
        })}

        {/* ── How levels work ─────────────────────────────────────────────── */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <View style={styles.infoHeader}>
            <FontAwesome6 name="circle-info" size={14} color={colors.tint} />
            <Text style={[styles.infoTitle, { color: colors.text }]}>How levels work</Text>
          </View>
          <Text style={[styles.infoBody, { color: colors.text }]}>
            Every EcoToken you earn counts as XP. Levels use quadratic scaling — early levels are easy, later ones reward long-term commitment.
          </Text>
          <View style={styles.formulaRow}>
            <Text style={[styles.formulaText, { color: colors.text }]}>
              Tokens to reach Level <Text style={{ color: colors.tint }}>L</Text>
              {'  =  '}
              <Text style={{ color: colors.tint }}>500 × (L − 1)²</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Tier row component ─────────────────────────────────────────────────────────
function TierRow({
  tier,
  isCurrentTier,
  isPastTier,
  currentLevel,
  totalTokens,
  colors,
  isDark,
  progress,
}: {
  tier: ReturnType<typeof buildTierRows>[number];
  isCurrentTier: boolean;
  isPastTier: boolean;
  currentLevel: number;
  totalTokens: number;
  colors: any;
  isDark: boolean;
  progress: number;
}) {
  const { rank, minLevel, maxLevel, minTokens, maxTokens } = tier;
  const levelRange = maxLevel
    ? minLevel === maxLevel ? `Lv ${minLevel}` : `Lv ${minLevel}–${maxLevel}`
    : `Lv ${minLevel}+`;

  const tokenRange = maxTokens !== null
    ? `${minTokens.toLocaleString()} – ${maxTokens.toLocaleString()}`
    : `${minTokens.toLocaleString()}+`;

  // Within this tier, how far along?
  let tierProgress = 0;
  if (isCurrentTier && maxTokens !== null) {
    tierProgress = Math.min((totalTokens - minTokens) / (maxTokens - minTokens + 1), 1);
  } else if (isCurrentTier && maxTokens === null) {
    tierProgress = 1;
  } else if (isPastTier) {
    tierProgress = 1;
  }

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: tierProgress, duration: 700, useNativeDriver: false }).start();
  }, [tierProgress]);
  const barWidth = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[
      styles.tierRow,
      { backgroundColor: colors.surface },
      isCurrentTier && { borderWidth: 1.5, borderColor: rank.color + '60', backgroundColor: rank.color + '0A' },
    ]}>
      {/* Left accent line */}
      <View style={[styles.tierAccent, { backgroundColor: isCurrentTier || isPastTier ? rank.color : rank.color + '40' }]} />

      <View style={{ flex: 1 }}>
        {/* Top row */}
        <View style={styles.tierTopRow}>
          {/* Emoji + name */}
          <Text style={styles.tierEmoji}>{rank.emoji}</Text>
          <View style={{ flex: 1 }}>
            <View style={styles.tierNameRow}>
              <Text style={[
                styles.tierName,
                { color: isCurrentTier || isPastTier ? (isDark ? '#fff' : '#111') : colors.text },
                !isPastTier && !isCurrentTier && { opacity: 0.45 },
              ]}>
                {rank.name}
              </Text>
              {isCurrentTier && (
                <View style={[styles.currentPill, { backgroundColor: rank.color }]}>
                  <Text style={styles.currentPillText}>Current</Text>
                </View>
              )}
              {isPastTier && (
                <FontAwesome6 name="circle-check" size={13} color={rank.color} solid />
              )}
            </View>
            <Text style={[styles.tierMeta, { color: colors.text, opacity: isCurrentTier || isPastTier ? 0.6 : 0.35 }]}>
              {levelRange}  ·  {tokenRange} tokens
            </Text>
          </View>
        </View>

        {/* Progress bar — only show for current/past */}
        {(isCurrentTier || isPastTier) && (
          <View style={[styles.tierBarTrack, { backgroundColor: rank.color + '20' }]}>
            <Animated.View style={[styles.tierBarFill, { width: barWidth, backgroundColor: rank.color }]} />
          </View>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:         { flex: 1 },
  navRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 20 },
  backLabel:    { fontSize: 15, fontWeight: '500' },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },

  // Hero
  heroCard:      { borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, gap: 8 },
  rankEmoji:     { fontSize: 72, marginBottom: 4 },
  rankBadge:     { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  rankBadgeText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  levelBig:      { fontSize: 36, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  tokenCount:    { fontSize: 16, fontWeight: '700', marginBottom: 8 },

  xpSection:     { width: '100%', gap: 6, marginTop: 4 },
  xpLabels:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpLabel:       { fontSize: 12, opacity: 0.65 },
  xpPct:         { fontSize: 13, fontWeight: '800' },

  nextRankHint:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginTop: 6 },
  nextRankEmoji: { fontSize: 16 },
  nextRankText:  { fontSize: 12, fontWeight: '700' },

  // Section label
  sectionLabel:  { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, opacity: 0.5, textTransform: 'uppercase', paddingHorizontal: 2, marginTop: 6 },

  // Tier rows
  tierRow:       { flexDirection: 'row', borderRadius: 16, overflow: 'hidden', paddingVertical: 14, paddingRight: 14, paddingLeft: 0, gap: 12 },
  tierAccent:    { width: 4 },
  tierTopRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  tierEmoji:     { fontSize: 28 },
  tierNameRow:   { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  tierName:      { fontSize: 16, fontWeight: '700' },
  tierMeta:      { fontSize: 12, marginTop: 1 },
  currentPill:   { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  currentPillText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  tierBarTrack:  { height: 5, borderRadius: 3, overflow: 'hidden' },
  tierBarFill:   { height: '100%', borderRadius: 3 },

  // Info card
  infoCard:      { borderRadius: 16, padding: 16, gap: 8, marginTop: 6 },
  infoHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoTitle:     { fontSize: 14, fontWeight: '700' },
  infoBody:      { fontSize: 13, lineHeight: 20, opacity: 0.65 },
  formulaRow:    { padding: 10, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.04)' },
  formulaText:   { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
