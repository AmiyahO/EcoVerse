// onboarding/7.tsx — All Set
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useEffect, useRef } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';

const HIGHLIGHTS = [
  { icon: '📊', text: 'Track CO₂ savings in real time' },
  { icon: '🪙', text: 'Earn tokens for every eco action' },
  { icon: '🔥', text: 'Build streaks, hit weekly goals' },
  { icon: '📈', text: 'See your impact grow over time' },
];

export default function OnboardingStep7() {
  const { scheme } = useAppTheme();
  const isDark = scheme !== 'light';

  const bg          = isDark ? '#0B1E14' : '#F0F7F1';
  const headline    = isDark ? '#fff' : '#1B4332';
  const subhead     = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(27,67,50,0.6)';
  const rowBg       = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(27,67,50,0.06)';
  const rowBorder   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(27,67,50,0.10)';
  const rowText     = isDark ? 'rgba(255,255,255,0.85)' : '#1B4332';
  const footnote    = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(27,67,50,0.4)';
  const glowColor   = isDark ? '#2E7D3228' : '#A5D6A730';
  const mottoColor  = isDark ? '#8BE94F' : '#1B5E20';

  const fade      = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const anims     = useRef(HIGHLIGHTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    HIGHLIGHTS.forEach((_, i) => {
      Animated.timing(anims[i], { toValue: 1, duration: 400, delay: 300 + i * 100, useNativeDriver: true }).start();
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.glow, { backgroundColor: glowColor }]} />

      <Animated.View style={[styles.logoWrap, { opacity: fade, transform: [{ scale: scaleAnim }] }]}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.tagline, { color: mottoColor }]}>TRACK YOUR IMPACT</Text>
      </Animated.View>

      <Animated.View style={[{ opacity: fade }, styles.headlineWrap]}>
        <Text style={[styles.headline, { color: headline }]}>You're all set! 🎉</Text>
        <Text style={[styles.subhead, { color: subhead }]}>
          Start logging your first activity and watch your impact unfold.
        </Text>
      </Animated.View>

      <View style={styles.highlights}>
        {HIGHLIGHTS.map((h, i) => (
          <Animated.View
            key={i}
            style={[
              styles.highlightRow,
              { backgroundColor: rowBg, borderColor: rowBorder },
              {
                opacity: anims[i],
                transform: [{ translateX: anims[i].interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
              },
            ]}
          >
            <Text style={styles.highlightIcon}>{h.icon}</Text>
            <Text style={[styles.highlightText, { color: rowText }]}>{h.text}</Text>
          </Animated.View>
        ))}
      </View>

      <Animated.Text style={[styles.footnote, { opacity: fade, color: footnote }]}>
        Together we can make a difference 🌱
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 50, paddingBottom: 16, alignItems: 'center', justifyContent: 'space-between' },
  glow: { position: 'absolute', top: '20%', left: '50%', marginLeft: -120, width: 240, height: 240, borderRadius: 120 },
  logoWrap: { alignItems: 'center' },
  logo:     { width: 140, height: 140, marginBottom: -12 },
  tagline:  { fontSize: 11, fontWeight: '800', letterSpacing: 3, marginTop: 4, opacity: 0.85 },
  headlineWrap: { alignItems: 'center', gap: 10 },
  headline:     { fontSize: 34, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  subhead:      { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  highlights: { width: '100%', gap: 12 },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, borderWidth: 1 },
  highlightIcon: { fontSize: 22 },
  highlightText: { fontSize: 15, fontWeight: '500' },
  footnote: { fontSize: 13, textAlign: 'center' },
});