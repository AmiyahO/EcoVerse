// activity details screen
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useActivityStore } from '@/src/store/activityStore';
import { act } from 'react';

function getActivityMetric(activity: any) {
  switch (activity.category) {
    case 'walking':
      return activity.steps
        ? `${activity.steps.toLocaleString()} steps`
        : '—';

    case 'running':
      if (activity.distance && activity.duration) {
        return `${activity.distance} km · ${activity.duration} min`;
      }
      return activity.distance
        ? `${activity.distance} km`
        : activity.duration
        ? `${activity.duration} min`
        : '—';

    case 'cycling':
      return activity.distance
        ? `${activity.distance} km`
        : '—';

    case 'electricity':
      return activity.kwhSaved
        ? `${activity.kwhSaved} kWh saved`
        : '—';

    case 'water':
      return activity.litersSaved
        ? `${activity.litersSaved} L saved`
        : '—';

    default:
      return '—';
  }
}

export default function ActivityDetailsScreen() {
  const { id } = useLocalSearchParams();
  const activity = useActivityStore((state) =>
    state.getActivityById(id as string)
  );
  const removeActivity = useActivityStore((state) => state.removeActivity);

  if (!activity) {
    return (
      <View style={styles.container}>
        <ThemedText>Activity not found.</ThemedText>
      </View>
    );
  }

  const confirmDelete = () => {
    Alert.alert(
      'Delete activity?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeActivity(activity.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <ThemedText type="title">
        {activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
      </ThemedText>
      

      {/* Info Card */}
      <View style={styles.card}>
        {activity.category === 'walking' && (
          <Detail label="Steps" value={activity.steps} suffix="steps" />
        )}

        {activity.category === 'running' && (
          <>
            <Detail label="Distance" value={activity.distance} suffix="km" />
            <Detail label="Duration" value={activity.duration} suffix="min" />
          </>
        )}

        {activity.category === 'cycling' && (
          <Detail label="Distance" value={activity.distance} suffix="km" />
        )}

        {activity.category === 'electricity' && (
          <Detail label="Energy saved" value={activity.kwhSaved} suffix="kWh" />
        )}

        {activity.category === 'water' && (
          <Detail label="Water saved" value={activity.litersSaved} suffix="L" />
        )}

        <Detail
          label="Date"
          value={new Date(activity.date).toLocaleString()}
        />
      </View>


      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.edit]}
          onPress={() => {
            // placeholder for future edit screen
            Alert.alert('Edit coming soon');
          }}
        >
          <ThemedText>Edit</ThemedText>
        </Pressable>

        <Pressable
          style={[styles.button, styles.delete]}
          onPress={confirmDelete}
        >
          <ThemedText>Delete</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function Detail({
  label,
  value,
  suffix,
}: {
  label: string;
  value?: number | string;
  suffix?: string;
}) {
  if (value === undefined || value === null) return null;

  return (
    <View style={styles.row}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <ThemedText>
        {value} {suffix ?? ''}
      </ThemedText>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 20,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(46,45,45,0.08)',
    gap: 12,
  },
  row: {
    gap: 2,
  },
  label: {
    fontSize: 13,
    opacity: 0.6,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  edit: {
    backgroundColor: 'rgba(46,45,45,0.12)',
  },
  delete: {
    backgroundColor: 'rgba(200,60,60,0.15)',
  },
});

