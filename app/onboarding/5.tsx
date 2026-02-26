// onboarding/5.tsx — Permissions
import { View, Text, StyleSheet, Animated, Pressable, ActivityIndicator, Linking, AppState, AppStateStatus, Platform } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';
import { requestHealthPermissions, checkHealthPermissions, PermissionStatus } from '@/src/services/healthConnect';

const HC_PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';

const PERMISSIONS = [
  { icon: '🏃', color: '#66BB6A', name: 'Health & Activity', desc: 'Auto-sync steps and workouts from Google Fit, Samsung Health, Strava and more. No manual entry needed.', id: 'health' },
  { icon: '🔔', color: '#FFB300', name: 'Notifications', desc: 'Daily reminders to log activities and weekly goal progress alerts.', id: 'notifications', comingSoon: true },
  { icon: '📷', color: '#FF7043', name: 'Camera', desc: 'Scan electricity and water bills with OCR to instantly extract your meter reading.', id: 'camera', alwaysGranted: true },
];

export default function OnboardingStep5() {
  const { scheme } = useAppTheme();
  const isDark = scheme !== 'light';

  const bg       = isDark ? '#0B1E14' : '#F0F7F1';
  const headline = isDark ? '#fff' : '#1B4332';
  const subhead  = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(27,67,50,0.55)';
  const permName = isDark ? '#fff' : '#1B4332';
  const permDesc = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(27,67,50,0.55)';
  const cardBg   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(27,67,50,0.05)';
  const noteBg   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(27,67,50,0.05)';
  const noteText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(27,67,50,0.55)';
  const orbBg    = isDark ? '#29B6F615' : '#29B6F612';
  const headTextColor = isDark ? '#8BE94F' : '#1B5E20';

  const fade  = useRef(new Animated.Value(0)).current;
  const anims = useRef(PERMISSIONS.map(() => new Animated.Value(0))).current;

  const [hcStatus,   setHcStatus]   = useState<PermissionStatus>('not_asked');
  const [requesting, setRequesting] = useState(false);
  const isAndroid = Platform.OS === 'android';

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    PERMISSIONS.forEach((_, i) => {
      Animated.timing(anims[i], { toValue: 1, duration: 450, delay: 150 + i * 100, useNativeDriver: true }).start();
    });
    checkHealthPermissions().then(setHcStatus);
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') checkHealthPermissions().then(setHcStatus);
    });
    return () => sub.remove();
  }, []);

  const handleGrantHealth = async () => {
    if (!isAndroid) return;
    setRequesting(true);
    const status = await requestHealthPermissions();
    setHcStatus(status);
    setRequesting(false);
    if (status === 'unavailable') Linking.openURL(HC_PLAY_STORE);
  };

  const hcGranted     = hcStatus === 'granted';
  const hcUnavailable = hcStatus === 'unavailable';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.orbBR, { backgroundColor: orbBg }]} />

      <Animated.View style={[styles.header, { opacity: fade }]}>
        <Text style={[styles.eyebrow, { color: headTextColor }]}>PERMISSIONS</Text>
        <Text style={[styles.headline, { color: headline }]}>{"What we'll\nask for"}</Text>
        <Text style={[styles.subhead, { color: subhead }]}>EcoVerse only requests what it needs. You stay in control.</Text>
      </Animated.View>

      <View style={styles.list}>
        {PERMISSIONS.map((perm, i) => {
          const isHealth = perm.id === 'health';
          const granted  = perm.alwaysGranted || (isHealth && hcGranted);
          const notAvail = isHealth && hcUnavailable;
          const cardBorderColor = granted ? perm.color + '40' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(27,67,50,0.1)');

          return (
            <Animated.View
              key={perm.name}
              style={[
                styles.permCard,
                { backgroundColor: cardBg, borderColor: cardBorderColor },
                { opacity: anims[i], transform: [{ translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
              ]}
            >
              <View style={[styles.permIcon, { backgroundColor: perm.color + '20', borderColor: perm.color + '35' }]}>
                <Text style={styles.permEmoji}>{perm.icon}</Text>
              </View>
              <View style={styles.permText}>
                <View style={styles.permNameRow}>
                  <Text style={[styles.permName, { color: permName }]}>{perm.name}</Text>
                  {perm.comingSoon ? (
                    <View style={styles.soonBadge}><Text style={styles.soonText}>Soon</Text></View>
                  ) : granted ? (
                    <View style={[styles.grantedBadge, { backgroundColor: perm.color + '25' }]}>
                      <Text style={[styles.grantedText, { color: perm.color }]}>✓ Granted</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.permDesc, { color: permDesc }]}>{perm.desc}</Text>
                {isHealth && !granted && isAndroid && (
                  <Pressable
                    onPress={handleGrantHealth}
                    disabled={requesting}
                    style={[styles.grantBtn, { backgroundColor: perm.color + '25', borderColor: perm.color + '40' }]}
                  >
                    {requesting
                      ? <ActivityIndicator size="small" color={perm.color} />
                      : <Text style={[styles.grantBtnText, { color: perm.color }]}>
                          {notAvail ? 'Install Health Connect →' : 'Grant access →'}
                        </Text>
                    }
                  </Pressable>
                )}
                {isHealth && !isAndroid && (
                  <Text style={[styles.iosNote, { color: permDesc }]}>Available on Android only</Text>
                )}
              </View>
            </Animated.View>
          );
        })}
      </View>

      <Animated.View style={[styles.noteBox, { opacity: fade, backgroundColor: noteBg, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(27,67,50,0.1)' }]}>
        <Text style={[styles.noteText, { color: noteText }]}>
          🔒 Your data is stored securely in Firebase. No ads, no third-party sharing, ever.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 16 },
  orbBR: { position: 'absolute', bottom: 60, right: -60, width: 200, height: 200, borderRadius: 100 },
  header: { marginBottom: 24, gap: 6 },
  eyebrow: { color: '#8BE94F', fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.8 },
  headline: { fontSize: 32, fontWeight: '800', lineHeight: 40, letterSpacing: -0.5 },
  subhead: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  list: { gap: 12, marginBottom: 16, flex: 1 },
  permCard: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', borderRadius: 14, padding: 14, borderWidth: 1 },
  permIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  permEmoji: { fontSize: 20 },
  permText: { flex: 1, gap: 4 },
  permNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  permName: { fontSize: 15, fontWeight: '700' },
  permDesc: { fontSize: 12, lineHeight: 17 },
  soonBadge: { backgroundColor: 'rgba(255,179,0,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  soonText: { color: '#FFB300', fontSize: 11, fontWeight: '600' },
  grantedBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  grantedText: { fontSize: 11, fontWeight: '700' },
  grantBtn: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, minWidth: 80, alignItems: 'center' },
  grantBtnText: { fontSize: 13, fontWeight: '700' },
  iosNote: { fontSize: 11, marginTop: 4 },
  noteBox: { borderRadius: 12, padding: 14, borderWidth: 1 },
  noteText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
});