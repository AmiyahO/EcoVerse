// onboarding/4.tsx — Community (Challenges + Leaderboard) — NEW
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { useEffect, useRef } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';
import { FontAwesome6 } from '@expo/vector-icons';

const CHALLENGES = [
  { icon: 'person-walking', color: '#4CAF50', title: 'Step Sprint',        difficulty: 'Easy',   reward: '+100 tokens' },
  { icon: 'bicycle',        color: '#29B6F6', title: 'Two-Wheel Hero',     difficulty: 'Medium', reward: '+200 tokens' },
  { icon: 'bolt',           color: '#FFC107', title: 'Power Saver',        difficulty: 'Hard',   reward: '+350 tokens' },
];

const DIFF_COLORS: Record<string, string> = {
  Easy: '#4CAF50', Medium: '#FFB300', Hard: '#FF7043', Epic: '#AB47BC',
};

const LEADERBOARD = [
  { rank: 1, alias: 'SolarFox·4821',  score: 94, medal: '🥇' },
  { rank: 2, alias: 'GreenWave·2910', score: 87, medal: '🥈' },
  { rank: 3, alias: 'EcoOwl·7733',    score: 81, medal: '🥉' },
  { rank: 4, alias: 'You',            score: 76, medal: null, isYou: true },
];

export default function OnboardingStep4() {
  const { scheme, colors } = useAppTheme();
  const isDark = scheme !== 'light';

  const bg           = isDark ? '#0B1E14' : '#F0F7F1';
  const headline     = isDark ? '#fff' : '#1B4332';
  const subhead      = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(27,67,50,0.55)';
  const cardBg       = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(27,67,50,0.05)';
  const cardBorder   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(27,67,50,0.09)';
  const rowText      = isDark ? '#fff' : '#1B4332';
  const mutedText    = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(27,67,50,0.5)';
  const sectionLabel = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(27,67,50,0.4)';
  const headTextColor = isDark ? '#8BE94F' : '#1B5E20';
  const youBg        = isDark ? `${colors.tint}25` : `${colors.tint}18`;
  const youBorder    = isDark ? `${colors.tint}55` : `${colors.tint}45`;

  const headerFade  = useRef(new Animated.Value(0)).current;
  const chalAnims   = useRef(CHALLENGES.map(() => new Animated.Value(0))).current;
  const lbAnims     = useRef(LEADERBOARD.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    CHALLENGES.forEach((_, i) => {
      Animated.timing(chalAnims[i], { toValue: 1, duration: 420, delay: 150 + i * 100, useNativeDriver: true }).start();
    });
    LEADERBOARD.forEach((_, i) => {
      Animated.timing(lbAnims[i], { toValue: 1, duration: 380, delay: 500 + i * 80, useNativeDriver: true }).start();
    });
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={[styles.container, { backgroundColor: bg }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.orbTL, { backgroundColor: isDark ? '#FF704318' : '#FF704312' }]} />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <Text style={[styles.eyebrow, { color: headTextColor }]}>COMMUNITY</Text>
        <Text style={[styles.headline, { color: headline }]}>Compete, challenge,{'\n'}make an impact together</Text>
        <Text style={[styles.subhead, { color: subhead }]}>
          New challenges rotate every week. Your leaderboard rank is based on your weekly EcoScore.
        </Text>
      </Animated.View>

      {/* Challenges preview */}
      <Text style={[styles.sectionLabel, { color: sectionLabel }]}>WEEKLY CHALLENGES (PREVIEW)</Text>
      <View style={styles.chalList}>
        {CHALLENGES.map((ch, i) => (
          <Animated.View
            key={ch.title}
            style={[
              styles.chalCard,
              { backgroundColor: cardBg, borderColor: cardBorder },
              { opacity: chalAnims[i], transform: [{ translateX: chalAnims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
            ]}
          >
            <View style={[styles.chalIcon, { backgroundColor: ch.color + '20', borderColor: ch.color + '40' }]}>
              <FontAwesome6 name={ch.icon as any} size={16} color={ch.color} />
            </View>
            <View style={styles.chalText}>
              <Text style={[styles.chalTitle, { color: rowText }]}>{ch.title}</Text>
              <View style={styles.chalMeta}>
                <View style={[styles.diffBadge, { backgroundColor: DIFF_COLORS[ch.difficulty] + '22' }]}>
                  <Text style={[styles.diffText, { color: DIFF_COLORS[ch.difficulty] }]}>{ch.difficulty}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.rewardPill, { backgroundColor: 'rgba(76,175,80,0.18)' }]}>
              <FontAwesome6 name="leaf" size={9} color="#4CAF50" style={{ marginRight: 3 }} />
              <Text style={styles.rewardText}>{ch.reward}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Leaderboard preview */}
      <Text style={[styles.sectionLabel, { color: sectionLabel, marginTop: 8 }]}>LEADERBOARD (PREVIEW)</Text>
      <View style={styles.lbList}>
        {LEADERBOARD.map((row, i) => (
          <Animated.View
            key={row.alias}
            style={[
              styles.lbRow,
              {
                backgroundColor: row.isYou ? youBg : cardBg,
                borderColor:     row.isYou ? youBorder : cardBorder,
              },
              { opacity: lbAnims[i], transform: [{ translateY: lbAnims[i].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
            ]}
          >
            <Text style={[styles.lbRank, { color: row.isYou ? colors.tint : mutedText }]}>
              {row.medal ?? `#${row.rank}`}
            </Text>
            <Text style={[styles.lbAlias, { color: row.isYou ? colors.tint : rowText, fontWeight: row.isYou ? '700' : '500' }]}>
              {row.alias}
            </Text>
            <View style={[styles.scorePill, { backgroundColor: row.isYou ? `${colors.tint}30` : cardBg }]}>
              <Text style={[styles.scoreText, { color: row.isYou ? colors.tint : mutedText }]}>{row.score}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Privacy note */}
      <Animated.View style={[styles.privacyNote, { opacity: headerFade, backgroundColor: cardBg, borderColor: cardBorder }]}>
        <FontAwesome6 name="user-shield" size={13} color={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(27,67,50,0.4)'} />
        <Text style={[styles.privacyText, { color: mutedText }]}>
          Privacy-first by default — shown as an eco-alias unless you opt in to real-name display.
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 32 },
  orbTL:      { position: 'absolute', top: -50, left: -50, width: 180, height: 180, borderRadius: 90 },

  header:   { marginBottom: 20, gap: 6 },
  eyebrow:  { fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.8 },
  headline: { fontSize: 30, fontWeight: '800', lineHeight: 38, letterSpacing: -0.5 },
  subhead:  { fontSize: 13, lineHeight: 19, marginTop: 4 },

  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },

  chalList: { gap: 8, marginBottom: 12 },
  chalCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12, borderWidth: 1 },
  chalIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  chalText: { flex: 1, gap: 4 },
  chalTitle: { fontSize: 14, fontWeight: '600' },
  chalMeta:  { flexDirection: 'row', gap: 6 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  diffText:  { fontSize: 11, fontWeight: '700' },
  rewardPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  rewardText: { fontSize: 11, fontWeight: '700', color: '#4CAF50' },

  lbList: { gap: 6, marginBottom: 14 },
  lbRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1 },
  lbRank:  { fontSize: 15, fontWeight: '700', width: 30, textAlign: 'center' },
  lbAlias: { flex: 1, fontSize: 14 },
  scorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  scoreText: { fontSize: 13, fontWeight: '700' },

  privacyNote: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 12 },
  privacyText: { flex: 1, fontSize: 12, lineHeight: 17 },
});