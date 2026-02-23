// onboarding/2.tsx — How It Works
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

const STEPS = [
  {
    icon: '📋',
    color: '#4CAF50',
    title: 'Log an activity',
    desc: 'Record walking, cycling, electricity savings, reduced water usage, and more.',
  },
  {
    icon: '🧮',
    color: '#29B6F6',
    title: 'We calculate your impact',
    desc: 'EcoVerse converts your activity into kg of CO₂ saved using region-specific emission factors.',
  },
  {
    icon: '🪙',
    color: '#FFB300',
    title: 'Earn eco tokens',
    desc: 'Every saving earns tokens. Build streaks to multiply your earnings. Hit weekly goals.',
  },
  {
    icon: '📈',
    color: '#FF7043',
    title: 'Track & improve',
    desc: 'See your trends, compare weeks, and discover which habits have the most impact.',
  },
];

export default function OnboardingStep2() {
  const anims = useRef(STEPS.map((_, i) => ({
    fade:  new Animated.Value(0),
    slideX: new Animated.Value(-20),
  }))).current;

  useEffect(() => {
    STEPS.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(anims[i].fade,   { toValue: 1, duration: 500, delay: 150 + i * 120, useNativeDriver: true }),
        Animated.timing(anims[i].slideX, { toValue: 0, duration: 400, delay: 150 + i * 120, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.orbTop} />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>HOW IT WORKS</Text>
        <Text style={styles.headline}>Four simple steps{'\n'}to real impact</Text>
      </View>

      <View style={styles.stepsList}>
        {STEPS.map((step, i) => (
          <Animated.View
            key={i}
            style={[
              styles.stepCard,
              {
                opacity: anims[i].fade,
                transform: [{ translateX: anims[i].slideX }],
              },
            ]}
          >
            {/* Left: number + connector */}
            <View style={styles.stepLeft}>
              <View style={[styles.iconCircle, { backgroundColor: step.color + '22', borderColor: step.color + '44' }]}>
                <Text style={styles.stepIcon}>{step.icon}</Text>
              </View>
              {i < STEPS.length - 1 && (
                <View style={[styles.connector, { backgroundColor: step.color + '30' }]} />
              )}
            </View>

            {/* Right: text */}
            <View style={styles.stepRight}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1E14',
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 16,
  },
  orbTop: {
    position: 'absolute', top: -40, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#34C9C914',
  },

  header:   { marginBottom: 32, gap: 8 },
  eyebrow:  { color: '#8BE94F', fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.8 },
  headline: { fontSize: 32, fontWeight: '800', color: '#fff', lineHeight: 40, letterSpacing: -0.5 },

  stepsList: { gap: 0 },
  stepCard: { flexDirection: 'row', gap: 16 },

  stepLeft:   { alignItems: 'center', width: 44 },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  stepIcon:  { fontSize: 20 },
  connector: { width: 2, flex: 1, minHeight: 16, marginVertical: 4 },

  stepRight: { flex: 1, paddingBottom: 20, paddingTop: 10 },
  stepTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  stepDesc:  { fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 19 },
});