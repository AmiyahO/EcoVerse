// components/health-connect-banner.tsx
// Shows on the add activity screen when walking/running/cycling is selected.
// Three states:
//   1. not_asked  → "Connect Health Connect" CTA
//   2. granted    → shows today's steps / recent session to import
//   3. unavailable → hidden (not Android or HC not installed)

import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  checkHealthPermissions,
  fetchTodaySteps,
  fetchRecentActivities,
  formatActivityDate,
  formatActivityDuration,
  formatSource,
  HCActivity,
  PermissionStatus,
} from '@/src/services/healthConnect';
import { ActivityCategory } from '@/src/store/activityStore';

interface HealthConnectBannerProps {
  category: ActivityCategory;
  /** Called when user picks a value to auto-fill */
  onAutoFill: (data: {
    steps?: number;
    distance?: number;
    duration?: number;
  }) => void;
}

export default function HealthConnectBanner({ category, onAutoFill }: HealthConnectBannerProps) {
  const { colors } = useAppTheme();

  const [status, setStatus]           = useState<PermissionStatus>('not_asked');
  const [loading, setLoading]         = useState(true);
  const [todaySteps, setTodaySteps]   = useState<{ steps: number; distance: number } | null>(null);
  const [recentSessions, setRecent]   = useState<HCActivity[]>([]);
  const [dismissed, setDismissed]     = useState(false);

  const isMovement = category === 'walking' || category === 'running' || category === 'cycling';

  const loadData = useCallback(async () => {
    if (!isMovement) return;
    setLoading(true);

    const perm = await checkHealthPermissions();
    setStatus(perm);

    if (perm === 'granted') {
      const [steps, sessions] = await Promise.all([
        category === 'walking' ? fetchTodaySteps() : Promise.resolve(null),
        fetchRecentActivities(7),
      ]);
      setTodaySteps(steps);
      // Filter to matching category
      setRecent(sessions.filter(s => s.type === category).slice(0, 3));
    }

    setLoading(false);
  }, [category]);

  useEffect(() => {
    setDismissed(false);
    loadData();
  }, [category]);

  // Hidden cases
  if (!isMovement || dismissed || status === 'unavailable') return null;

  // ── Not connected ──────────────────────────────────────────────────────────
  if (status === 'not_asked' || status === 'denied') {
    return (
      <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.tint + '30' }]}>
        <View style={styles.bannerLeft}>
          <View style={[styles.bannerIcon, { backgroundColor: colors.tint + '18' }]}>
            <FontAwesome6 name="heart-pulse" size={16} color={colors.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.bannerTitle, { color: colors.text }]}>
              Auto-fill from Health Connect
            </ThemedText>
            <ThemedText style={[styles.bannerSub, { color: colors.text }]}>
              Import your {category} data from Google Fit, Samsung Health & more.
            </ThemedText>
          </View>
        </View>
        <View style={styles.bannerActions}>
          <Pressable
            onPress={() => router.push('/health-connect-setup' as any)}
            style={[styles.connectBtn, { backgroundColor: colors.tint }]}
          >
            <ThemedText style={styles.connectBtnText}>Connect</ThemedText>
          </Pressable>
          <Pressable onPress={() => setDismissed(true)} style={styles.dismissBtn}>
            <Ionicons name="close" size={16} color={colors.text + '55'} />
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.banner, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="small" color={colors.tint} />
        <ThemedText style={[styles.bannerSub, { color: colors.text, marginLeft: 10 }]}>
          Loading your Health Connect data…
        </ThemedText>
      </View>
    );
  }

  // ── Granted: walking with today's steps ───────────────────────────────────
  if (status === 'granted' && category === 'walking' && todaySteps && todaySteps.steps > 0) {
    return (
      <View style={[styles.hcCard, { backgroundColor: colors.surface, borderColor: colors.tint + '25' }]}>
        <View style={styles.hcCardHeader}>
          <View style={[styles.hcIcon, { backgroundColor: '#66BB6A20' }]}>
            <Text style={styles.hcIconEmoji}>👟</Text>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.hcCardTitle, { color: colors.text }]}>Today from Health Connect</ThemedText>
            <ThemedText style={[styles.hcSource, { color: colors.text }]}>Auto-synced</ThemedText>
          </View>
          <Pressable onPress={() => router.push('/health-connect-setup' as any)} style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={14} color={colors.text + '55'} />
          </Pressable>
        </View>

        <View style={styles.hcStats}>
          <View style={styles.hcStat}>
            <ThemedText style={[styles.hcStatValue, { color: colors.tint }]}>
              {todaySteps.steps.toLocaleString()}
            </ThemedText>
            <ThemedText style={[styles.hcStatLabel, { color: colors.text }]}>steps</ThemedText>
          </View>
          {todaySteps.distance > 0 && (
            <View style={[styles.hcStatDivider, { backgroundColor: colors.surfaceMuted }]} />
          )}
          {todaySteps.distance > 0 && (
            <View style={styles.hcStat}>
              <ThemedText style={[styles.hcStatValue, { color: colors.tint }]}>
                {todaySteps.distance}
              </ThemedText>
              <ThemedText style={[styles.hcStatLabel, { color: colors.text }]}>km</ThemedText>
            </View>
          )}
        </View>

        <Pressable
          onPress={() => onAutoFill({ steps: todaySteps.steps, distance: todaySteps.distance || undefined })}
          style={[styles.importBtn, { backgroundColor: colors.tint }]}
        >
          <FontAwesome6 name="download" size={13} color="#fff" />
          <ThemedText style={styles.importBtnText}>Use today's data</ThemedText>
        </Pressable>
      </View>
    );
  }

  // ── Granted: recent sessions (running / cycling / walking fallback) ────────
  if (status === 'granted' && recentSessions.length > 0) {
    return (
      <View style={[styles.hcCard, { backgroundColor: colors.surface, borderColor: colors.tint + '25' }]}>
        <View style={styles.hcCardHeader}>
          <View style={[styles.hcIcon, { backgroundColor: colors.tint + '18' }]}>
            <FontAwesome6
              name={category === 'cycling' ? 'bicycle' : category === 'running' ? 'person-running' : 'person-walking'}
              size={15}
              color={colors.tint}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.hcCardTitle, { color: colors.text }]}>
              Recent {category} sessions
            </ThemedText>
            <ThemedText style={[styles.hcSource, { color: colors.text }]}>From Health Connect · last 7 days</ThemedText>
          </View>
          <Pressable onPress={() => router.push('/health-connect-setup' as any)} style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={14} color={colors.text + '55'} />
          </Pressable>
        </View>

        <View style={styles.sessionsList}>
          {recentSessions.map((session, i) => (
            <Pressable
              key={session.id}
              onPress={() => onAutoFill({
                steps:    session.steps,
                distance: session.distance,
                duration: session.duration,
              })}
              style={[
                styles.sessionRow,
                i < recentSessions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surfaceMuted },
              ]}
            >
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.sessionDate, { color: colors.text }]}>
                  {formatActivityDate(session.startTime)}
                  {session.source ? ` · ${formatSource(session.source)}` : ''}
                </ThemedText>
                <ThemedText style={[styles.sessionMeta, { color: colors.text }]}>
                  {[
                    session.steps ? `${session.steps.toLocaleString()} steps` : null,
                    session.distance ? `${session.distance} km` : null,
                    session.duration ? formatActivityDuration(session.duration) : null,
                  ].filter(Boolean).join(' · ')}
                </ThemedText>
              </View>
              <View style={[styles.importPill, { backgroundColor: colors.tint + '18' }]}>
                <ThemedText style={[styles.importPillText, { color: colors.tint }]}>Use</ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  // ── Granted but no data ───────────────────────────────────────────────────
  if (status === 'granted') {
    return (
      <View style={[styles.banner, { backgroundColor: colors.surface }]}>
        <Ionicons name="fitness-outline" size={18} color={colors.tint} />
        <ThemedText style={[styles.bannerSub, { color: colors.text, flex: 1, marginLeft: 10 }]}>
          No recent {category} sessions found in Health Connect.
        </ThemedText>
        <Pressable onPress={() => router.push('/health-connect-setup' as any)} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={14} color={colors.text + '55'} />
        </Pressable>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  // Promo banner (not connected)
  banner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, padding: 12, gap: 10,
    borderWidth: 1,
  },
  bannerLeft:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerIcon:    { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  bannerTitle:   { fontSize: 13, fontWeight: '700' },
  bannerSub:     { fontSize: 12, opacity: 0.55, marginTop: 1, lineHeight: 16 },
  bannerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  connectBtn:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9 },
  connectBtnText:{ color: '#fff', fontSize: 13, fontWeight: '700' },
  dismissBtn:    { padding: 4 },

  // HC data card
  hcCard: {
    borderRadius: 14, padding: 14, gap: 12,
    borderWidth: 1,
  },
  hcCardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hcIcon:        { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  hcIconEmoji:   { fontSize: 18 },
  hcCardTitle:   { fontSize: 14, fontWeight: '700' },
  hcSource:      { fontSize: 11, opacity: 0.45, marginTop: 1 },
  settingsBtn:   { padding: 6 },

  // Today stats
  hcStats:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  hcStat:        { alignItems: 'center', gap: 2 },
  hcStatValue:   { fontSize: 28, fontWeight: '800' },
  hcStatLabel:   { fontSize: 12, opacity: 0.5 },
  hcStatDivider: { width: 1, height: 36 },

  importBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 11, borderRadius: 10,
  },
  importBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Sessions list
  sessionsList: { gap: 0 },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 10,
  },
  sessionDate: { fontSize: 13, fontWeight: '600' },
  sessionMeta: { fontSize: 12, opacity: 0.5, marginTop: 2 },
  importPill:  { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  importPillText: { fontSize: 12, fontWeight: '700' },
});