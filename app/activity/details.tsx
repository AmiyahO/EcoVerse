// activity/details.tsx
import { View, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { auth, db } from '@/src/firebase/config';
import { useState } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { calculateTokens, calculateCarbonSaved, CATEGORY_COLORS, persistWeeklyEcoScore  } from '@/src/utils/ecoLogic';
import { FontAwesome6 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { appAlert } from '@/components/AppAlert';

const CATEGORY_ICON: Record<string, string> = {
  walking:     'person-walking',
  running:     'person-running',
  cycling:     'bicycle',
  electricity: 'bolt',
  water:       'droplet',
};

export default function ActivityDetailsScreen() {
  const { colors } = useAppTheme();
  const userRegion     = useActivityStore(s => s.userRegion);
  const removeActivity = useActivityStore(s => s.removeActivity);

  const { id } = useLocalSearchParams();
  const activity = useActivityStore(s => s.getActivityById(id as string));
  const [isDeleting, setIsDeleting] = useState(false);

  if (!activity) return null;

  const categoryColor = CATEGORY_COLORS[activity.category] ?? colors.tint;
  const tokens  = calculateTokens(activity);
  const carbon  = calculateCarbonSaved(activity, userRegion);

  const confirmDelete = () => {
    appAlert.show({
      title: 'Delete activity?',
      message: 'This cannot be undone.',
      variant: 'confirm',
      confirmLabel: 'Delete',
      destructive: true,
      icon: 'trash',
      onConfirm: async () => {
            if (!auth.currentUser || isDeleting) return;
            setIsDeleting(true);

            try {
              const userRef     = doc(db, 'users', auth.currentUser.uid);
              const activityRef = doc(db, 'users', auth.currentUser.uid, 'activities', activity.id);

              // Soft-delete the activity
              await updateDoc(activityRef, { deleted: true });

              // Also soft-delete the linked bill reading if there is one
              if (activity.billId) {
                const billRef = doc(db, 'users', auth.currentUser.uid, 'bills', activity.billId);
                await updateDoc(billRef, { deleted: true });
              }

              await updateDoc(userRef, {
                tokens:           increment(-tokens),
                totalCarbonSaved: increment(-carbon),
              });

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});

              const store = useActivityStore.getState();
              const remainingActivities = store.activities.filter(a => a.id !== activity.id);
              persistWeeklyEcoScore(
                remainingActivities,
                store.userProfile?.weeklyTarget ?? 500,
                store.userRegion ?? 'GLOBAL_AVG',
                {
                  totalCarbonSaved: (store.userProfile?.totalCarbonSaved ?? 0) - carbon,
                  tokens:           (store.userProfile?.tokens ?? 0) - tokens,
                },
              ).catch(() => {});

              // Now safe to remove locally and navigate
              removeActivity(activity.id);
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)/activity');
            } catch (e) {
              console.error('Delete error:', e);
              appAlert.show({ title: 'Error', message: 'Could not delete activity. Please try again.' });
            } finally {
              setIsDeleting(false);
            }
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: categoryColor + '20' }]}>
            <FontAwesome6
              name={CATEGORY_ICON[activity.category] ?? 'leaf'}
              size={26}
              color={categoryColor}
            />
          </View>
          <View>
            <ThemedText style={[styles.categoryName, { color: colors.text }]}>
              {activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
            </ThemedText>
            <ThemedText style={[styles.dateText, { color: colors.text }]}>
              {new Date(activity.date).toLocaleDateString('en-US', {
                weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </ThemedText>
          </View>
        </View>

        {/* ── Impact summary ── */}
        <View style={styles.impactRow}>
          <View style={[styles.impactCard, { backgroundColor: colors.surface }]}>
            <FontAwesome6 name="leaf" size={14} color={colors.tint} />
            <ThemedText style={[styles.impactValue, { color: colors.tint }]}>
              {tokens}
            </ThemedText>
            <ThemedText style={[styles.impactLabel, { color: colors.text }]}>tokens</ThemedText>
          </View>
          <View style={[styles.impactCard, { backgroundColor: colors.surface }]}>
            <FontAwesome6 name="cloud" size={14} color={colors.tint} />
            <ThemedText style={[styles.impactValue, { color: colors.tint }]}>
              {carbon.toFixed(2)}
            </ThemedText>
            <ThemedText style={[styles.impactLabel, { color: colors.text }]}>kg CO₂ saved</ThemedText>
          </View>
        </View>

        {/* ── Details card ── */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {activity.category === 'walking' && (
            <>
              {activity.steps    !== undefined && <DetailRow icon="shoe-prints" label="Steps"    value={`${activity.steps.toLocaleString()} steps`} colors={colors} />}
              {activity.distance !== undefined && <DetailRow icon="route"       label="Distance" value={`${activity.distance} km`}                  colors={colors} />}
              {activity.duration !== undefined && <DetailRow icon="clock"       label="Duration" value={`${activity.duration} min`}                 colors={colors} />}
            </>
          )}
          {activity.category === 'running' && (
            <>
              <DetailRow icon="route"        label="Distance" value={`${activity.distance} km`}  colors={colors} />
              <DetailRow icon="clock"        label="Duration" value={`${activity.duration} min`} colors={colors} />
            </>
          )}
          {activity.category === 'cycling' && (
            <>
              <DetailRow icon="route" label="Distance" value={`${activity.distance} km`} colors={colors} />
              {activity.duration !== undefined && <DetailRow icon="clock" label="Duration" value={`${activity.duration} min`} colors={colors} />}
            </>
          )}
          {activity.category === 'electricity' && (
            <DetailRow icon="bolt" label="Energy saved" value={`${activity.kwhSaved} kWh`} colors={colors} />
          )}
          {activity.category === 'water' && (
            <DetailRow icon="droplet" label="Water saved" value={`${activity.litersSaved?.toLocaleString()} L`} colors={colors} />
          )}

          <View style={[styles.divider, { backgroundColor: colors.surfaceMuted }]} />

          <DetailRow
            icon="calendar"
            label="Logged at"
            value={new Date(activity.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            colors={colors}
          />
          {(activity as any).source === 'health_connect' && (
            <DetailRow
              icon="heart-pulse"
              label="Source"
              value="Imported from Health Connect"
              colors={colors}
            />
          )}
        </View>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => router.push({ pathname: '/activity/edit', params: { id: activity.id } })}
          >
            <FontAwesome6 name="pen" size={14} color={colors.text} style={{ opacity: 0.6 }} />
            <ThemedText style={{ color: colors.text, fontWeight: '600' }}>Edit</ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.deleteBtn,
              { opacity: pressed || isDeleting ? 0.7 : 1 },
            ]}
            onPress={confirmDelete}
            disabled={isDeleting}
          >
            <FontAwesome6 name="trash" size={14} color="#fff" />
            <ThemedText style={{ color: '#fff', fontWeight: '600' }}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </ThemedText>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

function DetailRow({
  icon, label, value, colors,
}: {
  icon: string; label: string; value: string; colors: any;
}) {
  return (
    <View style={styles.detailRow}>
      <FontAwesome6 name={icon as any} size={13} color={colors.text} style={{ opacity: 0.35, width: 16 }} />
      <ThemedText style={[styles.detailLabel, { color: colors.text }]}>{label}</ThemedText>
      <ThemedText style={[styles.detailValue, { color: colors.text }]}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  headerIcon: {
    width: 60, height: 60, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  categoryName: { fontSize: 22, fontWeight: '700' },
  dateText:     { fontSize: 13, opacity: 0.5, marginTop: 2 },

  impactRow: { flexDirection: 'row', gap: 12 },
  impactCard: {
    flex: 1, padding: 16, borderRadius: 14,
    alignItems: 'center', gap: 4,
  },
  impactValue: { fontSize: 22, fontWeight: '700' },
  impactLabel: { fontSize: 12, opacity: 0.5 },

  card: { padding: 16, borderRadius: 14, gap: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { fontSize: 14, opacity: 0.55, flex: 1 },
  detailValue: { fontSize: 14, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    padding: 15, borderRadius: 12,
  },
  deleteBtn: { backgroundColor: '#C62828' },
});