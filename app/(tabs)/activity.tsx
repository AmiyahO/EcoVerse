// Activity screen
import { View, FlatList, Pressable,  StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useActivityStore } from '@/src/store/activityStore';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';

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

export default function ActivityScreen() {
  const activities = useActivityStore((state) => state.activities);
  const CATEGORIES = ['all', 'walking', 'running', 'cycling', 'electricity', 'water'];
  const [filter, setFilter] = useState('all');

  const sortedActivities = useMemo(() => {
    return [...activities].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (filter === 'all') return sortedActivities;
    return sortedActivities.filter(a => a.category === filter);
  }, [sortedActivities, filter]);

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

      {/* Filters */}
      <View style={styles.filterRow}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const active = filter === item;
            return (
              <Pressable
                onPress={() => setFilter(item)}
                style={[
                  styles.filterChip,
                  active && styles.filterChipActive,
                ]}
              >
                <ThemedText
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                  ]}
                >
                  {item === 'all'
                    ? 'All'
                    : item.charAt(0).toUpperCase() + item.slice(1)}
                </ThemedText>
              </Pressable>
            );
          }}
        />
      </View>

      {/* List */}
      {activities.length === 0 ? (
        <ThemedText style={styles.emptyText}>
          No activities yet. Start moving 🌱
        </ThemedText>
      ) : (
        <FlatList
          data={filteredActivities}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }) => {
            const label = getActivityMetric(item);

            return (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push(`/activity/details?id=${item.id}`)
                }
              >
                <View style={styles.cardTop}>
                  <ThemedText type="defaultSemiBold" style={styles.category}>
                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                  </ThemedText>

                  <ThemedText style={styles.metric}>
                    {label}
                  </ThemedText>
                </View>

                <ThemedText style={styles.date}>
                  {new Date(item.date).toLocaleDateString()}
                </ThemedText>
              </Pressable>
            );
          }}
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

  filterRow: {
    marginBottom: 12,
  },

  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(46,45,45,0.08)',
  },

  filterChipActive: {
    backgroundColor: 'rgba(46,125,50,0.18)',
  },

  filterText: {
    fontSize: 13,
    opacity: 0.7,
  },

  filterTextActive: {
    fontWeight: '600',
    opacity: 1,
  },

  cardTop: {
    gap: 4,
  },

  category: {
    fontSize: 15,
  },

  metric: {
    fontSize: 18,
    fontWeight: '400',
  },
});

