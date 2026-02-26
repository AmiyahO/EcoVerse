// app/health-connect-sync.tsx
// "Sync now" review screen — fetches unsynced HC sessions, lets user
// select/deselect, shows estimated impact, then batch-imports on confirm.

import {
  View, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, Alert, Animated,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useActivityStore } from '@/src/store/activityStore';
import {
  fetchSyncCandidates,
  commitSync,
  formatSyncDate,
  SyncSession,
} from '@/src/services/healthSyncService';
import {
  checkHealthPermissions,
  formatActivityDate,
  formatActivityDuration,
  formatSource,
} from '@/src/services/healthConnect';

const CATEGORY_ICON: Record<string, string> = {
  walking: 'person-walking',
  running: 'person-running',
  cycling: 'bicycle',
};

const CATEGORY_COLOR: Record<string, string> = {
  walking: '#66BB6A',
  running: '#FFA726',
  cycling: '#26C6DA',
};

export default function HealthConnectSyncScreen() {
  const { colors } = useAppTheme();
  const activities  = useActivityStore(s => s.activities);
  const userRegion  = useActivityStore(s => s.userRegion);

  const [loading,     setLoading]     = useState(true);
  const [syncing,     setSyncing]     = useState(false);
  const [sessions,    setSessions]    = useState<SyncSession[]>([]);
  const [lastSynced,  setLastSynced]  = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<string[]>([]);
  const [permOk,      setPermOk]      = useState(true);

  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const [showSuccess, setShowSuccess] = useState(false);
  const [syncResult, setSyncResult]   = useState<{ imported: number; totalTokens: number; totalCarbon: number } | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    fadeAnim.setValue(0);

    const perm = await checkHealthPermissions();
    if (perm !== 'granted') {
      setPermOk(false);
      setLoading(false);
      return;
    }

    const { sessions: s, syncState } = await fetchSyncCandidates(activities, userRegion);
    setSessions(s);
    setLastSynced(syncState.lastSyncedAt);
    setImportedIds(syncState.importedIds);
    setLoading(false);

    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  };

  const toggleSession = (index: number) => {
    setSessions(prev => prev.map((s, i) => i === index ? { ...s, selected: !s.selected } : s));
  };

  const toggleAll = () => {
    const allSelected = sessions.every(s => s.selected);
    setSessions(prev => prev.map(s => ({ ...s, selected: !allSelected })));
  };

  const selectedCount = sessions.filter(s => s.selected).length;
  const totalTokens   = sessions.filter(s => s.selected).reduce((sum, s) => sum + s.estimatedTokens, 0);
  const totalCarbon   = sessions.filter(s => s.selected).reduce((sum, s) => sum + s.estimatedCarbon, 0);

  const handleSync = async () => {
    if (selectedCount === 0) return;
    setSyncing(true);
    try {
      const result = await commitSync(sessions, userRegion, activities, importedIds);
      setSyncResult(result);
      setShowSuccess(true);
      Animated.timing(successAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (e) {
      console.error('Sync error:', e);
      Alert.alert('Sync failed', 'Could not import activities. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (showSuccess && syncResult) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.successScreen, { opacity: successAnim }]}>
          <View style={styles.successIcon}>
            <FontAwesome6 name="circle-check" size={64} color={colors.tint} />
          </View>
          <ThemedText style={[styles.successTitle, { color: colors.text }]}>Sync complete!</ThemedText>
          <ThemedText style={[styles.successSub, { color: colors.text }]}>
            {syncResult.imported} {syncResult.imported === 1 ? 'activity' : 'activities'} imported
          </ThemedText>

          <View style={styles.successStats}>
            <View style={[styles.successStat, { backgroundColor: colors.surface }]}>
              <FontAwesome6 name="leaf" size={16} color={colors.tint} />
              <ThemedText style={[styles.successStatValue, { color: colors.tint }]}>
                +{syncResult.totalTokens}
              </ThemedText>
              <ThemedText style={[styles.successStatLabel, { color: colors.text }]}>tokens earned</ThemedText>
            </View>
            <View style={[styles.successStat, { backgroundColor: colors.surface }]}>
              <FontAwesome6 name="cloud" size={16} color={colors.tint} />
              <ThemedText style={[styles.successStatValue, { color: colors.tint }]}>
                {syncResult.totalCarbon.toFixed(2)}
              </ThemedText>
              <ThemedText style={[styles.successStatLabel, { color: colors.text }]}>kg CO₂ saved</ThemedText>
            </View>
          </View>

          <Pressable
            onPress={() => router.back()}
            style={[styles.doneBtn, { backgroundColor: colors.tint }]}
          >
            <ThemedText style={styles.doneBtnText}>Done</ThemedText>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Not permitted ───────────────────────────────────────────────────────────
  if (!permOk && !loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: colors.text }]}>Sync Activities</ThemedText>
        </View>
        <View style={styles.emptyState}>
          <FontAwesome6 name="lock" size={52} color={colors.text} style={{ opacity: 0.3, marginBottom: 4 }} />
          <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>Health Connect not connected</ThemedText>
          <ThemedText style={[styles.emptySub, { color: colors.text }]}>
            Grant Health Connect access first to sync your activities.
          </ThemedText>
          <Pressable
            onPress={() => router.replace('/health-connect-setup' as any)}
            style={[styles.setupBtn, { backgroundColor: colors.tint }]}
          >
            <ThemedText style={styles.setupBtnText}>Set up Health Connect</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.headerTitle, { color: colors.text }]}>Sync Activities</ThemedText>
          <ThemedText style={[styles.headerSub, { color: colors.text }]}>
            Last synced: {formatSyncDate(lastSynced)}
          </ThemedText>
        </View>
        <Pressable onPress={load} disabled={loading} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color={loading ? colors.text + '44' : colors.tint} />
        </Pressable>
      </View>

      {/* Loading */}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={[styles.loadingText, { color: colors.text }]}>Checking Health Connect…</ThemedText>
        </View>
      ) : sessions.length === 0 ? (

        <View style={styles.emptyState}>
          <FontAwesome6 name="circle-check" size={52} color={colors.tint} style={{ marginBottom: 4 }} />
          <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>All caught up!</ThemedText>
          <ThemedText style={[styles.emptySub, { color: colors.text }]}>
            No new activities found since your last sync.{'\n'}
            {lastSynced ? `Last checked ${formatSyncDate(lastSynced)}.` : 'No previous sync found — try again after logging some workouts.'}
          </ThemedText>
        </View>

      ) : (

        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>

          {/* Summary bar */}
          <View style={[styles.summaryBar, { backgroundColor: colors.surface }]}>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.summaryTitle, { color: colors.text }]}>
                {sessions.length} new {sessions.length === 1 ? 'activity' : 'activities'} found
              </ThemedText>
              {selectedCount > 0 && (
                <ThemedText style={[styles.summaryDetail, { color: colors.tint }]}>
                  {selectedCount} selected · +{Math.round(totalTokens)} tokens · {totalCarbon.toFixed(2)} kg CO₂
                </ThemedText>
              )}
            </View>
            <Pressable onPress={toggleAll} style={[styles.toggleAllBtn, { borderColor: colors.tint + '55' }]}>
              <ThemedText style={[styles.toggleAllText, { color: colors.tint }]}>
                {sessions.every(s => s.selected) ? 'Deselect all' : 'Select all'}
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {sessions.map((session, i) => {
              const hca    = session.hcActivity;
              const color  = CATEGORY_COLOR[hca.type];
              const icon   = CATEGORY_ICON[hca.type];
              const source = formatSource(hca.source);

              return (
                <Pressable
                  key={hca.id}
                  onPress={() => toggleSession(i)}
                  style={[
                    styles.sessionCard,
                    { backgroundColor: colors.surface },
                    session.selected
                      ? { borderColor: color + '55', borderWidth: 1.5 }
                      : { borderColor: colors.surfaceMuted, borderWidth: 1, opacity: 0.6 },
                  ]}
                >
                  {/* Left: category icon */}
                  <View style={[styles.sessionIconWrap, { backgroundColor: color + '20' }]}>
                    <FontAwesome6 name={icon as any} size={18} color={color} />
                  </View>

                  {/* Middle: details */}
                  <View style={{ flex: 1 }}>
                    <View style={styles.sessionTopRow}>
                      <ThemedText style={[styles.sessionType, { color: colors.text }]}>
                        {hca.type.charAt(0).toUpperCase() + hca.type.slice(1)}
                      </ThemedText>
                      <ThemedText style={[styles.sessionDate, { color: colors.text }]}>
                        {formatActivityDate(hca.startTime)}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.sessionMeta, { color: colors.text }]}>
                      {[
                        hca.steps    ? `${hca.steps.toLocaleString()} steps` : null,
                        hca.distance ? `${hca.distance} km`                  : null,
                        hca.duration ? formatActivityDuration(hca.duration)  : null,
                      ].filter(Boolean).join(' · ')}
                    </ThemedText>
                    <ThemedText style={[styles.sessionSource, { color: colors.text }]}>
                      via {source}
                    </ThemedText>
                  </View>

                  {/* Right: impact + checkbox */}
                  <View style={styles.sessionRight}>
                    <View style={styles.sessionImpact}>
                      {/* Leaf icon instead of coin emoji */}
                      <View style={styles.tokenRow}>
                        <FontAwesome6 name="leaf" size={11} color={session.selected ? colors.tint : colors.text} />
                        <ThemedText style={[styles.impactTokens, { color: session.selected ? colors.tint : colors.text }]}>
                          +{session.estimatedTokens}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.impactCarbon, { color: colors.text }]}>
                        {session.estimatedCarbon.toFixed(2)}kg
                      </ThemedText>
                    </View>
                    <View style={[
                      styles.checkbox,
                      session.selected
                        ? { backgroundColor: color, borderColor: color }
                        : { backgroundColor: 'transparent', borderColor: colors.surfaceMuted },
                    ]}>
                      {session.selected && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Bottom CTA */}
          <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.surfaceMuted }]}>
            <Pressable
              onPress={handleSync}
              disabled={syncing || selectedCount === 0}
              style={[
                styles.syncBtn,
                { backgroundColor: colors.tint },
                (syncing || selectedCount === 0) && { opacity: 0.45 },
              ]}
            >
              {syncing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <FontAwesome6 name="heart-pulse" size={15} color="#fff" />
                  <ThemedText style={styles.syncBtnText}>
                    Import {selectedCount} {selectedCount === 1 ? 'activity' : 'activities'}
                  </ThemedText>
                </>
              )}
            </Pressable>
            {selectedCount > 0 && (
              <ThemedText style={[styles.syncNote, { color: colors.text }]}>
                +{Math.round(totalTokens)} tokens · {totalCarbon.toFixed(2)} kg CO₂ saved
              </ThemedText>
            )}
          </View>

        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub:   { fontSize: 12, opacity: 0.4, marginTop: 1 },
  refreshBtn:  { padding: 8 },

  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText:  { fontSize: 14, opacity: 0.5 },

  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 12,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptySub:   { fontSize: 14, opacity: 0.5, textAlign: 'center', lineHeight: 21 },
  setupBtn:   { marginTop: 8, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12 },
  setupBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  summaryBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 4, marginBottom: 8,
    borderRadius: 12, padding: 12, gap: 10,
  },
  summaryTitle:  { fontSize: 14, fontWeight: '700' },
  summaryDetail: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  toggleAllBtn:  { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  toggleAllText: { fontSize: 12, fontWeight: '600' },

  scroll: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },

  sessionCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, padding: 13, gap: 12,
  },
  sessionIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  sessionTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sessionType:   { fontSize: 14, fontWeight: '700' },
  sessionDate:   { fontSize: 12, opacity: 0.45 },
  sessionMeta:   { fontSize: 13, opacity: 0.65, marginTop: 2 },
  sessionSource: { fontSize: 11, opacity: 0.35, marginTop: 2 },

  sessionRight:  { alignItems: 'flex-end', gap: 8, flexShrink: 0 },
  sessionImpact: { alignItems: 'flex-end' },
  tokenRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  impactTokens:  { fontSize: 13, fontWeight: '700' },
  impactCarbon:  { fontSize: 11, opacity: 0.45, marginTop: 1 },

  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },

  bottomBar: {
    padding: 16, paddingBottom: 28, gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  syncBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 54, borderRadius: 14,
  },
  syncBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  syncNote:    { textAlign: 'center', fontSize: 12, opacity: 0.45 },

  successScreen: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 12,
  },
  successIcon:      { marginBottom: 8 },
  successTitle:     { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  successSub:       { fontSize: 16, opacity: 0.6, textAlign: 'center' },
  successStats:     { flexDirection: 'row', gap: 12, marginVertical: 12, width: '100%' },
  successStat: {
    flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', gap: 6,
  },
  successStatValue: { fontSize: 26, fontWeight: '800' },
  successStatLabel: { fontSize: 12, opacity: 0.5, textAlign: 'center' },
  doneBtn: {
    width: '100%', height: 54, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});