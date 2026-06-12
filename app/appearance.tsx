// app/appearance.tsx
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ACCENT_PRESETS, type AccentKey } from '@/constants/theme';
import { useThemeStore } from '@/src/store/themeStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AppearanceScreen() {
  const { colors, scheme } = useAppTheme();
  const accentKey = useThemeStore(s => s.accentKey);
  const setAccent = useThemeStore(s => s.setAccent);

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: colors.text }]}>Appearance</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>APP COLOUR</ThemedText>
        <ThemedText style={[styles.sectionHint, { color: colors.text }]}>
          Changes buttons, highlights, and active icons throughout the app.
          The colour adjusts automatically for light and dark mode.
        </ThemedText>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {(Object.entries(ACCENT_PRESETS) as [AccentKey, typeof ACCENT_PRESETS[AccentKey]][]).map(
            ([key, preset], i, arr) => {
              const selected  = accentKey === key;
              const lightCol  = preset.light;
              const darkCol   = preset.dark;
              const activeCol = preset[scheme];
              const isLast    = i === arr.length - 1;

              return (
                <Pressable
                  key={key}
                  onPress={() => setAccent(key)}
                  style={({ pressed }) => [
                    styles.row,
                    selected && {
                      backgroundColor: activeCol + '12',
                      borderLeftWidth: 3,
                      borderLeftColor: activeCol,
                    },
                    !selected && { borderLeftWidth: 3, borderLeftColor: 'transparent' },
                    pressed && { opacity: 0.6 },
                    !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.text + '12' },
                  ]}
                >
                  {/* Light + dark swatch pair */}
                  <View style={styles.swatchPair}>
                    <View style={[styles.swatch, { backgroundColor: lightCol }]} />
                    <View style={[styles.swatchDark, { backgroundColor: darkCol }]} />
                  </View>

                  {/* Label */}
                  <ThemedText style={[styles.label, { color: colors.text }]}>
                    {preset.label}
                  </ThemedText>

                  {/* Live tint preview pill */}
                  <View style={[styles.previewPill, { backgroundColor: activeCol + '20' }]}>
                    <ThemedText style={[styles.previewText, { color: activeCol }]}>Aa</ThemedText>
                  </View>

                  {selected
                    ? <Ionicons name="checkmark-circle" size={22} color={activeCol} />
                    : <View style={[styles.radio, { borderColor: colors.text + '25' }]} />}
                </Pressable>
              );
            }
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  backBtn:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 22, fontWeight: '700' },
  scroll:       { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, paddingHorizontal: 4 },
  sectionHint:  { fontSize: 13, opacity: 0.45, marginBottom: 16, paddingHorizontal: 4, lineHeight: 18 },
  card:         { borderRadius: 14, overflow: 'hidden' },
  row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  swatchPair:   { flexDirection: 'row', width: 44 },
  swatch:       { width: 26, height: 26, borderRadius: 13, zIndex: 1 },
  swatchDark:   { width: 26, height: 26, borderRadius: 13, marginLeft: -10 },
  label:        { flex: 1, fontSize: 15 },
  previewPill:  { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, marginRight: 4 },
  previewText:  { fontSize: 15, fontWeight: '700' },
  radio:        { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5 },
});