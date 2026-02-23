// onboarding/1.tsx — Welcome
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { useEffect, useRef } from 'react';

const { width: W, height: H } = Dimensions.get('window');

export default function OnboardingStep1() {
  const fade  = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,   { toValue: 1, duration: 700, delay: 100, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 600, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Background orbs */}
      <View style={styles.orbTopRight} />
      <View style={styles.orbBottomLeft} />

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { opacity: fade, transform: [{ translateY: slideY }] }]}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>TRACK YOUR IMPACT</Text>
      </Animated.View>

      {/* Main copy */}
      <Animated.View style={[styles.copy, { opacity: fade, transform: [{ translateY: slideY }] }]}>
        <Text style={styles.headline}>Your planet.{'\n'}Your choices.{'\n'}Your impact.</Text>
        <Text style={styles.body}>
          EcoVerse helps you understand and reduce your carbon footprint — one activity at a time.
          Log what you do, see what it saves, and build habits that actually matter.
        </Text>
      </Animated.View>

      {/* Stat pills */}
      <Animated.View style={[styles.pills, { opacity: fade }]}>
        <StatPill emoji="🌍" value="~4.7t" label="avg CO₂/year" />
        <StatPill emoji="🚶" value="300+" label="kg saveable" />
        <StatPill emoji="⚡" value="40%" label="from energy" />
      </Animated.View>
    </View>
  );
}

function StatPill({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillEmoji}>{emoji}</Text>
      <Text style={styles.pillValue}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1E14',
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  orbTopRight: {
    position: 'absolute', top: -60, right: -60,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: '#2E7D3222',
  },
  orbBottomLeft: {
    position: 'absolute', bottom: 80, left: -80,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#34C9C915',
  },

  logoWrap:  { alignItems: 'center', marginTop: 20 },
  logo:      { width: 130, height: 130 },
  tagline:   { color: '#8BE94F', fontSize: 11, fontWeight: '800', letterSpacing: 3, marginTop: 4, opacity: 0.8 },

  copy:      { gap: 16 },
  headline:  { fontSize: 36, fontWeight: '800', color: '#fff', lineHeight: 44, letterSpacing: -0.5 },
  body:      { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 23 },

  pills:     { flexDirection: 'row', gap: 10 },
  pill: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 12, alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
  },
  pillEmoji: { fontSize: 20 },
  pillValue: { fontSize: 17, fontWeight: '800', color: '#fff' },
  pillLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
});