// Home screen
import { View, StyleSheet, Button } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActivityStore } from '@/src/store/activityStore';

export default function HomeScreen() {
  const activities = useActivityStore((state) => state.activities);

  // Compute totals
  const totalSteps = activities.reduce((sum, a) => sum + (a.steps ?? 0), 0);
  const totalDistance = activities.reduce((sum, a) => sum + (a.distance ?? 0), 0);
  const recentActivity = activities[activities.length - 1];

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedText type="title">EcoVerse</ThemedText>
      <ThemedText type="subtitle">
        Your sustainability dashboard
      </ThemedText>

      {/* Summary Cards */}
      <View style={styles.card}>
        <ThemedText type="defaultSemiBold">Activities logged</ThemedText>
        <ThemedText style={styles.bigNumber}>{activities.length}</ThemedText>
      </View>

      <View style={styles.card}>
        <ThemedText type="defaultSemiBold">Total Steps</ThemedText>
        <ThemedText style={styles.bigNumber}>{totalSteps}</ThemedText>
      </View>

      <View style={styles.card}>
        <ThemedText type="defaultSemiBold">Total Distance</ThemedText>
        <ThemedText style={styles.bigNumber}>{totalDistance.toFixed(2)} km</ThemedText>
      </View>

      <View style={styles.card}>
        <ThemedText type="defaultSemiBold">Most Recent Activity</ThemedText>
        {recentActivity ? (
          <ThemedText>
            {recentActivity.type}: {recentActivity.steps ?? recentActivity.distance ?? 0}{recentActivity.steps ? ' steps' : ' km'}
          </ThemedText>
        ) : (
          <ThemedText style={styles.hintText}>No activities yet.</ThemedText>
        )}
      </View>

      {/* Quick Add */}
      <View style={styles.card}>
        <ThemedText
          type="link"
          onPress={() => router.push('/activity/add')}
        >
          + Add new activity
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(127,127,127,0.08)',
    gap: 8,
  },
  bigNumber: {
    fontSize: 32,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 14,
    color: 'gray',
    marginTop: 4,
  },
});
