// onboarding/3.tsx
import { Animated, Text, StyleSheet, View, Image } from 'react-native';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function OnboardingStep3() {
  const { scheme } = useAppTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Run both animations at once
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      })
    ]).start();
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
      <Animated.View style={{ 
        opacity: fadeAnim, 
        transform: [{ scale: scaleAnim }], 
        alignItems: 'center',
        width: '100%'
      }}>
        
        <Image 
          source={require('@/assets/images/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        {/* Motto */}
        <Text style={styles.motto}>TRACK YOUR IMPACT</Text>

        <View style={styles.textContainer}>
          <Text style={styles.title}>You're All Set!</Text>
          <Text style={styles.subtitle}>
            Log activities, track your CO₂ savings, and see your progress over time.
          </Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 20, color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 18, textAlign: 'center', color: '#fff', lineHeight: 24, opacity: 0.9 },
  logo: {
    width: 250,     // Adjust size as needed
    height: 250,
  },
  motto: { 
    fontSize: 14, 
    fontWeight: '900', 
    color: '#8BE94F', 
    letterSpacing: 3, 
    marginBottom: 50, 
    opacity: 0.8 ,
  },
  textContainer: { alignItems: 'center', marginTop: 10 },
});
