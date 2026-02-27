// onboarding/3.tsx — What You Can Track
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';
import { FontAwesome6 } from '@expo/vector-icons';

const CATEGORIES = [
  { icon: 'person-walking', color: '#4CAF50', name: 'Walking',     desc: 'Log steps or distance. Every km on foot = ~0.19 kg CO₂ avoided vs driving.' },
  { icon: 'bicycle',        color: '#29B6F6', name: 'Cycling',     desc: 'Even short rides add up. Cycling is one of the highest-impact habit changes.' },
  { icon: 'person-running', color: '#FF7043', name: 'Running',     desc: 'Track runs by distance and duration. Combines movement and CO₂ savings.' },
  { icon: 'bolt',           color: '#FFC107', name: 'Electricity', desc: 'Enter your monthly meter reading. We calculate savings vs your previous bill.' },
  { icon: 'droplet',        color: '#26C6DA', name: 'Water',       desc: 'Log monthly usage in litres. Even small reductions in water use matter.' },
];

export default function OnboardingStep3() {
  const { scheme } = useAppTheme();
  const isDark = scheme !== 'light';

  const bg       = isDark ? '#0B1E14' : '#F0F7F1';
  const headline = isDark ? '#fff' : '#1B4332';
  const subhead  = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(27,67,50,0.55)';
  const catName  = isDark ? '#fff' : '#1B4332';
  const catDesc  = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(27,67,50,0.55)';
  const orbBg    = isDark ? '#2E7D3218' : '#2E7D3212';
  const headTextColor = isDark ? '#8BE94F' : '#1B5E20';

  const fade  = useRef(new Animated.Value(0)).current;
  const anims = useRef(CATEGORIES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    CATEGORIES.forEach((_, i) => {
      Animated.timing(anims[i], { toValue: 1, duration: 450, delay: 80 + i * 90, useNativeDriver: true }).start();
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.orbBR, { backgroundColor: orbBg }]} />

      <Animated.View style={[styles.header, { opacity: fade }]}>
        <Text style={[styles.eyebrow, { color: headTextColor }]}>WHAT YOU CAN TRACK</Text>
        <Text style={[styles.headline, { color: headline }]}>Five activity{'\n'}categories</Text>
        <Text style={[styles.subhead, { color: subhead }]}>
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
                transform: [{ translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
              },
            ]}
          >
            <View style={[styles.catIcon, { backgroundColor: cat.color + '20', borderColor: cat.color + '40' }]}>
              <FontAwesome6 name={cat.icon as any} size={18} color={cat.color} />
            </View>
            <View style={styles.catText}>
              <Text style={[styles.catName, { color: catName }]}>{cat.name}</Text>
              <Text style={[styles.catDesc, { color: catDesc }]}>{cat.desc}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 16 },
  orbBR:     { position: 'absolute', bottom: 40, right: -60, width: 200, height: 200, borderRadius: 100 },
  header:    { marginBottom: 24, gap: 6 },
  eyebrow:   { fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.8 },
  headline:  { fontSize: 32, fontWeight: '800', lineHeight: 40, letterSpacing: -0.5 },
  subhead:   { fontSize: 14, lineHeight: 20, marginTop: 4 },
  list:      { gap: 12 },
  catRow:    { flexDirection: 'row', gap: 14, alignItems: 'center' },
  catIcon:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  catText:   { flex: 1 },
  catName:   { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  catDesc:   { fontSize: 12, lineHeight: 17 },
});