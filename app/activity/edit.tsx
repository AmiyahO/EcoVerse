// activity/edit.tsx
import {
  View, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '@/src/firebase/config';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemedText } from '@/components/themed-text';
import { useActivityStore } from '@/src/store/activityStore';
import { calculateTokens, calculateCarbonSaved, CATEGORY_COLORS, persistWeeklyEcoScore } from '@/src/utils/ecoLogic';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { playSound } from '@/src/utils/sfx';
import { appAlert } from '@/components/AppAlert';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function parseActivityDate(iso: string): Date {
  // Handles 'YYYY-MM-DD' and full ISO strings without timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
}

function toLocalISOString(date: Date): string {
  const y   = date.getFullYear();
  const mo  = String(date.getMonth() + 1).padStart(2, '0');
  const d   = String(date.getDate()).padStart(2, '0');
  const h   = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s   = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${min}:${s}`; // local time, no Z
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EditActivityScreen() {
  const { scheme, colors } = useAppTheme();
  const isDark = scheme === 'dark';
  const { id } = useLocalSearchParams();

  const activity       = useActivityStore(s => s.getActivityById(id as string));
  const userRegion     = useActivityStore(s => s.userRegion);
  const activities     = useActivityStore(s => s.activities);
  const userProfile    = useActivityStore(s => s.userProfile);
  const updateActivity = useActivityStore(s => s.updateActivity);

  const [steps,       setSteps]       = useState('');
  const [distance,    setDistance]    = useState('');
  const [duration,    setDuration]    = useState('');
  const [kwhSaved,    setKwhSaved]    = useState('');
  const [litersSaved, setLitersSaved] = useState('');
  const [isSaving,    setIsSaving]    = useState(false);

  // Date state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPicker,   setShowPicker]   = useState(false);

  useEffect(() => {
    if (activity) {
      setSteps(activity.steps?.toString() ?? '');
      setDistance(activity.distance?.toString() ?? '');
      setDuration(activity.duration?.toString() ?? '');
      setKwhSaved(activity.kwhSaved?.toString() ?? '');
      setLitersSaved(activity.litersSaved?.toString() ?? '');
      setSelectedDate(parseActivityDate(activity.date));
    }
  }, [activity]);

  if (!activity) return null;

  const isUtility     = activity.category === 'electricity' || activity.category === 'water';
  const categoryColor = CATEGORY_COLORS[activity.category] ?? colors.tint;

  const onDateChange = (_: DateTimePickerEvent, date?: Date) => {
    // On Android the picker dismisses itself — hide our state flag
    setShowPicker(Platform.OS === 'ios');
    if (date) {
      // Clamp to today — no future dates
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      setSelectedDate(date > today ? today : date);
    }
  };

  const handleUpdate = async () => {
    if (!auth.currentUser || isSaving) return;

    // Validate — at least one metric field must be filled
    const hasValue = [steps, distance, duration, kwhSaved, litersSaved].some(v => v.trim() !== '');
    if (!hasValue) {
      appAlert.show({ title: 'Nothing to save', message: 'Please enter a value before updating.' });
      return;
    }

    // Validate numeric fields aren't zero or negative
    const numFields = [
      { label: 'Steps',        val: steps },
      { label: 'Distance',     val: distance },
      { label: 'Duration',     val: duration },
      { label: 'kWh saved',    val: kwhSaved },
      { label: 'Litres saved', val: litersSaved },
    ];
    for (const f of numFields) {
      if (f.val.trim() === '') continue;
      const n = Number(f.val);
      if (isNaN(n) || n <= 0) {
        appAlert.show({ title: 'Invalid value', message: `${f.label} must be a number greater than 0.` });
        return;
      }
    }

    setIsSaving(true);
    try {
      const userRef     = doc(db, 'users', auth.currentUser.uid);
      const activityRef = doc(db, 'users', auth.currentUser.uid, 'activities', activity.id);

      const oldTokens = calculateTokens(activity);
      const oldCarbon = calculateCarbonSaved(activity, userRegion);

      const updatedData = {
        ...activity,
        date:        toLocalISOString(selectedDate),
        steps:       steps       ? Number(steps)       : undefined,
        distance:    distance    ? Number(distance)    : undefined,
        duration:    duration    ? Number(duration)    : undefined,
        kwhSaved:    kwhSaved    ? Number(kwhSaved)    : undefined,
        litersSaved: litersSaved ? Number(litersSaved) : undefined,
      };

      const newTokens = calculateTokens(updatedData);
      const newCarbon = calculateCarbonSaved(updatedData, userRegion);

      const firestoreData = Object.fromEntries(
        Object.entries(updatedData).filter(([, v]) => v !== undefined)
      );

      await updateDoc(activityRef, firestoreData);
      await updateDoc(userRef, {
        tokens:           increment(newTokens - oldTokens),
        totalCarbonSaved: increment(newCarbon - oldCarbon),
      });

      // Reflect edit in leaderboard score
      const updatedActivities = activities.map(a =>
        a.id === activity.id ? { ...a, ...updatedData } : a
      );
      await persistWeeklyEcoScore(
        updatedActivities,
        userProfile?.weeklyTarget ?? 500,
        userRegion,
        {
          totalCarbonSaved: (userProfile?.totalCarbonSaved ?? 0) + (newCarbon - oldCarbon),
          tokens:           (userProfile?.tokens ?? 0) + (newTokens - oldTokens),
        },
      );

      updateActivity(activity.id, updatedData);
      playSound('activity-save').catch(() => {});

      appAlert.show({
        title: 'Updated',
        message: 'Activity updated successfully.',
        icon: 'circle-check',
        onDismiss: () => router.back(),
      });
    } catch (e) {
      console.error('Update error:', e);
      appAlert.show({ title: 'Error', message: 'Failed to update activity. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>

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
              size={20} color={categoryColor}
            />
          </View>
          <ThemedText type="title" style={{ color: colors.text, fontSize: 22 }}>
            Edit {activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
          </ThemedText>
        </View>

        {/* Utility note */}
        {isUtility && (
          <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
            <FontAwesome6 name="circle-info" size={12} color={colors.text}
              style={{ opacity: 0.4, marginTop: 1 }} />
            <ThemedText style={[styles.infoText, { color: colors.text }]}>
              Editing the saved amount directly. To log a new monthly reading, use the main log screen instead.
            </ThemedText>
          </View>
        )}

        <View style={styles.form}>

          {/* ── Date field ── */}
          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: colors.text }]}>Date</ThemedText>
            <Pressable
              onPress={() => setShowPicker(true)}
              style={({ pressed }) => [
                styles.dateBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.tint + '30',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.tint} />
              <ThemedText style={[styles.dateText, { color: colors.text }]}>
                {formatDisplayDate(selectedDate)}
              </ThemedText>
              <Ionicons name="chevron-down" size={16} color={colors.text + '55'}
                style={{ marginLeft: 'auto' }} />
            </Pressable>
          </View>

          {/* Native date picker — Android shows a dialog, iOS shows inline */}
          {showPicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={onDateChange}
              // Respect the app's dark/light theme on iOS
              themeVariant={isDark ? 'dark' : 'light'}
            />
          )}

          {/* ── Metric inputs ── */}
          {activity.category === 'walking' && (
            <>
              {activity.steps    !== undefined && <EditInput label="Steps" value={steps} onChange={setSteps} colors={colors} />}
              {activity.distance !== undefined && <EditInput label="Distance (km)" value={distance} onChange={setDistance} colors={colors} />}
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
            style={[styles.saveBtn, { backgroundColor: colors.tint }, isSaving && { opacity: 0.6 }]}
            onPress={handleUpdate}
            disabled={isSaving}
          >
            {isSaving
              ? <ActivityIndicator color="#fff" size="small" />
              : <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                  Update Activity
                </ThemedText>
            }
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Shared input ─────────────────────────────────────────────────────────────

function EditInput({ label, value, onChange, colors }: {
  label: string; value: string; onChange: (v: string) => void; colors: any;
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { padding: 20, gap: 20, paddingBottom: 40 },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoBox:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10 },
  infoText:   { fontSize: 13, opacity: 0.6, flex: 1, lineHeight: 18 },
  form:       { gap: 16 },
  field:      { gap: 8 },
  label:      { fontSize: 14, opacity: 0.7, fontWeight: '500' },
  input:      { padding: 15, borderRadius: 12, fontSize: 16 },
  saveBtn:    { padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  dateBtn:    {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, padding: 15, borderRadius: 12, borderWidth: 1.5,
  },
  dateText:   { fontSize: 16, flex: 1 },
});