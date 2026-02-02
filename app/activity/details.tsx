// activity details screen
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useActivityStore } from '@/src/store/activityStore';

export default function ActivityDetailsScreen() {
  const { id } = useLocalSearchParams();
  const activity = useActivityStore((state) => state.getActivityById(id as string));

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Activity Details</Text>
      <Text>ID: {activity?.id}</Text>
      <Text>Type: {activity?.type}</Text>
      <Text>Steps: {activity?.steps ?? '-'}</Text>
      <Text>Distance: {activity?.distance ?? '-'} km</Text>
      <Text>Date: {activity?.date ? new Date(activity.date).toLocaleString() : '-'}</Text>
    </View>
  );
}
