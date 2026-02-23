// activity/edit.tsx
import { View, StyleSheet, Pressable, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '@/src/firebase/config';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemedText } from '@/components/themed-text';
import { useActivityStore } from '@/src/store/activityStore';
import { calculateTokens, calculateCarbonSaved, CATEGORY_COLORS } from '@/src/utils/ecoLogic';
import { FontAwesome6 } from '@expo/vector-icons';

export default function EditActivityScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams();

  const activity   = useActivityStore(s => s.getActivityById(id as string));
  const userRegion = useActivityStore(s => s.userRegion);
  const updateActivity = useActivityStore(s => s.updateActivity);

  const [steps, setSteps]           = useState('');
  const [distance, setDistance]     = useState('');
  const [duration, setDuration]     = useState('');
  const [kwhSaved, setKwhSaved]     = useState('');
  const [litersSaved, setLitersSaved] = useState('');
  const [isSaving, setIsSaving]     = useState(false);

  useEffect(() => {
    if (activity) {
      setSteps(activity.steps?.toString() ?? '');
      setDistance(activity.distance?.toString() ?? '');
      setDuration(activity.duration?.toString() ?? '');
      setKwhSaved(activity.kwhSaved?.toString() ?? '');
      setLitersSaved(activity.litersSaved?.toString() ?? '');
    }
  }, [activity]);

  if (!activity) return null;

  const isUtility = activity.category === 'electricity' || activity.category === 'water';
  const categoryColor = CATEGORY_COLORS[activity.category] ?? colors.tint;

  const handleUpdate = async () => {
    if (!auth.currentUser || isSaving) return;
    setIsSaving(true);

    try {
      const userRef     = doc(db, 'users', auth.currentUser.uid);
      const activityRef = doc(db, 'users', auth.currentUser.uid, 'activities', activity.id);

      // Old impact
      const oldTokens = calculateTokens(activity);
      const oldCarbon = calculateCarbonSaved(activity, userRegion);

      // Build updated data
      const updatedData = {
        ...activity,
        steps:        steps        ? Number(steps)        : undefined,
        distance:     distance     ? Number(distance)     : undefined,
        duration:     duration     ? Number(duration)     : undefined,
        kwhSaved:     kwhSaved     ? Number(kwhSaved)     : undefined,
        litersSaved:  litersSaved  ? Number(litersSaved)  : undefined,
      };

      // New impact
      const newTokens = calculateTokens(updatedData);
      const newCarbon = calculateCarbonSaved(updatedData, userRegion);

      // Strip undefined before writing to Firestore
      const firestoreData = Object.fromEntries(
        Object.entries(updatedData).filter(([, v]) => v !== undefined)
      );

      // Update activity document
      await updateDoc(activityRef, firestoreData);

      // Update user totals with the diff only
      const tokenDiff  = newTokens - oldTokens;
      const carbonDiff = newCarbon - oldCarbon;

      await updateDoc(userRef, {
        tokens:           increment(tokenDiff),
        totalCarbonSaved: increment(carbonDiff),
      });

      // Update local store too so UI reflects immediately
      updateActivity(activity.id, updatedData);

      Alert.alert('Updated', 'Activity updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error('Update error:', e);
      Alert.alert('Error', 'Failed to update activity. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: categoryColor + '18' }]}>
          <FontAwesome6
            name={
              activity.category === 'walking'     ? 'person-walking' :
              activity.category === 'running'     ? 'person-running' :
              activity.category === 'cycling'     ? 'bicycle' :
              activity.category === 'electricity' ? 'bolt' : 'droplet'
            }
            size={20}
            color={categoryColor}
          />
        </View>
        <ThemedText type="title" style={{ color: colors.text, fontSize: 22 }}>
          Edit {activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
        </ThemedText>
      </View>

      {/* Utility note */}
      {isUtility && (
        <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
          <FontAwesome6 name="circle-info" size={12} color={colors.text} style={{ opacity: 0.4, marginTop: 1 }} />
          <ThemedText style={[styles.infoText, { color: colors.text }]}>
            Editing the saved amount directly. To log a new monthly reading, use the main log screen instead.
          </ThemedText>
        </View>
      )}

      <View style={styles.form}>
        {activity.category === 'walking' && (
          <>
            {activity.steps !== undefined && (
              <EditInput label="Steps" value={steps} onChange={setSteps} colors={colors} />
            )}
            {activity.distance !== undefined && (
              <EditInput label="Distance (km)" value={distance} onChange={setDistance} colors={colors} />
            )}
          </>
        )}
        {activity.category === 'running' && (
          <>
            <EditInput label="Distance (km)" value={distance} onChange={setDistance} colors={colors} />
            <EditInput label="Duration (min)" value={duration} onChange={setDuration} colors={colors} />
          </>
        )}
        {activity.category === 'cycling' && (
          <EditInput label="Distance (km)" value={distance} onChange={setDistance} colors={colors} />
        )}
        {activity.category === 'electricity' && (
          <EditInput label="kWh Saved" value={kwhSaved} onChange={setKwhSaved} colors={colors} />
        )}
        {activity.category === 'water' && (
          <EditInput label="Litres Saved" value={litersSaved} onChange={setLitersSaved} colors={colors} />
        )}

        <Pressable
          style={[styles.saveButton, { backgroundColor: colors.tint }, isSaving && { opacity: 0.6 }]}
          onPress={handleUpdate}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
              Update Activity
            </ThemedText>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function EditInput({
  label, value, onChange, colors,
}: {
  label: string; value: string;
  onChange: (v: string) => void; colors: any;
}) {
  return (
    <View style={styles.field}>
      <ThemedText style={[styles.label, { color: colors.text }]}>{label}</ThemedText>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholderTextColor={colors.text + '55'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 8, padding: 12, borderRadius: 10,
  },
  infoText: { fontSize: 13, opacity: 0.6, flex: 1, lineHeight: 18 },
  form:  { gap: 16 },
  field: { gap: 8 },
  label: { fontSize: 14, opacity: 0.7, fontWeight: '500' },
  input: { padding: 15, borderRadius: 12, fontSize: 16 },
  saveButton: { padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 8 },
});