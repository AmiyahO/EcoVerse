// Settings screen
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useThemeStore } from '@/src/store/themeStore';
import { Pressable, ScrollView, StyleSheet, View, Alert, Modal } from 'react-native';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { router } from "expo-router";
import { GoogleAuthProvider, reauthenticateWithCredential, signOut, deleteUser } from 'firebase/auth';
import { auth, db } from '@/src/firebase/config';
import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { SafeAreaView } from 'react-native-safe-area-context';

const REGION_LABELS: Record<string, string> = {
  US: '🇺🇸 United States',
  UK: '🇬🇧 United Kingdom',
  EU: '🇪🇺 European Union',
  INDIA: '🇮🇳 India',
  CHINA: '🇨🇳 China',
  GLOBAL_AVG: '🌐 Other / Global',
};

type SettingRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  leftIcon?: string;
  leftIconColor?: string;
  isDestructive?: boolean;
  showChevron?: boolean;
  badge?: string;
};

function SettingRow({
  label,
  value,
  onPress,
  leftIcon,
  leftIconColor,
  isDestructive = false,
  showChevron = true,
  badge,
}: SettingRowProps) {
  const { colors } = useAppTheme();
  const textColor = isDestructive ? '#EF5350' : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress ? { opacity: 0.6 } : {},
      ]}
    >
      <View style={styles.rowLeft}>
        {leftIcon && (
          <View style={[styles.rowIconWrap, { backgroundColor: (leftIconColor ?? colors.tint) + '18' }]}>
            <Ionicons name={leftIcon as any} size={16} color={leftIconColor ?? colors.tint} />
          </View>
        )}
        <ThemedText style={[styles.rowLabel, { color: textColor }]}>{label}</ThemedText>
      </View>

      <View style={styles.rowRight}>
        {badge && (
          <View style={[styles.badge, { backgroundColor: colors.tint + '22' }]}>
            <ThemedText style={[styles.badgeText, { color: colors.tint }]}>{badge}</ThemedText>
          </View>
        )}
        {value && (
          <ThemedText style={[styles.rowValue, { color: colors.text }]}>{value}</ThemedText>
        )}
        {onPress && showChevron && (
          <Ionicons name="chevron-forward" size={15} color={colors.text + '33'} />
        )}
      </View>
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { colors } = useAppTheme();
  return (
    <ThemedText style={[styles.sectionHeader, { color: colors.text  }]}>
      {title}
    </ThemedText>
  );
}

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const mode = useThemeStore(s => s.mode);
  const setMode = useThemeStore(s => s.setMode);

  const [region, setRegion] = useState('GLOBAL_AVG');
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const regions = ['US', 'UK', 'EU', 'INDIA', 'CHINA', 'GLOBAL_AVG'];

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) setRegion(snap.data().region || 'GLOBAL_AVG');
      } catch (e) {
        console.error('Firestore fetch error:', e);
      }
    });
    return () => unsubscribe();
  }, []);

  const selectRegion = async (r: string) => {
    if (auth.currentUser) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { region: r });
      setRegion(r);
      setRegionModalVisible(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => signOut(auth).then(() => router.replace('/login')),
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This is permanent. All your eco-data and tokens will be deleted. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
              const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
              if (isGoogleUser) {
                await GoogleSignin.hasPlayServices();
                const userInfo = await GoogleSignin.signIn();
                const idToken = userInfo.data?.idToken;
                if (!idToken) throw new Error('No ID token');
                const credential = GoogleAuthProvider.credential(idToken);
                await reauthenticateWithCredential(user, credential);
              }
              await deleteDoc(doc(db, 'users', user.uid));
              await deleteUser(user);
              router.replace('/login');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Please try again.');
            }
          },
        },
      ]
    );
  };

  const themeIcon = mode === 'dark' ? 'moon' : mode === 'light' ? 'sunny' : 'phone-portrait-outline';
  const themeColor = mode === 'dark' ? '#7878f8' : mode === 'light' ? '#FDB813' : '#4A90E2';
  const themeLabel = mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: colors.text }]}>Settings</ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Account ── */}
        <SectionHeader title="Account" />
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <SettingRow
            label="Email"
            value={auth.currentUser?.email ?? '—'}
            leftIcon="mail-outline"
            leftIconColor="#4A90E2"
            showChevron={false}
          />
          <View style={[styles.separator, { backgroundColor: colors.surfaceMuted }]} />
          <SettingRow
            label="Region"
            value={REGION_LABELS[region] ?? region}
            leftIcon="globe-outline"
            leftIconColor="#29B6F6"
            onPress={() => setRegionModalVisible(true)}
          />
          <View style={[styles.separator, { backgroundColor: colors.surfaceMuted }]} />
          <SettingRow
            label="Sign Out"
            leftIcon="log-out-outline"
            leftIconColor="#EF5350"
            isDestructive
            showChevron={false}
            onPress={handleSignOut}
          />
        </View>

        {/* ── Preferences ── */}
        <SectionHeader title="Preferences" />
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <SettingRow
            label="Theme"
            value={themeLabel}
            leftIcon={themeIcon}
            leftIconColor={themeColor}
            onPress={() => setMode(mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system')}
          />
          <View style={[styles.separator, { backgroundColor: colors.surfaceMuted }]} />
          <SettingRow
            label="Notifications"
            leftIcon="notifications-outline"
            leftIconColor="#FFC107"
            badge="Soon"
            showChevron={false}
          />
        </View>

        {/* ── Data ── */}
        <SectionHeader title="Data" />
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <SettingRow
            label="Sync status"
            leftIcon="cloud-done-outline"
            leftIconColor="#4CAF50"
            badge="Soon"
            showChevron={false}
          />
          <View style={[styles.separator, { backgroundColor: colors.surfaceMuted }]} />
          <SettingRow
            label="Reset local data"
            leftIcon="refresh-outline"
            leftIconColor="#FF7043"
            badge="Soon"
            showChevron={false}
          />
        </View>

        {/* ── About ── */}
        <SectionHeader title="About" />
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <SettingRow
            label="Version"
            value="1.0.1 (Beta)"
            leftIcon="information-circle-outline"
            leftIconColor="#26C6DA"
            showChevron={false}
          />
          <View style={[styles.separator, { backgroundColor: colors.surfaceMuted }]} />
          <SettingRow
            label="Privacy Policy"
            leftIcon="shield-checkmark-outline"
            leftIconColor="#4CAF50"
            onPress={() =>
              Alert.alert(
                'Privacy',
                'Your data is stored securely in Firebase and used only for CO₂ calculation.'
              )
            }
          />
          <View style={[styles.separator, { backgroundColor: colors.surfaceMuted }]} />
          <SettingRow
            label="Terms of Service"
            leftIcon="document-text-outline"
            leftIconColor="#29B6F6"
            onPress={() => {}}
          />
        </View>

        {/* ── Danger Zone ── */}
        <SectionHeader title="Danger Zone" />
        <View style={[styles.section, styles.dangerSection, { backgroundColor: '#EF535010', borderColor: '#EF535030' }]}>
          <SettingRow
            label="Delete Account"
            leftIcon="trash-outline"
            leftIconColor="#EF5350"
            isDestructive
            showChevron={false}
            onPress={handleDeleteAccount}
          />
        </View>

        <ThemedText style={[styles.footerNote, { color: colors.text }]}>
          EcoVerse · v1.0.1 Beta · Made with 🌱
        </ThemedText>
      </ScrollView>

      {/* ── Region Modal ── */}
      <Modal visible={regionModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setRegionModalVisible(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Select Region</ThemedText>
            <ThemedText style={[styles.modalSubtitle, { color: colors.text }]}>
              Used for accurate CO₂ calculations
            </ThemedText>
            {regions.map((r, idx) => (
              <Pressable
                key={r}
                onPress={() => selectRegion(r)}
                style={[
                  styles.modalOption,
                  idx < regions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surfaceMuted },
                  region === r && { backgroundColor: colors.tint + '12' },
                ]}
              >
                <ThemedText style={[styles.modalOptionText, { color: colors.text }]}>
                  {REGION_LABELS[r]}
                </ThemedText>
                {region === r && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 6,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  section: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  dangerSection: {
    borderWidth: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 15,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 13,
    opacity: 0.5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Footer
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.3,
    marginTop: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 32,
  },
  modalCard: {
    borderRadius: 20,
    overflow: 'hidden',
    paddingTop: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 20,
  },
  modalSubtitle: {
    fontSize: 13,
    opacity: 0.5,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalOptionText: {
    fontSize: 15,
  },
});