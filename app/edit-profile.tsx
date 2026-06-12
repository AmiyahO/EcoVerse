// edit-profile.tsx
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { auth, db } from '@/src/firebase/config';
import { useActivityStore } from '@/src/store/activityStore';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Pressable,
  StyleSheet, TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { playSound } from '@/src/utils/sfx';
import { appAlert } from '@/components/AppAlert';

const CLOUD_NAME    = 'dn70uuubp';
const UPLOAD_PRESET = 'ecoverse_default';

const WEEKLY_TARGET_PRESETS = [250, 500, 750, 1000, 1500];

export default function EditProfileScreen() {
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';
  const setUserProfile = useActivityStore(s => s.setUserProfile);
  const userProfile = useActivityStore(s => s.userProfile);

  const [displayName, setDisplayName]   = useState('');
  const [weeklyTarget, setWeeklyTarget] = useState('500');
  const [photoURL, setPhotoURL]         = useState<string | null>(null);
  const [isSaving, setIsSaving]         = useState(false);
  const [isUploading, setIsUploading]   = useState(false);
  const [loading, setLoading]           = useState(true);
  const [nameFocused, setNameFocused]   = useState(false);
  const [targetFocused, setTargetFocused] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    async function loadProfile() {
      if (!auth.currentUser) return;
      try {
        const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          setDisplayName(data.displayName || '');
          setWeeklyTarget(data.weeklyTarget?.toString() || '500');
          setPhotoURL(data.photoURL || null);
        }
      } catch (e) {
        console.error('Error loading profile:', e);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      appAlert.show({ title: 'Permission needed', message: 'Please allow gallery access in Settings.', icon: 'images' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled) uploadToCloudinary(result.assets[0].uri);
  };

  const uploadToCloudinary = async (fileUri: string) => {
    setIsUploading(true);
    const data = new FormData();
    data.append('file', { uri: fileUri, type: 'image/jpeg', name: 'avatar.jpg' } as any);
    data.append('upload_preset', UPLOAD_PRESET);
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: data, headers: { Accept: 'application/json', 'Content-Type': 'multipart/form-data' } }
      );
      const result = await response.json();
      if (result.secure_url) {
        setPhotoURL(result.secure_url);
      } else {
        throw new Error('Upload failed');
      }
    } catch (e) {
      appAlert.show({ title: 'Upload failed', message: 'Could not upload your photo. Please try again.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    if (!displayName.trim()) {
      appAlert.show({ title: 'Name required', message: 'Please enter a display name.' });
      return;
    }
    const target = Number(weeklyTarget);
    if (isNaN(target) || target < 1) {
      appAlert.show({ title: 'Invalid target', message: 'Weekly token target must be at least 1.' });
      return;
    }

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName: displayName.trim(),
        weeklyTarget: target,
        photoURL,
      });
      // Update leaderboard if it exists
      const leaderboardRef = doc(db, 'leaderboard', auth.currentUser.uid);
      await updateDoc(leaderboardRef, {
        displayName: displayName.trim(),
        photoURL,
      }).catch(() => {}); // Ignore if leaderboard doc doesn't exist
      // Update local store immediately so header reflects changes
      setUserProfile({
        displayName: displayName.trim(),
        email: auth.currentUser.email || '',
        photoURL,
        weeklyTarget: target,
        tokens: userProfile?.tokens ?? 0,
        totalCarbonSaved: userProfile?.totalCarbonSaved ?? 0,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playSound('activity-save').catch(() => {});
      router.back();
    } catch (e) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      appAlert.show({ title: 'Error', message: 'Could not save changes. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const inputBorder = (focused: boolean) =>
    focused ? colors.tint + '99' : (isDark ? '#ffffff14' : '#00000014');

  const initial = displayName.charAt(0).toUpperCase() || '?';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</ThemedText>
        {/* Save shortcut in header */}
        <Pressable
          onPress={handleSave}
          disabled={isSaving || loading}
          style={[styles.headerSaveBtn, { backgroundColor: colors.tint, opacity: (isSaving || loading) ? 0.5 : 1 }]}
        >
          {isSaving
            ? <ActivityIndicator size="small" color="#fff" />
            : <ThemedText style={styles.headerSaveBtnText}>Save</ThemedText>
          }
        </Pressable>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Avatar ── */}
        <View style={styles.avatarSection}>
          <Pressable onPress={pickImage} style={styles.avatarOuter}>
            {/* Tinted ring */}
            <View style={[styles.avatarRing, { borderColor: colors.tint + '55' }]}>
              {photoURL ? (
                <Image source={{ uri: photoURL }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.tint + '22' }]}>
                  {loading ? (
                    <ActivityIndicator color={colors.tint} />
                  ) : (
                    <ThemedText style={[styles.initial, { color: colors.tint }]}>{initial}</ThemedText>
                  )}
                </View>
              )}
            </View>
            {/* Camera badge */}
            <View style={[styles.cameraBadge, { backgroundColor: colors.tint, borderColor: colors.background }]}>
              {isUploading
                ? <ActivityIndicator size="small" color="#fff" />
                : <FontAwesome6 name="camera" size={11} color="#fff" />
              }
            </View>
          </Pressable>
          <ThemedText style={[styles.avatarHint, { color: colors.text }]}>
            {isUploading ? 'Uploading…' : 'Tap to change photo'}
          </ThemedText>
        </View>

        {/* ── Form ── */}
        <View style={styles.form}>

          {/* Display Name */}
          <View style={styles.fieldGroup}>
            <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>Display Name</ThemedText>
            <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: inputBorder(nameFocused) }]}>
              <Ionicons name="person-outline" size={16} color={colors.text + '55'} style={styles.fieldIcon} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={colors.text + '44'}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
              {displayName.length > 0 && (
                <Pressable onPress={() => setDisplayName('')} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={16} color={colors.text + '44'} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Weekly Target */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>Weekly Token Target</ThemedText>
              <View style={[styles.targetBadge, { backgroundColor: colors.tint + '18' }]}>
                <FontAwesome6 name="leaf" size={10} color={colors.tint} />
                <ThemedText style={[styles.targetBadgeText, { color: colors.tint }]}>
                  {weeklyTarget || '—'} tokens/week
                </ThemedText>
              </View>
            </View>

            {/* Quick-select preset chips */}
            <View style={styles.presetRow}>
              {WEEKLY_TARGET_PRESETS.map(p => {
                const selected = weeklyTarget === String(p);
                return (
                  <Pressable
                    key={p}
                    onPress={() => setWeeklyTarget(String(p))}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: selected ? colors.tint : colors.surface,
                        borderColor: selected ? colors.tint : (isDark ? '#ffffff14' : '#00000012'),
                      },
                    ]}
                  >
                    <ThemedText style={[styles.presetChipText, { color: selected ? '#fff' : colors.text }]}>
                      {p}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {/* Manual input */}
            <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: inputBorder(targetFocused) }]}>
              <FontAwesome6 name="bullseye" size={14} color={colors.text + '55'} style={styles.fieldIcon} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                value={weeklyTarget}
                onChangeText={setWeeklyTarget}
                keyboardType="numeric"
                placeholder="Custom target"
                placeholderTextColor={colors.text + '44'}
                onFocus={() => setTargetFocused(true)}
                onBlur={() => setTargetFocused(false)}
              />
            </View>
            <ThemedText style={[styles.fieldHint, { color: colors.text }]}>
              Set a weekly goal to stay motivated. You earn tokens through every logged eco-activity.
            </ThemedText>
          </View>

        </View>

        {/* ── Save button ── */}
        <Pressable
          style={[styles.saveBtn, { backgroundColor: colors.tint, opacity: (isSaving || loading) ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={isSaving || loading}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <ThemedText style={styles.saveBtnText}>Save Changes</ThemedText>
            </>
          )}
        </Pressable>

      </Animated.ScrollView>
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
  headerTitle:       { flex: 1, fontSize: 20, fontWeight: '700' },
  headerSaveBtn:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  headerSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  scroll: { paddingHorizontal: 20, paddingBottom: 48, gap: 24 },

  // Avatar
  avatarSection: { alignItems: 'center', paddingVertical: 8 },
  avatarOuter:   { position: 'relative', marginBottom: 10 },
  avatarRing: {
    width: 104, height: 104, borderRadius: 52,
    borderWidth: 2.5, padding: 3,
  },
  avatar: {
    width: 95, height: 95, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'visible',
  },
  
  initial:    { fontSize: 32, fontWeight: '700', lineHeight: 38, includeFontPadding: false },
  cameraBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  avatarHint: { fontSize: 13, opacity: 0.45 },

  // Form
  form:       { gap: 20 },
  fieldGroup: { gap: 10 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { fontSize: 14, fontWeight: '600', opacity: 0.7 },
  fieldHint:  { fontSize: 12, opacity: 0.4, lineHeight: 17, paddingHorizontal: 2 },

  targetBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  targetBadgeText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  presetRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  presetChip:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  presetChipText: { fontSize: 13, fontWeight: '600' },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, height: 50,
  },
  fieldIcon:  { marginRight: 10 },
  textInput:  { flex: 1, fontSize: 15 },
  clearBtn:   { padding: 4 },

  // Save
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 54, borderRadius: 14, marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});