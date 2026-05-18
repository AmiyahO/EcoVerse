// onboarding/6.tsx — Region
import { View, Text, StyleSheet, Animated, Pressable, ScrollView } from 'react-native';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { REGIONAL_INTENSITY } from '@/src/utils/ecoLogic';

const REGIONS = [
  { id: 'US',         label: 'United States',  flag: '🇺🇸', hint: 'Mixed coal & gas  ·  0.386 kg CO₂/kWh' },
  { id: 'UK',         label: 'United Kingdom', flag: '🇬🇧', hint: 'Growing renewables  ·  0.193 kg CO₂/kWh' },
  { id: 'EU',         label: 'European Union', flag: '🇪🇺', hint: 'Varied across states  ·  0.276 kg CO₂/kWh' },
  { id: 'INDIA',      label: 'India',          flag: '🇮🇳', hint: 'Predominantly coal  ·  0.713 kg CO₂/kWh' },
  { id: 'CHINA',      label: 'China',          flag: '🇨🇳', hint: 'High coal dependency  ·  0.581 kg CO₂/kWh' },
  { id: 'GLOBAL_AVG', label: 'Other / Global', flag: '🌐', hint: 'Global average  ·  0.475 kg CO₂/kWh' },
];

export default function OnboardingStep6({ region, setRegion }: { region: string; setRegion: (r: string) => void }) {
  const { scheme } = useAppTheme();
  const isDark = scheme !== 'light';

  const bg            = isDark ? '#0B1E14' : '#F0F7F1';
  const headline      = isDark ? '#fff' : '#1B4332';
  const subhead       = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(27,67,50,0.55)';
  const rowBg         = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(27,67,50,0.05)';
  const rowBorder     = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(27,67,50,0.10)';
  const labelColor    = isDark ? 'rgba(255,255,255,0.8)' : '#1B4332';
  const labelSelected = isDark ? '#fff' : '#0A2E1A';
  const hintColor     = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(27,67,50,0.4)';
  const footnote      = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(27,67,50,0.4)';
  const radioColor    = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(27,67,50,0.25)';
  const headTextColor = isDark ? '#8BE94F' : '#1B5E20';

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={[styles.container, { backgroundColor: bg }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.orbTR, { backgroundColor: isDark ? '#4CAF5018' : '#4CAF5012' }]} />

      <Animated.View style={[styles.header, { opacity: fade }]}>
        <Text style={[styles.eyebrow, { color: headTextColor }]}>YOUR REGION</Text>
        <Text style={[styles.headline, { color: headline }]}>Where are{'\n'}you based?</Text>
        <Text style={[styles.subhead, { color: subhead }]}>
          Each country has a different electricity grid intensity — this makes your CO₂ calculations accurate for your region.
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
                { backgroundColor: rowBg, borderColor: rowBorder },
                selected && { backgroundColor: 'rgba(76,175,80,0.12)', borderColor: 'rgba(76,175,80,0.4)' },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.regionFlag}>{r.flag}</Text>
              <View style={styles.regionTextCol}>
                <Text style={[styles.regionLabel, { color: selected ? labelSelected : labelColor }]}>
                  {r.label}
                </Text>
                <Text style={[styles.regionHint, { color: hintColor }]}>{r.hint}</Text>
              </View>
              {selected
                ? <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
                : <View style={[styles.radioEmpty, { borderColor: radioColor }]} />}
            </Pressable>
          );
        })}
      </Animated.View>

      <Animated.Text style={[styles.footnote, { opacity: fade, color: footnote }]}>
        You can change this anytime in Settings.
      </Animated.Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24 },
  orbTR:        { position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80 },
  header:       { marginBottom: 20, gap: 6 },
  eyebrow:      { fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.8 },
  headline:     { fontSize: 32, fontWeight: '800', lineHeight: 40, letterSpacing: -0.5 },
  subhead:      { fontSize: 13, lineHeight: 19, marginTop: 4 },
  listWrap:     { gap: 8, marginBottom: 16 },
  regionRow:    { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  regionFlag:   { fontSize: 24 },
  regionTextCol:{ flex: 1 },
  regionLabel:  { fontSize: 15, fontWeight: '600' },
  regionHint:   { fontSize: 11, marginTop: 1 },
  radioEmpty:   { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5 },
  footnote:     { textAlign: 'center', fontSize: 12 },
});