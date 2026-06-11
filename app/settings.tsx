// settings.tsx
import appJson from '@/app.json';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { auth, db } from '@/src/firebase/config';
import { checkHealthPermissions, PermissionStatus } from '@/src/services/healthConnect';
import { formatSyncDate, getSyncState } from '@/src/services/healthSyncService';
import {
  applyNotifSettings,
  DEFAULT_NOTIF_SETTINGS,
  getNotifPermStatus, requestNotifPermission,
  type NotifPermStatus,
  type NotifSettings,
} from '@/src/services/notificationService';
import { useActivityStore } from '@/src/store/activityStore';
import { useThemeStore } from '@/src/store/themeStore';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { router } from 'expo-router';
import {
  deleteUser,
  EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential,
  signOut,
} from 'firebase/auth';
import { deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState, AppStateStatus, Linking,
  Modal,
  Pressable, ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appAlert } from '@/components/AppAlert';
import { appPrompt } from '@/components/AppPrompt';

const REGION_OPTIONS: { key: string; label: string; flag: string }[] = [
  { key: 'US',         label: 'United States',  flag: '🇺🇸' },
  { key: 'UK',         label: 'United Kingdom', flag: '🇬🇧' },
  { key: 'EU',         label: 'European Union', flag: '🇪🇺' },
  { key: 'INDIA',      label: 'India',          flag: '🇮🇳' },
  { key: 'CHINA',      label: 'China',          flag: '🇨🇳' },
  { key: 'GLOBAL_AVG', label: 'Global Average', flag: '🌐' },
];

function getRegionLabel(key: string) {
  const r = REGION_OPTIONS.find(o => o.key === key);
  return r ? `${r.flag} ${r.label}` : key;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.sectionBlock}>
      <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>{title}</ThemedText>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        {children}
      </View>
    </View>
  );
}

type RowProps = {
  icon: string;
  iconColor?: string;
  label: string;
  value?: string;
  badge?: string;
  destructive?: boolean;
  chevron?: boolean;
  onPress?: () => void;
  rightNode?: React.ReactNode;
  separator?: boolean;
};

function Row({
  icon, iconColor, label, value, badge,
  destructive = false, chevron = true,
  onPress, rightNode, separator = true,
}: RowProps) {
  const { colors } = useAppTheme();
  const iconBg     = (iconColor ?? colors.tint) + '18';
  const labelColor = destructive ? '#EF5350' : colors.text;

  return (
    <>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [styles.row, pressed && onPress ? { opacity: 0.55 } : {}]}
      >
        <View style={[styles.rowIconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon as any} size={16} color={iconColor ?? colors.tint} />
        </View>
        <ThemedText style={[styles.rowLabel, { color: labelColor }]} numberOfLines={1}>
          {label}
        </ThemedText>
        <View style={styles.rowRight}>
          {rightNode}
          {badge && (
            <View style={[styles.badge, { backgroundColor: colors.tint + '20' }]}>
              <ThemedText style={[styles.badgeText, { color: colors.tint }]}>{badge}</ThemedText>
            </View>
          )}
          {value && (
            <ThemedText style={[styles.rowValue, { color: colors.text }]} numberOfLines={1}>
              {value}
            </ThemedText>
          )}
          {onPress && chevron && (
            <Ionicons name="chevron-forward" size={14} color={colors.text + '30'} />
          )}
        </View>
      </Pressable>
      {separator && <View style={[styles.sep, { backgroundColor: colors.surfaceMuted, marginLeft: 54 }]} />}
    </>
  );
}

function DocModal({
  visible, title, content, onClose,
}: {
  visible: boolean; title: string; content: string; onClose: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: colors.text }]}>{title}</ThemedText>
        </View>
        <ScrollView contentContainerStyle={styles.docScroll} showsVerticalScrollIndicator={false}>
          <ThemedText style={[styles.docText, { color: colors.text }]}>{content}</ThemedText>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function SettingsScreen() {
  const { scheme, colors } = useAppTheme();
  const isDark = scheme === 'dark';
  const mode    = useThemeStore(s => s.mode);
  const setMode = useThemeStore(s => s.setMode);
  const userProfile = useActivityStore(s => s.userProfile);

  const [region, setRegion]           = useState('GLOBAL_AVG');
  const [regionModal, setRegionModal] = useState(false);
  const [themeModal, setThemeModal]   = useState(false);
  const [hcStatus,   setHcStatus]     = useState<PermissionStatus>('not_asked');
  const [lastSynced, setLastSynced]   = useState<string | null>(null);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(false);
  const [notifPerm,      setNotifPerm]      = useState<NotifPermStatus>('not_asked');
  const [notifSettings,  setNotifSettings]  = useState<NotifSettings>(DEFAULT_NOTIF_SETTINGS);
  const [notifModal,     setNotifModal]     = useState(false);
  const [timePickerFor,  setTimePickerFor]  = useState<keyof NotifSettings | null>(null);

  const [cloudSyncTime,   setCloudSyncTime]   = useState<string>('Syncing…');
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'error'>('syncing');
  const unsubCloudSync = useRef<(() => void) | null>(null);

  const modalBg   = isDark ? '#1C2820' : '#FFFFFF';
  const overlayBg = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)';

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (unsubCloudSync.current) {
        unsubCloudSync.current();
        unsubCloudSync.current = null;
      }
      if (!user) return;
      const userDocRef = doc(db, 'users', user.uid);
      unsubCloudSync.current = onSnapshot(
        userDocRef,
        (snap) => {
          if (snap.exists()) {
            setRegion(snap.data().region || 'GLOBAL_AVG');
            setShowOnLeaderboard(snap.data().showOnLeaderboard ?? false);
          }
          const now = new Date();
          setCloudSyncTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          setCloudSyncStatus('synced');
        },
        (error) => {
          console.error('Settings cloud sync error:', error);
          setCloudSyncStatus('error');
          setCloudSyncTime('Error');
        }
      );
    });
    return () => {
      unsub();
      if (unsubCloudSync.current) unsubCloudSync.current();
    };
  }, []);

  useEffect(() => {
    const recheck = () => {
      checkHealthPermissions().then(setHcStatus);
      getSyncState().then(s => setLastSynced(s.lastSyncedAt));
    };
    // Load saved notification settings from AsyncStorage
    AsyncStorage.getItem('notifSettings').then(raw => {
      if (raw) {
        try { setNotifSettings(JSON.parse(raw)); } catch {}
      }
    });
    getNotifPermStatus().then(setNotifPerm);
    recheck();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') recheck();
    });
    return () => sub.remove();
  }, []);

  const selectRegion = async (r: string) => {
    if (auth.currentUser) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { region: r });
      setRegion(r);
    }
    setRegionModal(false);
  };

  const handleLeaderboardToggle = async (value: boolean) => {
    setShowOnLeaderboard(value);
    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      await updateDoc(doc(db, 'users', uid), { showOnLeaderboard: value });
      // Mirror to leaderboard collection with displayName and photoURL so it's reflected in community screen
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'leaderboard', uid), {
        showOnLeaderboard: value,
        displayName: userProfile?.displayName || null,
        photoURL: userProfile?.photoURL || null,
      }, { merge: true });
    }
  };

  const handleSignOut = () => {
    appAlert.show({
      title: 'Sign Out',
      message: 'Are you sure?',
      variant: 'confirm',
      confirmLabel: 'Sign Out',
      destructive: true,
      onConfirm: () => signOut(auth).then(() => router.replace('/login')),
    });
  };

  const handleDeleteAccount = () => {
    appAlert.show({
      title: 'Delete Account',
      message: 'This permanently deletes all your data and cannot be undone. Are you sure?',
      variant: 'confirm',
      confirmLabel: 'Delete Everything',
      destructive: true,
      icon: 'trash',
      onConfirm: async () => {
            const user = auth.currentUser;
            if (!user) return;

            // Signal _layout.tsx to ignore onAuthStateChanged during deletion
            const deletingRef = (global as any).__ecoverse_isDeletingAccount;
            if (deletingRef) deletingRef.current = true;

            const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
            const isEmail  = user.providerData.some(p => p.providerId === 'password');

            try {
              // ── Step 1: Re-authenticate ──
              if (isGoogle) {
                // Wait for AppAlert dismiss animation to fully complete before
                // presenting the Google account picker — on some devices the
                // picker conflicts with the modal layer still animating out.
                await new Promise(resolve => setTimeout(resolve, 350));
                await GoogleSignin.hasPlayServices();
                const info  = await GoogleSignin.signIn();
                const token = info.data?.idToken;
                if (!token) throw new Error('No ID token');
                await reauthenticateWithCredential(user, GoogleAuthProvider.credential(token));
              } else if (isEmail) {
                // Show password prompt for email re-auth
                await new Promise<void>((resolve, reject) => {
                  appPrompt.show({
                    title: 'Confirm Password',
                    message: 'Enter your password to permanently delete your account.',
                    placeholder: 'Password',
                    secure: true,
                    confirmLabel: 'Confirm',
                    cancelLabel: 'Cancel',
                    destructive: true,
                    icon: 'lock',
                    onConfirm: async (password) => {
                      const credential = EmailAuthProvider.credential(user.email!, password);
                      await reauthenticateWithCredential(user, credential);
                      resolve();
                    },
                    onCancel: () => reject(new Error('cancelled')),
                  });
                });
              }

              // ── Step 2: Firestore cleanup BEFORE auth delete ──
              // Done first so docs are cleaned up even if app crashes after auth delete.
              try {
                await Promise.all([
                  deleteDoc(doc(db, 'users', user.uid)),
                  deleteDoc(doc(db, 'leaderboard', user.uid)),
                ]);
              } catch { /* best-effort */ }

              // ── Step 3: Clear Zustand store ──
              // Done after Firestore cleanup so re-auth (which triggers onAuthStateChanged)
              // doesn't flash the app with a blank profile before deletion completes.
              useActivityStore.getState().clearActivities();
              useActivityStore.getState().setUserProfile(null as any);

              // ── Step 4: Delete Firebase Auth account ──
              await deleteUser(user);
              // Clear the deletion guard and navigate explicitly —
              // onAuthStateChanged is blocked by isDeletingAccount so we
              // must route manually after a successful delete.
              if (deletingRef) deletingRef.current = false;
              router.replace('/login');

            } catch (e: any) {
              if (deletingRef) deletingRef.current = false;
              if (e.message === 'cancelled') return;
              const msg =
                e.code === 'auth/requires-recent-login'
                  ? 'Please sign out and sign back in, then try deleting your account again.'
                  : e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
                  ? 'Incorrect password. Please try again.'
                  : e.code === 'auth/network-request-failed'
                  ? 'No internet connection. Please try again.'
                  : 'Could not delete account. Please try again.';
              appAlert.show({ title: 'Deletion Failed', message: msg });
            }
      },
    });
  };

  // ── Notification helpers ───────────────────────────────────────────────────
  const saveNotifSettings = async (updated: NotifSettings) => {
    setNotifSettings(updated);
    await AsyncStorage.setItem('notifSettings', JSON.stringify(updated));
    const currentStreak = 0; // pass real streak if available from store
    await applyNotifSettings(updated, currentStreak);
  };

  const handleNotifToggle = (key: keyof NotifSettings, value: boolean) => {
    saveNotifSettings({ ...notifSettings, [key]: value });
  };

  const handleTimeChange = (key: keyof NotifSettings, hhmm: string) => {
    saveNotifSettings({ ...notifSettings, [key]: hhmm });
  };

  const handleRequestNotifPerm = async () => {
    const status = await requestNotifPermission();
    setNotifPerm(status);
    if (status === 'granted') {
      await applyNotifSettings(notifSettings, 0);
    } else {
      appAlert.show({
        title: 'Notifications blocked',
        message: 'To enable notifications, go to your device Settings → Apps → EcoVerse → Notifications.',
        icon: 'bell-slash',
      });
    }
  };

  const handleFeedback = () => {
    Linking.openURL('mailto:ecoverse.dev.team@gmail.com?subject=EcoVerse%20Feedback').catch(() => {
      appAlert.show({ title: 'Could not open your email app', message: 'Please copy our address to send manually: ecoverse.dev.team@gmail.com' });
    });
  };

  const cloudSyncValue =
    cloudSyncStatus === 'synced'  ? `Synced ${cloudSyncTime}` :
    cloudSyncStatus === 'error'   ? 'Sync error' :
    'Syncing…';

  const THEME_OPTIONS = [
    { key: 'system', label: 'System', icon: 'phone-portrait-outline', color: '#6C8EBF' },
    { key: 'light',  label: 'Light',  icon: 'sunny-outline',          color: '#FDB813' },
    { key: 'dark',   label: 'Dark',   icon: 'moon-outline',           color: '#7878f8' },
  ] as const;
  const currentTheme = THEME_OPTIONS.find(t => t.key === mode) ?? THEME_OPTIONS[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: colors.text }]}>Settings</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Pressable
          style={[styles.profileCard, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/edit-profile')}
        >
          <View style={[styles.profileAvatar, { backgroundColor: colors.tint + '22' }]}>
            <ThemedText style={[styles.profileInitial, { color: colors.tint }]}>
              {userProfile?.displayName?.charAt(0).toUpperCase() || '?'}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.profileName,  { color: colors.text }]}>
              {userProfile?.displayName || 'Your Name'}
            </ThemedText>
            <ThemedText style={[styles.profileEmail, { color: colors.text }]}>
              {userProfile?.email || auth.currentUser?.email || ''}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.text + '40'} />
        </Pressable>

        <Section title="Account">
          <Row icon="globe-outline"  iconColor="#29B6F6" label="Region"
            value={getRegionLabel(region)} onPress={() => setRegionModal(true)} separator={true} />
          <Row icon="mail-outline"   iconColor="#4A90E2" label="Email"
            value={auth.currentUser?.email ?? '—'} chevron={false} separator={false} />
        </Section>

        <Section title="Appearance">
          <Row icon={currentTheme.icon} iconColor={currentTheme.color} label="Theme"
            value={currentTheme.label} onPress={() => setThemeModal(true)} separator={false} />
        </Section>

        <Section title="Notifications">
          {notifPerm !== 'granted' ? (
            // Not yet granted — show one-tap enable row
            <Row
              icon="notifications-outline"
              iconColor="#FFC107"
              label={notifPerm === 'denied' ? 'Notifications blocked' : 'Enable notifications'}
              value={notifPerm === 'denied' ? 'Open Settings' : 'Tap to allow'}
              onPress={handleRequestNotifPerm}
              separator={false}
            />
          ) : (
            <>
              <Row
                icon="notifications-outline" iconColor="#FFC107"
                label="Daily activity reminder"
                chevron={false} separator={true}
                rightNode={
                  <Switch
                    value={notifSettings.dailyReminder}
                    onValueChange={v => handleNotifToggle('dailyReminder', v)}
                    trackColor={{ true: colors.tint, false: colors.surfaceMuted }}
                    thumbColor="#fff"
                  />
                }
              />
              {notifSettings.dailyReminder && (
                <Row
                  icon="time-outline" iconColor="#FFC107"
                  label="Reminder time"
                  value={notifSettings.dailyReminderTime}
                  onPress={() => { setTimePickerFor('dailyReminderTime'); setNotifModal(true); }}
                  separator={true}
                />
              )}
              <Row
                icon="trophy-outline" iconColor="#FF7043"
                label="Weekly goal recap (Sunday)"
                chevron={false} separator={true}
                rightNode={
                  <Switch
                    value={notifSettings.weeklyGoalAlert}
                    onValueChange={v => handleNotifToggle('weeklyGoalAlert', v)}
                    trackColor={{ true: colors.tint, false: colors.surfaceMuted }}
                    thumbColor="#fff"
                  />
                }
              />
              <Row
                icon="footsteps-outline" iconColor="#29B6F6"
                label={'Missed yesterday nudge'}
                chevron={false} separator={true}
                rightNode={
                  <Switch
                    value={notifSettings.missedDayNudge}
                    onValueChange={v => handleNotifToggle('missedDayNudge', v)}
                    trackColor={{ true: colors.tint, false: colors.surfaceMuted }}
                    thumbColor="#fff"
                  />
                }
              />
              <Row
                icon="flame-outline" iconColor="#EF5350"
                label="Streak at-risk alert"
                chevron={false} separator={false}
                rightNode={
                  <Switch
                    value={notifSettings.streakAtRiskAlert}
                    onValueChange={v => handleNotifToggle('streakAtRiskAlert', v)}
                    trackColor={{ true: colors.tint, false: colors.surfaceMuted }}
                    thumbColor="#fff"
                  />
                }
              />
            </>
          )}
        </Section>

        <Section title="Data & Privacy">
          <Row icon="fitness-outline" iconColor="#66BB6A" label="Health Connect"
            value={hcStatus === 'granted' ? 'Connected' : hcStatus === 'unavailable' ? 'Unavailable' : 'Not connected'}
            onPress={() => router.push('/health-connect-setup' as any)} separator={true} />
          <Row icon="sync-outline" iconColor="#29B6F6" label="Sync activities"
            value={hcStatus === 'granted' ? formatSyncDate(lastSynced) : undefined}
            onPress={hcStatus === 'granted'
              ? () => router.push('/health-connect-sync' as any)
              : () => router.push('/health-connect-setup' as any)}
            separator={true} />
          <Row
            icon={cloudSyncStatus === 'error' ? 'cloud-offline-outline' : 'cloud-done-outline'}
            iconColor={cloudSyncStatus === 'error' ? '#EF5350' : '#4CAF50'}
            label="Cloud sync"
            value={cloudSyncValue}
            chevron={false}
            separator={true}
          />
          <Row icon="shield-checkmark-outline" iconColor="#26A69A" label="Privacy Policy"
            onPress={() => router.push('/privacy-policy')} separator={true} />
          <Row icon="document-text-outline" iconColor="#29B6F6" label="Terms of Service"
            onPress={() => router.push('/terms-of-service')} separator={true} />
          <Row
            icon="people-outline"
            iconColor="#4CAF50"
            label="Show profile on leaderboard"
            chevron={false}
            separator={false}
            rightNode={
              <Switch
                value={showOnLeaderboard}
                onValueChange={handleLeaderboardToggle}
                trackColor={{ true: colors.tint, false: colors.surfaceMuted }}
                thumbColor="#fff"
              />
            }
          />
        </Section>

        <Section title="About">
          <Row icon="leaf-outline" iconColor="#4CAF50" label="Version"
            value={appJson.expo.version + " Beta"} chevron={false} separator={true} />
          <Row icon="chatbubble-ellipses-outline" iconColor="#29B6F6" label="Send feedback"
            onPress={handleFeedback} separator={false} />
        </Section>

        <Section title="Account Actions">
          <Row icon="log-out-outline" iconColor="#EF5350" label="Sign Out"
            destructive chevron={false} onPress={handleSignOut} separator={true} />
          <Row icon="trash-outline"   iconColor="#EF5350" label="Delete Account"
            destructive chevron={false} onPress={handleDeleteAccount} separator={false} />
        </Section>

        <ThemedText style={[styles.footerText, { color: colors.text }]}>
          EcoVerse · v{appJson.expo.version} Beta
        </ThemedText>

      </ScrollView>

      {/* Region Modal */}
      <Modal visible={regionModal} transparent animationType="slide">
        <Pressable style={[styles.overlay, { backgroundColor: overlayBg }]} onPress={() => setRegionModal(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: modalBg }]} onPress={e => e.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.text + '20' }]} />
            <ThemedText style={[styles.sheetTitle,    { color: colors.text }]}>Select Region</ThemedText>
            <ThemedText style={[styles.sheetSubtitle, { color: colors.text }]}>
              Used for accurate CO₂ emission factor calculations.
            </ThemedText>
            {REGION_OPTIONS.map((r, i) => {
              const selected = region === r.key;
              return (
                <Pressable key={r.key} onPress={() => selectRegion(r.key)}
                  style={({ pressed }) => [
                    styles.sheetOption,
                    selected && { backgroundColor: colors.tint + '12' },
                    pressed  && { opacity: 0.6 },
                    i < REGION_OPTIONS.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.text + '12',
                    },
                  ]}
                >
                  <ThemedText style={styles.sheetOptionFlag}>{r.flag}</ThemedText>
                  <ThemedText style={[styles.sheetOptionLabel, { color: colors.text }]}>{r.label}</ThemedText>
                  {selected
                    ? <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
                    : <View style={[styles.radioCircle, { borderColor: colors.text + '25' }]} />}
                </Pressable>
              );
            })}
            <View style={{ height: 12 }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Theme Modal */}
      <Modal visible={themeModal} transparent animationType="slide">
        <Pressable style={[styles.overlay, { backgroundColor: overlayBg }]} onPress={() => setThemeModal(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: modalBg }]} onPress={e => e.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.text + '20' }]} />
            <ThemedText style={[styles.sheetTitle, { color: colors.text }]}>Choose Theme</ThemedText>
            {THEME_OPTIONS.map((t, i) => {
              const selected = mode === t.key;
              return (
                <Pressable key={t.key} onPress={() => { setMode(t.key); setThemeModal(false); }}
                  style={({ pressed }) => [
                    styles.sheetOption,
                    selected && { backgroundColor: colors.tint + '12' },
                    pressed  && { opacity: 0.6 },
                    i < THEME_OPTIONS.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.text + '12',
                    },
                  ]}
                >
                  <View style={[styles.themeIconWrap, { backgroundColor: t.color + '20' }]}>
                    <Ionicons name={t.icon as any} size={18} color={t.color} />
                  </View>
                  <ThemedText style={[styles.sheetOptionLabel, { color: colors.text }]}>{t.label}</ThemedText>
                  {selected
                    ? <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
                    : <View style={[styles.radioCircle, { borderColor: colors.text + '25' }]} />}
                </Pressable>
              );
            })}
            <View style={{ height: 12 }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Time picker modal (simple HH/MM drum) ── */}
      <Modal visible={notifModal} transparent animationType="slide">
        <Pressable style={[styles.overlay, { backgroundColor: overlayBg }]} onPress={() => setNotifModal(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: modalBg }]} onPress={e => e.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.text + '20' }]} />
            <ThemedText style={[styles.sheetTitle, { color: colors.text }]}>Set reminder time</ThemedText>
            <ThemedText style={[styles.sheetSubtitle, { color: colors.text }]}>
              Choose when you'd like to receive this notification each day.
            </ThemedText>
            {[
              { label: '6:00 AM',  value: '06:00' },
              { label: '8:00 AM',  value: '08:00' },
              { label: '12:00 PM', value: '12:00' },
              { label: '3:00 PM',  value: '15:00' },
              { label: '6:00 PM',  value: '18:00' },
              { label: '8:00 PM',  value: '20:00' },
              { label: '9:00 PM',  value: '21:00' },
            ].map((opt, i, arr) => {
              const currentVal = timePickerFor ? (notifSettings[timePickerFor] as string) : '';
              const selected   = currentVal === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    if (timePickerFor) handleTimeChange(timePickerFor, opt.value);
                    setNotifModal(false);
                  }}
                  style={({ pressed }) => [
                    styles.sheetOption,
                    selected && { backgroundColor: colors.tint + '12' },
                    pressed  && { opacity: 0.6 },
                    i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.text + '12' },
                  ]}
                >
                  <Ionicons name="time-outline" size={18} color={selected ? colors.tint : colors.text} style={{ opacity: 0.6 }} />
                  <ThemedText style={[styles.sheetOptionLabel, { color: colors.text }]}>{opt.label}</ThemedText>
                  {selected
                    ? <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
                    : <View style={[styles.radioCircle, { borderColor: colors.text + '25' }]} />}
                </Pressable>
              );
            })}
            <View style={{ height: 12 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 4 },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 14, marginBottom: 8 },
  profileAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  profileInitial: { fontSize: 20, fontWeight: '700' },
  profileName:    { fontSize: 16, fontWeight: '600' },
  profileEmail:   { fontSize: 13, opacity: 0.5, marginTop: 1 },
  sectionBlock: { gap: 6, marginTop: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4 },
  sectionCard:  { borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  rowIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel:    { flex: 1, fontSize: 15 },
  rowRight:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue:    { fontSize: 13, opacity: 0.45, maxWidth: 160 },
  sep:         { height: StyleSheet.hairlineWidth },
  badge:       { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText:   { fontSize: 11, fontWeight: '600' },
  footerText:  { textAlign: 'center', fontSize: 12, opacity: 0.25, marginTop: 20 },
  docScroll:   { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  docText:     { fontSize: 14, lineHeight: 22, opacity: 0.85 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 24 },
  sheetHandle:      { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:       { fontSize: 17, fontWeight: '700', paddingHorizontal: 20, marginBottom: 4 },
  sheetSubtitle:    { fontSize: 13, opacity: 0.45, paddingHorizontal: 20, marginBottom: 8 },
  sheetOption:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, gap: 12 },
  sheetOptionFlag:  { fontSize: 22 },
  sheetOptionLabel: { flex: 1, fontSize: 15 },
  radioCircle:      { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5 },
  themeIconWrap:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});