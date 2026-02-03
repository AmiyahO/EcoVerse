import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActivityStore } from '@/src/store/activityStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function HomeScreen() {
  const activities = useActivityStore((state) => state.activities);

  const totalSteps = activities.reduce((sum, a) => sum + (a.steps ?? 0), 0);
  const totalDistance = activities.reduce((sum, a) => sum + (a.distance ?? 0), 0);

  const ecoScore = Math.round(totalSteps / 100 + totalDistance * 10);
  const ecoTokens = Math.floor(ecoScore / 5);
  const recentActivity = activities[activities.length - 1];

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={{ fontSize: 24 }}>
        Your sustainability dashboard
      </ThemedText>

      {/* ECO SCORE (CIRCULAR HERO) */}
      <View style={styles.scoreWrapper}>
        <View style={styles.scoreCircle}>
          <ThemedText style={styles.scoreLabel}>Eco Score</ThemedText>
          <ThemedText style={styles.scoreNumber}>{ecoScore}</ThemedText>
        </View>

        {/* ECO TOKENS (PILL) */}
        <View style={styles.tokenPill}>
          <Ionicons name="leaf" size={18} color="#2E7D32" />
          <ThemedText style={styles.tokenText}>
            {ecoTokens} Eco Tokens
          </ThemedText>
        </View>
      </View>

      <ThemedText style={styles.CO2}>
        You saved approx X CO₂e today
      </ThemedText>

      {/* OTHER CARDS */}
      <View style={[styles.card, styles.sectionBreak]}>
        <ThemedText type="defaultSemiBold">Activities logged</ThemedText>
        <ThemedText style={styles.bigNumber}>{activities.length}</ThemedText>
      </View>

      <View style={styles.card}>
        <ThemedText type="defaultSemiBold">Most Recent Activity</ThemedText>
        {recentActivity ? (
          <ThemedText>
            {recentActivity.type}:{' '}
            {recentActivity.steps ?? recentActivity.distance ?? 0}
            {recentActivity.steps ? ' steps' : ' km'}
          </ThemedText>
        ) : (
          <ThemedText style={styles.hintText}>No activities yet.</ThemedText>
        )}
      </View>

      <View style={styles.card}>
        <ThemedText type="link" onPress={() => router.push('/activity/add')}>
          + Add new activity
        </ThemedText>
      </View>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 50,
    gap: 16,
  },

  /* Eco Score */
  scoreWrapper: {
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },

  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(46, 125, 50, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  scoreLabel: {
    fontSize: 20,
    opacity: 0.8,
  },

  scoreNumber: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 52,
  },

  /* Eco Tokens */
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(46, 125, 50, 0.15)',
  },

  tokenText: {
    fontSize: 20,
    fontWeight: '500',
  },

  /* Cards */
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(46, 45, 45, 0.08)',
    gap: 8,
  },

  bigNumber: {
    fontSize: 32,
    fontWeight: '600',
  },

  hintText: {
    fontSize: 14,
    color: 'gray',
    marginTop: 4,
  },

  CO2: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 4,
    marginBottom: 30,
  },
  sectionBreak: {
  marginBottom: 12,
  },

});
