// add.tsx
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useActivityStore, ActivityCategory } from '@/src/store/activityStore';
import { FontAwesome6 } from '@expo/vector-icons';

const ACTIVITY_CATEGORIES = [
  { key: 'walking', label: 'Walking', icon: 'person-walking' },
  { key: 'running', label: 'Running', icon: 'person-running' },
  { key: 'cycling', label: 'Cycling', icon: 'bicycle' },
  { key: 'electricity', label: 'Electricity', icon: 'bolt' },
  { key: 'water', label: 'Water', icon: 'droplet' },
] as const;

export default function AddActivityScreen() {
  const addActivity = useActivityStore((state) => state.addActivity);

  const [category, setCategory] = useState<ActivityCategory | null>(null);
  const [steps, setSteps] = useState('');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [kwhSaved, setKwhSaved] = useState('');
  const [litersSaved, setLitersSaved] = useState('');

  const resetInputs = () => {
    setSteps('');
    setDistance('');
    setDuration('');
    setKwhSaved('');
    setLitersSaved('');
  };

  const handleSave = () => {
    if (!category) return;
    
    addActivity({
      id: Date.now().toString(),
      category,
      steps: steps ? Number(steps) : undefined,
      distance: distance ? Number(distance) : undefined,
      duration: duration ? Number(duration) : undefined,
      kwhSaved: kwhSaved ? Number(kwhSaved) : undefined,
      litersSaved: litersSaved ? Number(litersSaved) : undefined,
      date: new Date().toISOString(),
    });

    router.back();
  };

  const isSaveDisabled =
    !category ||
    (category === 'walking' && !steps) ||
    (category === 'running' && (!distance || !duration)) ||
    (category === 'cycling' && !distance) ||
    (category === 'electricity' && !kwhSaved) ||
    (category === 'water' && !litersSaved);

  return (
    <View style={styles.container}>
      {/* <ThemedText type="title">Add Activity</ThemedText> */}

      {/* Category Selection */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">Category</ThemedText>

        <View style={styles.grid}>
          {ACTIVITY_CATEGORIES.map(item => {
            const selected = category === item.key;

            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  setCategory(item.key);
                  resetInputs();
                }}
                style={[
                  styles.categoryCard,
                  selected && styles.categoryCardActive,
                ]}
              >
                <FontAwesome6
                  name={item.icon as any}
                  size={26}
                  color={selected ? '#2E7D32' : '#777'}
                />
                <ThemedText
                  style={[
                    styles.categoryLabel,
                    selected && styles.categoryLabelActive,
                  ]}
                >
                  {item.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
      
      {/* conditional inputs based on category */}
      {category === 'walking' && (
        <Input
          label="Steps"
          value={steps}
          setValue={setSteps}
          placeholder="e.g. 4500"
        />
      )}

      {category === 'running' && (
        <>
          <Input
            label="Distance (km)"
            value={distance}
            setValue={setDistance}
            placeholder="e.g. 3.2"
          />
          <Input
            label="Duration (minutes)"
            value={duration}
            setValue={setDuration}
            placeholder="e.g. 25"
          />
        </>
      )}

      {category === 'cycling' && (
        <Input
          label="Distance (km)"
          value={distance}
          setValue={setDistance}
          placeholder="e.g. 5"
        />
      )}

      {category === 'electricity' && (
        <Input
          label="kWh Saved"
          value={kwhSaved}
          setValue={setKwhSaved}
          placeholder="e.g. 2.5"
        />
      )}

      {category === 'water' && (
        <Input
          label="Liters Saved"
          value={litersSaved}
          setValue={setLitersSaved}
          placeholder="e.g. 10"
        />
      )}

      {/* Save */}
      <Pressable
        style={[styles.saveButton, isSaveDisabled && { opacity: 0.5 }]}
        onPress={handleSave}
        disabled={isSaveDisabled}
      >
      <ThemedText type="defaultSemiBold">Save Activity</ThemedText>
      </Pressable>
    </View>
  );
}

/* Reusable input component */
function Input({
  label,
  value,
  setValue,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={setValue}
        keyboardType="numeric"
        placeholder={placeholder}
        style={styles.input}
      />
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
  section: {
    gap: 10,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  categoryCard: {
    width: '48%',
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(46,45,45,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  categoryCardActive: {
    backgroundColor: 'rgba(46,125,50,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(46,125,50,0.4)',
  },

  categoryLabel: {
    fontSize: 14,
    opacity: 0.8,
  },

  categoryLabelActive: {
    fontWeight: '600',
    opacity: 1,
  },
});
