// add.tsx
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ActivityCategory, useActivityStore } from '@/src/store/activityStore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, Alert } from 'react-native';
import { db, auth } from '@/src/firebase/config';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { calculateFinalTokens, calculateStreak, calculateTokens, calculateCarbonSaved, BASELINES } from '@/src/utils/ecoLogic';

const ACTIVITY_CATEGORIES = [
  { key: 'walking', label: 'Walking', icon: 'person-walking' },
  { key: 'running', label: 'Running', icon: 'person-running' },
  { key: 'cycling', label: 'Cycling', icon: 'bicycle' },
  { key: 'electricity', label: 'Electricity', icon: 'bolt' },
  { key: 'water', label: 'Water', icon: 'droplet' },
] as const;

export default function AddActivityScreen() {
  const { colors } = useAppTheme();
  
  // Pull streak from the store:
  const activities = useActivityStore(s => s.activities);
  const streak = calculateStreak(activities); // import calculateStreak too

  const [category, setCategory] = useState<ActivityCategory | null>(null);
  const [steps, setSteps] = useState('');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [kwhSaved, setKwhSaved] = useState('');
  const [litersSaved, setLitersSaved] = useState('');

  const userRegion = useActivityStore(s => s.userRegion);

  const resetInputs = () => {
    setSteps('');
    setDistance('');
    setDuration('');
    setKwhSaved('');
    setLitersSaved('');
  };

  const handleSave = async () => {
    // Check if user is logged in
    if (!auth.currentUser) {
      Alert.alert("Error", "You must be logged in to save activities.");
      return;
    }
    
    if (!category || !auth.currentUser) return;
    
    // 1. Create a raw object with potential undefined values
    const rawData = ({
      category,
      steps: steps ? Number(steps) : undefined,
      distance: distance ? Number(distance) : undefined,
      duration: duration ? Number(duration) : undefined,
      kwhSaved: kwhSaved ? Number(kwhSaved) : undefined,
      litersSaved: litersSaved ? Number(litersSaved) : undefined,
      date: new Date().toISOString(),
    });

    // 2. STRIP UNDEFINED: Create the actual document by filtering out undefined keys
    const newActivityData = Object.fromEntries(
      Object.entries(rawData).filter(([_, value]) => value !== undefined)
    );

    // 3. Calculate impact for this specific entry
    // We use rawData here so the logic functions get 0 or undefined as expected
    const tokensEarned = calculateFinalTokens(rawData as any, streak);
    const carbonSaved = calculateCarbonSaved(rawData as any, userRegion);

    try {
      // 4. Add to Firestore sub-collection (now safe because no undefined values exist)
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'activities'), newActivityData);

      // 5. Update User's Running Totals
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        tokens: increment(tokensEarned),
        totalCarbonSaved: increment(carbonSaved)
      });

    router.back();
    } catch (error) {
    console.error("Error saving activity:", error);
    Alert.alert("Error", "Could not save activity to the cloud.");
  }
  };

  const isSaveDisabled =
    !category ||
    (category === 'walking' && !steps && !distance) ||
    (category === 'running' && (!distance || !duration)) ||
    (category === 'cycling' && !distance) ||
    (category === 'electricity' && !kwhSaved) ||
    (category === 'water' && !litersSaved);

  return (
    <View style={[styles.container]}>
      {/* Category Selection */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Category</ThemedText>

        <View style={[styles.grid]}>
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
                  { backgroundColor: selected ? '#2e7d3230' : colors.surface }
                ]}
              >
                <FontAwesome6
                  name={item.icon as any}
                  size={26}
                  color={selected ? '#2E7D32' : colors.icon}
                />
                <ThemedText
                  style={[
                    styles.categoryLabel,
                    selected && styles.categoryLabelActive,
                    { color: colors.icon }
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
        <>
          <Input
            label="Steps"
            value={steps}
            setValue={setSteps}
            placeholder="e.g. 4500"
            placeholderTextColor={colors.text + '99'}
            style={{ color: colors.text }}
          />
          <Input
            label="Distance (km) — optional"
            value={distance}
            setValue={setDistance}
            placeholder="e.g. 3.2"
            placeholderTextColor={colors.text + '99'}
            style={{ color: colors.text }}
          />
        </>
      )}

      {category === 'running' && (
        <>
          <Input
            label="Distance (km)"
            value={distance}
            setValue={setDistance}
            placeholder="e.g. 3.2"
            placeholderTextColor={colors.text + '99'}
            style={{ color: colors.text }}
          />
          <Input
            label="Duration (minutes)"
            value={duration}
            setValue={setDuration}
            placeholder="e.g. 25"
            placeholderTextColor={colors.text + '99'}
            style={{ color: colors.text }}
          />
        </>
      )}

      {category === 'cycling' && (
        <Input
          label="Distance (km)"
          value={distance}
          setValue={setDistance}
          placeholder="e.g. 5"
          placeholderTextColor={colors.text + '99'}
          style={{ color: colors.text }}
        />
      )}

      {category === 'electricity' && (
        <>
          <Input
            label="kWh Saved"
            value={kwhSaved}
            setValue={setKwhSaved}
            placeholder="e.g. 2.5"
            placeholderTextColor={colors.text + '99'}
            style={{ color: colors.text }}
          />
          <ThemedText style={{ fontSize: 12, opacity: 0.5, color: colors.text, marginTop: -12 }}>
            {BASELINES.electricity.label}
          </ThemedText>
        </>
      )}

      {category === 'water' && (
        <>  
          <Input
            label="Liters Saved"
            value={litersSaved}
            setValue={setLitersSaved}
            placeholder="e.g. 10"
            placeholderTextColor={colors.text + '99'}
            style={{ color: colors.text }}
          />
          <ThemedText style={{ fontSize: 12, opacity: 0.5, color: colors.text, marginTop: -12 }}>
            {BASELINES.water.label}
          </ThemedText>
        </>
      )}

      {/* Save */}
      <Pressable
        style={[styles.saveButton, isSaveDisabled && { opacity: 0.5 }, { backgroundColor: colors.surfaceMuted }]}
        onPress={handleSave}
        disabled={isSaveDisabled}
      >
      <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>Save Activity</ThemedText>
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
  placeholderTextColor,
  style,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  placeholder: string;
  placeholderTextColor?: string;
  style?: any;
}) {
  const { colors } = useAppTheme();
  const finalPlaceholderTextColor = placeholderTextColor ?? (colors.text + '99');
  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={setValue}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={finalPlaceholderTextColor}
        style={[styles.input, style, { backgroundColor: colors.surface, color: colors.text }]}
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
    //backgroundColor: 'rgba(46,45,45,0.08)', // #2e2d2d14
  },
  saveButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    //backgroundColor: 'rgba(46,45,45,0.15)', // #2e2d2d26
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
    // backgroundColor: 'rgba(46,45,45,0.08)', // #2e2d2d14
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  categoryCardActive: {
    borderWidth: 1,
    borderColor: 'rgba(46,125,50,0.4)', // #2e7d3240
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
