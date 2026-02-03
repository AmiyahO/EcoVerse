import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useActivityStore } from '@/src/store/activityStore';

export default function StatsScreen() {
  const activities = useActivityStore((state) => state.activities);

  const totalSteps = activities.reduce((s, a) => s + (a.steps ?? 0), 0);
  const totalDistance = activities.reduce((s, a) => s + (a.distance ?? 0), 0);

  const avgSteps =
    activities.length > 0 ? Math.round(totalSteps / activities.length) : 0;
  const avgDistance =
    activities.length > 0
      ? (totalDistance / activities.length).toFixed(2)
      : '0.00';

  const ecoScore = Math.round(totalSteps / 100 + totalDistance * 10);
  const co2Saved = (totalDistance * 0.21).toFixed(2); // placeholder logic

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title">Your Stats</ThemedText>
        <ThemedText style={styles.subtle}>
          Based on logged activities
        </ThemedText>
      </View>

      {/* Overview */}
      <View style={styles.card}>
        <ThemedText type="defaultSemiBold">Total Activities</ThemedText>
        <ThemedText style={styles.big}>{activities.length}</ThemedText>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        <StatCard label="Total Steps" value={totalSteps} />
        <StatCard label="Total Distance" value={`${totalDistance.toFixed(2)} km`} />
        <StatCard label="Avg Steps" value={avgSteps} />
        <StatCard label="Avg Distance" value={`${avgDistance} km`} />
      </View>

      {/* Eco Impact */}
      <View style={styles.card}>
        <ThemedText type="defaultSemiBold">Eco Impact</ThemedText>

        <View style={styles.row}>
          <ThemedText>You saved approx</ThemedText>
          <ThemedText style={styles.emphasis}>
            {co2Saved} kg CO₂e
          </ThemedText>
        </View>

        <ThemedText style={styles.subtle}>
          Eco Score: {ecoScore}
        </ThemedText>
      </View>

      {/* Future hook */}
      <View style={styles.hintBox}>
        <ThemedText style={styles.subtle}>
          More insights and visual trends coming soon 🌱
        </ThemedText>
      </View>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statCard}>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 20,
  },
  header: {
    gap: 4,
  },
  subtle: {
    fontSize: 13,
    opacity: 0.6,
  },
  big: {
    fontSize: 36,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(46,45,45,0.08)',
    gap: 8,
  },
  statCard: {
    width: '48%',
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(46,45,45,0.08)',
    gap: 4,
  },
  statLabel: {
    fontSize: 13,
    opacity: 0.6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emphasis: {
    fontWeight: '600',
  },
  hintBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(46,45,45,0.05)',
  },
});
