// src/services/healthConnect.ts
// Health Connect integration for Android.
// Uses expo-health-connect (Expo config plugin wrapper around react-native-health-connect).
// Health Connect requires Android 8+ (API 26). On Android 14+ it's built into the OS.

import {
  initialize,
  requestPermission,
  readRecords,
  getGrantedPermissions,
  openHealthConnectSettings,
  openHealthConnectDataManagement,
  RecordType,
} from 'react-native-health-connect';
import { Platform } from 'react-native';
import { localMidnightToday } from '@/src/utils/dateUtils';

// ── Types ────────────────────────────────────────────────────────────────────

export interface HCActivity {
  id: string;
  type: 'walking' | 'running' | 'cycling';
  startTime: string;
  endTime: string;
  // Walking
  steps?: number;
  distance?: number;    // km
  // Running / Cycling
  duration?: number;    // minutes
  calories?: number;
  source?: string;      // e.g. "Google Fit", "Samsung Health"
}

/**
 * A day's worth of steps from the phone pedometer (no exercise session).
 * Surfaces in the sync screen as an importable walking entry.
 */
export interface HCDailySteps {
  /** Unique ID — "steps-YYYY-MM-DD" */
  id: string;
  /** ISO date string for the LOCAL day, e.g. "2026-02-27" */
  date: string;
  /** Local midnight for the day */
  startTime: string;
  /** Local end-of-day for the day */
  endTime: string;
  steps: number;
  distance: number; // km, may be 0 if no distance data
  source: string;
}

export interface HCSummary {
  totalSteps: number;
  totalDistance: number; // km
  activities: HCActivity[];
}

export type PermissionStatus =
  | 'granted'
  | 'denied'
  | 'not_asked'
  | 'unavailable'; // not Android or HC not installed

// ── Permission definitions ───────────────────────────────────────────────────

const REQUIRED_PERMISSIONS = [
  { accessType: 'read' as const, recordType: 'Steps' as RecordType },
  { accessType: 'read' as const, recordType: 'Distance' as RecordType },
  { accessType: 'read' as const, recordType: 'ExerciseSession' as RecordType },
  { accessType: 'read' as const, recordType: 'ActiveCaloriesBurned' as RecordType },
];

// ── Availability check ───────────────────────────────────────────────────────

export async function isHealthConnectAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const result = await initialize();
    return result;
  } catch {
    return false;
  }
}

// ── Permission request ───────────────────────────────────────────────────────

export async function requestHealthPermissions(): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') return 'unavailable';

  try {
    const isAvailable = await initialize();
    if (!isAvailable) return 'unavailable';

    // requestPermission opens the HC dialog. The return value is unreliable
    // on many devices so we poll checkHealthPermissions after the dialog closes.
    await requestPermission(REQUIRED_PERMISSIONS);

    // Poll up to 10 times with 600ms gaps (6s total) waiting for HC to reflect the grant
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      const status = await checkHealthPermissions();
      if (status === 'granted') return 'granted';
    }

    // Final check — return whatever we get
    return checkHealthPermissions();
  } catch (e) {
    console.error('Health Connect permission error:', e);
    return 'denied';
  }
}

export async function checkHealthPermissions(): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') return 'unavailable';

  try {
    // Re-initialize each time — required for getGrantedPermissions to reflect
    // permission changes made while the app was in the background
    const isAvailable = await initialize();
    if (!isAvailable) {
      return 'unavailable';
    }

    const granted = await getGrantedPermissions();
    const hasSteps = granted.some((p: any) => p.recordType === 'Steps');
    return hasSteps ? 'granted' : 'not_asked';
  } catch (e) {
    return 'not_asked';
  }
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * Local-midnight-aware date range for N days back.
 * All HC queries must use local midnight — NOT UTC midnight —
 * to avoid bleeding the previous day's evening into the wrong day
 * on devices in UTC+1 or later (e.g. Cyprus is UTC+2/+3).
 */
function getDateRange(daysBack: number): { startTime: string; endTime: string } {
  const end   = new Date();
  const start = new Date();
  start.setDate(end.getDate() - daysBack);
  start.setHours(0, 0, 0, 0); // local midnight
  return {
    startTime: start.toISOString(),
    endTime:   end.toISOString(),
  };
}

/** Returns the local ISO date string (YYYY-MM-DD) for a given Date */
function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Today's steps (banner auto-fill) ─────────────────────────────────────────

/**
 * Fetch TODAY's step count and distance from Health Connect.
 * Uses local midnight so devices in UTC+1 or later don't bleed
 * yesterday's evening sessions into today's count.
 */
export async function fetchTodaySteps(): Promise<{ steps: number; distance: number } | null> {
  try {
    const startTime = localMidnightToday().toISOString();
    const endTime   = new Date().toISOString();

    const [stepsResult, distanceResult] = await Promise.all([
      readRecords('Steps',    { timeRangeFilter: { operator: 'between', startTime, endTime } }),
      readRecords('Distance', { timeRangeFilter: { operator: 'between', startTime, endTime } }),
    ]);

    // Same deduplication as fetchDailyStepSummaries:
    // bucket by dataOrigin, take max across origins to prevent
    // Samsung Health + Google Fit both writing the same steps
    const stepsByOrigin: Record<string, number> = {};
    for (const r of stepsResult.records as any[]) {
      const origin = r.metadata?.dataOrigin ?? 'unknown';
      stepsByOrigin[origin] = (stepsByOrigin[origin] ?? 0) + (r.count ?? 0);
    }
    const totalSteps = stepsByOrigin && Object.keys(stepsByOrigin).length > 0
      ? Math.max(...Object.values(stepsByOrigin))
      : 0;

    const distByOrigin: Record<string, number> = {};
    for (const r of distanceResult.records as any[]) {
      const origin = r.metadata?.dataOrigin ?? 'unknown';
      distByOrigin[origin] = (distByOrigin[origin] ?? 0) + (r.distance?.inMeters ?? 0);
    }
    const totalDistanceMeters = distByOrigin && Object.keys(distByOrigin).length > 0
      ? Math.max(...Object.values(distByOrigin))
      : 0;

    return {
      steps:    Math.round(totalSteps),
      distance: Math.round((totalDistanceMeters / 1000) * 100) / 100,
    };
  } catch (e) {
    console.error('fetchTodaySteps error:', e);
    return null;
  }
}

/**
 * Fetch recent exercise sessions from Health Connect for the last N days.
 * Filters to walking, running, cycling.
 * Used to show "recent activities" the user can import.
 */
export async function fetchRecentActivities(daysBack = 7): Promise<HCActivity[]> {
  try {
    const { startTime, endTime } = getDateRange(daysBack);

    const sessions = await readRecords('ExerciseSession', {
      timeRangeFilter: { operator: 'between', startTime, endTime },
    });

    const activities: HCActivity[] = [];

    for (const session of sessions.records as any[]) {
      // Map Health Connect exercise types to EcoVerse categories
      // Type IDs: 55 = walking, 56 = running, 8 = cycling (road), 9 = cycling (mountain)
      const typeId = session.exerciseType;
      let type: HCActivity['type'] | null = null;

      if (typeId === 55 || typeId === 79)       type = 'walking';   // walking, hiking
      else if (typeId === 56 || typeId === 58)  type = 'running';   // running, trail running
      else if (typeId === 8  || typeId === 9)   type = 'cycling';   // cycling variants

      if (!type) continue; // skip gym, yoga, etc.

      const startMs     = new Date(session.startTime).getTime();
      const endMs       = new Date(session.endTime).getTime();
      const durationMin = Math.round((endMs - startMs) / 60000);

      // Try to get distance for this session's time window
      let distKm = 0;
      try {
        const distResult = await readRecords('Distance', {
          timeRangeFilter: { operator: 'between', startTime: session.startTime, endTime: session.endTime },
        });
        const distMeters = distResult.records.reduce((s: number, r: any) => s + (r.distance?.inMeters ?? 0), 0);
        distKm = Math.round((distMeters / 1000) * 100) / 100;
      } catch { /* distance not available */ }

      // Steps for walking
      let steps = 0;
      if (type === 'walking') {
        try {
          const stepsResult = await readRecords('Steps', {
            timeRangeFilter: { operator: 'between', startTime: session.startTime, endTime: session.endTime },
          });
          steps = stepsResult.records.reduce((s: number, r: any) => s + (r.count ?? 0), 0);
        } catch { /* steps not available */ }
      }

      activities.push({
        id:        session.metadata?.id ?? `${startMs}`,
        type,
        startTime: session.startTime,
        endTime:   session.endTime,
        duration:  durationMin,
        distance:  distKm > 0 ? distKm : undefined,
        steps:     steps > 0 ? Math.round(steps) : undefined,
        source:    session.metadata?.dataOrigin ?? undefined,
      });
    }

    // Sort newest first
    return activities.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  } catch (e) {
    console.error('fetchRecentActivities error:', e);
    return [];
  }
}

// ── Daily pedometer step summaries ────────────────────────────────────────────
//
// The phone's built-in pedometer writes Steps records throughout the day with
// NO corresponding ExerciseSession. fetchRecentActivities() misses these entirely.
//
// This function aggregates HC Steps + Distance records day by day and returns
// one HCDailySteps entry per day that has steps > 0. The caller (healthSyncService)
// is responsible for filtering out days that already have a walking activity logged,
// and for skipping days covered by an exercise session from fetchRecentActivities().

export async function fetchDailyStepSummaries(daysBack = 30): Promise<HCDailySteps[]> {
  if (Platform.OS !== 'android') return [];

  try {
    const { startTime, endTime } = getDateRange(daysBack);

    const [stepsResult, distanceResult] = await Promise.all([
      readRecords('Steps',    { timeRangeFilter: { operator: 'between', startTime, endTime } }),
      readRecords('Distance', { timeRangeFilter: { operator: 'between', startTime, endTime } }),
    ]);

    // ── Steps: bucket by (dayKey, dataOrigin), then take max per day ─────────
    //
    // stepsByOrigin[dayKey][origin] = total steps from that origin on that day
    const stepsByOrigin: Record<string, Record<string, number>> = {};

    for (const r of stepsResult.records as any[]) {
      const dayKey = toLocalISODate(new Date(r.startTime));
      const origin = r.metadata?.dataOrigin ?? 'unknown';
      if (!stepsByOrigin[dayKey]) stepsByOrigin[dayKey] = {};
      stepsByOrigin[dayKey][origin] = (stepsByOrigin[dayKey][origin] ?? 0) + (r.count ?? 0);
    }

    // For each day, the best step count is the maximum across all origins
    const stepsByDay: Record<string, number> = {};
    for (const [dayKey, origins] of Object.entries(stepsByOrigin)) {
      stepsByDay[dayKey] = Math.max(...Object.values(origins));
    }

    // ── Distance: same deduplication ─────────────────────────────────────────
    const distByOrigin: Record<string, Record<string, number>> = {};

    for (const r of distanceResult.records as any[]) {
      const dayKey = toLocalISODate(new Date(r.startTime));
      const origin = r.metadata?.dataOrigin ?? 'unknown';
      if (!distByOrigin[dayKey]) distByOrigin[dayKey] = {};
      distByOrigin[dayKey][origin] = (distByOrigin[dayKey][origin] ?? 0) + (r.distance?.inMeters ?? 0);
    }

    const distByDay: Record<string, number> = {};
    for (const [dayKey, origins] of Object.entries(distByOrigin)) {
      distByDay[dayKey] = Math.max(...Object.values(origins));
    }

    // ── Build one summary per day ─────────────────────────────────────────────
    const summaries: HCDailySteps[] = [];

    for (const [dateKey, totalSteps] of Object.entries(stepsByDay)) {
      if (totalSteps < 100) continue; // ignore noise / brief movement

      const [y, mo, d] = dateKey.split('-').map(Number);
      const dayStart = new Date(y, mo - 1, d, 0, 0, 0, 0);
      const dayEnd   = new Date(y, mo - 1, d, 23, 59, 59, 999);

      const totalDistMeters = distByDay[dateKey] ?? 0;
      const distKm = Math.round((totalDistMeters / 1000) * 100) / 100;

      summaries.push({
        id:        `steps-${dateKey}`,
        date:      dateKey,
        startTime: dayStart.toISOString(),
        endTime:   dayEnd.toISOString(),
        steps:     Math.round(totalSteps),
        distance:  distKm,
        source:    'pedometer',
      });
    }

    // Sort newest first
    return summaries.sort((a, b) => b.date.localeCompare(a.date));
  } catch (e) {
    console.error('fetchDailyStepSummaries error:', e);
    return [];
  }
}

// ── Deep links ───────────────────────────────────────────────────────────────

/** Open Health Connect app settings (to grant/revoke permissions) */
export function openHCSettings() {
  openHealthConnectSettings();
}

/** Open Health Connect data management */
export function openHCDataManagement() {
  openHealthConnectDataManagement();
}

// ── Formatting helpers ───────────────────────────────────────────────────────

export function formatActivityDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatActivityDate(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  // Compare local dates, not UTC
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate();

  if (sameDay(d, now)) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Yesterday';

  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Friendly source name from package origin */
export function formatSource(origin?: string): string {
  if (!origin) return 'Health Connect';
  if (origin.includes('com.google.android.apps.fitness')) return 'Google Fit';
  if (origin.includes('com.sec.android.app.shealth')) return 'Samsung Health';
  if (origin.includes('com.strava'))                  return 'Strava';
  if (origin.includes('com.garmin.android.apps.connectmobile'))                  return 'Garmin';
  if (origin.includes('com.polar.flow'))                   return 'Polar';
  if (origin.includes('com.fitbit.FitbitMobile'))                  return 'Fitbit';
  // Fallback: capitalize last segment of package name
  const parts = origin.split('.');
  const last  = parts[parts.length - 1];
  return last.charAt(0).toUpperCase() + last.slice(1);
}