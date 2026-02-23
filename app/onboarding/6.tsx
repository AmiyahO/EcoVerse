// onboarding/6.tsx — Region
import { View, Text, StyleSheet, Animated, Pressable, ScrollView } from 'react-native';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { REGIONAL_INTENSITY } from '@/src/utils/ecoLogic';

const REGIONS = [
  { id: 'US',         label: 'United States',  flag: '🇺🇸', hint: 'Mix of coal & gas' },
  { id: 'UK',         label: 'United Kingdom', flag: '🇬🇧', hint: 'Growing renewables' },
  { id: 'EU',         label: 'European Union', flag: '🇪🇺', hint: 'Varied, avg ~300g/kWh' },
  { id: 'INDIA',      label: 'India',          flag: '🇮🇳', hint: 'Predominantly coal' },
  { id: 'CHINA',      label: 'China',          flag: '🇨🇳', hint: 'High coal dependency' },
  { id: 'GLOBAL_AVG', label: 'Other / Global', flag: '🌐', hint: 'Global average used' },
];

export default function OnboardingStep6({ region, setRegion }: { region: string; setRegion: (r: string) => void }) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.orbTR} />

      <Animated.View style={[styles.header, { opacity: fade }]}>
        <Text style={styles.eyebrow}>YOUR REGION</Text>
        <Text style={styles.headline}>Where are{'\n'}you based?</Text>
        <Text style={styles.subhead}>
          Each country has a different electricity grid carbon intensity. This makes your CO₂ calculations accurate.
        </Text>
      </Animated.View>

      <Animated.View style={[{ opacity: fade }, styles.listWrap]}>
        {REGIONS.map(r => {
          const selected = region === r.id;
          return (
            <Pressable
              key={r.id}
              onPress={() => setRegion(r.id)}
              style={({ pressed }) => [
                styles.regionRow,
                selected && styles.regionRowSelected,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.regionFlag}>{r.flag}</Text>
              <View style={styles.regionTextCol}>
                <Text style={[styles.regionLabel, selected && styles.regionLabelSelected]}>
                  {r.label}
                </Text>
                <Text style={styles.regionHint}>{r.hint}</Text>
              </View>
              {selected
                ? <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
                : <View style={styles.radioEmpty} />
              }
            </Pressable>
          );
        })}
      </Animated.View>

      <Animated.Text style={[styles.footnote, { opacity: fade }]}>
        You can change this anytime in Settings.
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1E14',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  orbTR: {
    position: 'absolute', top: -50, right: -50,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#4CAF5018',
  },

  header:   { marginBottom: 20, gap: 6 },
  eyebrow:  { color: '#8BE94F', fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.8 },
  headline: { fontSize: 32, fontWeight: '800', color: '#fff', lineHeight: 40, letterSpacing: -0.5 },
  subhead:  { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 19, marginTop: 4 },

  listWrap: { gap: 8, flex: 1 },
  regionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
  },
  regionRowSelected: {
    backgroundColor: 'rgba(76,175,80,0.12)',
    borderColor: 'rgba(76,175,80,0.4)',
  },
  regionFlag:  { fontSize: 24 },
  regionTextCol: { flex: 1 },
  regionLabel: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  regionLabelSelected: { color: '#fff' },
  regionHint:  { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 1 },
  radioEmpty: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
  },

  footnote: { textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 12 },
});