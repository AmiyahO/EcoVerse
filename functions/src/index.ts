import { setGlobalOptions } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Cost control: one instance is all this weekly function ever needs.
setGlobalOptions({ maxInstances: 1 });

const db = admin.firestore();

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChallengeTemplate {
  id:            string;
  title:         string;
  description:   string;
  icon:          string;
  color:         string;
  difficulty:    'easy' | 'medium' | 'hard' | 'epic';
  challengeType: 'weekly' | 'monthly';
  challengeGroup?: string;   // e.g. 'steps' | 'distance' | 'cycling' | 'activities'
  rewardTokens:  number;
  badgeLabel:    string;
  goal: {
    metric:      string;
    target:      number;
    categories:  string[];
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns `count` items chosen uniformly at random without replacement. */
function randomPick<T>(arr: T[], count: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
}

/** Returns the Sunday-based week ID for a given date, e.g. "2026-05-11". */
function getSundayDateString(date: Date): string {
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - date.getDay());
  sunday.setHours(0, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;
}

// ── Scheduled rotation ────────────────────────────────────────────────────────
//
// Runs every Sunday at 00:01 Cyprus time (Europe/Nicosia handles DST automatically).
//
// Controlled randomization — guaranteed weekly mix:
//   2 easy  +  2 medium  +  1 hard-or-epic  =  5 weekly challenges
//
// This ensures users always have approachable content alongside one
// aspirational stretch challenge, preventing "all-hard" or "all-easy" weeks.
//
// Monthly challenges (electricity/water) are appended on the first Sunday
// of each calendar month.
//
export const rotateChallenges = onSchedule(
  { schedule: '1 0 * * 0', timeZone: 'Europe/Nicosia' },
  async () => {
    const now    = new Date();
    const weekId = getSundayDateString(now);

    // ── 1. Load weekly templates from Firestore ───────────────────────────────
    const weeklySnap = await db.collection('challengeTemplates')
      .where('challengeType', '==', 'weekly')
      .get();

    const weeklyTemplates: ChallengeTemplate[] = weeklySnap.docs.map(
      d => ({ id: d.id, ...d.data() } as ChallengeTemplate)
    );

    // ── 2. Controlled randomization by difficulty tier ────────────────────────
    const easy   = weeklyTemplates.filter(c => c.difficulty === 'easy');
    const medium = weeklyTemplates.filter(c => c.difficulty === 'medium');
    const hard   = weeklyTemplates.filter(
      c => c.difficulty === 'hard' || c.difficulty === 'epic'
    );

    // Store separately so the log below reflects exactly what was picked,
    // not a re-randomized sample (previous bug: randomPick() was called again
    // inside the console.log, producing counts that didn't match the actual batch).
    const pickedEasy   = randomPick(easy,   Math.min(2, easy.length));
    const pickedMedium = randomPick(medium, Math.min(2, medium.length));
    const pickedHard   = randomPick(hard,   Math.min(1, hard.length));

    const picked: ChallengeTemplate[] = [
      ...pickedEasy,
      ...pickedMedium,
      ...pickedHard,
    ];

    if (picked.length === 0) {
      console.warn('No weekly templates found — skipping rotation');
      return;
    }

    // ── 3. Monthly challenges — first Sunday of the month only ────────────────
    let monthlyTemplates: ChallengeTemplate[] = [];
    const isFirstSundayOfMonth = now.getDate() <= 7;

    if (isFirstSundayOfMonth) {
      const monthlySnap = await db.collection('challengeTemplates')
        .where('challengeType', '==', 'monthly')
        .get();
      monthlyTemplates = monthlySnap.docs.map(
        d => ({ id: d.id, ...d.data() } as ChallengeTemplate)
      );
    }

    // ── 4. Delete this week's stale challenges (clean slate) ──────────────────
    const oldSnap = await db.collection('challenges')
      .where('weekId', '==', weekId)
      .get();
    await Promise.all(oldSnap.docs.map(d => d.ref.delete()));

    // ── 5. Write new challenges in a single atomic batch ──────────────────────
    const batch = db.batch();

    for (const template of [...picked, ...monthlyTemplates]) {
      const { id: _templateId, ...fields } = template;
      batch.set(db.collection('challenges').doc(), { ...fields, weekId });
    }

    await batch.commit();

    // Accurate log — uses the already-picked arrays, not a re-randomization
    console.log(
      `Week ${weekId}: wrote ${picked.length} weekly challenges ` +
      `(${pickedEasy.length} easy, ${pickedMedium.length} medium, ` +
      `${pickedHard.length} hard/epic)` +
      (monthlyTemplates.length > 0 ? ` + ${monthlyTemplates.length} monthly` : '')
    );
  }
);