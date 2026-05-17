// onboarding/5.tsx — Permissions (properly implemented)
import {
  View, Text, StyleSheet, Animated, Pressable,
  ActivityIndicator, Linking, AppState, AppStateStatus, Platform,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';
import { FontAwesome6 } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { requestHealthPermissions, checkHealthPermissions, PermissionStatus } from '@/src/services/healthConnect';
import * as Notifications from 'expo-notifications';
import { Camera } from 'expo-camera';

const HC_PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';

type GrantState = 'idle' | 'granted' | 'denied' | 'unavailable';

export default function OnboardingStep5() {
  const { scheme, colors } = useAppTheme();
  const isDark = scheme !== 'light';

  const bg           = isDark ? '#0B1E14' : '#F0F7F1';
  const headline     = isDark ? '#fff' : '#1B4332';
  const subhead      = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(27,67,50,0.55)';
  const permName     = isDark ? '#fff' : '#1B4332';
  const permDesc     = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(27,67,50,0.55)';
  const cardBg       = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(27,67,50,0.05)';
  const noteText     = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(27,67,50,0.55)';
  const headTextColor = isDark ? '#8BE94F' : '#1B5E20';

  const fade  = useRef(new Animated.Value(0)).current;
  const anims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  // Per-permission state
  const [hcStatus,    setHcStatus]    = useState<PermissionStatus>('not_asked');
  const [notifStatus, setNotifStatus] = useState<GrantState>('idle');
  const [cameraStatus,setCameraStatus]= useState<GrantState>('idle');

  const [hcLoading,    setHcLoading]    = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [cameraLoading,setCameraLoading]= useState(false);

  const isAndroid = Platform.OS === 'android';

  // Check initial states
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    [0, 1, 2].forEach(i => {
      Animated.timing(anims[i], { toValue: 1, duration: 450, delay: 150 + i * 110, useNativeDriver: true }).start();
    });

    // Check Health Connect
    if (isAndroid) {
      checkHealthPermissions().then(setHcStatus);
    }

    // Check camera
    Camera.getCameraPermissionsAsync().then(({ status }) => {
      if (status === 'granted') setCameraStatus('granted');
    });

    // Check notifications
    Notifications.getPermissionsAsync().then(({ status }) => {
      if (status === 'granted') setNotifStatus('granted');
    });

    // Re-check on app foreground (user may have gone to Settings)
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') return;
      if (isAndroid) checkHealthPermissions().then(setHcStatus);
      Camera.getCameraPermissionsAsync().then(({ status }) => {
        if (status === 'granted') setCameraStatus('granted');
      });
      Notifications.getPermissionsAsync().then(({ status }) => {
        if (status === 'granted') setNotifStatus('granted');
        else if (status === 'denied') setNotifStatus('denied');
      });
    });
    return () => sub.remove();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleGrantHealth = async () => {
    if (!isAndroid) return;
    setHcLoading(true);
    const status = await requestHealthPermissions();
    setHcStatus(status);
    setHcLoading(false);
    if (status === 'unavailable') Linking.openURL(HC_PLAY_STORE);
  };

  const handleGrantNotif = async () => {
    setNotifLoading(true);
    const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      setNotifStatus('granted');
    } else if (!canAskAgain) {
      // User permanently denied — send to Settings
      setNotifStatus('denied');
      Linking.openSettings();
    } else {
      setNotifStatus('denied');
    }
    setNotifLoading(false);
  };

  const handleGrantCamera = async () => {
    setCameraLoading(true);
    const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();
    if (status === 'granted') {
      setCameraStatus('granted');
    } else if (!canAskAgain) {
      setCameraStatus('denied');
      Linking.openSettings();
    } else {
      setCameraStatus('denied');
    }
    setCameraLoading(false);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const hcGranted     = hcStatus === 'granted';
  const hcUnavailable = hcStatus === 'unavailable';

  const PERMISSIONS: {
    faIcon: string; color: string; name: string; desc: string;
    granted: boolean; loading: boolean;
    onGrant?: () => void; grantLabel?: string;
    unavailableNote?: string;
  }[] = [
    {
      faIcon: 'heart-pulse',
      color: '#66BB6A',
      name: 'Health & Activity',
      desc: 'Auto-sync steps and workouts from Google Fit, Samsung Health, Strava and more. No manual entry needed.',
      granted:  hcGranted,
      loading:  hcLoading,
      onGrant:  isAndroid ? handleGrantHealth : undefined,
      grantLabel: hcUnavailable ? 'Install Health Connect →' : 'Grant access →',
      unavailableNote: !isAndroid ? 'Available on Android only' : undefined,
    },
    {
      faIcon: 'bell',
      color: '#FFB300',
      name: 'Notifications',
      desc: 'Daily reminders to log activities, weekly goal progress alerts, and streak-at-risk nudges.',
      granted:  notifStatus === 'granted',
      loading:  notifLoading,
      onGrant:  handleGrantNotif,
      grantLabel: notifStatus === 'denied' ? 'Open Settings →' : 'Allow notifications →',
    },
    {
      faIcon: 'camera',
      color: '#FF7043',
      name: 'Camera (OCR)',
      desc: 'Scan electricity and water bills to instantly extract your meter reading — no manual typing.',
      granted:  cameraStatus === 'granted',
      loading:  cameraLoading,
      onGrant:  handleGrantCamera,
      grantLabel: cameraStatus === 'denied' ? 'Open Settings →' : 'Allow camera →',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.orbBR, { backgroundColor: isDark ? '#29B6F615' : '#29B6F612' }]} />

      <Animated.View style={[styles.header, { opacity: fade }]}>
        <Text style={[styles.eyebrow, { color: headTextColor }]}>PERMISSIONS</Text>
        <Text style={[styles.headline, { color: headline }]}>{"What we'll\nask for"}</Text>
        <Text style={[styles.subhead, { color: subhead }]}>
          EcoVerse only requests what it needs. You can grant these now or skip and do it later.
        </Text>
      </Animated.View>

      <View style={styles.list}>
        {PERMISSIONS.map((perm, i) => {
          const cardBorderColor = perm.granted
            ? perm.color + '45'
            : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(27,67,50,0.1)');

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
                <FontAwesome6 name={perm.faIcon as any} size={20} color={perm.color} />
              </View>
              <View style={styles.permText}>
                {/* Name row */}
                <View style={styles.permNameRow}>
                  <Text style={[styles.permName, { color: permName }]}>{perm.name}</Text>
                  {perm.granted && (
                    <View style={[styles.grantedBadge, { backgroundColor: perm.color + '25' }]}>
                      <Ionicons name="checkmark" size={11} color={perm.color} />
                      <Text style={[styles.grantedText, { color: perm.color }]}>Granted</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.permDesc, { color: permDesc }]}>{perm.desc}</Text>
                {/* Grant button — shown if not yet granted and has a handler */}
                {!perm.granted && perm.onGrant && (
                  <Pressable
                    onPress={perm.onGrant}
                    disabled={perm.loading}
                    style={({ pressed }) => [
                      styles.grantBtn,
                      { backgroundColor: perm.color + '22', borderColor: perm.color + '45' },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    {perm.loading
                      ? <ActivityIndicator size="small" color={perm.color} />
                      : <Text style={[styles.grantBtnText, { color: perm.color }]}>{perm.grantLabel}</Text>
                    }
                  </Pressable>
                )}
                {/* Platform unavailable note */}
                {perm.unavailableNote && (
                  <Text style={[styles.unavailNote, { color: permDesc }]}>{perm.unavailableNote}</Text>
                )}
              </View>
            </Animated.View>
          );
        })}
      </View>

      <Animated.View style={[styles.noteBox, {
        opacity: fade,
        backgroundColor: cardBg,
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(27,67,50,0.1)',
      }]}>
        <Ionicons name="lock-closed" size={14} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(27,67,50,0.4)'} />
        <Text style={[styles.noteText, { color: noteText }]}>
          Your data is stored securely in Firebase. No ads, no third-party sharing, ever.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 16 },
  orbBR:     { position: 'absolute', bottom: 60, right: -60, width: 200, height: 200, borderRadius: 100 },
  header:    { marginBottom: 24, gap: 6 },
  eyebrow:   { fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.8 },
  headline:  { fontSize: 32, fontWeight: '800', lineHeight: 40, letterSpacing: -0.5 },
  subhead:   { fontSize: 14, lineHeight: 20, marginTop: 4 },

  list:     { gap: 10, marginBottom: 16, flex: 1 },
  permCard: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', borderRadius: 14, padding: 14, borderWidth: 1 },
  permIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  permText: { flex: 1, gap: 4 },

  permNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  permName:    { fontSize: 15, fontWeight: '700' },
  permDesc:    { fontSize: 12, lineHeight: 17 },

  grantedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  grantedText:  { fontSize: 11, fontWeight: '700' },

  grantBtn:     { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, minWidth: 80, alignItems: 'center' },
  grantBtnText: { fontSize: 13, fontWeight: '700' },

  unavailNote: { fontSize: 11, marginTop: 4, opacity: 0.7 },

  noteBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 14, borderWidth: 1 },
  noteText: { fontSize: 13, lineHeight: 19, flex: 1 },
});