// app/health-connect-setup.tsx
// Dedicated setup screen that guides users through enabling Health Connect.
// Shows app-specific instructions for Google Fit, Samsung Health, Strava etc.
// Accessible from the add activity screen banner and from onboarding.

import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  checkHealthPermissions,
  openHCSettings,
  PermissionStatus,
  requestHealthPermissions,
} from '@/src/services/healthConnect';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


// ── Supported apps ───────────────────────────────────────────────────────────
const SUPPORTED_APPS = [
  {
    name: 'Google Fit',
    icon: <Image source={require('@/assets/images/google-fit.png')} style={{ width: 20, height: 20 }} />,
    color: '#4285F4',
    packageId: 'com.google.android.apps.fitness',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.apps.fitness',
    steps: [
      'Open Google Fit → Profile tab',
      'Settings (gear icon) → Connected apps',
      'Find Health Connect and turn on "Sync Fit with Health Connect"',
    ],
  },
  {
    name: 'Samsung Health',
    icon: <Image source={require('@/assets/images/samsung-health.png')} style={{ width: 20, height: 20 }} />,
    color: '#4F6FD4',
    packageId: 'com.sec.android.app.shealth',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.sec.android.app.shealth',
    steps: [
      'Open Samsung Health → tap ⋮ (Menu)',
      'Settings → Connected Services → Health Connect',
      'Toggle on, grant permissions',
    ],
  },
  {
    name: 'Garmin Connect',
    icon: <Image source={require('@/assets/images/garmin-connect.png')} style={{ width: 20, height: 20 }} />,
    color: '#007CC3',
    packageId: 'com.garmin.android.apps.connectmobile',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.garmin.android.apps.connectmobile',
    steps: [
      'Open Garmin Connect → More tab (bottom right)',
      'Settings → Third Party Apps → Health Connect',
      'Tap Connect → grant permissions',
    ],
  },
  {
    name: 'Polar Flow',
    icon: <Image source={require('@/assets/images/polar-flow.png')} style={{ width: 20, height: 20 }} />,
    color: '#FF3366',
    packageId: 'com.polar.flow',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=fi.polar.polarflow',
    steps: [
      'Open Polar Flow → Open Menu (top left)',
      'General Settings → Third Party Apps → Health Connect',
      'Tap Connect → grant permissions',
    ],
  },
  {
    name: 'Fitbit',
    icon: <Image source={require('@/assets/images/fitbit.png')} style={{ width: 20, height: 20 }} />,
    color: '#00B0B9',
    packageId: 'com.fitbit.FitbitMobile',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.fitbit.FitbitMobile',
    steps: [
      'Open Fitbit → Today tab',
      'Tap devices icon → Add Connections Section → Health Connect',
      'Toggle on, grant permissions',
    ],
  },
  {
    name: 'Strava',
    icon: <Image source={require('@/assets/images/strava.png')} style={{ width: 20, height: 20 }} />,
    color: '#FC4C02',
    packageId: 'com.strava',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.strava',
    steps: [
      'Open Strava → You tab (bottom right)',
      'Settings (gear) → Applications, Services, and Devices',
      'Find "Health Connect" → grant permissions',
    ],
  },
];

const HC_PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';
const HC_PACKAGE    = 'com.google.android.apps.healthdata';

// ── Setup steps ──────────────────────────────────────────────────────────────
const SETUP_STEPS = [
  {
    num: '1',
    icon: <Image source={require('@/assets/images/health-connect.png')} style={{ width: 20, height: 20 }} />,
    color: '#4CAF50',
    title: 'Install Health Connect',
    desc: 'Health Connect is Google\'s health data hub. On Android 14+ it\'s built in. On older devices, install it from the Play Store.',
    action: 'Install / Open',
  },
  {
    num: '2',
    icon: 'fitness-outline',
    color: '#29B6F6',
    title: 'Connect your fitness app',
    desc: 'Open your fitness app (e.g. Google Fit, Samsung Health, Strava) and enable Health Connect in its settings. Tap an app below for exact steps.',
    action: null,
  },
  {
    num: '3',
    icon: 'shield-checkmark-outline',
    color: '#FFB300',
    title: 'Grant EcoVerse access',
    desc: 'Allow EcoVerse to read steps, distance, and workouts. Your data stays on-device — EcoVerse only reads activity summaries to calculate your eco-impact.',
    action: 'Grant access',
  },
];

// ── Main screen ──────────────────────────────────────────────────────────────
export default function HealthConnectSetupScreen() {
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';

  const [permStatus, setPermStatus]       = useState<PermissionStatus>('not_asked');
  const [requesting, setRequesting]       = useState(false);
  const [expandedApp, setExpandedApp]     = useState<string | null>(null);
  const [checking, setChecking]           = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkPermissions();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const checkPermissions = async () => {
    setChecking(true);
    const status = await checkHealthPermissions();
    setPermStatus(status);
    setChecking(false);
  };

  const handleGrantAccess = async () => {
    setRequesting(true);
    const status = await requestHealthPermissions();
    setPermStatus(status);
    setRequesting(false);

    if (status === 'granted') {
      Alert.alert(
        '✅ Connected!',
        'EcoVerse can now read your activity data from Health Connect. Your steps and workouts will auto-fill when you log activities.',
        [{ text: 'Great!', onPress: () => router.back() }]
      );
    } else if (status === 'unavailable') {
      Alert.alert(
        'Health Connect not found',
        'Please install Health Connect from the Play Store first.',
        [
          { text: 'Install', onPress: () => Linking.openURL(HC_PLAY_STORE) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const openApp = async (packageId: string, playStoreUrl: string) => {
    try {
      await Linking.openURL(`intent://#Intent;package=${packageId};scheme=android-app;end`);
    } catch {
      // App not installed — open Play Store
      Linking.openURL(playStoreUrl);
    }
  };

  const isGranted = permStatus === 'granted';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
          Health Connect
        </ThemedText>
        {isGranted && (
          <View style={[styles.connectedBadge, { backgroundColor: '#4CAF5020' }]}>
            <View style={styles.connectedDot} />
            <ThemedText style={styles.connectedText}>Connected</ThemedText>
          </View>
        )}
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.surface }]}>
          <Image source={require('@/assets/images/health-connect.png')} style={{ width: 48, height: 48 }} />
          <ThemedText style={[styles.heroTitle, { color: colors.text }]}>
            {isGranted ? 'Health Connect active' : 'Auto-sync your workouts'}
          </ThemedText>
          <ThemedText style={[styles.heroDesc, { color: colors.text }]}>
            {isGranted
              ? 'Your steps, runs, and rides are automatically available when you log activities. No manual entry needed.'
              : 'Connect Health Connect to automatically pull your steps, runs, and rides from Google Fit, Samsung Health, Strava, and more.'}
          </ThemedText>
          {isGranted && (
            <Pressable
              onPress={openHCSettings}
              style={[styles.manageBtn, { borderColor: colors.tint + '44' }]}
            >
              <Ionicons name="settings-outline" size={14} color={colors.tint} />
              <ThemedText style={[styles.manageBtnText, { color: colors.tint }]}>
                Manage permissions
              </ThemedText>
            </Pressable>
          )}
        </View>

        {/* What syncs */}
        <View style={styles.sectionBlock}>
          <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>WHAT SYNCS</ThemedText>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {[
              { icon: '👟', label: 'Steps', desc: 'Today\'s step count auto-fills the walking form' },
              { icon: '📍', label: 'Distance', desc: 'km walked, run, or cycled from GPS' },
              { icon: '⏱️', label: 'Exercise sessions', desc: 'Walks, runs, and rides from the last 7 days' },
              { icon: '🔥', label: 'Calories', desc: 'Active calories burned (shown for context)' },
            ].map((item, i, arr) => (
              <View key={item.label}>
                <View style={styles.syncRow}>
                  <Text style={styles.syncIcon}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.syncLabel, { color: colors.text }]}>{item.label}</ThemedText>
                    <ThemedText style={[styles.syncDesc, { color: colors.text }]}>{item.desc}</ThemedText>
                  </View>
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" style={{ opacity: isGranted ? 1 : 0.25 }} />
                </View>
                {i < arr.length - 1 && <View style={[styles.sep, { backgroundColor: colors.surfaceMuted }]} />}
              </View>
            ))}
          </View>
        </View>

        {/* Setup steps — only show if not granted */}
        {!isGranted && (
          <View style={styles.sectionBlock}>
            <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>SETUP GUIDE</ThemedText>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              {SETUP_STEPS.map((step, i) => (
                <View key={step.num} style={styles.setupStep}>
                  <View style={[styles.stepNumCircle, { backgroundColor: step.color + '20', borderColor: step.color + '40' }]}>
                    {typeof step.icon === 'string' ? (
                      <Ionicons name={step.icon as any} size={18} color={step.color} />
                    ) : (
                      step.icon
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <ThemedText style={[styles.stepTitle, { color: colors.text }]}>{step.title}</ThemedText>
                    <ThemedText style={[styles.stepDesc, { color: colors.text }]}>{step.desc}</ThemedText>
                    {step.action === 'Install / Open' && (
                      <Pressable
                        onPress={() => Linking.openURL(HC_PLAY_STORE)}
                        style={[styles.inlineBtn, { backgroundColor: step.color + '15', borderColor: step.color + '35' }]}
                      >
                        <ThemedText style={[styles.inlineBtnText, { color: step.color }]}>
                          Open Play Store →
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Supported apps */}
        <View style={styles.sectionBlock}>
          <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>SUPPORTED APPS</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: colors.text }]}>
            Tap an app for step-by-step instructions to enable Health Connect sharing.
          </ThemedText>
          <View style={styles.appsList}>
            {SUPPORTED_APPS.map(app => {
              const isExpanded = expandedApp === app.name;
              return (
                <View key={app.name} style={[styles.appCard, { backgroundColor: colors.surface }]}>
                  <Pressable
                    onPress={() => setExpandedApp(isExpanded ? null : app.name)}
                    style={styles.appHeader}
                  >
                    <View style={[styles.appIconBadge, { backgroundColor: app.color + '25', borderColor: app.color + '40', borderWidth: 1 }]}>
                      {typeof app.icon === 'string' ? (
                        <Text style={[styles.appIconText, { color: app.color }]}>{app.icon}</Text>
                      ) : (
                        app.icon
                      )}
                    </View>
                    <ThemedText style={[styles.appName, { color: colors.text }]}>{app.name}</ThemedText>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.text + '66'}
                    />
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.appSteps}>
                      <View style={[styles.appStepsDivider, { backgroundColor: colors.surfaceMuted }]} />
                      {app.steps.map((step, i) => (
                        <View key={i} style={styles.appStepRow}>
                          <View style={[styles.appStepNum, { backgroundColor: app.color + '20' }]}>
                            <Text style={[styles.appStepNumText, { color: app.color }]}>{i + 1}</Text>
                          </View>
                          <ThemedText style={[styles.appStepText, { color: colors.text }]}>{step}</ThemedText>
                        </View>
                      ))}
                      <Pressable
                        onPress={() => openApp(app.packageId, app.playStoreUrl)}
                        style={[styles.openAppBtn, { backgroundColor: app.color + '15', borderColor: app.color + '30' }]}
                      >
                        <ThemedText style={[styles.openAppBtnText, { color: app.color }]}>
                          Open {app.name} →
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Privacy note */}
        <View style={[styles.privacyNote, { backgroundColor: colors.surface }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#4CAF50" />
          <ThemedText style={[styles.privacyText, { color: colors.text }]}>
            EcoVerse only reads activity data — it never writes to Health Connect. Your health data stays on your device and is never uploaded to our servers.
          </ThemedText>
        </View>

      </Animated.ScrollView>

      {/* Bottom CTA */}
      {!isGranted && (
        <View style={[styles.bottomCTA, { backgroundColor: colors.background, borderTopColor: colors.surfaceMuted }]}>
          <Pressable
            onPress={handleGrantAccess}
            disabled={requesting || checking}
            style={[styles.grantBtn, { backgroundColor: colors.tint, opacity: (requesting || checking) ? 0.7 : 1 }]}
          >
            {requesting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="fitness-outline" size={18} color="#fff" />
                <ThemedText style={styles.grantBtnText}>Grant Health Connect access</ThemedText>
              </>
            )}
          </Pressable>
          <ThemedText style={[styles.ctaNote, { color: colors.text }]}>
            You can revoke access anytime in Health Connect settings
          </ThemedText>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700' },
  connectedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  connectedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4CAF50' },
  connectedText: { fontSize: 12, fontWeight: '600', color: '#4CAF50' },

  scroll: { padding: 16, gap: 16, paddingBottom: 120 },

  // Hero
  hero: {
    borderRadius: 16, padding: 20, alignItems: 'center', gap: 10,
  },
  heroIcon:  { fontSize: 48 },
  heroTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  heroDesc:  { fontSize: 14, opacity: 0.6, textAlign: 'center', lineHeight: 21 },
  manageBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4,
  },
  manageBtnText: { fontSize: 13, fontWeight: '600' },

  // Section
  sectionBlock:    { gap: 8 },
  sectionLabel:    { fontSize: 11, fontWeight: '700', opacity: 0.5, letterSpacing: 1, paddingHorizontal: 2 },
  sectionSubtitle: { fontSize: 13, opacity: 0.5, lineHeight: 18 },
  card:            { borderRadius: 14, overflow: 'hidden' },

  // What syncs
  syncRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  syncIcon:  { fontSize: 22 },
  syncLabel: { fontSize: 14, fontWeight: '600' },
  syncDesc:  { fontSize: 12, opacity: 0.5, marginTop: 1 },
  sep:       { height: StyleSheet.hairlineWidth, marginLeft: 52 },

  // Setup steps
  setupStep: { flexDirection: 'row', gap: 14, padding: 16, paddingBottom: 8 },
  stepNumCircle: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, flexShrink: 0,
  },
  stepTitle: { fontSize: 15, fontWeight: '700' },
  stepDesc:  { fontSize: 13, opacity: 0.55, lineHeight: 18 },
  inlineBtn: {
    alignSelf: 'flex-start', marginTop: 8,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  inlineBtnText: { fontSize: 13, fontWeight: '600' },

  // Supported apps
  appsList: { gap: 8 },
  appCard:  { borderRadius: 14, overflow: 'hidden' },
  appHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, padding: 14,
  },
  appIcon:     { fontSize: 24 },
  appIconBadge: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  appIconText:  { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  appName:  { flex: 1, fontSize: 15, fontWeight: '600' },
  appSteps: { paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  appStepsDivider: { height: StyleSheet.hairlineWidth, marginBottom: 4 },
  appStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  appStepNum: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  appStepNumText: { fontSize: 12, fontWeight: '800' },
  appStepText:    { fontSize: 13, opacity: 0.75, flex: 1, lineHeight: 18 },
  openAppBtn: {
    alignSelf: 'flex-start', marginTop: 4,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  openAppBtnText: { fontSize: 13, fontWeight: '600' },

  // Privacy
  privacyNote: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, padding: 14, borderRadius: 12,
  },
  privacyText: { fontSize: 13, opacity: 0.55, flex: 1, lineHeight: 19 },

  // Bottom CTA
  bottomCTA: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32, gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  grantBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 54, borderRadius: 14,
  },
  grantBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ctaNote:      { textAlign: 'center', fontSize: 12, opacity: 0.4 },
});
