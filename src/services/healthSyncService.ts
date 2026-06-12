// src/services/healthSyncService.ts
import {
  collection, doc, updateDoc, getDoc,
  setDoc, increment, writeBatch,
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
  estimatedTokens: number;
  estimatedCarbon: number;
  selected: boolean;
  isPedometerDay?: boolean;
}

export interface SyncResult {
  imported: number;
  totalTokens: number;
  totalCarbon: number;
}

export interface SyncState {
  lastSyncedAt: string | null;
  importedIds: string[];
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

/**
 * Called from add.tsx after saving an HC-sourced activity.
 * Adds the hcId to meta/healthSync.importedIds so the sync screen
 * treats it as already imported and only offers deltas.
 */
export async function registerAddScreenImport(hcId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !hcId) return;
  try {
    const state = await getSyncState();
    if (!state.importedIds.includes(hcId)) {
      await setDoc(syncDocRef(uid), {
        lastSyncedAt: state.lastSyncedAt ?? new Date().toISOString(),
        importedIds:  [...state.importedIds, hcId],
      }, { merge: false });
    }
  } catch (e) {
    console.error('registerAddScreenImport error:', e);
  }
}

// ── Date helpers ─────────────────────────────────────────────────────────────

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
  // Strip trailing Z (or +00:00) before parsing so that activity dates stored
  // without timezone offset are not reinterpreted as UTC on UTC+ devices.
  // e.g. "2026-06-06T21:30:00" on Cyprus (UTC+3) must stay Jun 6, not become Jun 7.
  const local = new Date(iso.endsWith('Z') ? iso.slice(0, -1) : iso);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
}

// ── Fetch sessions ready to sync ─────────────────────────────────────────────

export async function fetchSyncCandidates(
  currentActivities: Activity[],
  userRegion: string,
): Promise<{ sessions: SyncSession[]; syncState: SyncState }> {
  const syncState = await getSyncState();

  // Always look back 30 days — importedSet deduplication handles what's already imported.
  // Previously this used lastSyncedAt to shrink the window, but that caused activities
  // outside the narrow window to disappear from the list after the first sync.
  const daysBack = 30;

  // importedSet = IDs from meta/healthSync UNION hcId values on existing activities.
  // This means activities imported via the add screen are also treated as imported,
  // even though add.tsx doesn't always update meta/healthSync in time.
  const importedSet = new Set(syncState.importedIds);
  for (const a of currentActivities) {
    const id = (a as any).hcId;
    if (id) importedSet.add(id);
  }

  const streak = calculateStreak(currentActivities);

  // ── A. Exercise sessions ──────────────────────────────────────────────────
  const hcActivities = await fetchRecentActivities(daysBack);
  const newActivities = hcActivities.filter(a => !importedSet.has(a.id));

  const filteredSessions = newActivities.filter(hca => {
    const hcDate = new Date(hca.startTime);
    return !currentActivities.some(existing => {
      if (existing.category !== hca.type) return false;
      const diffHours = Math.abs(new Date(existing.date).getTime() - hcDate.getTime()) / 3600000;
      return diffHours < 2;
    });
  });

  // Map date → session steps already accounted for (new + previously imported)
  const sessionStepsByDate = new Map<string, number>();
  for (const hca of filteredSessions) {
    if (hca.type === 'walking') {
      const dk = localDateKey(hca.startTime);
      sessionStepsByDate.set(dk, (sessionStepsByDate.get(dk) ?? 0) + (hca.steps ?? 0));
    }
  }
  for (const existing of currentActivities) {
    // Only count session-based HC imports (hcId does NOT start with 'steps-').
    // Pedometer imports are tracked separately via alreadyImportedSteps — adding
    // them here too would double-count and make deltaSteps go negative.
    const existingHcId = (existing as any).hcId ?? '';
    const isPedometerImport = existingHcId.startsWith('steps-');
    if (existing.category === 'walking' && (existing as any).source === 'health_connect' && !isPedometerImport) {
      const dk = localDateKey(existing.date);
      sessionStepsByDate.set(dk, (sessionStepsByDate.get(dk) ?? 0) + (existing.steps ?? 0));
    }
  }

  const sessionCandidates: SyncSession[] = filteredSessions.map(hca => {
    const activityLike = { category: hca.type, steps: hca.steps, distance: hca.distance, duration: hca.duration, date: hca.startTime };
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
    // Manual walking on this date always suppresses the pedometer entry
    const manualExists = currentActivities.some(
      a => a.category === 'walking' &&
           (a as any).source !== 'health_connect' &&
           localDateKey(a.date) === day.date
    );
    if (manualExists) continue;

    // Steps already accounted for by HC sessions (new + previously imported)
    const alreadyAccountedBySession = sessionStepsByDate.get(day.date) ?? 0;

    // Steps already imported for this pedometer day (via add screen or sync screen)
    // Find ALL HC walking activities on this date that used this pedometer hcId
    const previouslyImportedActivities = currentActivities.filter(
      a => a.category === 'walking' && (a as any).hcId === day.id
    );
    const alreadyImportedSteps = previouslyImportedActivities.reduce(
      (sum, a) => sum + (a.steps ?? 0), 0
    );

    const totalAlreadyAccountedSteps = alreadyAccountedBySession + alreadyImportedSteps;
    const deltaSteps = day.steps - totalAlreadyAccountedSteps;

    // Nothing new to offer if the delta is zero or negative (negative can happen if user deletes HC sessions that were previously imported, or if they log manual walking that exceeds the pedometer total)
    if (deltaSteps <= STEP_NOISE_THRESHOLD) continue;

    const deltaDistance = day.distance > 0 && day.steps > 0
      ? day.distance * (deltaSteps / day.steps)
      : undefined;

    const isPartial = totalAlreadyAccountedSteps > 0;

    const syntheticActivity: HCActivity & { originalDayId?: string } = {
      id:            isPartial ? `${day.id}-delta-${Date.now()}` : day.id,
      originalDayId: isPartial ? day.id : undefined,
      type:          'walking',
      startTime:     day.startTime,
      endTime:       day.endTime,
      steps:         Math.max(0, deltaSteps),
      distance:      deltaDistance,
      source:        isPartial ? 'pedometer-delta' : 'pedometer',
    };

    const activityLike = {
      category: 'walking' as const,
      steps:    Math.max(0, deltaSteps),
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

  const sessions = [...sessionCandidates, ...pedometerCandidates].sort(
    (a, b) => new Date(b.hcActivity.startTime).getTime() - new Date(a.hcActivity.startTime).getTime()
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
      category: hca.type,
      date:     toLocalISOString(new Date(hca.startTime)),
      source:   'health_connect',
      // For delta pedometer entries, store the original day ID as hcId so future
      // delta calculations accumulate correctly across multiple partial imports.
      hcId:     (hca as any).originalDayId ?? hca.id,
      hcSource: hca.source ?? null,
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

    // Use originalDayId for delta entries so importedIds stores the canonical
    // 'steps-YYYY-MM-DD' ID, not a timestamped delta ID that never matches day.id.
    const idToRecord = (hca as any).originalDayId ?? hca.id;
    if (!newImportedIds.includes(idToRecord)) {
      newImportedIds.push(idToRecord);
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
  if (diffMin < 1)    return 'Just now';
  if (diffMin < 60)   return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}