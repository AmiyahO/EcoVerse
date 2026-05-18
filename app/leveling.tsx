// app/leveling.tsx  — accessed via router.push('/leveling') from profile.tsx
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6, MaterialCommunityIcons  } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { getLevelInfo, getRankInfo, RANKS, tokensForLevel } from '@/src/utils/levelSystem';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Build tier data ──────────────────────────────────────────────────────────
function buildTierRows() {
  return RANKS.map((rank, i) => {
    const next      = RANKS[i + 1];
    const minTokens = tokensForLevel(rank.minLevel);
    const maxTokens = next ? tokensForLevel(next.minLevel) - 1 : null;
    const maxLevel  = next ? next.minLevel - 1 : null;
    return { rank, minLevel: rank.minLevel, maxLevel, minTokens, maxTokens };
  });
}

// ── Animated fill bar ────────────────────────────────────────────────────────
function AnimBar({ pct, color, height = 8, delay = 0 }: { pct: number; color: string; height?: number; delay?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 950, delay, useNativeDriver: false }).start();
  }, [pct]);
  const w = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={[{ height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: color + '22' }]}>
      <Animated.View style={{ width: w, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

// ── Next rank preview pill ───────────────────────────────────────────────────
function NextRankPill({ currentLevel, colors, isDark }: { currentLevel: number; colors: any; isDark: boolean }) {
  const next    = getRankInfo(currentLevel + 1);
  const current = getRankInfo(currentLevel);
  if (next.name === current.name) return null;
  const minLv = RANKS.find(r => r.name === next.name)?.minLevel ?? currentLevel + 1;
  return (
    <View style={[nrS.pill, { backgroundColor: next.color + '18', borderColor: next.color + '40' }]}>
      <MaterialCommunityIcons name={next.icon as any} size={24} color={next.color} />
      <View style={{ flex: 1 }}>
        <Text style={[nrS.name, { color: next.color }]}>Next rank: {next.name}</Text>
        <Text style={[nrS.sub, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }]}>
          Reach Level {minLv}
        </Text>
      </View>
    </View>
  );
}
const nrS = StyleSheet.create({
  pill:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginTop: 4 },
  name:  { fontSize: 13, fontWeight: '800' },
  sub:   { fontSize: 11, marginTop: 1 },
});

// ── Tier card ────────────────────────────────────────────────────────────────
function TierCard({
  tier, isCurrentTier, isPastTier, totalTokens, colors, isDark, index,
}: {
  tier: ReturnType<typeof buildTierRows>[number];
  isCurrentTier: boolean; isPastTier: boolean;
  totalTokens: number; colors: any; isDark: boolean; index: number;
}) {
  const { rank, minLevel, maxLevel, minTokens, maxTokens } = tier;
  const isLocked = !isCurrentTier && !isPastTier;

  const levelRange = maxLevel
    ? minLevel === maxLevel ? `Level ${minLevel}` : `Levels ${minLevel}–${maxLevel}`
    : `Level ${minLevel}+`;

  const tokenRange = maxTokens !== null
    ? `${minTokens.toLocaleString()} – ${maxTokens.toLocaleString()}`
    : `${minTokens.toLocaleString()}+`;

  let tierPct = 0;
  if (isCurrentTier && maxTokens !== null)
    tierPct = Math.min((totalTokens - minTokens) / (maxTokens - minTokens + 1), 1);
  else if (isPastTier || (isCurrentTier && maxTokens === null))
    tierPct = 1;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 320, delay: index * 55, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 320, delay: index * 55, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={[
        tcS.card,
        { backgroundColor: colors.surface },
          isCurrentTier && { borderWidth: 1.5, borderColor: rank.color + '55', backgroundColor: isDark ? rank.color + '10' : rank.color + '15' },
      ]}>
        {/* Left colour strip */}
        <View style={[tcS.strip, { backgroundColor: isLocked ? rank.color + '25' : rank.color }]} />

        <View style={tcS.inner}>
          {/* Top row */}
          <View style={tcS.topRow}>
            <View style={[tcS.iconWrap, {
              backgroundColor: isLocked ? colors.surfaceMuted : rank.color + '20',
              borderColor:     isLocked ? colors.surfaceMuted : rank.color + '45',
            }]}>
              <MaterialCommunityIcons
                name={rank.icon as any}
                size={22}
                color={isLocked ? colors.text : rank.color}
                style={isLocked ? { opacity: 0.3 } : undefined}
              />
            </View>

            <View style={{ flex: 1 }}>
              <View style={tcS.nameRow}>
                <Text style={[tcS.name, { color: isLocked ? colors.text : (isDark ? '#fff' : '#111') }, isLocked && { opacity: 0.35 }]}>
                  {rank.name}
                </Text>
                {isCurrentTier && (
                  <LinearGradient colors={[rank.color, rank.color + 'CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={tcS.herePill}>
                    <Text style={tcS.herePillText}>You're here</Text>
                  </LinearGradient>
                )}
                {isPastTier && (
                  <View style={[tcS.donePill, { backgroundColor: rank.color + '20' }]}>
                    <FontAwesome6 name="circle-check" size={10} color={rank.color} solid />
                    <Text style={[tcS.donePillText, { color: rank.color }]}>Done</Text>
                  </View>
                )}
                {isLocked && <FontAwesome6 name="lock" size={10} color={colors.text} style={{ opacity: 0.25 }} />}
              </View>
              <Text style={[tcS.meta, { color: colors.text, opacity: isLocked ? 0.28 : 0.55 }]}>{levelRange}</Text>
              <Text style={[tcS.tokens, { color: isLocked ? colors.text : rank.color, opacity: isLocked ? 0.28 : 0.85 }]}>
                {tokenRange} tokens
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          {!isLocked && (
            <View style={tcS.barRow}>
              <View style={{ flex: 1 }}>
                <AnimBar pct={tierPct} color={rank.color} height={5} delay={index * 55 + 200} />
              </View>
              {isCurrentTier && maxTokens !== null && (
                <Text style={[tcS.pctLabel, { color: rank.color }]}>{Math.round(tierPct * 100)}%</Text>
              )}
              {isPastTier && (
                <Text style={[tcS.pctLabel, { color: rank.color }]}>100%</Text>
              )}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const tcS = StyleSheet.create({
  card:    { flexDirection: 'row', borderRadius: 16, overflow: 'hidden', marginBottom: 8 },
  strip:   { width: 4 },
  inner:   { flex: 1, padding: 14, gap: 10 },
  topRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap:{ width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  name:    { fontSize: 16, fontWeight: '800' },
  meta:    { fontSize: 12, marginTop: 1 },
  tokens:  { fontSize: 11, fontWeight: '600', marginTop: 1 },
  herePill:{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  herePillText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  donePill:{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  donePillText: { fontSize: 10, fontWeight: '700' },
  barRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pctLabel:{ fontSize: 11, fontWeight: '800', minWidth: 32, textAlign: 'right' },
});

// ── Main screen ──────────────────────────────────────────────────────────────
export default function LevelingScreen() {
  const { colors, scheme } = useAppTheme();
  const isDark      = scheme === 'dark';
  const userProfile = useActivityStore(s => s.userProfile);
  const totalTokens = userProfile?.tokens ?? 0;

  const { level, progress, tokensToNext } = getLevelInfo(totalTokens);
  const rank     = getRankInfo(level);
  const tierRows = buildTierRows();

  const completedCount = tierRows.filter(t => t.maxLevel !== null && level > t.maxLevel).length;

  // Hero entrance
  const heroScale   = useRef(new Animated.Value(0.9)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(heroScale,   { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }),
      Animated.timing(heroOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero card ─────────────────────────────────────────────────── */}
        <Animated.View style={{ transform: [{ scale: heroScale }], opacity: heroOpacity, marginBottom: 20 }}>
          <LinearGradient
            colors={isDark
              ? [rank.color + 'B5', rank.color + '45', colors.surface + 'EE']
              : ['#FFFFFF', rank.color + '55', rank.color + '35']}
            start={isDark ? { x: 0.1, y: 0 } : { x: 0, y: 0 }}
            end={isDark ? { x: 0.9, y: 1 }   : { x: 1, y: 1 }}
            style={[s.heroCard, { borderColor: isDark ? rank.color + '55' : rank.color + 'BB' }]}
          >
            {/* Decorative blobs */}
            <View style={[s.blob, { width: 170, height: 170, top: -55, right: -55, backgroundColor: rank.color + '14' }]} />
            <View style={[s.blob, { width: 90,  height: 90,  bottom: -25, left: 10,  backgroundColor: rank.color + '0E' }]} />

            {/* Floating back button — top-left of hero, no nav bar needed */}
            <Pressable
              style={[s.backBtn, { backgroundColor: rank.color + '28' }]}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <FontAwesome6 name="chevron-left" size={13} color={rank.color} />
            </Pressable>

            {/* Top: icon + level + rank */}
            <View style={s.heroTop}>
              <View style={[s.emojiFrame, { borderColor: rank.color + '55', backgroundColor: rank.color + '1E' }]}>
                <MaterialCommunityIcons name={rank.icon as any} size={34} color={rank.color} />
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={[s.heroLevel, { color: isDark ? '#fff' : '#111' }]}>Level {level}</Text>
                <View style={[s.rankTag, { backgroundColor: rank.color + '28', borderColor: rank.color + '55' }]}>
                  <Text style={[s.rankTagText, { color: rank.color }]}>{rank.name}</Text>
                </View>
              </View>
            </View>

            {/* Token count */}
            <Text style={[s.heroTokens, { color: rank.color }]}>
              {totalTokens.toLocaleString()} lifetime tokens
            </Text>

            {/* XP bar */}
            <View style={{ gap: 6 }}>
              <AnimBar pct={progress} color={rank.color} height={10} />
              <View style={s.xpLabels}>
                <Text style={[s.xpLeft, { color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)' }]}>
                  {tokensToNext.toLocaleString()} to Level {level + 1}
                </Text>
                <Text style={[s.xpRight, { color: rank.color }]}>{Math.round(progress * 100)}%</Text>
              </View>
            </View>

            {/* Stat chips */}
            <View style={[s.statsRow, { backgroundColor: isDark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.5)' }]}>
              {[
                { label: 'Level',     value: String(level) },
                { label: 'Rank tier', value: `${RANKS.indexOf(rank) + 1}/${RANKS.length}` },
                { label: 'Completed', value: `${completedCount} tier${completedCount !== 1 ? 's' : ''}` },
              ].map((stat, i) => (
                <React.Fragment key={stat.label}>
                  {i > 0 && <View style={[s.statDiv, { backgroundColor: rank.color + '30' }]} />}
                  <View style={s.statItem}>
                    <Text style={[s.statNum,   { color: rank.color }]}>{stat.value}</Text>
                    <Text style={[s.statLabel, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }]}>{stat.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            {/* Next rank teaser */}
            <NextRankPill currentLevel={level} colors={colors} isDark={isDark} />
          </LinearGradient>
        </Animated.View>

        {/* ── Section header ─────────────────────────────────────────────── */}
        <View style={s.sectionRow}>
          <Text style={[s.sectionLabel, { color: colors.text }]}>All Rank Tiers</Text>
          <Text style={[s.sectionSub, { color: colors.text }]}>{completedCount} of {RANKS.length} completed</Text>
        </View>

        {/* ── Tier cards ─────────────────────────────────────────────────── */}
        {tierRows.map((tier, idx) => {
          const isCurrentTier = level >= tier.minLevel && (tier.maxLevel === null || level <= tier.maxLevel);
          const isPastTier    = tier.maxLevel !== null && level > tier.maxLevel;
          return (
            <TierCard
              key={tier.rank.name}
              tier={tier}
              isCurrentTier={isCurrentTier}
              isPastTier={isPastTier}
              totalTokens={totalTokens}
              colors={colors}
              isDark={isDark}
              index={idx}
            />
          );
        })}

        {/* ── Formula card ───────────────────────────────────────────────── */}
        <View style={[s.infoCard, { backgroundColor: colors.surface }]}>
          <View style={s.infoHeader}>
            <View style={[s.infoIcon, { backgroundColor: colors.tint + '18' }]}>
              <FontAwesome6 name="circle-info" size={13} color={colors.tint} />
            </View>
            <Text style={[s.infoTitle, { color: colors.text }]}>How levels work</Text>
          </View>
          <Text style={[s.infoBody, { color: colors.text }]}>
            Every EcoToken you earn counts as XP. Levels use quadratic scaling — early ranks level up quickly, higher ranks reward long-term commitment.
          </Text>
          <View style={[s.formula, { backgroundColor: colors.tint + '10' }]}>
            <Text style={[s.formulaText, { color: colors.text }]}>
              Tokens to reach{' '}
              <Text style={{ color: colors.tint, fontWeight: '800' }}>Level L</Text>
              {'  =  '}
              <Text style={{ color: colors.tint, fontWeight: '800' }}>500 × (L−1)²</Text>
            </Text>
          </View>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1 },
  nav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 },
  backBtn:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  scroll:   { paddingHorizontal: 16, paddingBottom: 40 },

  heroCard:   { borderRadius: 24, padding: 20, borderWidth: 1.5, gap: 14, overflow: 'hidden' },
  blob:       { position: 'absolute', borderRadius: 999 },
  heroTop:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  emojiFrame: { width: 68, height: 68, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  heroLevel:  { fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  rankTag:    { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  rankTagText:{ fontSize: 13, fontWeight: '800' },
  heroTokens: { fontSize: 14, fontWeight: '700' },

  xpLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  xpLeft:   { fontSize: 12 },
  xpRight:  { fontSize: 13, fontWeight: '800' },

  statsRow:  { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12 },
  statItem:  { flex: 1, alignItems: 'center', gap: 2 },
  statNum:   { fontSize: 15, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '500' },
  statDiv:   { width: 1, height: 28 },

  sectionRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, opacity: 0.5, textTransform: 'uppercase' },
  sectionSub:   { fontSize: 11, opacity: 0.4 },

  infoCard:   { borderRadius: 16, padding: 16, gap: 10, marginTop: 8 },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoIcon:   { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  infoTitle:  { fontSize: 14, fontWeight: '700' },
  infoBody:   { fontSize: 13, lineHeight: 20, opacity: 0.65 },
  formula:    { padding: 12, borderRadius: 10 },
  formulaText:{ fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
});