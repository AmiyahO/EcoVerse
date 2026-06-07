// components/health-connect-banner.tsx
// Shows on the add activity screen when walking/running/cycling is selected.
// Three states:
//   1. not_asked  → "Connect Health Connect" CTA
//   2. granted    → shows steps/sessions for the SELECTED DATE to import
//   3. unavailable → hidden (not Android or HC not installed)
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  checkHealthPermissions,
  fetchStepsForDate,
  fetchRecentActivities,
  formatActivityDate,
  formatActivityDuration,
  formatSource,
  HCActivity,
  PermissionStatus,
} from '@/src/services/healthConnect';
import { ActivityCategory, useActivityStore } from '@/src/store/activityStore';

interface HealthConnectBannerProps {
  category: ActivityCategory;
  /** The date currently selected in the Add Activity date picker.
   *  Banner fetches steps for this date — not always today. */
  selectedDate: Date;
  /** Called when user picks a value to auto-fill */
  onAutoFill: (data: {
    steps?: number;
    distance?: number;
    duration?: number;
    hcId?: string; // ID of the Health Connect data used for auto-fill, for traceability and de-duplication
  }) => void;
}

/** Returns true if two Date objects fall on the same local calendar day */
function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

/** Short human-readable label for a date: "Today", "Yesterday", or "May 8" */
function formatDateLabel(date: Date): string {
  const today = new Date();
  if (isSameLocalDay(date, today)) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameLocalDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HealthConnectBanner({
  category,
  selectedDate,
  onAutoFill,
}: HealthConnectBannerProps) {
  const { colors } = useAppTheme();
  const activities = useActivityStore(s => s.activities);

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
        // Fetch steps for the SELECTED date — not always today
        category === 'walking' ? fetchStepsForDate(selectedDate) : Promise.resolve(null),
        fetchRecentActivities(7),
      ]);
      setTodaySteps(steps);
      // Filter sessions to the matching category; for walking also filter
      // to sessions on the selected date so stale old sessions don't appear
      // when the user has picked a specific past day.
      const filteredSessions = sessions
        .filter(s => s.type === category)
        .filter(s => {
          // For walking with a specific past date selected, only show sessions
          // from that date so the banner is date-coherent.
          if (category === 'walking' && !isSameLocalDay(selectedDate, new Date())) {
            return isSameLocalDay(new Date(s.startTime), selectedDate);
          }
          return true;
        })
        .filter(s => {
          // Hide sessions already imported (matched by hcId or time proximity)
          const alreadyByHcId = activities.some(a => (a as any).hcId === s.id);
          const alreadyByTime = activities.some(a => {
            if (a.category !== s.type) return false;
            return Math.abs(new Date(a.date).getTime() - new Date(s.startTime).getTime()) < 2 * 3600000;
          });
          return !alreadyByHcId && !alreadyByTime;
        })
        .slice(0, 3);
      setRecent(filteredSessions);
    }

    setLoading(false);
  }, [category, selectedDate]);

  // Re-run whenever category OR selectedDate changes
  useEffect(() => {
    setDismissed(false);
    loadData();
  }, [category, selectedDate]);

  // Hidden cases
  if (!isMovement || dismissed || status === 'unavailable') return null;

  const dateLabel = formatDateLabel(selectedDate);

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
          Loading Health Connect data for {dateLabel}…
        </ThemedText>
      </View>
    );
  }

  // ── Granted: walking with steps for the selected date ─────────────────────
  // Calculate how many steps for this date are already imported
  const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const alreadyImportedSteps = activities
    .filter(a => a.category === 'walking' && (a as any).hcId === `steps-${dateKey}`)
    .reduce((sum, a) => sum + ((a as any).steps ?? 0), 0);
  const availableSteps = todaySteps ? Math.max(0, todaySteps.steps - alreadyImportedSteps) : 0;
  const availableDistance = (todaySteps && todaySteps.steps > 0 && availableSteps > 0)
    ? Math.round((todaySteps.distance * (availableSteps / todaySteps.steps)) * 100) / 100
    : 0;

  if (status === 'granted' && category === 'walking' && availableSteps > 200) {
    return (
      <View style={[styles.hcCard, { backgroundColor: colors.surface, borderColor: colors.tint + '25' }]}>
        <View style={styles.hcCardHeader}>
          <View style={[styles.hcIcon, { backgroundColor: '#66BB6A20' }]}>
            <FontAwesome6 name="person-walking" size={16} color="#66BB6A" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.hcCardTitle, { color: colors.text }]}>
              {dateLabel} from Health Connect
            </ThemedText>
            <ThemedText style={[styles.hcSource, { color: colors.text }]}>Auto-synced</ThemedText>
          </View>
          <Pressable onPress={() => router.push('/health-connect-setup' as any)} style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={14} color={colors.text + '55'} />
          </Pressable>
        </View>

        <View style={styles.hcStats}>
          <View style={styles.hcStat}>
            <ThemedText style={[styles.hcStatValue, { color: colors.tint }]}>
              {availableSteps.toLocaleString()}
            </ThemedText>
            <ThemedText style={[styles.hcStatLabel, { color: colors.text }]}>
              {alreadyImportedSteps > 0 ? 'steps remaining' : 'steps'}
            </ThemedText>
          </View>
          {availableDistance > 0 && (
            <View style={[styles.hcStatDivider, { backgroundColor: colors.surfaceMuted }]} />
          )}
          {availableDistance > 0 && (
            <View style={styles.hcStat}>
              <ThemedText style={[styles.hcStatValue, { color: colors.tint }]}>
                {availableDistance}
              </ThemedText>
              <ThemedText style={[styles.hcStatLabel, { color: colors.text }]}>km</ThemedText>
            </View>
          )}
        </View>

        <Pressable
          onPress={() => {
            onAutoFill({ steps: availableSteps, distance: availableDistance || undefined, hcId: `steps-${dateKey}` });
          }}          style={[styles.importBtn, { backgroundColor: colors.tint }]}
        >
          <FontAwesome6 name="download" size={13} color="#fff" />
          <ThemedText style={styles.importBtnText}>Use {dateLabel.toLowerCase()}'s data</ThemedText>
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
                hcId: session.id,
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

  // ── Granted but no data for selected date ────────────────────────────────
  if (status === 'granted') {
    return (
      <View style={[styles.banner, { backgroundColor: colors.surface }]}>
        <Ionicons name="fitness-outline" size={18} color={colors.tint} />
        <ThemedText style={[styles.bannerSub, { color: colors.text, flex: 1, marginLeft: 10 }]}>
          No {category} data found in Health Connect for {dateLabel}.
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