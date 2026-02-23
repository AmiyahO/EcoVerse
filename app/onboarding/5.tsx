// onboarding/5.tsx — Permissions
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

const PERMISSIONS = [
  {
    icon: '🏃',
    color: '#66BB6A',
    name: 'Health & Activity',
    desc: 'Auto-sync your steps and workouts from Google Fit or Apple Health. No manual logging needed.',
    status: 'coming_soon',
  },
  {
    icon: '🔔',
    color: '#FFB300',
    name: 'Notifications',
    desc: 'Get daily reminders to log activities and weekly goal progress updates.',
    status: 'coming_soon',
  },
  {
    icon: '📍',
    color: '#29B6F6',
    name: 'Location',
    desc: 'Used only to auto-detect your region for accurate CO₂ calculations. Never stored.',
    status: 'coming_soon',
  },
  {
    icon: '📷',
    color: '#FF7043',
    name: 'Camera',
    desc: 'Scan your electricity or water bill with OCR to instantly extract your meter reading.',
    status: 'available',
  },
];

export default function OnboardingStep5() {
  const fade  = useRef(new Animated.Value(0)).current;
  const anims = useRef(PERMISSIONS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    PERMISSIONS.forEach((_, i) => {
      Animated.timing(anims[i], {
        toValue: 1, duration: 450, delay: 150 + i * 100, useNativeDriver: true,
      }).start();
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.orbBR} />

      <Animated.View style={[styles.header, { opacity: fade }]}>
        <Text style={styles.eyebrow}>PERMISSIONS</Text>
        <Text style={styles.headline}>What we'll{'\n'}ask for</Text>
        <Text style={styles.subhead}>
          EcoVerse only requests what it needs. You're always in control.
        </Text>
      </Animated.View>

      <View style={styles.list}>
        {PERMISSIONS.map((perm, i) => (
          <Animated.View
            key={perm.name}
            style={[
              styles.permCard,
              {
                opacity: anims[i],
                transform: [{
                  translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
                }],
              },
            ]}
          >
            <View style={[styles.permIcon, { backgroundColor: perm.color + '20', borderColor: perm.color + '35' }]}>
              <Text style={styles.permEmoji}>{perm.icon}</Text>
            </View>
            <View style={styles.permText}>
              <View style={styles.permNameRow}>
                <Text style={styles.permName}>{perm.name}</Text>
                {perm.status === 'coming_soon' ? (
                  <View style={styles.soonBadge}>
                    <Text style={styles.soonText}>Soon</Text>
                  </View>
                ) : (
                  <View style={styles.availBadge}>
                    <Text style={styles.availText}>Active</Text>
                  </View>
                )}
              </View>
              <Text style={styles.permDesc}>{perm.desc}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.View style={[styles.noteBox, { opacity: fade }]}>
        <Text style={styles.noteText}>
          🔒 Your data never leaves Firebase. No ads, no third-party sharing, ever.
        </Text>
      </Animated.View>
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
    position: 'absolute', bottom: 60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#29B6F615',
  },

  header:   { marginBottom: 24, gap: 6 },
  eyebrow:  { color: '#8BE94F', fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.8 },
  headline: { fontSize: 32, fontWeight: '800', color: '#fff', lineHeight: 40, letterSpacing: -0.5 },
  subhead:  { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 20, marginTop: 4 },

  list: { gap: 12, marginBottom: 16 },
  permCard: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  permIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, flexShrink: 0,
  },
  permEmoji: { fontSize: 20 },
  permText:  { flex: 1 },
  permNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  permName:  { fontSize: 15, fontWeight: '700', color: '#fff' },
  permDesc:  { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 17 },

  soonBadge:  { backgroundColor: 'rgba(255,179,0,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  soonText:   { color: '#FFB300', fontSize: 11, fontWeight: '600' },
  availBadge: { backgroundColor: 'rgba(76,175,80,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  availText:  { color: '#4CAF50', fontSize: 11, fontWeight: '600' },

  noteBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  noteText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 19, textAlign: 'center' },
});