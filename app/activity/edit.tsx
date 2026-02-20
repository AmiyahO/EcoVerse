import { View, StyleSheet, Pressable, TextInput, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '@/src/firebase/config';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemedText } from '@/components/themed-text';
import { useActivityStore } from '@/src/store/activityStore';
import { calculateTokens, calculateCarbonSaved } from '@/src/utils/ecoLogic';
import { FontAwesome6 } from '@expo/vector-icons';

export default function EditActivityScreen() {
  const { colors } = useAppTheme();
  const [userRegion, setUserRegion] = useState('GLOBAL_AVG');
  const { id } = useLocalSearchParams();
  
  // Get existing activity from local store
  const activity = useActivityStore((state) => state.getActivityById(id as string));

  // Form State
  const [steps, setSteps] = useState('');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [kwhSaved, setKwhSaved] = useState('');
  const [litersSaved, setLitersSaved] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with existing data
  useEffect(() => {
    if (activity) {
      setSteps(activity.steps?.toString() || '');
      setDistance(activity.distance?.toString() || '');
      setDuration(activity.duration?.toString() || '');
      setKwhSaved(activity.kwhSaved?.toString() || '');
      setLitersSaved(activity.litersSaved?.toString() || '');
    }
  }, [activity]);

  if (!activity) return null;

  const handleUpdate = async () => {
    if (!auth.currentUser || isSaving) return;

    try {
      setIsSaving(true);
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const activityRef = doc(db, 'users', auth.currentUser.uid, 'activities', activity.id);

      // 1. Fetch region for impact re-calculation
      const userSnap = await getDoc(userRef);
      const region = userSnap.data()?.region || 'GLOBAL_AVG';

      // 2. Calculate OLD impact
      const oldTokens = calculateTokens(activity);
      const oldCarbon = calculateCarbonSaved(activity, userRegion);

      // 3. Prepare NEW data
      const updatedData = {
        ...activity,
        steps: steps ? Number(steps) : undefined,
        distance: distance ? Number(distance) : undefined,
        duration: duration ? Number(duration) : undefined,
        kwhSaved: kwhSaved ? Number(kwhSaved) : undefined,
        litersSaved: litersSaved ? Number(litersSaved) : undefined,
      };

      // 4. Calculate NEW impact
      const newTokens = calculateTokens(updatedData);
      const newCarbon = calculateCarbonSaved(updatedData, userRegion);

      // 5. Calculate Difference (New - Old)
      const tokenDiff = newTokens - oldTokens;
      const carbonDiff = newCarbon - oldCarbon;

      // 6. Update Firestore
      await updateDoc(activityRef, Object.fromEntries(
        Object.entries(updatedData).filter(([_, v]) => v !== undefined)
      ));

      await updateDoc(userRef, {
        tokens: increment(tokenDiff),
        totalCarbonSaved: increment(carbonDiff)
      });

      Alert.alert("Success", "Activity updated!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert("Error", "Failed to update activity.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <FontAwesome6 name="pen-to-square" size={24} color={colors.tint} />
        <ThemedText type="title" style={{ color: colors.text }}>
          {activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
        </ThemedText>
      </View>

      <View style={styles.form}>
        {activity.category === 'walking' && (
          <EditInput label="Steps" value={steps} onChange={setSteps} />
        )}
        {activity.category === 'running' && (
          <>
            <EditInput label="Distance (km)" value={distance} onChange={setDistance} />
            <EditInput label="Duration (min)" value={duration} onChange={setDuration} />
          </>
        )}
        {activity.category === 'cycling' && (
          <EditInput label="Distance (km)" value={distance} onChange={setDistance} />
        )}
        {activity.category === 'electricity' && (
          <EditInput label="kWh Saved" value={kwhSaved} onChange={setKwhSaved} />
        )}
        {activity.category === 'water' && (
          <EditInput label="Liters Saved" value={litersSaved} onChange={setLitersSaved} />
        )}

        <Pressable
          style={[styles.saveButton, { backgroundColor: colors.tint }]}
          onPress={handleUpdate}
          disabled={isSaving}
        >
          <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>
            {isSaving ? 'Saving...' : 'Update Activity'}
          </ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function EditInput({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 30 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, opacity: 0.7 },
  input: { padding: 15, borderRadius: 12, fontSize: 16 },
  saveButton: { padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 }
});