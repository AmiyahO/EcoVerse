// app/future-vision.tsx
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

type VisionCard = {
  icon:      string;
  iconColor: string;
  bgColor:   string;
  title:     string;
  subtitle:  string;
  bullets:   string[];
  tag:       string;
  phase:     number;
};

const VISION_CARDS: VisionCard[] = [
  {
    icon:      'store',
    iconColor: '#FFB300',
    bgColor:   '#FFB30015',
    title:     'EcoToken Marketplace',
    subtitle:  'Turn your eco-effort into real rewards',
    tag:       'Phase 3',
    phase:     3,
    bullets: [
      'Redeem EcoTokens for discounts at partner retailers and local eco-shops',
      'Municipality partnerships — bill discounts for verified high-EcoScore users',
      'City-level perks: public transport credits, green parking vouchers',
      'Brands sponsor token rewards for specific verified sustainable actions',
    ],
  },
  {
    icon:      'users',
    iconColor: '#29B6F6',
    bgColor:   '#29B6F615',
    title:     'Friend Accountability',
    subtitle:  'Sustain habits together',
    tag:       'Phase 3',
    phase:     3,
    bullets: [
      'Add friends and view each other\'s weekly EcoScore (opt-in, privacy-first)',
      'Shared weekly challenges — e.g. "Walk 50 km between us this week"',
      'Gentle nudge: "Your friend logged 3 activities today 🌱"',
      'Anonymous group leaderboards ranked by EcoScore within friend circles',
    ],
  },
  {
    icon:      'earth-americas',
    iconColor: '#4CAF50',
    bgColor:   '#4CAF5015',
    title:     'More Regions & Countries',
    subtitle:  'Global carbon accuracy, local relevance',
    tag:       'Phase 3',
    phase:     3,
    bullets: [
      'Expand beyond current regions to cover 50+ countries with localised grid emission factors',
      'Country-specific utility benchmarks for electricity and water comparisons',
      'Localised leaderboards so users compete within their own national context',
      'Regional challenges aligned with local climate initiatives and government targets',
    ],
  },
  {
    icon:      'wifi',
    iconColor: '#78909C',
    bgColor:   '#78909C15',
    title:     'Offline Mode',
    subtitle:  'Log anywhere, sync when ready',
    tag:       'Phase 3',
    phase:     3,
    bullets: [
      'Full activity logging with no internet connection required',
      'Local-first architecture — data queued and synced automatically on reconnect',
      'Offline leaderboard cache so rankings remain visible without connectivity',
      'Health Connect sync queued offline and resolved when network is restored',
    ],
  },
  {
    icon:      'universal-access',
    iconColor: '#AB47BC',
    bgColor:   '#AB47BC15',
    title:     'Accessibility & Personalisation',
    subtitle:  'EcoVerse for everyone',
    tag:       'Phase 3',
    phase:     3,
    bullets: [
      'Reduce Motion toggle — all celebrations, confetti, and spring animations respect the preference',
      'Custom app tint colour — choose from a curated palette to personalise your EcoVerse',
      'High contrast mode for improved readability in bright outdoor conditions',
      'Larger text and icon scaling support for accessibility needs',
    ],
  },
  {
    icon:      'city',
    iconColor: '#26C6DA',
    bgColor:   '#26C6DA15',
    title:     'Municipal & Civic Integration',
    subtitle:  'Connect individual action to city-level impact',
    tag:       'Phase 4',
    phase:     4,
    bullets: [
      'Partner with local authorities to validate and reward sustainable commuting',
      'Aggregate anonymised city-wide EcoScore data for urban sustainability dashboards',
      'Integration with smart utility meters for automatic electricity and water tracking',
      'Community challenges aligned with city targets such as EU Green Deal goals',
    ],
  },
  {
    icon:      'robot',
    iconColor: '#EF5350',
    bgColor:   '#EF535015',
    title:     'Predictive AI Coach',
    subtitle:  'Personalised sustainability guidance at scale',
    tag:       'Phase 4',
    phase:     4,
    bullets: [
      'ML model trained on behaviour patterns to predict high-impact actions per user',
      'Proactive nudge: "Based on your history, Tuesday is your best day to cycle"',
      'Smart goal calibration — auto-adjusts weekly target to your recent activity pace',
      'Carbon impact forecast: "At this rate you\'ll save 12 kg CO₂ this month"',
    ],
  },
];

const PHASE_COLORS: Record<number, string> = {
  3: '#4CAF50',
  4: '#AB47BC',
};

function VisionCardView({ card, colors }: { card: VisionCard; colors: any }) {
  const phaseColor = PHASE_COLORS[card.phase] ?? card.iconColor;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: card.iconColor + '28' }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: card.bgColor }]}>
          <FontAwesome6 name={card.icon as any} size={20} color={card.iconColor} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.cardTitleRow}>
            <ThemedText style={[styles.cardTitle, { color: colors.text }]}>{card.title}</ThemedText>
            <View style={[styles.phasePill, { backgroundColor: phaseColor + '18', borderColor: phaseColor + '35' }]}>
              <ThemedText style={[styles.phaseText, { color: phaseColor }]}>{card.tag}</ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.cardSub, { color: colors.text }]}>{card.subtitle}</ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: card.iconColor + '18' }]} />

      <View style={{ gap: 8 }}>
        {card.bullets.map((b, i) => (
          <View key={i} style={styles.bulletRow}>
            <View style={[styles.bullet, { backgroundColor: card.iconColor }]} />
            <ThemedText style={[styles.bulletText, { color: colors.text }]}>{b}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function FutureVisionScreen() {
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';

  const phase3Cards = VISION_CARDS.filter(c => c.phase === 3);
  const phase4Cards = VISION_CARDS.filter(c => c.phase === 4);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.surfaceMuted }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.5 : 1 }]}
          onPress={() => router.back()}
        >
          <FontAwesome6 name="chevron-left" size={16} color={colors.tint} />
        </Pressable>
        <ThemedText type="defaultSemiBold" style={[styles.headerTitle, { color: colors.text }]}>
          What&#39;s Next
        </ThemedText>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Hero */}
        <LinearGradient
          colors={isDark ? ['#1a2e1a', '#0d1f1f'] : ['#f0fdf4', '#e0f7fa']}
          style={styles.hero}
        >
          <View style={[styles.heroIcon, { backgroundColor: colors.tint + '20' }]}>
            <FontAwesome6 name="seedling" size={28} color={colors.tint} />
          </View>
          <ThemedText style={[styles.heroTitle, { color: colors.text }]}>
            EcoVerse is just getting started
          </ThemedText>
          <ThemedText style={[styles.heroBody, { color: colors.text }]}>
            Today EcoVerse tracks your eco-friendly activities, calculates your CO₂ savings,
            and rewards you with EcoTokens. Here is where it is headed.
          </ThemedText>
          <View style={styles.phaseRow}>
            <View style={[styles.phaseLegendPill, { backgroundColor: '#4CAF5018', borderColor: '#4CAF5035' }]}>
              <View style={[styles.phaseDot, { backgroundColor: '#4CAF50' }]} />
              <ThemedText style={[styles.phaseLegendText, { color: '#4CAF50' }]}>Phase 3 — Near-term</ThemedText>
            </View>
            <View style={[styles.phaseLegendPill, { backgroundColor: '#AB47BC18', borderColor: '#AB47BC35' }]}>
              <View style={[styles.phaseDot, { backgroundColor: '#AB47BC' }]} />
              <ThemedText style={[styles.phaseLegendText, { color: '#AB47BC' }]}>Phase 4 — Long-term</ThemedText>
            </View>
          </View>
          <View style={[styles.heroBadge, { backgroundColor: colors.tint + '18', borderColor: colors.tint + '30' }]}>
            <FontAwesome6 name="flask" size={11} color={colors.tint} />
            <ThemedText style={[styles.heroBadgeText, { color: colors.tint }]}>
              Features below are planned — not yet live
            </ThemedText>
          </View>
        </LinearGradient>

        {/* Phase 3 */}
        <View style={styles.phaseSection}>
          <View style={styles.phaseSectionHeader}>
            <View style={[styles.phaseHeaderPill, { backgroundColor: '#4CAF5018' }]}>
              <FontAwesome6 name="rocket" size={11} color="#4CAF50" />
              <ThemedText style={[styles.phaseHeaderText, { color: '#4CAF50' }]}>Phase 3 — Near-term</ThemedText>
            </View>
          </View>
          {phase3Cards.map(card => (
            <VisionCardView key={card.title} card={card} colors={colors} />
          ))}
        </View>

        {/* Phase 4 */}
        <View style={styles.phaseSection}>
          <View style={styles.phaseSectionHeader}>
            <View style={[styles.phaseHeaderPill, { backgroundColor: '#AB47BC18' }]}>
              <FontAwesome6 name="star" size={11} color="#AB47BC" />
              <ThemedText style={[styles.phaseHeaderText, { color: '#AB47BC' }]}>Phase 4 — Long-term Vision</ThemedText>
            </View>
          </View>
          {phase4Cards.map(card => (
            <VisionCardView key={card.title} card={card} colors={colors} />
          ))}
        </View>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: colors.surfaceMuted + '60', borderColor: colors.surfaceMuted }]}>
          <FontAwesome6 name="circle-info" size={14} color={colors.text} style={{ opacity: 0.4 }} />
          <ThemedText style={[styles.footerText, { color: colors.text }]}>
            EcoVerse was developed as a Final Year Project at the University of Nicosia.
            These planned features represent the intended direction of the platform
            beyond the current prototype scope.
          </ThemedText>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17 },

  scroll: { padding: 16, gap: 16, paddingBottom: 40 },

  hero: { borderRadius: 20, padding: 20, alignItems: 'center', gap: 10 },
  heroIcon: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  heroTitle:  { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  heroBody:   { fontSize: 14, opacity: 0.6, textAlign: 'center', lineHeight: 20 },
  phaseRow:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  phaseLegendPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  phaseDot:         { width: 6, height: 6, borderRadius: 3 },
  phaseLegendText:  { fontSize: 11, fontWeight: '600' },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginTop: 4,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '600' },

  phaseSection:       { gap: 12 },
  phaseSectionHeader: { paddingHorizontal: 4 },
  phaseHeaderPill:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  phaseHeaderText:    { fontSize: 12, fontWeight: '700' },

  card:       { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardTitle:  { fontSize: 15, fontWeight: '700', flex: 1 },
  cardSub:    { fontSize: 12, opacity: 0.5 },
  phasePill:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  phaseText:  { fontSize: 10, fontWeight: '700' },
  divider:    { height: 1, marginVertical: 2 },

  bulletRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet:     { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  bulletText: { fontSize: 13, lineHeight: 20, flex: 1, opacity: 0.8 },

  footer: {
    flexDirection: 'row', gap: 10, padding: 14,
    borderRadius: 12, borderWidth: 1, alignItems: 'flex-start',
  },
  footerText: { fontSize: 12, opacity: 0.5, flex: 1, lineHeight: 18 },
});