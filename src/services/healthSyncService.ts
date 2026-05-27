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
    importedIds:  newIds,
  }, { merge: false });
}

// ── Date helpers ────────────────────────────────────────────────────────

function toLocalISOString(date: Date): string {
  const y   = date.getFullYear();
  const mo  = String(date.getMonth() + 1).padStart(2, '0');
  const d   = String(date.getDate()).padStart(2, '0');
  const h   = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s   = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${min}:${s}`;
}

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
 *   2. Haven't already been imported (not in importedIds), OR are pedometer
 *      days where there are meaningfully MORE steps since last import
 *   3. Don't overlap with manually-logged activities (within ±2h, same type)
 *
 * Merges two sources:
 *   A. ExerciseSession records — from Strava, Samsung Health, Google Fit etc.
 *   B. Daily step summaries — aggregated per local calendar day.
 *      For pedometer days already imported, offers the DELTA if > threshold.
 */
export async function fetchSyncCandidates(
  currentActivities: Activity[],
  userRegion: string,
): Promise<{ sessions: SyncSession[]; syncState: SyncState }> {
  const syncState = await getSyncState();

  const daysBack = syncState.lastSyncedAt
    ? Math.min(
        30,
        Math.ceil(
          (Date.now() - new Date(syncState.lastSyncedAt).getTime()) / 86400000
        ) + 1
      )
    : 30;

  const importedSet = new Set(syncState.importedIds);
  const streak = calculateStreak(currentActivities);

  // ── A. Exercise sessions ──────────────────────────────────────────────────
  const hcActivities = await fetchRecentActivities(daysBack);

  const newActivities = hcActivities.filter(a => !importedSet.has(a.id));

  const filteredSessions = newActivities.filter(hca => {
    const hcDate = new Date(hca.startTime);
    return !currentActivities.some(existing => {
      if (existing.category !== hca.type) return false;
      const existDate = new Date(existing.date);
      const diffHours = Math.abs(existDate.getTime() - hcDate.getTime()) / 3600000;
      return diffHours < 2;
    });
  });

  // Build a map of date → total steps already accounted for by HC walking sessions
  const sessionStepsByDate = new Map<string, number>();
  for (const hca of filteredSessions) {
    if (hca.type === 'walking') {
      const dk = localDateKey(hca.startTime);
      sessionStepsByDate.set(dk, (sessionStepsByDate.get(dk) ?? 0) + (hca.steps ?? 0));
    }
  }
  for (const existing of currentActivities) {
    if (existing.category === 'walking' && (existing as any).source === 'health_connect') {
      const dk = localDateKey(existing.date);
      sessionStepsByDate.set(dk, (sessionStepsByDate.get(dk) ?? 0) + (existing.steps ?? 0));
    }
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

  // ── B. Daily step summaries ───────────────────────────────────────────────
  const pedometerDays = await fetchDailyStepSummaries(daysBack);

  const pedometerCandidates: SyncSession[] = [];
  const STEP_NOISE_THRESHOLD = 200;

  for (const day of pedometerDays) {
    // Any manual walking entry on this date suppresses the pedometer day entirely
    const manualExists = currentActivities.some(
      a => a.category === 'walking' &&
           (a as any).source !== 'health_connect' &&
           localDateKey(a.date) === day.date
    );
    if (manualExists) continue;

    // Calculate how many steps are already accounted for by imported or
    // newly-fetched HC walking sessions on this date.
    const alreadyAccountedSteps = sessionStepsByDate.get(day.date) ?? 0;

    // ── NEW: handle pedometer days that were previously imported via add screen
    // or sync screen — check if there are more steps now than when last imported.
    if (importedSet.has(day.id)) {
      // Find the previously-imported activity with this hcId
      const previouslyImported = currentActivities.find(
        a => (a as any).hcId === day.id
      );
      const alreadyImportedSteps = previouslyImported?.steps ?? 0;
      const deltaFromLastImport = day.steps - alreadyImportedSteps - alreadyAccountedSteps;

      // Only re-offer if meaningfully more steps have been recorded
      if (deltaFromLastImport <= STEP_NOISE_THRESHOLD) continue;

      // Offer just the new steps since last import
      const deltaDistance = day.distance > 0
        ? day.distance * (deltaFromLastImport / day.steps)
        : undefined;

      const syntheticActivity: HCActivity = {
        id:        `${day.id}-delta-${Date.now()}`, // unique so it doesn't collide in importedIds
        type:      'walking',
        startTime: day.startTime,
        endTime:   day.endTime,
        steps:     Math.max(0, deltaFromLastImport),
        distance:  deltaDistance,
        source:    'pedometer-delta',
      };

      const activityLike = {
        category: 'walking' as const,
        steps:    Math.max(0, deltaFromLastImport),
        distance: deltaDistance,
        date:     day.startTime,
      };

      pedometerCandidates.push({
        hcActivity:      syntheticActivity,
        estimatedTokens: calculateFinalTokens(activityLike as any, streak),
        estimatedCarbon: calculateCarbonSaved(activityLike as any, userRegion),
        selected:        true,
        isPedometerDay:  true,
      });

      continue;
    }

    // ── Not yet imported — standard flow ─────────────────────────────────────
    const deltaSteps = day.steps - alreadyAccountedSteps;

    if (alreadyAccountedSteps > 0 && deltaSteps <= STEP_NOISE_THRESHOLD) continue;

    const deltaDistance = alreadyAccountedSteps > 0 && day.distance > 0
      ? day.distance * (deltaSteps / day.steps)
      : (day.distance > 0 ? day.distance : undefined);

    const effectiveSteps = alreadyAccountedSteps > 0 ? Math.max(0, deltaSteps) : day.steps;

    const syntheticActivity: HCActivity = {
      id:        day.id,
      type:      'walking',
      startTime: day.startTime,
      endTime:   day.endTime,
      steps:     effectiveSteps,
      distance:  deltaDistance,
      source:    alreadyAccountedSteps > 0 ? 'pedometer-delta' : 'pedometer',
    };

    const activityLike = {
      category: 'walking' as const,
      steps:    effectiveSteps,
      distance: deltaDistance,
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
      date: toLocalISOString(new Date(hca.startTime)),
      source:    'health_connect',
      hcId:      hca.id,
      hcSource:  hca.source ?? null,
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

    // Only add to importedIds if not already present (delta re-imports use
    // a unique timestamped ID so they don't overwrite the original entry)
    if (!newImportedIds.includes(hca.id)) {
      newImportedIds.push(hca.id);
    }
  }

  const userRef = doc(db, 'users', uid);
  batch.update(userRef, {
    tokens:           increment(totalTokens),
    totalCarbonSaved: increment(totalCarbon),
  });

  await batch.commit();
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