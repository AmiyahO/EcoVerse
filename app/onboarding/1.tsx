// onboarding/1.tsx — Welcome
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { useEffect, useRef } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';
import { FontAwesome6 } from '@expo/vector-icons';

const { width: W } = Dimensions.get('window');

export default function OnboardingStep1() {
  const { scheme, colors } = useAppTheme();
  const isDark = scheme !== 'light';
  const bg         = isDark ? '#0B1E14' : '#F0F7F1';
  const headline   = isDark ? '#fff' : '#1B4332';
  const body       = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(27,67,50,0.65)';
  const pillBg     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(27,67,50,0.07)';
  const pillValue  = isDark ? '#fff' : '#1B4332';
  const pillLabel  = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(27,67,50,0.5)';
  const mottoColor = isDark ? '#8BE94F' : '#1B5E20';

  const fade   = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,   { toValue: 1, duration: 700, delay: 100, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 600, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Decorative orbs */}
      <View style={[styles.orbTopRight,   { backgroundColor: isDark ? '#2E7D3222' : '#2E7D3215' }]} />
      <View style={[styles.orbBottomLeft, { backgroundColor: isDark ? '#34C9C915' : '#66BB6A15' }]} />
      <View style={[styles.orbCenter,     { backgroundColor: isDark ? '#4CAF5010' : '#4CAF5008' }]} />

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { opacity: fade, transform: [{ translateY: slideY }] }]}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.tagline, { color: mottoColor }]}>TRACK YOUR IMPACT</Text>
      </Animated.View>

      {/* Text content */}
      <Animated.View style={[styles.copy, { opacity: fade, transform: [{ translateY: slideY }] }]}>
        <Text style={[styles.headlineText, { color: headline }]}>
          Your planet.{'\n'}Your choices.{'\n'}Your impact.
        </Text>
        <Text style={[styles.bodyText, { color: body }]}>
          EcoVerse helps you track eco-friendly activities, calculate real CO₂ savings,
          and build habits that matter — with streaks, challenges, and an AI coach to keep you going.
        </Text>
      </Animated.View>

      {/* Stats pills */}
      <Animated.View style={[styles.pills, { opacity: fade }]}>
        <StatPill icon="earth-americas" iconColor="#4CAF50" value="~4.7t" label="avg CO₂/year"  pillBg={pillBg} pillValue={pillValue} pillLabel={pillLabel} />
        <StatPill icon="person-walking"  iconColor="#29B6F6" value="300+"  label="kg saveable"   pillBg={pillBg} pillValue={pillValue} pillLabel={pillLabel} />
        <StatPill icon="trophy"          iconColor="#FFC107" value="8"     label="rank tiers"    pillBg={pillBg} pillValue={pillValue} pillLabel={pillLabel} />
      </Animated.View>
    </View>
  );
}

function StatPill({ icon, iconColor, value, label, pillBg, pillValue, pillLabel }: {
  icon: string; iconColor: string; value: string; label: string;
  pillBg: string; pillValue: string; pillLabel: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: pillBg }]}>
      <FontAwesome6 name={icon as any} size={18} color={iconColor} />
      <Text style={[styles.pillValueText, { color: pillValue }]}>{value}</Text>
      <Text style={[styles.pillLabelText, { color: pillLabel }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, paddingHorizontal: 28,
    paddingTop: 56, paddingBottom: 24, justifyContent: 'space-between',
  },
  orbTopRight:   { position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: 120 },
  orbBottomLeft: { position: 'absolute', bottom: 80, left: -80, width: 200, height: 200, borderRadius: 100 },
  orbCenter:     { position: 'absolute', top: '38%', left: '50%', marginLeft: -100, width: 200, height: 200, borderRadius: 100 },

  logoWrap:  { alignItems: 'center', marginTop: 8 },
  logo:      { width: 130, height: 130, marginBottom: 4 },
  tagline:   { fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.9 },

  copy:         { gap: 14 },
  headlineText: { fontSize: 36, fontWeight: '800', lineHeight: 44, letterSpacing: -0.5 },
  bodyText:     { fontSize: 15, lineHeight: 23 },

  pills:         { flexDirection: 'row', gap: 10 },
  pill:          { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  pillValueText: { fontSize: 17, fontWeight: '800' },
  pillLabelText: { fontSize: 11, textAlign: 'center' },
});