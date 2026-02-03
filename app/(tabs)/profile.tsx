// Profile screen (mock data)
import { View, Text, StyleSheet } from 'react-native';
import { useActivityStore } from '@/src/store/activityStore';

export default function ProfileScreen() {
  const activities = useActivityStore((state) => state.activities);
  const totalSteps = activities.reduce((sum, a) => sum + (a.steps ?? 0), 0);
  const totalDistance = activities.reduce((sum, a) => sum + (a.distance ?? 0), 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Profile</Text>

      {/* User info (placeholder) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Info</Text>
        <Text>Name: Amirah</Text>
        <Text>Email: your.email@example.com</Text>
      </View>

      {/* Activity summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity Summary</Text>
        <Text>Total Activities: {activities.length}</Text>
        <Text>Total Steps: {totalSteps}</Text>
        <Text>Total Distance: {totalDistance.toFixed(2)} km</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(46, 45, 45, 0.08)',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
});

