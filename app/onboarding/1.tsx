// onboarding/1.tsx — Welcome
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { useEffect, useRef } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';

const { width: W, height: H } = Dimensions.get('window');

export default function OnboardingStep1() {
  const { scheme } = useAppTheme();
  const isDark = scheme !== 'light';
  const bg        = isDark ? '#0B1E14' : '#F0F7F1';
  const headline  = isDark ? '#fff' : '#1B4332';
  const body      = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(27,67,50,0.65)';
  const pillBg    = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(27,67,50,0.07)';
  const pillValue = isDark ? '#fff' : '#1B4332';
  const pillLabel = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(27,67,50,0.5)';
  const orbColor1 = isDark ? '#2E7D3222' : '#2E7D3215';
  const orbColor2 = isDark ? '#34C9C915' : '#66BB6A15';
  // Darker motto in light mode — was too faint at #8BE94F on white
  const mottoColor = isDark ? '#8BE94F' : '#1B5E20';

  const fade   = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,   { toValue: 1, duration: 700, delay: 100, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 600, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.orbTopRight,   { backgroundColor: orbColor1 }]} />
      <View style={[styles.orbBottomLeft, { backgroundColor: orbColor2 }]} />

      <Animated.View style={[styles.logoWrap, { opacity: fade, transform: [{ translateY: slideY }] }]}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.tagline, { color: mottoColor }]}>TRACK YOUR IMPACT</Text>
      </Animated.View>

      <Animated.View style={[styles.copy, { opacity: fade, transform: [{ translateY: slideY }] }]}>
        <Text style={[styles.headlineText, { color: headline }]}>
          Your planet.{'\n'}Your choices.{'\n'}Your impact.
        </Text>
        <Text style={[styles.bodyText, { color: body }]}>
          EcoVerse helps you understand and reduce your carbon footprint — one activity at a time.
          Log what you do, see what it saves, and build habits that actually matter.
        </Text>
      </Animated.View>

      <Animated.View style={[styles.pills, { opacity: fade }]}>
        <StatPill emoji="🌍" value="~4.7t" label="avg CO₂/year" pillBg={pillBg} pillValue={pillValue} pillLabel={pillLabel} />
        <StatPill emoji="🚶" value="300+" label="kg saveable"   pillBg={pillBg} pillValue={pillValue} pillLabel={pillLabel} />
        <StatPill emoji="⚡" value="40%"  label="from energy"   pillBg={pillBg} pillValue={pillValue} pillLabel={pillLabel} />
      </Animated.View>
    </View>
  );
}

function StatPill({ emoji, value, label, pillBg, pillValue, pillLabel }: {
  emoji: string; value: string; label: string;
  pillBg: string; pillValue: string; pillLabel: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: pillBg }]}>
      <Text style={styles.pillEmoji}>{emoji}</Text>
      <Text style={[styles.pillValueText, { color: pillValue }]}>{value}</Text>
      <Text style={[styles.pillLabelText, { color: pillLabel }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, paddingHorizontal: 28,
    paddingTop: 60, paddingBottom: 24, justifyContent: 'space-between',
  },
  orbTopRight:   { position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: 120 },
  orbBottomLeft: { position: 'absolute', bottom: 80, left: -80, width: 200, height: 200, borderRadius: 100 },

  logoWrap: { alignItems: 'center', marginTop: 20 },
  logo:     { width: 130, height: 130, marginBottom: -8 },
  tagline:  { fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.9 },

  copy:         { gap: 16 },
  headlineText: { fontSize: 36, fontWeight: '800', lineHeight: 44, letterSpacing: -0.5 },
  bodyText:     { fontSize: 15, lineHeight: 23 },

  pills: { flexDirection: 'row', gap: 10 },
  pill:  { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  pillEmoji:     { fontSize: 20 },
  pillValueText: { fontSize: 17, fontWeight: '800' },
  pillLabelText: { fontSize: 11, textAlign: 'center' },
});