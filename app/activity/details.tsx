// activity details screen
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useActivityStore } from '@/src/store/activityStore';

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
      <ThemedText type="title">{activity.type}</ThemedText>

      {/* Info Card */}
      <View style={styles.card}>
        <Detail label="Steps" value={activity.steps} suffix="steps" />
        <Detail label="Distance" value={activity.distance} suffix="km" />
        <Detail
          label="Date"
          value={new Date(activity.date!).toLocaleString()}
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
  if (!value) return null;

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

