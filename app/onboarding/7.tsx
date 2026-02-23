// onboarding/7.tsx — All Set
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useEffect, useRef } from 'react';

const HIGHLIGHTS = [
  { icon: '📊', text: 'Track CO₂ savings in real time' },
  { icon: '🪙', text: 'Earn tokens for every eco action' },
  { icon: '🔥', text: 'Build streaks, hit weekly goals' },
  { icon: '📈', text: 'See your impact grow over time' },
];

export default function OnboardingStep7() {
  const fade   = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const anims  = useRef(HIGHLIGHTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    HIGHLIGHTS.forEach((_, i) => {
      Animated.timing(anims[i], {
        toValue: 1, duration: 400, delay: 300 + i * 100, useNativeDriver: true,
      }).start();
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Glow */}
      <View style={styles.glow} />

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { opacity: fade, transform: [{ scale: scaleAnim }] }]}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>TRACK YOUR IMPACT</Text>
      </Animated.View>

      {/* Headline */}
      <Animated.View style={[{ opacity: fade }, styles.headlineWrap]}>
        <Text style={styles.headline}>You're all set! 🎉</Text>
        <Text style={styles.subhead}>
          Start logging your first activity and watch your impact unfold.
        </Text>
      </Animated.View>

      {/* Highlights */}
      <View style={styles.highlights}>
        {HIGHLIGHTS.map((h, i) => (
          <Animated.View
            key={i}
            style={[
              styles.highlightRow,
              {
                opacity: anims[i],
                transform: [{
                  translateX: anims[i].interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }),
                }],
              },
            ]}
          >
            <Text style={styles.highlightIcon}>{h.icon}</Text>
            <Text style={styles.highlightText}>{h.text}</Text>
          </Animated.View>
        ))}
      </View>

      <Animated.Text style={[styles.footnote, { opacity: fade }]}>
        Together we can make a difference 🌱
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1E14',
    paddingHorizontal: 28,
    paddingTop: 50,
    paddingBottom: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glow: {
    position: 'absolute',
    top: '20%', left: '50%',
    marginLeft: -120,
    width: 240, height: 240,
    borderRadius: 120,
    backgroundColor: '#2E7D3228',
  },

  logoWrap:  { alignItems: 'center' },
  logo:      { width: 140, height: 140 },
  tagline:   { color: '#8BE94F', fontSize: 11, fontWeight: '800', letterSpacing: 3, marginTop: 4, opacity: 0.8 },

  headlineWrap: { alignItems: 'center', gap: 10 },
  headline:     { fontSize: 34, fontWeight: '800', color: '#fff', textAlign: 'center', letterSpacing: -0.5 },
  subhead:      { fontSize: 15, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 22 },

  highlights: { width: '100%', gap: 12 },
  highlightRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  highlightIcon: { fontSize: 22 },
  highlightText: { fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  footnote: {
    fontSize: 13, color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
  },
});