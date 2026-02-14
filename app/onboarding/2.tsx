// onboarding/2.tsx
import { Animated, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function OnboardingStep2() {
  const { scheme } = useAppTheme();
  const [region, setRegion] = useState('');
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
      <Animated.Text style={styles.title}>Your Region</Animated.Text>
      <Animated.Text style={styles.subtitle}>
        Optional: Enter your region for more accurate CO₂ calculations
      </Animated.Text>
      <TextInput
        value={region}
        onChangeText={setRegion}
        placeholder="Your region"
        placeholderTextColor={scheme === 'dark' ? '#ccc' : '#555'}
        style={[styles.input,
        { color: scheme === 'dark' ? '#000' : '#000', backgroundColor: scheme === 'dark' ? '#fff' : '#fff' },
        ]}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 20, color: '#fff' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 30, color: '#fff' },
  input: { width: '80%', backgroundColor: '#fff', borderRadius: 8, padding: 12, color: '#000' },
});
