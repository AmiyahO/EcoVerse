// add activity screen
import { View, Text, Button } from 'react-native';
import { router } from 'expo-router';
import { useActivityStore } from '@/src/store/activityStore';

export default function AddActivityScreen() {
  const addActivity = useActivityStore((state) => state.addActivity);
  
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, marginBottom: 12 }}>Add Activity</Text>
      <Button
      title="Save Activity"
      onPress={() => {
        addActivity({
          id: Date.now().toString(),
          type: 'Walking', // In real app, get from user input
          steps: 3000,
          distance: 2,
          date: new Date().toISOString(),
        });
        router.back();
  }}
/>
    </View>
  );
}
