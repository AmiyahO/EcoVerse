// Activity screen (mock data)
import { View, FlatList, Pressable,  StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useActivityStore } from '@/src/store/activityStore';
import { router } from 'expo-router';

export default function ActivityScreen() {
  const activities = useActivityStore((state) => state.activities);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title">Activity</ThemedText>
        <Pressable
          style={styles.addButton}
          onPress={() => router.push('/activity/add')}
        >
          <ThemedText type="link">＋ Add</ThemedText>
        </Pressable>
      </View>

      {/* List */}
      {activities.length === 0 ? (
        <ThemedText style={styles.emptyText}>
          No activities yet. Start moving 🌱
        </ThemedText>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push(`/activity/details?id=${item.id}`)
              }
            >
              <ThemedText type="defaultSemiBold">
                {item.type}
              </ThemedText>
              <ThemedText>
                {item.steps
                  ? `${item.steps} steps`
                  : `${item.distance} km`}
              </ThemedText>
              <ThemedText style={styles.date}>
                {new Date(item.date!).toLocaleDateString()}
              </ThemedText>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
    paddingTop: 30,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(46,45,45,0.08)',
    gap: 4,
  },
  date: {
    fontSize: 12,
    opacity: 0.6,
  },
  emptyText: {
    marginTop: 40,
    textAlign: 'center',
    opacity: 0.6,
  },
});

