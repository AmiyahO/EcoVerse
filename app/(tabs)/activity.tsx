// Activity screen (mock data)
import { View, Text, FlatList, Button, TouchableOpacity } from 'react-native';
import { useActivityStore } from '@/src/store/activityStore';
import { router } from 'expo-router';

export default function ActivityScreen() {
  const activities = useActivityStore((state) => state.activities);
  const addActivity = useActivityStore((state) => state.addActivity);
  const clearActivities = useActivityStore((state) => state.clearActivities);

  // Example: add mock activity
  const addMock = () => {
    addActivity({
      id: Date.now().toString(),
      type: 'Walking',
      steps: Math.floor(Math.random() * 5000) + 1000,
      distance: parseFloat((Math.random() * 5).toFixed(2)),
      date: new Date().toISOString(),
    });
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 10 }}>Your Activities</Text>

      {/* Temporary mock buttons */}
      <Button title="Add Random Activity" onPress={addMock} />
      <Button title="Clear All Activities" onPress={clearActivities} color="red" />

      {/* Activity list */}
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 10 }}>
            <TouchableOpacity onPress={() => router.push(`/activity/details?id=${item.id}`)}>
            <Text>
              {item.type}: {item.steps ?? item.distance ?? 0} {item.steps ? 'steps' : 'km'}
            </Text>
            </TouchableOpacity>
            {item.date && <Text style={{ fontSize: 12, color: 'gray' }}>{new Date(item.date).toLocaleString()}</Text>}
          </View>
        )}
      />
      {/* Navigate to AddActivityScreen */}
      <Button
        title="+ Add Activity"
        onPress={() => router.push('/activity/add')}
      />
    </View>
  );
}
