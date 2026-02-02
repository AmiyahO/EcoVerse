// Stats screen (mock data)
import { View, Text, StyleSheet } from 'react-native';
import { useActivityStore } from '@/src/store/activityStore';

export default function StatsScreen() {
  const activities = useActivityStore(state => state.activities);

  const totalSteps = activities.reduce((sum, a) => sum + (a.steps ?? 0), 0);
  const totalDistance = activities.reduce((sum, a) => sum + (a.distance ?? 0), 0);
  const averageSteps = activities.length ? Math.round(totalSteps / activities.length) : 0;
  const averageDistance = activities.length ? (totalDistance / activities.length).toFixed(2) : '0.00';
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stats</Text>
      <Text>Total Activities: {activities.length}</Text>
      <Text>Total Steps: {totalSteps}</Text>
      <Text>Total Distance: {totalDistance.toFixed(2)} km</Text>
      <Text>Average Steps per Activity: {averageSteps}</Text>
      <Text>Average Distance per Activity: {averageDistance} km</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
  },
});
