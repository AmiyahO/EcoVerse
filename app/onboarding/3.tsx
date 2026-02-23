// onboarding/3.tsx — What You Can Track
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

const CATEGORIES = [
  {
    icon: '🚶',
    color: '#66BB6A',
    name: 'Walking',
    desc: 'Log steps or distance. Every km on foot = ~0.21 kg CO₂ avoided vs driving.',
  },
  {
    icon: '🚴',
    color: '#26C6DA',
    name: 'Cycling',
    desc: 'Even short rides add up. Cycling is one of the highest-impact habit changes.',
  },
  {
    icon: '🏃',
    color: '#FFA726',
    name: 'Running',
    desc: 'Track runs by distance and duration. Combines movement and CO₂ savings.',
  },
  {
    icon: '⚡',
    color: '#FFEE58',
    name: 'Electricity',
    desc: 'Enter your monthly meter reading. We calculate savings vs your previous bill.',
  },
  {
    icon: '💧',
    color: '#29B6F6',
    name: 'Water',
    desc: 'Log monthly usage in litres. Even small reductions in water use matter.',
  },
];

export default function OnboardingStep3() {
  const fade   = useRef(new Animated.Value(0)).current;
  const anims  = useRef(CATEGORIES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    CATEGORIES.forEach((_, i) => {
      Animated.timing(anims[i], {
        toValue: 1, duration: 450, delay: 80 + i * 90, useNativeDriver: true,
      }).start();
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.orbBR} />

      <Animated.View style={[styles.header, { opacity: fade }]}>
        <Text style={styles.eyebrow}>WHAT YOU CAN TRACK</Text>
        <Text style={styles.headline}>Five activity{'\n'}categories</Text>
        <Text style={styles.subhead}>
          Each one maps directly to real CO₂ emissions using scientific data.
        </Text>
      </Animated.View>

      <View style={styles.list}>
        {CATEGORIES.map((cat, i) => (
          <Animated.View
            key={cat.name}
            style={[
              styles.catRow,
              {
                opacity: anims[i],
                transform: [{
                  translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
                }],
              },
            ]}
          >
            <View style={[styles.catIcon, { backgroundColor: cat.color + '20', borderColor: cat.color + '40' }]}>
              <Text style={styles.catEmoji}>{cat.icon}</Text>
            </View>
            <View style={styles.catText}>
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catDesc}>{cat.desc}</Text>
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
  orbBR: {
    position: 'absolute', bottom: 40, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#2E7D3218',
  },

  header:   { marginBottom: 24, gap: 6 },
  eyebrow:  { color: '#8BE94F', fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.8 },
  headline: { fontSize: 32, fontWeight: '800', color: '#fff', lineHeight: 40, letterSpacing: -0.5 },
  subhead:  { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 20, marginTop: 4 },

  list:    { gap: 12 },
  catRow:  { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  catIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, flexShrink: 0,
  },
  catEmoji: { fontSize: 20 },
  catText:  { flex: 1, paddingTop: 2 },
  catName:  { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  catDesc:  { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 17 },
});