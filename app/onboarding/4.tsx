// onboarding/4.tsx — Tokens & Streaks
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { useEffect, useRef } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';
import { FontAwesome6 } from '@expo/vector-icons';

const EXAMPLES = [
  { activity: '30 min walk',       tokens: '+30',  co2: '0.6 kg CO₂' },
  { activity: '10 km cycle',       tokens: '+100', co2: '2.5 kg CO₂' },
  { activity: '100 kWh saved',     tokens: '+500', co2: '47.5 kg CO₂' },
  { activity: '500 L water saved', tokens: '+50',  co2: '1.5 kg CO₂' },
];

export default function OnboardingStep4() {
  const { scheme } = useAppTheme();
  const isDark   = scheme !== 'light';
  const bg       = isDark ? '#0B1E14' : '#F0F7F1';
  const cardBg   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(27,67,50,0.06)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(27,67,50,0.10)';
  const textColor  = isDark ? '#fff' : '#1B4332';
  const mutedText  = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(27,67,50,0.45)';
  const headTextColor = isDark ? '#8BE94F' : '#1B5E20';

  const fade      = useRef(new Animated.Value(0)).current;
  const anims     = useRef(EXAMPLES.map(() => new Animated.Value(0))).current;
  const tokenAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    Animated.timing(tokenAnim, { toValue: 1, duration: 900, delay: 200, useNativeDriver: false }).start();
    EXAMPLES.forEach((_, i) => {
      Animated.timing(anims[i], {
        toValue: 1, duration: 450, delay: 300 + i * 100, useNativeDriver: true,
      }).start();
    });
  }, []);

  const tokenCount = tokenAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 230] });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={[styles.container, { backgroundColor: bg }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.orbTL, { backgroundColor: isDark ? '#FFB30015' : '#FFB30020' }]} />

      <Animated.View style={[styles.header, { opacity: fade }]}>
        <Text style={[styles.eyebrow, { color: headTextColor }]}>TOKENS & IMPACT</Text>
        <Text style={[styles.headline, { color: textColor }]}>Real rewards for{'\n'}real savings</Text>
      </Animated.View>

      {/* Token counter hero */}
      <Animated.View style={[styles.tokenHero, { opacity: fade }]}>
        <View style={[styles.tokenCircle, {
          backgroundColor: isDark ? 'rgba(255,179,0,0.1)' : 'rgba(255,179,0,0.12)',
          borderColor: 'rgba(255,179,0,0.25)',
        }]}>
          {/* Leaf icon — matches the app's EcoToken icon exactly */}
          <FontAwesome6 name="leaf" size={28} color={isDark ? '#8BE94F' : '#2E7D32'} style={{ marginBottom: 4 }} />
          <AnimatedNumber anim={tokenCount} />
          <Text style={[styles.tokenLabel, { color: mutedText }]}>tokens this week</Text>
        </View>

        {/* Streak badge */}
        <View style={[styles.streakBadge, {
          backgroundColor: isDark ? 'rgba(255,112,0,0.15)' : 'rgba(255,112,0,0.12)',
          borderColor: 'rgba(255,112,0,0.3)',
        }]}>
          <FontAwesome6 name="fire" size={15} color="#FF7043" />
          <Text style={styles.streakText}>5 day streak  ×1.5 bonus</Text>
        </View>
      </Animated.View>

      {/* Example rows */}
      <View style={styles.examples}>
        <Text style={[styles.examplesLabel, { color: mutedText }]}>Example earnings</Text>
        {EXAMPLES.map((ex, i) => (
          <Animated.View
            key={i}
            style={[
              styles.exRow,
              { backgroundColor: cardBg, borderColor: cardBorder },
              {
                opacity: anims[i],
                transform: [{
                  translateX: anims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
                }],
              },
            ]}
          >
            <Text style={[styles.exActivity, { color: textColor }]}>{ex.activity}</Text>
            <Text style={[styles.exCo2, { color: mutedText }]}>{ex.co2}</Text>
            <View style={styles.exTokenPill}>
              <FontAwesome6 name="leaf" size={10} color="#4CAF50" style={{ marginRight: 3 }} />
              <Text style={styles.exTokenText}>{ex.tokens}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.View style={[styles.streakNote, {
        opacity: fade,
        backgroundColor: isDark ? 'rgba(255,112,0,0.08)' : 'rgba(255,112,0,0.07)',
        borderColor: isDark ? 'rgba(255,112,0,0.2)' : 'rgba(255,112,0,0.18)',
      }]}>
        <FontAwesome6 name="fire" size={14} color="#FF7043" />
        <Text style={[styles.note, { color: mutedText }]}>
          Streaks multiply your tokens. Log every day to keep your streak alive.
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

function AnimatedNumber({ anim }: { anim: Animated.AnimatedInterpolation<number> }) {
  const [display, setDisplay] = require('react').useState(0);
  require('react').useEffect(() => {
    const id = (anim as any).addListener(({ value }: any) => setDisplay(value));
    return () => (anim as any).removeListener(id);
  }, []);
  return <Text style={styles.tokenNumber}>{Math.round(display)}</Text>;
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 32 },
  orbTL:     { position: 'absolute', top: -50, left: -50, width: 180, height: 180, borderRadius: 90 },

  header:   { marginBottom: 24, gap: 6 },
  eyebrow:  { fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.8 },
  headline: { fontSize: 32, fontWeight: '800', lineHeight: 40, letterSpacing: -0.5 },

  tokenHero:   { alignItems: 'center', marginBottom: 24, gap: 10 },
  tokenCircle: { alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 40, width: '100%' },
  tokenNumber: { fontSize: 48, fontWeight: '900', color: '#FFB300', letterSpacing: -2 },
  tokenLabel:  { fontSize: 13, marginTop: 2 },

  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  streakText:  { color: '#FF7043', fontSize: 13, fontWeight: '600' },

  examples:      { gap: 8, marginBottom: 16 },
  examplesLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  exRow:         { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1 },
  exActivity:    { flex: 1, fontSize: 14, fontWeight: '500' },
  exCo2:         { fontSize: 12, marginRight: 10 },
  exTokenPill:   { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(76,175,80,0.2)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  exTokenText:   { color: '#4CAF50', fontWeight: '700', fontSize: 13 },

  streakNote: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 12 },
  note:       { fontSize: 13, lineHeight: 18, flex: 1 },
});