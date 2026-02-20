// onboarding/2.tsx
import { Animated, Text, Pressable, StyleSheet, View } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/hooks/useAppTheme';
import { REGIONAL_INTENSITY } from '@/src/utils/ecoLogic';
import { Ionicons } from '@expo/vector-icons';

const REGIONS = [
  { id: 'US', label: 'United States', flag: '🇺🇸' },
  { id: 'UK', label: 'United Kingdom', flag: '🇬🇧' },
  { id: 'EU', label: 'European Union', flag: '🇪🇺' },
  { id: 'INDIA', label: 'India', flag: '🇮🇳' },
  { id: 'CHINA', label: 'China', flag: '🇨🇳' },
  { id: 'GLOBAL_AVG', label: 'Other / Global', flag: '🌐' },
];

export default function OnboardingStep2({ region, setRegion }: any) {
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
      <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>Your Region</Animated.Text>
      <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
        Select your region for more accurate CO₂ calculations
      </Animated.Text>

      <View style={styles.listContainer}>
        {REGIONS.map((item) => {
          const isSelected = region === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setRegion(item.id)}
              style={[
                styles.regionItem,
                isSelected && { backgroundColor: '#fff', borderColor: '#fff' }
              ]}
            >
              <Text style={styles.regionEmoji}>{item.flag}</Text>
              <Text style={[styles.regionText, isSelected && { color: '#2E7D32', fontWeight: 'bold' }]}>
                {item.label}
              </Text>
              {isSelected && <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />}
            </Pressable>
          );
        })}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 20, color: '#fff' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 30, color: '#fff' },
  listContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  regionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  regionEmoji: { fontSize: 20, marginRight: 15 },
  regionText: { color: '#fff', fontSize: 16, flex: 1 },
});
