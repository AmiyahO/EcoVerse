// Settings screen
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useThemeStore } from '@/src/store/themeStore';
import { Pressable, ScrollView, StyleSheet, View, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from "expo-router";
import { GoogleAuthProvider, reauthenticateWithCredential, signOut, deleteUser } from 'firebase/auth';
import { auth, db } from '@/src/firebase/config';
import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

function SettingItem({
  label,
  value,
  onPress,
  iconName,
  iconColor,
  showChevron = true, // New prop to control chevron visibility
  isDestructive = false,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  iconName?: string;
  iconColor?: string;
  showChevron?: boolean;
  isDestructive?: boolean;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={styles.item}
    >
      {/* Left: Label */}
      <ThemedText style={{ color: isDestructive ? '#FF4444' : colors.text }}>{label}</ThemedText>

      {/* Right: Value + Icon */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {iconName && <Ionicons name={iconName as any} size={18} color={iconColor} />}
        {value && <ThemedText style={[styles.value, { color: colors.text }]}>{value}</ThemedText>}
        {onPress && showChevron && <Ionicons name="chevron-forward" size={16} color={colors.text + '44'} />}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() { 
  const { colors } = useAppTheme();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const [region, setRegion] = useState('Loading...');
  const [loading, setLoading] = useState(true);
  const regions = ['US', 'UK', 'EU', 'INDIA', 'CHINA', 'GLOBAL_AVG'];

  const [isRegionModalVisible, setRegionModalVisible] = useState(false); // New state

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setRegion(snap.data().region || 'GLOBAL_AVG');
      }
    } catch (error) {
      console.error("Firestore fetch error:", error);
    } finally {
      setLoading(false);
    }
  });
  return () => unsubscribe();
  }, []);

  const selectRegion = async (r: string) => {
    if (auth.currentUser) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { region: r });
      setRegion(r);
      setRegionModalVisible(false); // Close modal after selection
    }
  };

  // const handleRegionChange = () => {
  //   const regions = ['US', 'UK', 'EU', 'INDIA', 'CHINA', 'GLOBAL_AVG'];

  //   // We create the button array explicitly to satisfy TypeScript
  //   const buttons: any[] = regions.map(r => ({
  //     text: r,
  //     onPress: async () => {
  //       if (auth.currentUser) {
  //         await updateDoc(doc(db, 'users', auth.currentUser.uid), { region: r });
  //         setRegion(r);
  //       }
  //     }
  //   }));

  //   buttons.push({ text: "Cancel", style: "cancel" });

  //   Alert.alert("Select Region", "Calculations will update for future activities.", buttons);
  // };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Log Out", 
        style: "destructive", 
        onPress: () => signOut(auth).then(() => router.replace('/login')) 
      }
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This is permanent. All your eco-data and tokens will be deleted. Are you absolutely sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Everything", 
          style: "destructive", 
          onPress: async () => {
            const user = auth.currentUser;
            if (user) {
              try {
                // Re-authenticate Google users before deleting
              const isGoogleUser = user.providerData.some(
                p => p.providerId === 'google.com'
              );

              if (isGoogleUser) {
                await GoogleSignin.hasPlayServices();
                const userInfo = await GoogleSignin.signIn();
                const idToken = userInfo.data?.idToken;
                if (!idToken) throw new Error('No ID token');
                const credential = GoogleAuthProvider.credential(idToken);
                await reauthenticateWithCredential(user, credential);
              }

                // 1. Delete Firestore Data
                await deleteDoc(doc(db, "users", user.uid));
                // 2. Delete Auth User
                await deleteUser(user);
                router.replace('/login');
              } catch (e: any) {
                Alert.alert("Error", e.message || "Please try again.");
              }
            }
          } 
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <ThemedText type="title" style={{ color: colors.text, lineHeight: 35 }}>Settings</ThemedText>
      </View>
    
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        >
        {/* Account Section */}
        <View style={[
          styles.section,
          { backgroundColor: colors.surface }
        ]}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Account</ThemedText>
          <SettingItem label="Email" value={auth.currentUser?.email || 'Not available'} />
          <SettingItem label="Region" value={region} onPress={ () => setRegionModalVisible(true) } />
          <SettingItem label="Sign out" onPress={handleSignOut} iconName="log-out-outline" iconColor="#FF4444" />
        </View>

        {/* Preferences Section*/}
        <View style={[
          styles.section,
          { backgroundColor: colors.surface }
        ]}>
          <ThemedText type="defaultSemiBold" style = {{color: colors.text}}>Preferences</ThemedText>

          <SettingItem
            label="Theme"
            value={mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'}
            onPress={() => setMode(mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system')}
            iconName={mode === 'dark' ? 'moon' : mode === 'light' ? 'sunny' : 'phone-portrait'}
            iconColor={mode === 'dark' ? '#7878f8' : mode === 'light' ? '#FDB813' : '#4A90E2'} 
          />

          <SettingItem label="Notifications" value="On" />
        </View>

        {/* Data Section */}
        <View style={[
          styles.section,
          { backgroundColor: colors.surface }
        ]}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Data</ThemedText>
          <SettingItem label="Sync status" value="Up to date" />
          <SettingItem label="Reset local data" />
        </View>

        {/* About Section*/}
        <View style={[
          styles.section,
          { backgroundColor: colors.surface }
        ]}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>About</ThemedText>
          {/* Placeholder versions */}
          <SettingItem label="Version" value="1.0.1 (Beta)" /> 
          <SettingItem label="Terms of Service" onPress={() => {}} />
          <SettingItem label="Privacy Policy" onPress={() => Alert.alert("Privacy", "Your data is stored securely in Firebase and used only for CO₂ calculation.")} />
        </View>

        {/* Delete Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Danger Zone</ThemedText>
          <SettingItem 
            label="Delete Account" 
            onPress={handleDeleteAccount} 
            isDestructive={true} 
            showChevron={false}
          />
        </View>
      </ScrollView>

      {/* --- Region Selection Modal --- */}
      <Modal visible={isRegionModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <ThemedText type="subtitle" style={{ color: colors.text, marginBottom: 15 }}>Select Region</ThemedText>
            {regions.map((r) => (
              <Pressable key={r} onPress={() => selectRegion(r)} style={styles.modalOption}>
                <ThemedText style={{ color: colors.text }}>{r}</ThemedText>
                {region === r && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
              </Pressable>
            ))}
            <Pressable onPress={() => setRegionModalVisible(false)} style={styles.closeBtn}>
              <ThemedText style={{ color: colors.text, opacity: 0.6 }}>Cancel</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60, 
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center', 
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  value: {
    fontSize: 12,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  closeBtn: {
    marginTop: 15,
    alignItems: 'center',
  }
});
