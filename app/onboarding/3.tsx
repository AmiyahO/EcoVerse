// onboarding/3.tsx
import { Animated, Text, StyleSheet } from 'react-native';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function OnboardingStep3() {
  const { scheme } = useAppTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const gradientColors: readonly [string, string] =
    scheme === 'dark' ? ['#34C9C9', '#2E7D32'] : ['#2E7D32', '#34C9C9'];

  return (
    <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
        >
      <Animated.Text style={styles.title}>Track Your Impact</Animated.Text>
      <Animated.Text style={styles.subtitle}>
        Log activities, track your CO₂ savings, and see your progress over time.
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 20, color: '#fff' },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#fff' },
});
