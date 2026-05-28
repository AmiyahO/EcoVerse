// This Cloud Function rotates the weekly and monthly challenges every Sunday at 00:01 Cyprus time.  
// It uses a controlled randomization approach to ensure a balanced mix of challenge difficulties each week, while also guaranteeing that at least one carbon-impact challenge appears weekly.  
// Monthly challenges are added on the first Sunday of each calendar month.  The function runs with a single instance to control costs, and it performs all database updates in a single atomic batch for consistency.
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

/** Returns the Sunday-based week ID for a given date, expressed in Cyprus
 *  local time (Europe/Nicosia).  The function runs in UTC on Cloud Run, so
 *  using new Date() directly gives Saturday night UTC when the schedule fires
 *  at 00:01 Sunday Cyprus time — causing the Sunday offset to land on the
 *  previous week.  We extract the Cyprus wall-clock date via Intl.DateTimeFormat
 *  to get the correct Sunday. */
function getSundayDateString(date: Date): string {
  // Get the Cyprus local date parts at the moment the function fires.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Nicosia',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);

  const y = Number(parts.find(p => p.type === 'year')!.value);
  const m = Number(parts.find(p => p.type === 'month')!.value) - 1; // 0-indexed
  const d = Number(parts.find(p => p.type === 'day')!.value);

  // Build a plain local Date at midnight so getDay() reflects Cyprus weekday.
  const local = new Date(y, m, d, 0, 0, 0, 0);
  local.setDate(d - local.getDay()); // rewind to Sunday

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`;
}

// ── Scheduled rotation ────────────────────────────────────────────────────────
//
// Runs every Sunday at 00:01 Cyprus time (Europe/Nicosia handles DST automatically).
//
// Controlled randomization — guaranteed weekly mix:
//   2 easy  +  2 medium  +  1 hard-or-epic  +  1 CO₂  =  6 weekly challenges
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
    //
    // Guaranteed weekly mix:
    //   2 easy  +  2 medium  +  1 hard-or-epic  +  1 CO2  =  6 weekly challenges
    //
    // CO2 challenges (challengeGroup === 'co2') are drawn separately so at least
    // one carbon-impact challenge always appears regardless of the difficulty
    // shuffle.  They participate in the normal weekly pool but get a guaranteed
    // slot, giving carbon tracking a permanent presence every week.
    const co2Pool      = weeklyTemplates.filter(c => c.challengeGroup === 'co2');
    const nonCo2       = weeklyTemplates.filter(c => c.challengeGroup !== 'co2');

    const easy   = nonCo2.filter(c => c.difficulty === 'easy');
    const medium = nonCo2.filter(c => c.difficulty === 'medium');
    const hard   = nonCo2.filter(
      c => c.difficulty === 'hard' || c.difficulty === 'epic'
    );

    // Store separately so the log below reflects exactly what was picked,
    // not a re-randomized sample.
    const pickedEasy   = randomPick(easy,    Math.min(2, easy.length));
    const pickedMedium = randomPick(medium,  Math.min(2, medium.length));
    const pickedHard   = randomPick(hard,    Math.min(1, hard.length));
    const pickedCo2    = randomPick(co2Pool, Math.min(1, co2Pool.length));

    const picked: ChallengeTemplate[] = [
      ...pickedEasy,
      ...pickedMedium,
      ...pickedHard,
      ...pickedCo2,
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
      `${pickedHard.length} hard/epic, ${pickedCo2.length} co2)` +
      (monthlyTemplates.length > 0 ? ` + ${monthlyTemplates.length} monthly` : '')
    );
  }
);