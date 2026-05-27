// onboarding/3.tsx — Track & Earn (activities + gamification overview)
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { useEffect, useRef } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';
import { FontAwesome6 } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const CATEGORIES = [
  { icon: 'person-walking', color: '#4CAF50', name: 'Walking',     tokens: '1 token / 100 steps' },
  { icon: 'person-running', color: '#FF7043', name: 'Running',     tokens: '15 tokens / km' },
  { icon: 'bicycle',        color: '#29B6F6', name: 'Cycling',     tokens: '10 tokens / km' },
  { icon: 'bolt',           color: '#FFC107', name: 'Electricity', tokens: '5 tokens / kWh saved' },
  { icon: 'droplet',        color: '#26C6DA', name: 'Water',       tokens: '1 token / 10 L saved' },
];

// Must exactly match RANKS in src/utils/levelSystem.ts (MCO icons)
const RANKS = [
  { icon: 'seed',            color: '#A5D6A7', lib: 'MCO' },
  { icon: 'sprout',          color: '#66BB6A', lib: 'MCO' },
  { icon: 'tree',            color: '#43A047', lib: 'MCO' },
  { icon: 'pine-tree',       color: '#2E7D32', lib: 'MCO' },
  { icon: 'shield-half-full',color: '#00897B', lib: 'MCO' },
];

export default function OnboardingStep3() {
  const { scheme, colors } = useAppTheme();
  const isDark = scheme !== 'light';

  const bg           = isDark ? '#0B1E14' : '#F0F7F1';
  const headline     = isDark ? '#fff' : '#1B4332';
  const subhead      = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(27,67,50,0.55)';
  const cardBg       = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(27,67,50,0.05)';
  const cardBorder   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(27,67,50,0.08)';
  const catName      = isDark ? '#fff' : '#1B4332';
  const tokenText    = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(27,67,50,0.55)';
  const headTextColor = isDark ? '#8BE94F' : '#1B5E20';
  const streakBg     = isDark ? 'rgba(255,112,0,0.12)' : 'rgba(255,112,0,0.09)';

  const headerFade = useRef(new Animated.Value(0)).current;
  const catAnims   = useRef(CATEGORIES.map(() => new Animated.Value(0))).current;
  const bonusFade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    CATEGORIES.forEach((_, i) => {
      Animated.timing(catAnims[i], {
        toValue: 1, duration: 420, delay: 120 + i * 80, useNativeDriver: true,
      }).start();
    });
    Animated.timing(bonusFade, { toValue: 1, duration: 500, delay: 650, useNativeDriver: true }).start();
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={[styles.container, { backgroundColor: bg }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.orbBR, { backgroundColor: isDark ? '#2E7D3218' : '#2E7D3212' }]} />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <Text style={[styles.eyebrow, { color: headTextColor }]}>TRACK & EARN</Text>
        <Text style={[styles.headline, { color: headline }]}>Five categories,{'\n'}real CO₂ savings</Text>
        <Text style={[styles.subhead, { color: subhead }]}>
          Each activity earns EcoTokens and saves measurable CO₂.
        </Text>
      </Animated.View>

      {/* Category rows */}
      <View style={styles.catList}>
        {CATEGORIES.map((cat, i) => (
          <Animated.View
            key={cat.name}
            style={[
              styles.catRow,
              { backgroundColor: cardBg, borderColor: cardBorder },
              {
                opacity: catAnims[i],
                transform: [{ translateY: catAnims[i].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
              },
            ]}
          >
            <View style={[styles.catIcon, { backgroundColor: cat.color + '20', borderColor: cat.color + '40' }]}>
              <FontAwesome6 name={cat.icon as any} size={17} color={cat.color} />
            </View>
            <Text style={[styles.catName, { color: catName }]}>{cat.name}</Text>
            <View style={[styles.tokenPill, { backgroundColor: cat.color + '20' }]}>
              <FontAwesome6 name="leaf" size={9} color={cat.color} style={{ marginRight: 3 }} />
              <Text style={[styles.tokenPillText, { color: cat.color }]}>{cat.tokens}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Streak & leveling teaser */}
      <Animated.View style={[styles.bonusBox, { opacity: bonusFade, backgroundColor: streakBg, borderColor: isDark ? 'rgba(255,112,0,0.25)' : 'rgba(255,112,0,0.2)' }]}>
        <View style={styles.bonusRow}>
          <FontAwesome6 name="fire" size={15} color="#FF7043" />
          <Text style={[styles.bonusTitle, { color: headline }]}>Streak multiplier</Text>
        </View>
        <Text style={[styles.bonusDesc, { color: tokenText }]}>
          Log every day to build a streak. Every 5-day streak adds +10% tokens (up to +50%). Climb 8 nature-themed ranks from Seed to Eco Legend.
        </Text>
        <View style={styles.rankRow}>
          {RANKS.map((r, i) => (
            <View key={i} style={[styles.rankChip, { backgroundColor: r.color + '20' }]}>
              <MaterialCommunityIcons name={r.icon as any} size={14} color={r.color} />
            </View>
          ))}
          <Text style={[styles.rankMore, { color: tokenText }]}>+3 more</Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 32 },
  orbBR:     { position: 'absolute', bottom: 40, right: -60, width: 200, height: 200, borderRadius: 100 },

  header:   { marginBottom: 20, gap: 6 },
  eyebrow:  { fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.8 },
  headline: { fontSize: 32, fontWeight: '800', lineHeight: 40, letterSpacing: -0.5 },
  subhead:  { fontSize: 14, lineHeight: 20, marginTop: 2 },

  catList: { gap: 8, marginBottom: 16 },
  catRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12, borderWidth: 1 },
  catIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  catName: { flex: 1, fontSize: 14, fontWeight: '600' },
  tokenPill:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  tokenPillText: { fontSize: 11, fontWeight: '700' },

  bonusBox:  { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  bonusRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bonusTitle: { fontSize: 15, fontWeight: '700' },
  bonusDesc:  { fontSize: 13, lineHeight: 19 },
  rankRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  rankChip:  { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rankMore:  { fontSize: 12, marginLeft: 2 },
});