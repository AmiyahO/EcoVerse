// Activity screen
import { View, FlatList, Pressable, StyleSheet, SectionList, Modal, Alert, Animated } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { router } from 'expo-router';
import { useMemo, useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { calculateTokens, calculateCarbonSaved, CATEGORY_COLORS } from '@/src/utils/ecoLogic';
import { isToday, isThisWeek } from '@/src/utils/dateUtils';
import * as Haptics from 'expo-haptics';
import { doc, deleteDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '@/src/firebase/config';
import { persistWeeklyEcoScore } from '@/src/utils/ecoLogic';

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
  // Split into two arrays without mutating or duplicating entries
  const thisWeek = activities.filter(a => isThisWeek(a.date));
  const earlier = activities.filter(a => !isThisWeek(a.date));

  const sections = [];
  if (thisWeek.length > 0) sections.push({ title: 'This Week', data: thisWeek });
  if (earlier.length > 0)  sections.push({ title: 'Earlier',   data: earlier });
  return sections;
}

// ── Custom long-press action sheet ───────────────────────────────────────────
type ActionSheetItem = {
  activity: any;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
};

function ActivityActionSheet({ activity, onDuplicate, onDelete, onClose }: ActionSheetItem) {
  const { colors, scheme } = useAppTheme();
  const slideY = useRef(new Animated.Value(300)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, damping: 22, stiffness: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismiss = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 300, duration: 160, useNativeDriver: true }),
    ]).start(() => { onClose(); cb?.(); });
  };

  const accent  = CATEGORY_COLORS[activity.category] ?? colors.tint;
  const bgSheet = scheme === 'dark' ? '#1C2820' : '#FFFFFF';
  const label   = activity.category.charAt(0).toUpperCase() + activity.category.slice(1);
  const dateStr = new Date(activity.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const tokens  = calculateTokens(activity);

  return (
    <Modal transparent animationType="none" onRequestClose={() => dismiss()}>
      {/* Backdrop */}
      <Animated.View style={[styles.asBackdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => dismiss()} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.asSheet, { backgroundColor: bgSheet, transform: [{ translateY: slideY }] }]}>
        {/* Handle */}
        <View style={[styles.asHandle, { backgroundColor: colors.text + '20' }]} />

        {/* Activity preview */}
        <View style={[styles.asPreview, { backgroundColor: accent + '12', borderColor: accent + '30' }]}>
          <View style={[styles.asPreviewIcon, { backgroundColor: accent + '22' }]}>
            <FontAwesome6 name={CATEGORY_ICON[activity.category] ?? 'leaf'} size={20} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.asPreviewLabel, { color: colors.text }]}>{label}</ThemedText>
            <ThemedText style={[styles.asPreviewDate,  { color: colors.text }]}>{dateStr}</ThemedText>
          </View>
          <View style={[styles.asTokenBadge, { backgroundColor: accent + '18' }]}>
            <FontAwesome6 name="leaf" size={11} color={accent} />
            <ThemedText style={[styles.asTokenText, { color: accent }]}>{tokens}</ThemedText>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.asActions, { borderColor: colors.text + '10' }]}>
          {/* Duplicate */}
          <Pressable
            style={({ pressed }) => [styles.asAction, pressed && { opacity: 0.6 }]}
            onPress={() => dismiss(onDuplicate)}
          >
            <View style={[styles.asActionIcon, { backgroundColor: colors.tint + '18' }]}>
              <FontAwesome6 name="copy" size={16} color={colors.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.asActionTitle, { color: colors.text }]}>Duplicate</ThemedText>
              <ThemedText style={[styles.asActionSub,   { color: colors.text }]}>
                Creates a copy dated to today
              </ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={13} color={colors.text + '30'} />
          </Pressable>

          <View style={[styles.asSep, { backgroundColor: colors.text + '08' }]} />

          {/* Delete */}
          <Pressable
            style={({ pressed }) => [styles.asAction, pressed && { opacity: 0.6 }]}
            onPress={() => dismiss(() => {
              Alert.alert(
                'Delete Activity',
                'This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: onDelete },
                ]
              );
            })}
          >
            <View style={[styles.asActionIcon, { backgroundColor: '#EF535018' }]}>
              <FontAwesome6 name="trash" size={16} color="#EF5350" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.asActionTitle, { color: '#EF5350' }]}>Delete</ThemedText>
              <ThemedText style={[styles.asActionSub,   { color: colors.text }]}>
                Permanently removes this activity
              </ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={13} color={colors.text + '30'} />
          </Pressable>
        </View>

        {/* Cancel */}
        <Pressable
          style={({ pressed }) => [styles.asCancel, { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.6 : 1 }]}
          onPress={() => dismiss()}
        >
          <ThemedText style={[styles.asCancelText, { color: colors.text }]}>Cancel</ThemedText>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}


function ActivityCard({ item, colors, userRegion, onLongPress }: { item: any; colors: any; userRegion: string; onLongPress: () => void }) {
  const label = getActivityMetric(item);
  const accent = CATEGORY_COLORS[item.category] ?? '#2E7D32';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderWidth: 1, borderColor: accent + '25', opacity: pressed ? 0.88 : 1 }]}
      onPress={() => router.push(`/activity/details?id=${item.id}`)}
      onLongPress={onLongPress}
      delayLongPress={350}
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
  const [actionSheet, setActionSheet] = useState<any | null>(null);

  const sortedActivities = useMemo(() =>
    [...activities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [activities]
  );

  const filteredActivities = useMemo(() =>
    filter === 'all' ? sortedActivities : sortedActivities.filter(a => a.category === filter),
    [sortedActivities, filter]
  );

  const sections = useMemo(() => groupActivities(filteredActivities), [filteredActivities]);

  const handleLongPress = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionSheet(item);
  };

  const handleDuplicate = async (item: any) => {
    const copy = useActivityStore.getState().duplicateActivity(item.id);
    const uid = auth.currentUser?.uid;
    if (copy && uid) await setDoc(doc(db, 'users', uid, 'activities', copy.id), copy);
  };

  const handleDelete = async (item: any) => {
    const uid = auth.currentUser?.uid;
    const tokens = calculateTokens(item);
    const carbon = calculateCarbonSaved(item, useActivityStore.getState().userRegion);

    useActivityStore.getState().removeActivity(item.id);
    if (uid) {
      await deleteDoc(doc(db, 'users', uid, 'activities', item.id));
      await updateDoc(doc(db, 'users', uid), {
        tokens:           increment(-tokens),
        totalCarbonSaved: increment(-carbon),
      });
      const store = useActivityStore.getState();
      const remaining = store.activities.filter(a => a.id !== item.id);
      persistWeeklyEcoScore(remaining, store.userProfile?.weeklyTarget ?? 500, store.userRegion ?? 'GLOBAL_AVG').catch(() => {});
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom action sheet */}
      {actionSheet && (
        <ActivityActionSheet
          activity={actionSheet}
          onClose={() => setActionSheet(null)}
          onDuplicate={() => handleDuplicate(actionSheet)}
          onDelete={() => handleDelete(actionSheet)}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title" style={{ color: colors.text, lineHeight: 35 }}>Activity</ThemedText>
        <Pressable
          style={({ pressed }) => [styles.addButton, { backgroundColor: colors.tint, opacity: pressed ? 0.75 : 1 }]}
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
          contentContainerStyle={{ gap: 0, paddingBottom: 5 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <ThemedText style={[styles.sectionHeader, { color: colors.text }]}>
              {section.title}
            </ThemedText>
          )}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 10 }}>
              <ActivityCard item={item} colors={colors} userRegion={userRegion} onLongPress={() => handleLongPress(item)} />
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
    paddingTop: 16,
    paddingHorizontal: 16,
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

  // ── Action sheet ──
  asBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 10,
  },
  asSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 11,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: 32,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 24,
  },
  asHandle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 4,
  },
  asPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  asPreviewIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  asPreviewLabel: { fontSize: 15, fontWeight: '700' },
  asPreviewDate:  { fontSize: 12, opacity: 0.5, marginTop: 1 },
  asTokenBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  asTokenText: { fontSize: 13, fontWeight: '700' },
  asActions: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  asAction: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 15,
  },
  asActionIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  asActionTitle: { fontSize: 15, fontWeight: '600' },
  asActionSub:   { fontSize: 12, opacity: 0.45, marginTop: 1 },
  asSep:         { height: StyleSheet.hairlineWidth, marginLeft: 66 },
  asCancel: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: 14,
  },
  asCancelText: { fontSize: 16, fontWeight: '600', opacity: 0.7 },
});