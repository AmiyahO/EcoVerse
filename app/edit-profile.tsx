import { View, StyleSheet, TextInput, Pressable, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '@/src/firebase/config';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemedText } from '@/components/themed-text';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function EditProfileScreen() {
  const { colors } = useAppTheme();
  const [displayName, setDisplayName] = useState('');
  const [weeklyTarget, setWeeklyTarget] = useState('500');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- CLOUDINARY CONFIG ---
  const CLOUD_NAME = "dn70uuubp";
  const UPLOAD_PRESET = "ecoverse_default"; // REPLACE THIS (e.g., ml_default)

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
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false); // Set to false when done
      }
    }
    loadProfile();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery access is needed.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadToCloudinary(result.assets[0].uri);
    }
  };

  const uploadToCloudinary = async (fileUri: string) => {
    setIsUploading(true);
    
    // Cloudinary requires FormData for unsigned uploads
    const data = new FormData();
    data.append('file', {
      uri: fileUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as any);
    data.append('upload_preset', UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: data,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const result = await response.json();
      if (result.secure_url) {
        setPhotoURL(result.secure_url);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Upload Error", "Failed to upload image to Cloudinary.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;

    if (!displayName.trim()) {
        Alert.alert("Required", "Please enter a display name.");
        return;
    }

    if (!weeklyTarget.trim() || isNaN(Number(weeklyTarget)) || Number(weeklyTarget) < 1) {
      Alert.alert("Invalid Target", "Please enter a valid weekly token target (minimum 1).");
      return;
    }

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName: displayName.trim(),
        weeklyTarget: Number(weeklyTarget) || 500,
        photoURL: photoURL, // Saves the Cloudinary URL to Firestore
      });
      // Trigger success haptic
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Could not update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Fixed Left-Aligned Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <ThemedText type="title" style={[styles.headerTitle, { color: colors.text }]}>
          Edit Profile
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.avatarSection}>
          <Pressable onPress={pickImage} style={styles.avatarContainer}>
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.surfaceMuted, borderColor: colors.tint, }]}>
                <ThemedText style={[styles.initialText, {color: colors.text}]}>
                  {loading ? '' : (displayName.charAt(0).toUpperCase() || 'U')}
                </ThemedText>
              </View>
            )}
            <View style={[styles.editOverlay, { backgroundColor: colors.tint }]}>
              {isUploading ? <ActivityIndicator size="small" color="#fff" /> : <FontAwesome6 name="camera" size={12} color="#fff" />}
            </View>
          </Pressable>
        </View>
        
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText type="defaultSemiBold" style={[styles.label, {color: colors.text}]}>Display Name</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor="#888"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="defaultSemiBold" style={[styles.label, {color: colors.text}]}>Weekly Token Target</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
              value={weeklyTarget}
              onChangeText={setWeeklyTarget}
              keyboardType="numeric"
              placeholder="500"
              placeholderTextColor="#888"
            />
            <ThemedText style={[styles.helperText, {color: colors.text}]}>
              Set a goal for tokens earned through eco-activities each week.
            </ThemedText>
          </View>

          <Pressable 
            style={[styles.saveBtn, { backgroundColor: colors.tint, opacity: isSaving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <ThemedText style={styles.saveBtnText}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700'
  },
  container: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  avatarContainer: { width: 110, height: 110, position: 'relative' },
  avatar: { 
    width: 110, 
    height: 110, 
    borderRadius: 55, 
    borderWidth: 3, 
    justifyContent: 'center', 
    alignItems: 'center',
    overflow: 'hidden'
  },
  initialText: { 
    fontSize: 45, // Increased for better look
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    includeFontPadding: false, // Fixes Android vertical centering issues
    textAlignVertical: 'center', // Fixes Android vertical centering issues
    lineHeight: 55
  },
  editOverlay: { position: 'absolute', bottom: 5, right: 5, width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  form: { gap: 24 },
  inputGroup: { gap: 8 },
  label: { fontSize: 16, marginLeft: 4 },
  input: { padding: 16, borderRadius: 12, fontSize: 16 },
  helperText: { fontSize: 12, opacity: 0.5, paddingHorizontal: 4 },
  saveBtn: {
    marginTop: 10,
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 2
  },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});