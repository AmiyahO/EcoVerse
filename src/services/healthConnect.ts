// src/services/healthConnect.ts
// Health Connect integration for Android.
// Uses expo-health-connect (Expo config plugin wrapper around react-native-health-connect).
//
// Install: npm install expo-health-connect
// Add to app.json plugins: ["expo-health-connect"]
// Add android.permissions in app.json (see HEALTH_CONNECT_SETUP.md)
// Then rebuild: npx expo run:android
//
// Health Connect requires Android 8+ (API 26). On Android 14+ it's built into the OS.

import {
  initialize,
  requestPermission,
  readRecords,
  getGrantedPermissions,
  openHealthConnectSettings,
  openHealthConnectDataManagement,
  RecordType,
} from 'expo-health-connect';
import { Platform } from 'react-native';

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
      console.log('[HC] initialize() returned false — HC not available');
      return 'unavailable';
    }

    const granted = await getGrantedPermissions();
    console.log('[HC] getGrantedPermissions returned:', JSON.stringify(granted));
    const hasSteps = granted.some(p => p.recordType === 'Steps');
    return hasSteps ? 'granted' : 'not_asked';
  } catch (e) {
    console.log('[HC] checkHealthPermissions error:', e);
    return 'not_asked';
  }
}

// ── Data fetching ────────────────────────────────────────────────────────────

/**
 * Returns the date range for "today" or "last N days"
 */
function getDateRange(daysBack = 1): { startTime: string; endTime: string } {
  const end   = new Date();
  const start = new Date();
  start.setDate(end.getDate() - daysBack);
  start.setHours(0, 0, 0, 0);
  return {
    startTime: start.toISOString(),
    endTime:   end.toISOString(),
  };
}

/**
 * Fetch today's step count and distance from Health Connect.
 * Used to pre-fill the walking log form.
 */
export async function fetchTodaySteps(): Promise<{ steps: number; distance: number } | null> {
  try {
    const { startTime, endTime } = getDateRange(1);

    const [stepsResult, distanceResult] = await Promise.all([
      readRecords('Steps', { timeRangeFilter: { operator: 'between', startTime, endTime } }),
      readRecords('Distance', { timeRangeFilter: { operator: 'between', startTime, endTime } }),
    ]);

    const totalSteps = stepsResult.records.reduce(
      (sum, r) => sum + (r.count ?? 0), 0
    );

    const totalDistanceMeters = distanceResult.records.reduce(
      (sum, r) => sum + (r.distance?.inMeters ?? 0), 0
    );

    return {
      steps:    Math.round(totalSteps),
      distance: Math.round((totalDistanceMeters / 1000) * 100) / 100, // km, 2dp
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

    for (const session of sessions.records) {
      // Map Health Connect exercise types to EcoVerse categories
      // Type IDs: 55 = walking, 56 = running, 8 = cycling (road), 9 = cycling (mountain)
      const typeId = session.exerciseType;
      let type: HCActivity['type'] | null = null;

      if (typeId === 55 || typeId === 79)       type = 'walking';   // walking, hiking
      else if (typeId === 56 || typeId === 58)  type = 'running';   // running, trail running
      else if (typeId === 8  || typeId === 9)   type = 'cycling';   // cycling variants

      if (!type) continue; // skip gym, yoga, etc.

      const startMs  = new Date(session.startTime).getTime();
      const endMs    = new Date(session.endTime).getTime();
      const durationMin = Math.round((endMs - startMs) / 60000);

      // Try to get distance for this session's time window
      let distKm = 0;
      try {
        const distResult = await readRecords('Distance', {
          timeRangeFilter: { operator: 'between', startTime: session.startTime, endTime: session.endTime },
        });
        const distMeters = distResult.records.reduce((s, r) => s + (r.distance?.inMeters ?? 0), 0);
        distKm = Math.round((distMeters / 1000) * 100) / 100;
      } catch { /* distance not available */ }

      // Steps for walking
      let steps = 0;
      if (type === 'walking') {
        try {
          const stepsResult = await readRecords('Steps', {
            timeRangeFilter: { operator: 'between', startTime: session.startTime, endTime: session.endTime },
          });
          steps = stepsResult.records.reduce((s, r) => s + (r.count ?? 0), 0);
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
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Friendly source name from package origin */
export function formatSource(origin?: string): string {
  if (!origin) return 'Health Connect';
  if (origin.includes('google.android.apps.fitness')) return 'Google Fit';
  if (origin.includes('com.samsung.health'))           return 'Samsung Health';
  if (origin.includes('com.strava'))                   return 'Strava';
  if (origin.includes('com.garmin'))                   return 'Garmin';
  if (origin.includes('com.polar'))                    return 'Polar';
  // Fallback: capitalize last segment of package name
  const parts = origin.split('.');
  const last  = parts[parts.length - 1];
  return last.charAt(0).toUpperCase() + last.slice(1);
}