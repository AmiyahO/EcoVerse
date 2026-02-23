// onboarding/4.tsx — Tokens & Streaks
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

const EXAMPLES = [
  { activity: '30 min walk',       tokens: '+30',   co2: '0.6 kg CO₂' },
  { activity: '10 km cycle',       tokens: '+50',   co2: '1.4 kg CO₂' },
  { activity: '100 kWh saved',     tokens: '+100',  co2: '23 kg CO₂'  },
  { activity: '500 L water saved', tokens: '+50',   co2: '0.5 kg CO₂' },
];

export default function OnboardingStep4() {
  const fade  = useRef(new Animated.Value(0)).current;
  const anims = useRef(EXAMPLES.map(() => new Animated.Value(0))).current;
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
    <View style={styles.container}>
      <View style={styles.orbTL} />

      <Animated.View style={[styles.header, { opacity: fade }]}>
        <Text style={styles.eyebrow}>TOKENS & IMPACT</Text>
        <Text style={styles.headline}>Real rewards for{'\n'}real savings</Text>
      </Animated.View>

      {/* Token counter hero */}
      <Animated.View style={[styles.tokenHero, { opacity: fade }]}>
        <View style={styles.tokenCircle}>
          <Text style={styles.tokenLeaf}>🪙</Text>
          <AnimatedNumber anim={tokenCount} />
          <Text style={styles.tokenLabel}>tokens this week</Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakFire}>🔥</Text>
          <Text style={styles.streakText}>5 day streak  ×1.5 bonus</Text>
        </View>
      </Animated.View>

      {/* Example rows */}
      <View style={styles.examples}>
        <Text style={styles.examplesLabel}>Example earnings</Text>
        {EXAMPLES.map((ex, i) => (
          <Animated.View
            key={i}
            style={[
              styles.exRow,
              {
                opacity: anims[i],
                transform: [{
                  translateX: anims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
                }],
              },
            ]}
          >
            <Text style={styles.exActivity}>{ex.activity}</Text>
            <Text style={styles.exCo2}>{ex.co2}</Text>
            <View style={styles.exTokenPill}>
              <Text style={styles.exTokenText}>{ex.tokens}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.Text style={[styles.note, { opacity: fade }]}>
        💡 Streaks multiply your tokens. Log every day to keep your streak alive.
      </Animated.Text>
    </View>
  );
}

function AnimatedNumber({ anim }: { anim: Animated.AnimatedInterpolation<number> }) {
  const [display, setDisplay] = useAnimatedValue(anim);
  return <Text style={styles.tokenNumber}>{Math.round(display)}</Text>;
}

function useAnimatedValue(anim: Animated.AnimatedInterpolation<number>): [number, (v: number) => void] {
  const [val, setVal] = require('react').useState(0);
  require('react').useEffect(() => {
    const id = (anim as any).addListener(({ value }: any) => setVal(value));
    return () => (anim as any).removeListener(id);
  }, []);
  return [val, setVal];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1E14',
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 16,
  },
  orbTL: {
    position: 'absolute', top: -50, left: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#FFB30015',
  },

  header:   { marginBottom: 24, gap: 6 },
  eyebrow:  { color: '#8BE94F', fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.8 },
  headline: { fontSize: 32, fontWeight: '800', color: '#fff', lineHeight: 40, letterSpacing: -0.5 },

  tokenHero: { alignItems: 'center', marginBottom: 24, gap: 10 },
  tokenCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,179,0,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,179,0,0.25)',
    borderRadius: 20, paddingVertical: 16, paddingHorizontal: 40,
    width: '100%',
  },
  tokenLeaf:   { fontSize: 28, marginBottom: 4 },
  tokenNumber: { fontSize: 48, fontWeight: '900', color: '#FFB300', letterSpacing: -2 },
  tokenLabel:  { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,112,0,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,112,0,0.3)',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
  },
  streakFire: { fontSize: 16 },
  streakText: { color: '#FF7043', fontSize: 13, fontWeight: '600' },

  examples:       { gap: 8 },
  examplesLabel:  { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  exRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  exActivity:  { flex: 1, fontSize: 14, color: '#fff', fontWeight: '500' },
  exCo2:       { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginRight: 10 },
  exTokenPill: { backgroundColor: 'rgba(76,175,80,0.2)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  exTokenText: { color: '#4CAF50', fontWeight: '700', fontSize: 13 },

  note: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 18, marginTop: 12, textAlign: 'center' },
});