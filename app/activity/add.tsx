import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useActivityStore } from '@/src/store/activityStore';

export default function AddActivityScreen() {
  const addActivity = useActivityStore((state) => state.addActivity);

  const [type, setType] = useState('Walking');
  const [steps, setSteps] = useState('');
  const [distance, setDistance] = useState('');

  const handleSave = () => {
    if (!steps && !distance) return;

    addActivity({
      id: Date.now().toString(),
      type,
      steps: steps ? Number(steps) : undefined,
      distance: distance ? Number(distance) : undefined,
      date: new Date().toISOString(),
    });

    router.back();
  };

  return (
    <View style={styles.container}>
      <ThemedText type="title">Add Activity</ThemedText>

      {/* Activity Type */}
      <View style={styles.field}>
        <ThemedText type="defaultSemiBold">Activity type</ThemedText>
        <TextInput
          value={type}
          onChangeText={setType}
          placeholder="Walking, Cycling…"
          style={styles.input}
        />
      </View>

      {/* Steps */}
      <View style={styles.field}>
        <ThemedText type="defaultSemiBold">Steps (optional)</ThemedText>
        <TextInput
          value={steps}
          onChangeText={setSteps}
          keyboardType="numeric"
          placeholder="e.g. 3500"
          style={styles.input}
        />
      </View>

      {/* Distance */}
      <View style={styles.field}>
        <ThemedText type="defaultSemiBold">Distance (km, optional)</ThemedText>
        <TextInput
          value={distance}
          onChangeText={setDistance}
          keyboardType="numeric"
          placeholder="e.g. 2.4"
          style={styles.input}
        />
      </View>

      {/* Save */}
      <Pressable
        style={[styles.saveButton, (!steps && !distance) && { opacity: 0.5 }]}
        onPress={handleSave}
        disabled={!steps && !distance}
      >
        <ThemedText type="defaultSemiBold">Save Activity</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 20,
  },
  field: {
    gap: 6,
  },
  input: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(46,45,45,0.08)',
  },
  saveButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(46,45,45,0.15)',
  },
});
