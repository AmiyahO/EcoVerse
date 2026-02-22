// components/ai-suggestions-card.tsx
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { FontAwesome6 } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useEffect, useState } from 'react';
import { fetchAISuggestions, buildActivitySummary, AISuggestion } from '@/src/services/aiSuggestions';

interface Props {
  activities: any[];
  weeklyTokens: number;
  weeklyCO2: number;
  activeDaysThisWeek: number;
  streak: number;
}

export default function AISuggestionsCard({
  activities,
  weeklyTokens,
  weeklyCO2,
  activeDaysThisWeek,
  streak,
}: Props) {
  const { colors } = useAppTheme();
  const [tips, setTips] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const summary = buildActivitySummary(
    activities, weeklyTokens, weeklyCO2, activeDaysThisWeek, streak
  );

  const load = async (force = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);
      setError(false);
      const result = await fetchAISuggestions(summary, force);
      setTips(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // load once on mount — cache handles staleness

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.sparkleWrap, { backgroundColor: colors.tint + '18' }]}>
            <FontAwesome6 name="wand-magic-sparkles" size={13} color={colors.tint} />
          </View>
          <ThemedText type="defaultSemiBold" style={{ color: colors.text, fontSize: 15 }}>
            AI Suggestions
          </ThemedText>
        </View>

        {/* Refresh button */}
        <Pressable
          onPress={() => load(true)}
          disabled={refreshing || loading}
          hitSlop={8}
          style={({ pressed }) => [
            styles.refreshBtn,
            { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          {refreshing ? (
            <ActivityIndicator size={12} color={colors.tint} />
          ) : (
            <FontAwesome6
              name="rotate-right"
              size={12}
              color={colors.text}
              style={{ opacity: 0.5 }}
            />
          )}
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.tint} />
          <ThemedText style={[styles.loadingText, { color: colors.text }]}>
            Personalising your tips…
          </ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errorRow}>
          <ThemedText style={[styles.errorText, { color: colors.text }]}>
            Couldn't load tips.{' '}
          </ThemedText>
          <Pressable onPress={() => load(true)}>
            <ThemedText style={{ color: colors.tint, fontSize: 13 }}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.tipsContainer}>
          {tips.map((tip, i) => (
            <View
              key={i}
              style={[
                styles.tipRow,
                i < tips.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.surfaceMuted,
                  paddingBottom: 12,
                },
              ]}
            >
              {/* Icon */}
              <View style={[styles.tipIcon, { backgroundColor: colors.tint + '15' }]}>
                <FontAwesome6 name={tip.icon as any} size={14} color={colors.tint} />
              </View>

              {/* Text */}
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText style={[styles.tipTitle, { color: colors.text }]}>
                  {tip.title}
                </ThemedText>
                <ThemedText style={[styles.tipBody, { color: colors.text }]}>
                  {tip.body}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Footer label */}
      {!loading && !error && (
        <ThemedText style={[styles.footerLabel, { color: colors.text }]}>
          Powered by Gemini · Updates daily
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sparkleWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    opacity: 0.6,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 13,
    opacity: 0.6,
  },
  tipsContainer: {
    gap: 12,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  tipBody: {
    fontSize: 13,
    opacity: 0.65,
    lineHeight: 18,
  },
  footerLabel: {
    fontSize: 11,
    opacity: 0.3,
    textAlign: 'right',
  },
});
