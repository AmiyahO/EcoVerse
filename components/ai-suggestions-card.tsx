// components/ai-suggestions-card.tsx
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Animated } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { FontAwesome6 } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useEffect, useRef, useState } from 'react';
import {
  fetchAISuggestions,
  buildActivitySummary,
  AISuggestion,
  ICON_COLOR_MAP,
} from '@/src/services/aiSuggestions';

interface Props {
  activities: any[];
  weeklyTokens: number;
  weeklyCO2: number;
  activeDaysThisWeek: number;
  streak: number;
  /** When true, hides the card's own header (title + refresh button) since
   *  the parent modal already provides a header. */
  inModal?: boolean;
}

export default function AISuggestionsCard({
  activities, weeklyTokens, weeklyCO2, activeDaysThisWeek, streak, inModal = false,
}: Props) {
  const { colors } = useAppTheme();
  const [tips, setTips] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [userTriedRefresh, setUserTriedRefresh] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Track whether we've done the initial real load (with actual activity data)
  const hasLoadedWithData = useRef(false);

  const fadeIn = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const summary = buildActivitySummary(
    activities, weeklyTokens, weeklyCO2, activeDaysThisWeek, streak
  );

  const load = async (force = false) => {
    try {
      if (force) { setRefreshing(true); setUserTriedRefresh(true); }
      else setLoading(true);
      setError(false);

      const result = await fetchAISuggestions(summary, force);
      setTips(result.tips);
      setFromCache(result.fromCache);
      setRateLimited(result.rateLimited);
      fadeIn();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Initial load ──────────────────────────────────────────────────────────
  // Run on mount (activities may still be []).
  // Also re-run once when activities actually arrive from Firestore,
  // so we don't stay on placeholder tips for existing users.
  useEffect(() => {
    if (hasLoadedWithData.current) return; // already loaded with real data, don't keep re-fetching
    if (activities.length > 0) {
      hasLoadedWithData.current = true;
    }
    load();
  }, [activities.length]); // re-runs when 0 → N (first real data arrives)

  const getIconColor = (icon: string) => ICON_COLOR_MAP[icon] ?? colors.tint;

  const footerText = (rateLimited && userTriedRefresh)
    ? 'Quota limit reached — showing cached tips'
    : fromCache
    ? 'Personalised · Updates when your data changes'
    : 'Powered by Gemini · Updates daily';

  return (
    <View style={[styles.card, !inModal && { backgroundColor: colors.surface }]}>

      {/* Header — hidden when rendered inside a modal that already has one */}
      {!inModal && (
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.sparkleWrap, { backgroundColor: colors.tint + '18' }]}>
              <FontAwesome6 name="wand-magic-sparkles" size={13} color={colors.tint} />
            </View>
            <ThemedText type="defaultSemiBold" style={{ color: colors.text, fontSize: 15 }}>
              AI Suggestions
            </ThemedText>
            {rateLimited && userTriedRefresh && !loading && (
              <View style={[styles.offlineBadge, { backgroundColor: colors.surfaceMuted }]}>
                <ThemedText style={[styles.offlineBadgeText, { color: colors.text }]}>Cached</ThemedText>
              </View>
            )}
          </View>

          <Pressable
            onPress={() => load(true)}
            disabled={refreshing || loading}
            hitSlop={8}
            style={({ pressed }) => [
              styles.refreshBtn,
              { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.5 : 1 },
            ]}
          >
            {refreshing
              ? <ActivityIndicator size={12} color={colors.tint} />
              : <FontAwesome6 name="rotate-right" size={12} color={colors.text} style={{ opacity: 0.5 }} />
            }
          </Pressable>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.tint} />
          <ThemedText style={[styles.mutedText, { color: colors.text }]}>
            Personalising your tips…
          </ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errorRow}>
          <ThemedText style={[styles.mutedText, { color: colors.text }]}>Couldn't load tips. </ThemedText>
          <Pressable onPress={() => load(true)}>
            <ThemedText style={{ color: colors.tint, fontSize: 13 }}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : (
        <Animated.View style={[styles.tipsContainer, { opacity: fadeAnim }]}>
          {tips.map((tip, i) => {
            const iconColor = getIconColor(tip.icon);
            return (
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
                <View style={[styles.tipIcon, { backgroundColor: iconColor + '18' }]}>
                  <FontAwesome6 name={tip.icon as any} size={14} color={iconColor} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <ThemedText style={[styles.tipTitle, { color: colors.text }]}>{tip.title}</ThemedText>
                  <ThemedText style={[styles.tipBody,  { color: colors.text }]}>{tip.body}</ThemedText>
                </View>
              </View>
            );
          })}
        </Animated.View>
      )}

      {!loading && !error && (
        <View style={styles.footerRow}>
          <ThemedText style={[styles.footerLabel, { color: colors.text, flex: 1 }]}>{footerText}</ThemedText>
          {inModal && (
            <Pressable
              onPress={() => load(true)}
              disabled={refreshing || loading}
              hitSlop={8}
              style={({ pressed }) => [
                styles.refreshBtn,
                { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.5 : 1 },
              ]}
            >
              {refreshing
                ? <ActivityIndicator size={12} color={colors.tint} />
                : <FontAwesome6 name="rotate-right" size={12} color={colors.text} style={{ opacity: 0.5 }} />
              }
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, gap: 12 },
  footerRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sparkleWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  refreshBtn:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  offlineBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  offlineBadgeText: { fontSize: 11, fontWeight: '600', opacity: 0.5 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  errorRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  mutedText:  { fontSize: 13, opacity: 0.6 },
  tipsContainer: { gap: 12 },
  tipRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  tipIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  tipTitle: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
  tipBody:  { fontSize: 13, opacity: 0.6, lineHeight: 18 },
  footerLabel: { fontSize: 11, opacity: 0.35, textAlign: 'right' },
});