// onboarding/2.tsx — How It Works
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';
import { FontAwesome6 } from '@expo/vector-icons';

const STEPS = [
  { icon: 'circle-plus',    iconColor: '#4CAF50', title: 'Log an activity',           desc: 'Record walking, cycling, electricity savings, water usage and more. Or let Health Connect auto-sync.' },
  { icon: 'calculator',     iconColor: '#29B6F6', title: 'We calculate your impact',   desc: 'EcoVerse converts your activity into kg of CO₂ saved using region-specific emission factors.' },
  { icon: 'leaf',           iconColor: '#FFB300', title: 'Earn tokens & level up',     desc: 'Every saving earns EcoTokens. Streaks multiply your rewards. Climb 8 nature-themed rank tiers.' },
  { icon: 'users',          iconColor: '#FF7043', title: 'Compete & challenge',        desc: 'Join weekly challenges, climb the leaderboard, and see how your impact compares globally.' },
];

export default function OnboardingStep2() {
  const { scheme } = useAppTheme();
  const isDark = scheme !== 'light';

  const bg           = isDark ? '#0B1E14' : '#F0F7F1';
  const headline     = isDark ? '#fff' : '#1B4332';
  const stepTitle    = isDark ? '#fff' : '#1B4332';
  const stepDesc     = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(27,67,50,0.6)';
  const headTextColor = isDark ? '#8BE94F' : '#1B5E20';

  const anims = useRef(STEPS.map(() => ({
    fade:   new Animated.Value(0),
    slideX: new Animated.Value(-20),
  }))).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 500, delay: 80, useNativeDriver: true }).start();
    STEPS.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(anims[i].fade,   { toValue: 1, duration: 500, delay: 180 + i * 130, useNativeDriver: true }),
        Animated.timing(anims[i].slideX, { toValue: 0, duration: 400, delay: 180 + i * 130, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.orbTop, { backgroundColor: isDark ? '#34C9C914' : '#34C9C920' }]} />

      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <Text style={[styles.eyebrow, { color: headTextColor }]}>HOW IT WORKS</Text>
        <Text style={[styles.headline, { color: headline }]}>Four steps to{'\n'}real impact</Text>
      </Animated.View>

      <View style={styles.stepsList}>
        {STEPS.map((step, i) => (
          <Animated.View
            key={i}
            style={[styles.stepCard, { opacity: anims[i].fade, transform: [{ translateX: anims[i].slideX }] }]}
          >
            <View style={styles.stepLeft}>
              <View style={[styles.iconCircle, { backgroundColor: step.iconColor + '22', borderColor: step.iconColor + '44' }]}>
                <FontAwesome6 name={step.icon as any} size={18} color={step.iconColor} />
              </View>
              {i < STEPS.length - 1 && (
                <View style={[styles.connector, { backgroundColor: step.iconColor + '35' }]} />
              )}
            </View>
            <View style={styles.stepRight}>
              <Text style={[styles.stepTitle, { color: stepTitle }]}>{step.title}</Text>
              <Text style={[styles.stepDesc,  { color: stepDesc }]}>{step.desc}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 16 },
  orbTop:     { position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 90 },
  header:     { marginBottom: 36, gap: 8 },
  eyebrow:    { fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.8 },
  headline:   { fontSize: 32, fontWeight: '800', lineHeight: 40, letterSpacing: -0.5 },
  stepsList:  { gap: 0 },
  stepCard:   { flexDirection: 'row', gap: 16 },
  stepLeft:   { alignItems: 'center', width: 44 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  connector:  { width: 2, flex: 1, minHeight: 20, marginVertical: 4 },
  stepRight:  { flex: 1, paddingBottom: 24, paddingTop: 10 },
  stepTitle:  { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  stepDesc:   { fontSize: 13, lineHeight: 19 },
});