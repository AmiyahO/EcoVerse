// onboarding/7.tsx — All Set
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useEffect, useRef } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';
import { FontAwesome6 } from '@expo/vector-icons';

const HIGHLIGHTS = [
  { icon: 'chart-line',     color: '#29B6F6', text: 'Track CO₂ savings in real time' },
  { icon: 'leaf',           color: '#4CAF50', text: 'Earn tokens and climb 8 rank tiers' },
  { icon: 'users',          color: '#FF7043', text: 'Weekly challenges and a global leaderboard' },
  { icon: 'wand-magic-sparkles', color: '#FFC107', text: 'AI-powered eco tips, personalised to you' },
];

export default function OnboardingStep7() {
  const { scheme } = useAppTheme();
  const isDark = scheme !== 'light';

  const bg        = isDark ? '#0B1E14' : '#F0F7F1';
  const headline  = isDark ? '#fff' : '#1B4332';
  const subhead   = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(27,67,50,0.6)';
  const rowBg     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(27,67,50,0.06)';
  const rowBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(27,67,50,0.10)';
  const rowText   = isDark ? 'rgba(255,255,255,0.85)' : '#1B4332';
  const footnote  = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(27,67,50,0.4)';
  const mottoColor = isDark ? '#8BE94F' : '#1B5E20';

  const fade      = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const anims     = useRef(HIGHLIGHTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,      { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    HIGHLIGHTS.forEach((_, i) => {
      Animated.timing(anims[i], { toValue: 1, duration: 400, delay: 300 + i * 100, useNativeDriver: true }).start();
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.glow, { backgroundColor: isDark ? '#2E7D3228' : '#A5D6A730' }]} />

      <Animated.View style={[styles.logoWrap, { opacity: fade, transform: [{ scale: scaleAnim }] }]}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.tagline, { color: mottoColor }]}>TRACK YOUR IMPACT</Text>
      </Animated.View>

      <Animated.View style={[{ opacity: fade }, styles.headlineWrap]}>
        <Text style={[styles.headline, { color: headline }]}>You're all set! 🌱</Text>
        <Text style={[styles.subhead, { color: subhead }]}>
          Start logging your first activity and watch your impact grow.
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
            <View style={[styles.highlightIconWrap, { backgroundColor: h.color + '20' }]}>
              <FontAwesome6 name={h.icon as any} size={16} color={h.color} />
            </View>
            <Text style={[styles.highlightText, { color: rowText }]}>{h.text}</Text>
          </Animated.View>
        ))}
      </View>

      <Animated.View style={[styles.footnoteRow, { opacity: fade }]}>
        <FontAwesome6 name="seedling" size={13} color={mottoColor} />
        <Text style={[styles.footnote, { color: footnote }]}>Together we can make a difference</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, paddingHorizontal: 28, paddingTop: 50, paddingBottom: 16, alignItems: 'center', justifyContent: 'space-between' },
  glow:         { position: 'absolute', top: '18%', left: '50%', marginLeft: -110, width: 220, height: 220, borderRadius: 110 },
  logoWrap:     { alignItems: 'center', gap: 8 },
  logo:         { width: 130, height: 130 },
  tagline:      { fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.85 },
  headlineWrap: { alignItems: 'center', gap: 10 },
  headline:     { fontSize: 34, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  subhead:      { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  highlights:   { width: '100%', gap: 10 },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  highlightIconWrap: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  highlightText:{ fontSize: 14, fontWeight: '500', flex: 1, flexWrap: 'wrap' },
  footnoteRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footnote:     { fontSize: 13, textAlign: 'center' },
});