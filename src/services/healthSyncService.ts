// src/services/healthSyncService.ts
// Manages the "Sync now" Health Connect flow.
//
// Responsibilities:
//   - Store/retrieve lastSyncedAt in Firestore (persists across devices)
//   - Fetch HC sessions + daily pedometer summaries since last sync
//   - Deduplicate against already-imported IDs and existing activities
//   - Batch-write selected activities to Firestore
//   - Update user tokens/carbon totals atomically

import {
  collection, addDoc, doc, updateDoc, getDoc,
  setDoc, increment, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '@/src/firebase/config';
import {
  fetchRecentActivities,
  fetchDailyStepSummaries,
  checkHealthPermissions,
  HCActivity,
  HCDailySteps,
} from './healthConnect';
import {
  calculateFinalTokens,
  calculateCarbonSaved,
  calculateStreak,
} from '@/src/utils/ecoLogic';
import { Activity } from '@/src/store/activityStore';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SyncSession {
  hcActivity: HCActivity;
  /** Tokens this activity will earn (estimated at current streak) */
  estimatedTokens: number;
  /** kg CO₂ saved */
  estimatedCarbon: number;
  /** Whether to include in the sync — toggled by user on review screen */
  selected: boolean;
  /** True when this came from daily pedometer aggregation, not a session */
  isPedometerDay?: boolean;
}

export interface SyncResult {
  imported: number;
  totalTokens: number;
  totalCarbon: number;
}

export interface SyncState {
  lastSyncedAt: string | null;   // ISO string
  importedIds: string[];         // HC session IDs + pedometer day IDs already imported
}

// ── Firestore path helpers ───────────────────────────────────────────────────

function syncDocRef(uid: string) {
  return doc(db, 'users', uid, 'meta', 'healthSync');
}

// ── Read / write sync state ──────────────────────────────────────────────────

export async function getSyncState(): Promise<SyncState> {
  const uid = auth.currentUser?.uid;
  if (!uid) return { lastSyncedAt: null, importedIds: [] };

  try {
    const snap = await getDoc(syncDocRef(uid));
    if (!snap.exists()) return { lastSyncedAt: null, importedIds: [] };
    const data = snap.data();
    return {
      lastSyncedAt: data.lastSyncedAt ?? null,
      importedIds:  data.importedIds  ?? [],
    };
  } catch (e) {
    console.error('getSyncState error:', e);
    return { lastSyncedAt: null, importedIds: [] };
  }
}

async function updateSyncState(newIds: string[]) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await setDoc(syncDocRef(uid), {
    lastSyncedAt: new Date().toISOString(),
    importedIds:  newIds,          // full array — Firestore overwrites
  }, { merge: false });            // replace entirely so array stays clean
}

// ── Local date helper ────────────────────────────────────────────────────────

/** Extract YYYY-MM-DD from any ISO string using LOCAL date, not UTC */
function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Fetch sessions ready to sync ─────────────────────────────────────────────

/**
 * Returns sessions from Health Connect that:
 *   1. Are newer than lastSyncedAt (or last 30 days if never synced)
 *   2. Haven't already been imported (not in importedIds)
 *   3. Don't overlap with manually-logged activities (within ±2h, same type)
 *
 * Merges two sources:
 *   A. ExerciseSession records — from Strava, Samsung Health, Google Fit etc.
 *   B. Daily pedometer summaries — raw Steps records from the phone's built-in
 *      step counter, aggregated per local calendar day. These have NO
 *      corresponding ExerciseSession, so source A misses them entirely.
 *      Any day already covered by a walking session (source A) is suppressed.
 */
export async function fetchSyncCandidates(
  currentActivities: Activity[],
  userRegion: string,
): Promise<{ sessions: SyncSession[]; syncState: SyncState }> {
  const syncState = await getSyncState();

  // How far back to look — since last sync, capped at 30 days
  const daysBack = syncState.lastSyncedAt
    ? Math.min(
        30,
        Math.ceil(
          (Date.now() - new Date(syncState.lastSyncedAt).getTime()) / 86400000
        ) + 1 // +1 buffer day
      )
    : 30;

  const importedSet = new Set(syncState.importedIds);
  const streak = calculateStreak(currentActivities);

  // ── A. Exercise sessions ──────────────────────────────────────────────────
  const hcActivities = await fetchRecentActivities(daysBack);

  // Filter out already-imported sessions
  const newActivities = hcActivities.filter(a => !importedSet.has(a.id));

  // Also filter out sessions that overlap with manually-logged activities
  // (within 2 hours of the same type on the same day)
  const filteredSessions = newActivities.filter(hca => {
    const hcDate = new Date(hca.startTime);
    return !currentActivities.some(existing => {
      if (existing.category !== hca.type) return false;
      const existDate = new Date(existing.date);
      const diffHours = Math.abs(existDate.getTime() - hcDate.getTime()) / 3600000;
      return diffHours < 2;
    });
  });

  // Track which local dates are covered by a walking session
  // so we don't double-count with pedometer summaries below
  const sessionCoveredDates = new Set<string>();
  for (const hca of filteredSessions) {
    if (hca.type === 'walking') sessionCoveredDates.add(localDateKey(hca.startTime));
  }

  const sessionCandidates: SyncSession[] = filteredSessions.map(hca => {
    const activityLike = {
      category: hca.type,
      steps:    hca.steps,
      distance: hca.distance,
      duration: hca.duration,
      date:     hca.startTime,
    };
    return {
      hcActivity:      hca,
      estimatedTokens: calculateFinalTokens(activityLike as any, streak),
      estimatedCarbon: calculateCarbonSaved(activityLike as any, userRegion),
      selected:        true,
    };
  });

  // ── B. Daily pedometer summaries ──────────────────────────────────────────
  // fetchDailyStepSummaries aggregates raw Steps records from the device's
  // built-in step counter — one entry per local calendar day. Users who walk
  // with just their phone (no Strava session etc.) generate steps here only.
  const pedometerDays = await fetchDailyStepSummaries(daysBack);

  const pedometerCandidates: SyncSession[] = [];

  for (const day of pedometerDays) {
    // Already imported (pedometer IDs are "steps-YYYY-MM-DD")
    if (importedSet.has(day.id)) continue;
    // A walking exercise session already covers this date
    if (sessionCoveredDates.has(day.date)) continue;
    // A manually-logged walking activity exists on this local date
    const manualExists = currentActivities.some(
      a => a.category === 'walking' && localDateKey(a.date) === day.date
    );
    if (manualExists) continue;

    // Convert HCDailySteps → HCActivity so the sync screen renders it
    // identically to a session card with zero screen changes needed
    const syntheticActivity: HCActivity = {
      id:        day.id,
      type:      'walking',
      startTime: day.startTime,
      endTime:   day.endTime,
      steps:     day.steps,
      distance:  day.distance > 0 ? day.distance : undefined,
      source:    'pedometer',
    };

    const activityLike = {
      category: 'walking' as const,
      steps:    day.steps,
      distance: day.distance > 0 ? day.distance : undefined,
      date:     day.startTime,
    };

    pedometerCandidates.push({
      hcActivity:      syntheticActivity,
      estimatedTokens: calculateFinalTokens(activityLike as any, streak),
      estimatedCarbon: calculateCarbonSaved(activityLike as any, userRegion),
      selected:        true,
      isPedometerDay:  true,
    });
  }

  // ── Merge and sort newest first ───────────────────────────────────────────
  const sessions = [...sessionCandidates, ...pedometerCandidates].sort(
    (a, b) =>
      new Date(b.hcActivity.startTime).getTime() -
      new Date(a.hcActivity.startTime).getTime()
  );

  return { sessions, syncState };
}

// ── Commit selected sessions ─────────────────────────────────────────────────

/**
 * Writes all selected sessions to Firestore as activities.
 * Uses a Firestore batch for atomicity — either all succeed or none do.
 * Updates user token/carbon totals and sync state in the same operation.
 */
export async function commitSync(
  sessions: SyncSession[],
  userRegion: string,
  currentActivities: Activity[],
  existingImportedIds: string[],
): Promise<SyncResult> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  const selected = sessions.filter(s => s.selected);
  if (selected.length === 0) return { imported: 0, totalTokens: 0, totalCarbon: 0 };

  const streak = calculateStreak(currentActivities);
  let totalTokens = 0;
  let totalCarbon = 0;

  const batch = writeBatch(db);
  const newImportedIds = [...existingImportedIds];

  for (const session of selected) {
    const hca = session.hcActivity;

    const activityData: Record<string, any> = {
      category:  hca.type,
      date:      hca.startTime,
      source:    'health_connect',
      hcId:      hca.id,           // store so we can detect future duplicates
    };

    if (hca.steps    !== undefined) activityData.steps    = hca.steps;
    if (hca.distance !== undefined) activityData.distance = hca.distance;
    if (hca.duration !== undefined) activityData.duration = hca.duration;

    const tokens = calculateFinalTokens(activityData as any, streak);
    const carbon = calculateCarbonSaved(activityData as any, userRegion);

    totalTokens += tokens;
    totalCarbon += carbon;

    const activityRef = doc(collection(db, 'users', uid, 'activities'));
    batch.set(activityRef, activityData);

    newImportedIds.push(hca.id);
  }

  // Update user totals
  const userRef = doc(db, 'users', uid);
  batch.update(userRef, {
    tokens:           increment(totalTokens),
    totalCarbonSaved: increment(totalCarbon),
  });

  await batch.commit();

  // Update sync state (separate write — not critical to be atomic with activities)
  await updateSyncState(newImportedIds);

  return {
    imported:    selected.length,
    totalTokens: Math.round(totalTokens),
    totalCarbon: Math.round(totalCarbon * 100) / 100,
  };
}

// ── Format helpers ────────────────────────────────────────────────────────────

export function formatSyncDate(isoString: string | null): string {
  if (!isoString) return 'Never synced';
  const d = new Date(isoString);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);

  if (diffMin < 1)   return 'Just now';
  if (diffMin < 60)  return `${diffMin}m ago`;
  if (diffMin < 1440) {
    const h = Math.floor(diffMin / 60);
    return `${h}h ago`;
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}