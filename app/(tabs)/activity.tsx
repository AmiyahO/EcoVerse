// Activity screen
import { View, FlatList, Pressable, StyleSheet, SectionList } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { calculateTokens, calculateCarbonSaved, CATEGORY_COLORS } from '@/src/utils/ecoLogic';

const CATEGORY_ICON: Record<string, string> = {
  walking:     'person-walking',
  running:     'person-running',
  cycling:     'bicycle',
  electricity: 'bolt',
  water:       'droplet',
};

// ── Metric label ──────────────────────────────────────────────────────────────
function getActivityMetric(activity: any) {
  switch (activity.category) {
    case 'walking':
      if (activity.steps) return `${activity.steps.toLocaleString()} steps`;
      if (activity.distance) return `${activity.distance} km`;
      return '—';
    case 'running':
      if (activity.distance && activity.duration)
        return `${activity.distance} km · ${activity.duration} min`;
      return activity.distance
        ? `${activity.distance} km`
        : activity.duration
        ? `${activity.duration} min`
        : '—';
    case 'cycling':
      return activity.distance ? `${activity.distance} km` : '—';
    case 'electricity':
      return activity.kwhSaved ? `${activity.kwhSaved} kWh saved` : '—';
    case 'water':
      return activity.litersSaved ? `${activity.litersSaved} L saved` : '—';
    default:
      return '—';
  }
}

// ── Weekly grouping ───────────────────────────────────────────────────────────
function groupActivities(activities: any[]) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const thisWeek: any[] = [];
  const earlier: any[] = [];

  activities.forEach(a => {
    if (new Date(a.date) >= startOfWeek) {
      thisWeek.push(a);
    } else {
      earlier.push(a);
    }
  });

  const sections = [];
  if (thisWeek.length > 0) sections.push({ title: 'This Week', data: thisWeek });
  if (earlier.length > 0)  sections.push({ title: 'Earlier',   data: earlier });
  return sections;
}

// ── Activity card ─────────────────────────────────────────────────────────────
function ActivityCard({ item, colors, userRegion }: { item: any; colors: any; userRegion: string }) {
  const label = getActivityMetric(item);
  const accent = CATEGORY_COLORS[item.category] ?? '#2E7D32';

  return (
    <Pressable
      style={[ styles.card, { backgroundColor: colors.surface, borderWidth: 1, borderColor: accent + '25' },]}
      onPress={() => router.push(`/activity/details?id=${item.id}`)}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <View style={styles.cardInner}>
        {/* Top row */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: accent + '22' }]}>
            <FontAwesome6
              name={CATEGORY_ICON[item.category]}
              size={18}
              color={accent}
            />
          </View>

          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold" style={[styles.category, { color: colors.text }]}>
              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
            </ThemedText>
            <ThemedText style={[styles.metric, { color: colors.text }]}>
              {label}
            </ThemedText>
          </View>

          <ThemedText style={[styles.date, { color: colors.text }]}>
            {new Date(item.date).toLocaleDateString()}
          </ThemedText>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerPill}>
            <ThemedText style={[styles.footerText, { color: colors.text }]}>
              🌍 {calculateCarbonSaved(item, userRegion).toFixed(2)} kg CO₂
            </ThemedText>
          </View>
          <View style={styles.footerPill}>
            <FontAwesome6 name="leaf" size={11} color={accent} style={{ marginRight: 4 }} />
            <ThemedText style={[styles.footerText, { color: colors.text }]}>
              {calculateTokens(item)} tokens
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ActivityScreen() {
  const { colors, scheme } = useAppTheme();
  const userRegion    = useActivityStore(s => s.userRegion);
  const activities    = useActivityStore(s => s.activities);
  const CATEGORIES    = ['all', 'walking', 'running', 'cycling', 'electricity', 'water'];
  const [filter, setFilter] = useState('all');

  const sortedActivities = useMemo(() =>
    [...activities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [activities]
  );

  const filteredActivities = useMemo(() =>
    filter === 'all' ? sortedActivities : sortedActivities.filter(a => a.category === filter),
    [sortedActivities, filter]
  );

  const sections = useMemo(() => groupActivities(filteredActivities), [filteredActivities]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title" style={{ color: colors.text, lineHeight: 35 }}>Activity</ThemedText>
        <Pressable
          style={[styles.addButton, { backgroundColor: colors.tint }]}
          onPress={() => router.push('/activity/add')}
        >
          <FontAwesome6 name="plus" size={13} color="#fff" />
          <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Log</ThemedText>
        </Pressable>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const active = filter === item;
            const chipColor = item === 'all' ? colors.tint : (CATEGORY_COLORS[item] ?? colors.tint);

            return (
              <Pressable
                onPress={() => setFilter(item)}
                style={[styles.filterChip, 
                  active && { backgroundColor: chipColor + '28', borderColor: chipColor + '66', borderWidth: 1 },
                ]}
              >
                {item !== 'all' && active && (
                  <FontAwesome6 name={CATEGORY_ICON[item]} size={11} color={chipColor} />
                )}
                <ThemedText
                  style={[
                    styles.filterText,
                   { color: active ? chipColor : colors.text },
                    active && styles.filterTextActive,
                  ]}
                >
                  {item === 'all' ? 'All' : item.charAt(0).toUpperCase() + item.slice(1)}
                </ThemedText>
              </Pressable>
            );
          }}
        />
      </View>

      {/* List */}
      {filteredActivities.length === 0 ? (
        <View style={styles.emptyState}>
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.tint + '15' }]}>
          <FontAwesome6
            name={filter === 'all' ? 'leaf' : (CATEGORY_ICON[filter] ?? 'leaf')}
            size={36}
            color={filter === 'all' ? colors.tint : (CATEGORY_COLORS[filter] ?? colors.tint)}
          />
        </View>
        <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
          {filter === 'all' ? 'No activities yet' : `No ${filter} activities yet`}
        </ThemedText>
        <ThemedText style={[styles.emptySubtitle, { color: colors.text }]}>
          {filter === 'all'
            ? 'Start logging to track your eco impact'
            : `Log your first ${filter} activity to see it here`}
        </ThemedText>
        <Pressable
          style={[styles.emptyBtn, { backgroundColor: colors.tint }]}
          onPress={() => router.push('/activity/add')}
        >
          <FontAwesome6 name="plus" size={13} color="#fff" />
          <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Log Activity</ThemedText>
        </Pressable>
      </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 0, paddingBottom: 16 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <ThemedText style={[styles.sectionHeader, { color: colors.text }]}>
              {section.title}
            </ThemedText>
          )}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 10 }}>
              <ActivityCard item={item} colors={colors} userRegion={userRegion} />
            </View>
          )}
        />
      )}
    </SafeAreaView>
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
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },

  // Section header
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  // Card
  card: {
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  cardInner: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  category: {
    fontSize: 15,
  },
  metric: {
    fontSize: 16,
    fontWeight: '400',
    opacity: 0.85,
  },
  date: {
    fontSize: 11,
    opacity: 0.45,
    alignSelf: 'flex-start',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    opacity: 0.65,
  },

  // Filters
  filterRow: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterText: {
    fontSize: 13,
    opacity: 0.7,
  },
  filterTextActive: {
    fontWeight: '600',
    opacity: 1,
  },
  emptyText: {
    marginTop: 40,
    textAlign: 'center',
    opacity: 0.6,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
});