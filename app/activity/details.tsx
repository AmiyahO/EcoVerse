// activity details screen
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import { auth, db } from '@/src/firebase/config';
import { useState } from 'react';
import { doc, deleteDoc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { calculateTokens, calculateCarbonSaved } from '@/src/utils/ecoLogic';

export default function ActivityDetailsScreen() {
  const { colors } = useAppTheme();
  const userRegion = useActivityStore(s => s.userRegion);
  
  const { id } = useLocalSearchParams();
  const activity = useActivityStore((state) =>
    state.getActivityById(id as string)
  );

  const [isDeleting, setIsDeleting] = useState(false);

  if (!activity) {
    return null; // Don't render anything if activity is gone
  }

  const confirmDelete = () => {
    Alert.alert(
      'Delete activity?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!auth.currentUser || !activity|| isDeleting) return;

            try {
              setIsDeleting(true); // Prevent multiple taps

              const userRef = doc(db, 'users', auth.currentUser.uid);
              const activityRef = doc(db, 'users', auth.currentUser.uid, 'activities', activity.id);
              
              const tokensToRemove = calculateTokens(activity);
              const carbonToRemove = calculateCarbonSaved(activity, userRegion);

              // NAVIGATE BACK FIRST
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/activity'); // Fallback to activity list
              }
              
              // Update the Cloud (Wait a tiny bit so navigation starts)
              setTimeout(async () => {
                // Delete the activity
                await deleteDoc(activityRef);

                // Subtract from totals
                await updateDoc(userRef, {
                  tokens: increment(-tokensToRemove),
                  totalCarbonSaved: increment(-carbonToRemove)
                });
                
                // NOTE: We do NOT call removeActivity(activity.id) here.
                // Your RootLayout's onSnapshot listener will detect the deletion
                // and update the store automatically!
              }, 100);
            } catch (error) {
              console.error("Error deleting activity:", error);
            } finally {
                setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <ThemedText type="title" style={{ lineHeight: 50, color: colors.text }}>
        {activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
      </ThemedText>
      

      {/* Info Card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {activity.category === 'walking' && (
          <>
            {activity.steps ? (
              <Detail label="Steps" value={activity.steps} suffix="steps" />
            ) : (
              <Detail label="Distance" value={activity.distance} suffix="km" />
            )}
          </>
        )}

        {activity.category === 'running' && (
          <>
            <Detail label="Distance" value={activity.distance} suffix="km" />
            <Detail label="Duration" value={activity.duration} suffix="min" />
          </>
        )}

        {activity.category === 'cycling' && (
          <Detail label="Distance" value={activity.distance} suffix="km" />
        )}

        {activity.category === 'electricity' && (
          <Detail label="Energy saved" value={activity.kwhSaved} suffix="kWh" />
        )}

        {activity.category === 'water' && (
          <Detail label="Water saved" value={activity.litersSaved} suffix="L" />
        )}

        <Detail
          label="Date"
          value={new Date(activity.date).toLocaleString()}
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.edit, { backgroundColor: colors.surface }]}
          onPress={() => router.push({
            pathname: '/activity/edit',
            params: { id: activity.id }
          })}
        >
          <ThemedText style={{ color: colors.text }}>Edit</ThemedText>
        </Pressable>

        <Pressable
          style={[styles.button, styles.delete]}
          onPress={confirmDelete}
        >
          <ThemedText style={{ color: colors.text }}>Delete</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function Detail({
  label,
  value,
  suffix,
}: {
  label: string;
  value?: number | string;
  suffix?: string;
}) {
  if (value === undefined || value === null) return null;
  const { colors } = useAppTheme();

  return (
    <View style={styles.row}>
      <ThemedText style={[styles.label, { color: colors.text }]}>{label}</ThemedText>
      <ThemedText style={{ color: colors.text }}>
        {value} {suffix ?? ''}
      </ThemedText>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 20,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    //backgroundColor: 'rgba(46,45,45,0.08)', // #2e2d2d14
    gap: 12,
  },
  row: {
    gap: 2,
  },
  label: {
    fontSize: 13,
    opacity: 0.6,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  edit: {
    backgroundColor: 'rgba(46,45,45,0.12)', // #2e2d2d1f
  },
  delete: {
    backgroundColor: 'rgba(200,60,60,0.15)', // #c83c3c26
  },
});

