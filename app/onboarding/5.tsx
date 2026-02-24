// onboarding/5.tsx — Permissions
import { View, Text, StyleSheet, Animated, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import {
  requestHealthPermissions,
  checkHealthPermissions,
  PermissionStatus,
} from '@/src/services/healthConnect';
import { Platform } from 'react-native';

const HC_PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';

const PERMISSIONS = [
  {
    icon: '🏃',
    color: '#66BB6A',
    name: 'Health & Activity',
    desc: 'Auto-sync steps and workouts from Google Fit, Samsung Health, Strava and more. No manual entry needed.',
    id: 'health',
  },
  {
    icon: '🔔',
    color: '#FFB300',
    name: 'Notifications',
    desc: 'Daily reminders to log activities and weekly goal progress alerts.',
    id: 'notifications',
    comingSoon: true,
  },
  {
    icon: '📷',
    color: '#FF7043',
    name: 'Camera',
    desc: 'Scan electricity and water bills with OCR to instantly extract your meter reading.',
    id: 'camera',
    alwaysGranted: true,
  },
];

export default function OnboardingStep5() {
  const fade  = useRef(new Animated.Value(0)).current;
  const anims = useRef(PERMISSIONS.map(() => new Animated.Value(0))).current;

  const [hcStatus,   setHcStatus]   = useState<PermissionStatus>('not_asked');
  const [requesting, setRequesting] = useState(false);
  const isAndroid = Platform.OS === 'android';

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    PERMISSIONS.forEach((_, i) => {
      Animated.timing(anims[i], {
        toValue: 1, duration: 450, delay: 150 + i * 100, useNativeDriver: true,
      }).start();
    });
    checkHealthPermissions().then(setHcStatus);
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
    <View style={styles.container}>
      <View style={styles.orbBR} />

      <Animated.View style={[styles.header, { opacity: fade }]}>
        <Text style={styles.eyebrow}>PERMISSIONS</Text>
        <Text style={styles.headline}>{"What we'll\nask for"}</Text>
        <Text style={styles.subhead}>EcoVerse only requests what it needs. You stay in control.</Text>
      </Animated.View>

      <View style={styles.list}>
        {PERMISSIONS.map((perm, i) => {
          const isHealth = perm.id === 'health';
          const granted  = perm.alwaysGranted || (isHealth && hcGranted);
          const notAvail = isHealth && hcUnavailable;

          return (
            <Animated.View
              key={perm.name}
              style={[
                styles.permCard,
                { borderColor: granted ? perm.color + '40' : 'rgba(255,255,255,0.1)' },
                {
                  opacity: anims[i],
                  transform: [{ translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
                },
              ]}
            >
              <View style={[styles.permIcon, { backgroundColor: perm.color + '20', borderColor: perm.color + '35' }]}>
                <Text style={styles.permEmoji}>{perm.icon}</Text>
              </View>
              <View style={styles.permText}>
                <View style={styles.permNameRow}>
                  <Text style={styles.permName}>{perm.name}</Text>
                  {perm.comingSoon ? (
                    <View style={styles.soonBadge}><Text style={styles.soonText}>Soon</Text></View>
                  ) : granted ? (
                    <View style={[styles.grantedBadge, { backgroundColor: perm.color + '25' }]}>
                      <Text style={[styles.grantedText, { color: perm.color }]}>✓ Granted</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.permDesc}>{perm.desc}</Text>

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
                  <Text style={styles.iosNote}>Available on Android only</Text>
                )}
              </View>
            </Animated.View>
          );
        })}
      </View>

      <Animated.View style={[styles.noteBox, { opacity: fade }]}>
        <Text style={styles.noteText}>
          🔒 Your data is stored securely in Firebase. No ads, no third-party sharing, ever.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1E14', paddingHorizontal: 28, paddingTop: 60, paddingBottom: 16 },
  orbBR: { position: 'absolute', bottom: 60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: '#29B6F615' },
  header: { marginBottom: 24, gap: 6 },
  eyebrow: { color: '#8BE94F', fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.8 },
  headline: { fontSize: 32, fontWeight: '800', color: '#fff', lineHeight: 40, letterSpacing: -0.5 },
  subhead: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 20, marginTop: 4 },
  list: { gap: 12, marginBottom: 16, flex: 1 },
  permCard: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, borderWidth: 1 },
  permIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  permEmoji: { fontSize: 20 },
  permText: { flex: 1, gap: 4 },
  permNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  permName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  permDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 17 },
  soonBadge: { backgroundColor: 'rgba(255,179,0,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  soonText: { color: '#FFB300', fontSize: 11, fontWeight: '600' },
  grantedBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  grantedText: { fontSize: 11, fontWeight: '700' },
  grantBtn: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, minWidth: 80, alignItems: 'center' },
  grantBtnText: { fontSize: 13, fontWeight: '700' },
  iosNote: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  noteBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  noteText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 19, textAlign: 'center' },
});