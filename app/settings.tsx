// settings.tsx
import {
  View, StyleSheet, Pressable, ScrollView,
  Alert, Modal, Switch, Linking,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useThemeStore } from '@/src/store/themeStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  GoogleAuthProvider, reauthenticateWithCredential,
  signOut, deleteUser,
} from 'firebase/auth';
import { auth, db } from '@/src/firebase/config';
import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActivityStore } from '@/src/store/activityStore';

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

// ── Section wrapper ─────────────────────────────────────────────────────────
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

// ── Single row ───────────────────────────────────────────────────────────────
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
  const iconBg    = (iconColor ?? colors.tint) + '18';
  const labelColor = destructive ? '#EF5350' : colors.text;

  return (
    <>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [styles.row, pressed && onPress ? { opacity: 0.55 } : {}]}
      >
        {/* Left icon */}
        <View style={[styles.rowIconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon as any} size={16} color={iconColor ?? colors.tint} />
        </View>

        <ThemedText style={[styles.rowLabel, { color: labelColor }]} numberOfLines={1}>
          {label}
        </ThemedText>

        {/* Right side */}
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

// ── Screen ───────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { scheme, colors } = useAppTheme();
  const isDark = scheme === 'dark';
  const mode    = useThemeStore(s => s.mode);
  const setMode = useThemeStore(s => s.setMode);
  const userProfile = useActivityStore(s => s.userProfile);

  const [region, setRegion]                   = useState('GLOBAL_AVG');
  const [regionModal, setRegionModal]         = useState(false);
  const [themeModal, setThemeModal]           = useState(false);

  const modalBg = isDark ? '#1C2820' : '#FFFFFF';
  const overlayBg = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)';

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async user => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) setRegion(snap.data().region || 'GLOBAL_AVG');
      } catch (e) { console.error(e); }
    });
    return () => unsub();
  }, []);

  const selectRegion = async (r: string) => {
    if (auth.currentUser) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { region: r });
      setRegion(r);
    }
    setRegionModal(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: () => signOut(auth).then(() => router.replace('/login')),
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes all your data and cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything', style: 'destructive',
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
              const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
              if (isGoogle) {
                await GoogleSignin.hasPlayServices();
                const info    = await GoogleSignin.signIn();
                const token   = info.data?.idToken;
                if (!token) throw new Error('No ID token');
                await reauthenticateWithCredential(user, GoogleAuthProvider.credential(token));
              }
              await deleteDoc(doc(db, 'users', user.uid));
              await deleteUser(user);
              router.replace('/login');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Theme display
  const THEME_OPTIONS = [
    { key: 'system', label: 'System',    icon: 'phone-portrait-outline', color: '#6C8EBF' },
    { key: 'light',  label: 'Light',     icon: 'sunny-outline',           color: '#FDB813' },
    { key: 'dark',   label: 'Dark',      icon: 'moon-outline',            color: '#7878f8' },
  ] as const;
  const currentTheme = THEME_OPTIONS.find(t => t.key === mode) ?? THEME_OPTIONS[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: colors.text }]}>Settings</ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Profile card ── */}
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
            <ThemedText style={[styles.profileName, { color: colors.text }]}>
              {userProfile?.displayName || 'Your Name'}
            </ThemedText>
            <ThemedText style={[styles.profileEmail, { color: colors.text }]}>
              {userProfile?.email || auth.currentUser?.email || ''}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.text + '40'} />
        </Pressable>

        {/* ── Account ── */}
        <Section title="Account">
          <Row
            icon="globe-outline"
            iconColor="#29B6F6"
            label="Region"
            value={getRegionLabel(region)}
            onPress={() => setRegionModal(true)}
            separator={true}
          />
          <Row
            icon="mail-outline"
            iconColor="#4A90E2"
            label="Email"
            value={auth.currentUser?.email ?? '—'}
            chevron={false}
            separator={false}
          />
        </Section>

        {/* ── Appearance ── */}
        <Section title="Appearance">
          <Row
            icon={currentTheme.icon}
            iconColor={currentTheme.color}
            label="Theme"
            value={currentTheme.label}
            onPress={() => setThemeModal(true)}
            separator={false}
          />
        </Section>

        {/* ── Notifications ── */}
        <Section title="Notifications">
          <Row
            icon="notifications-outline"
            iconColor="#FFC107"
            label="Activity reminders"
            badge="Soon"
            chevron={false}
            separator={true}
          />
          <Row
            icon="trophy-outline"
            iconColor="#FF7043"
            label="Weekly goal alerts"
            badge="Soon"
            chevron={false}
            separator={false}
          />
        </Section>

        {/* ── Data & Privacy ── */}
        <Section title="Data & Privacy">
          <Row
            icon="cloud-done-outline"
            iconColor="#4CAF50"
            label="Cloud sync"
            value="Active"
            chevron={false}
            separator={true}
          />
          <Row
            icon="shield-checkmark-outline"
            iconColor="#26A69A"
            label="Privacy Policy"
            onPress={() =>
              Alert.alert(
                'Privacy',
                'Your data is stored securely in Firebase. Region is used only for CO₂ calculations — no GPS data is ever collected or stored.'
              )
            }
            separator={true}
          />
          <Row
            icon="document-text-outline"
            iconColor="#29B6F6"
            label="Terms of Service"
            onPress={() => {}}
            separator={false}
          />
        </Section>

        {/* ── About ── */}
        <Section title="About">
          <Row
            icon="leaf-outline"
            iconColor="#4CAF50"
            label="Version"
            value="1.0.1 Beta"
            chevron={false}
            separator={true}
          />
          <Row
            icon="star-outline"
            iconColor="#FFB300"
            label="Rate EcoVerse"
            badge="Soon"
            chevron={false}
            separator={false}
          />
        </Section>

        {/* ── Account Actions ── */}
        <Section title="Account Actions">
          <Row
            icon="log-out-outline"
            iconColor="#EF5350"
            label="Sign Out"
            destructive
            chevron={false}
            onPress={handleSignOut}
            separator={true}
          />
          <Row
            icon="trash-outline"
            iconColor="#EF5350"
            label="Delete Account"
            destructive
            chevron={false}
            onPress={handleDeleteAccount}
            separator={false}
          />
        </Section>

        <ThemedText style={[styles.footerText, { color: colors.text }]}>
          EcoVerse · v1.0.1 Beta · Made with 🌱
        </ThemedText>

      </ScrollView>

      {/* ── Region Modal ── */}
      <Modal visible={regionModal} transparent animationType="slide">
        <Pressable
          style={[styles.overlay, { backgroundColor: overlayBg }]}
          onPress={() => setRegionModal(false)}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: modalBg }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.text + '20' }]} />
            <ThemedText style={[styles.sheetTitle, { color: colors.text }]}>Select Region</ThemedText>
            <ThemedText style={[styles.sheetSubtitle, { color: colors.text }]}>
              Used for accurate CO₂ emission factor calculations.
            </ThemedText>
            {REGION_OPTIONS.map((r, i) => {
              const selected = region === r.key;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => selectRegion(r.key)}
                  style={({ pressed }) => [
                    styles.sheetOption,
                    selected && { backgroundColor: colors.tint + '12' },
                    pressed && { opacity: 0.6 },
                    i < REGION_OPTIONS.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.text + '12',
                    },
                  ]}
                >
                  <ThemedText style={[styles.sheetOptionFlag]}>{r.flag}</ThemedText>
                  <ThemedText style={[styles.sheetOptionLabel, { color: colors.text }]}>{r.label}</ThemedText>
                  {selected
                    ? <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
                    : <View style={[styles.radioCircle, { borderColor: colors.text + '25' }]} />
                  }
                </Pressable>
              );
            })}
            <View style={{ height: 12 }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Theme Modal ── */}
      <Modal visible={themeModal} transparent animationType="slide">
        <Pressable
          style={[styles.overlay, { backgroundColor: overlayBg }]}
          onPress={() => setThemeModal(false)}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: modalBg }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.text + '20' }]} />
            <ThemedText style={[styles.sheetTitle, { color: colors.text }]}>Choose Theme</ThemedText>

            {THEME_OPTIONS.map((t, i) => {
              const selected = mode === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => { setMode(t.key); setThemeModal(false); }}
                  style={({ pressed }) => [
                    styles.sheetOption,
                    selected && { backgroundColor: colors.tint + '12' },
                    pressed && { opacity: 0.6 },
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
                    : <View style={[styles.radioCircle, { borderColor: colors.text + '25' }]} />
                  }
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

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },

  scroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 4 },

  // Profile card
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 16, gap: 14, marginBottom: 8,
  },
  profileAvatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  profileInitial: { fontSize: 20, fontWeight: '700' },
  profileName:    { fontSize: 16, fontWeight: '600' },
  profileEmail:   { fontSize: 13, opacity: 0.5, marginTop: 1 },

  // Section
  sectionBlock: { gap: 6, marginTop: 10 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', opacity: 0.5,
    textTransform: 'uppercase', letterSpacing: 1,
    paddingHorizontal: 4,
  },
  sectionCard: { borderRadius: 14, overflow: 'hidden' },

  // Row
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13, gap: 12,
  },
  rowIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel:    { flex: 1, fontSize: 15 },
  rowRight:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue:    { fontSize: 13, opacity: 0.45, maxWidth: 160 },
  sep:         { height: StyleSheet.hairlineWidth },
  badge:       { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText:   { fontSize: 11, fontWeight: '600' },

  footerText: { textAlign: 'center', fontSize: 12, opacity: 0.25, marginTop: 20 },

  // Sheet / Modal
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 24,
  },
  sheetHandle:   { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:    { fontSize: 17, fontWeight: '700', paddingHorizontal: 20, marginBottom: 4 },
  sheetSubtitle: { fontSize: 13, opacity: 0.45, paddingHorizontal: 20, marginBottom: 8 },
  sheetOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 15, gap: 12,
  },
  sheetOptionFlag:  { fontSize: 22 },
  sheetOptionLabel: { flex: 1, fontSize: 15 },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5 },

  themeIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});