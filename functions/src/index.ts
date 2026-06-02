// functions/src/index.ts
//
// Contains three Cloud Functions:
//
//   1. rotateChallenges        — scheduled, every Sunday 00:01 Cyprus time
//      Rotates weekly/monthly challenges with controlled difficulty mix.
//
//   2. weeklyLeaderboardReset  — scheduled, every Sunday 00:05 UTC
//      Awards EcoTokens to top 3, records wins, resets all weeklyEcoScore fields.
import { setGlobalOptions } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Cost control: one instance is all these weekly functions ever need.
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
  challengeGroup?: string;
  rewardTokens:  number;
  badgeLabel:    string;
  goal: {
    metric:      string;
    target:      number;
    categories:  string[];
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomPick<T>(arr: T[], count: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
}

function getSundayDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Nicosia',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);

  const y = Number(parts.find(p => p.type === 'year')!.value);
  const m = Number(parts.find(p => p.type === 'month')!.value) - 1;
  const d = Number(parts.find(p => p.type === 'day')!.value);

  const local = new Date(y, m, d, 0, 0, 0, 0);
  local.setDate(d - local.getDay());

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`;
}

function lastSundayKeyUTC(): string {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);
  return sunday.toISOString().split('T')[0];
}

// ── 1. Challenge rotation ─────────────────────────────────────────────────────
export const rotateChallenges = onSchedule(
  { schedule: '1 0 * * 0', timeZone: 'Europe/Nicosia' },
  async () => {
    const now    = new Date();
    const weekId = getSundayDateString(now);

    const weeklySnap = await db.collection('challengeTemplates')
      .where('challengeType', '==', 'weekly')
      .get();

    const weeklyTemplates: ChallengeTemplate[] = weeklySnap.docs.map(
      d => ({ id: d.id, ...d.data() } as ChallengeTemplate)
    );

    const co2Pool = weeklyTemplates.filter(c => c.challengeGroup === 'co2');
    const nonCo2  = weeklyTemplates.filter(c => c.challengeGroup !== 'co2');

    const easy   = nonCo2.filter(c => c.difficulty === 'easy');
    const medium = nonCo2.filter(c => c.difficulty === 'medium');
    const hard   = nonCo2.filter(c => c.difficulty === 'hard' || c.difficulty === 'epic');

    const pickedEasy   = randomPick(easy,    Math.min(2, easy.length));
    const pickedMedium = randomPick(medium,  Math.min(2, medium.length));
    const pickedHard   = randomPick(hard,    Math.min(1, hard.length));
    const pickedCo2    = randomPick(co2Pool, Math.min(1, co2Pool.length));

    const picked: ChallengeTemplate[] = [
      ...pickedEasy, ...pickedMedium, ...pickedHard, ...pickedCo2,
    ];

    if (picked.length === 0) {
      console.warn('No weekly templates found — skipping rotation');
      return;
    }

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

    const oldSnap = await db.collection('challenges')
      .where('weekId', '==', weekId)
      .get();
    await Promise.all(oldSnap.docs.map(d => d.ref.delete()));

    const batch = db.batch();
    for (const template of [...picked, ...monthlyTemplates]) {
      const { id: _templateId, ...fields } = template;
      batch.set(db.collection('challenges').doc(), { ...fields, weekId });
    }
    await batch.commit();

    console.log(
      `Week ${weekId}: wrote ${picked.length} weekly challenges ` +
      `(${pickedEasy.length} easy, ${pickedMedium.length} medium, ` +
      `${pickedHard.length} hard/epic, ${pickedCo2.length} co2)` +
      (monthlyTemplates.length > 0 ? ` + ${monthlyTemplates.length} monthly` : '')
    );
  }
);

// ── 2. Weekly leaderboard reset + top 3 rewards ───────────────────────────────
const TOP3_REWARDS: Record<number, number> = { 1: 100, 2: 50, 3: 25 };

export const weeklyLeaderboardReset = onSchedule(
  { schedule: '5 0 * * 0', timeZone: 'UTC', timeoutSeconds: 120 },
  async () => {
    const weekId = lastSundayKeyUTC();
    console.log(`[weeklyReset] Starting reset for week ${weekId}`);

    const lbSnap = await db
      .collection('leaderboard')
      .orderBy('weeklyEcoScore', 'desc')
      .get();

    if (lbSnap.empty) {
      console.log('[weeklyReset] Leaderboard empty — nothing to do');
      return;
    }

    // Identify top 3, handling ties (same score = same rank)
    const top3Winners: Array<{ uid: string; rank: number; score: number }> = [];
    let currentRank = 1;

    for (const docSnap of lbSnap.docs) {
      if (currentRank > 3) break;
      const score: number = docSnap.data().weeklyEcoScore ?? 0;
      if (score <= 0) break;

      if (
        top3Winners.length > 0 &&
        score === top3Winners[top3Winners.length - 1].score
      ) {
        top3Winners.push({ uid: docSnap.id, rank: top3Winners[top3Winners.length - 1].rank, score });
      } else {
        top3Winners.push({ uid: docSnap.id, rank: currentRank, score });
        currentRank++;
      }
    }

    console.log(`[weeklyReset] Top 3:`, top3Winners);

    const batch = db.batch();

    // Award tokens to winners
    for (const winner of top3Winners) {
      const reward = TOP3_REWARDS[winner.rank] ?? 0;
      if (reward === 0) continue;

      batch.update(db.collection('users').doc(winner.uid), {
        tokens: admin.firestore.FieldValue.increment(reward),
      });

      // Keep lifetime tokens on leaderboard doc in sync
      batch.update(db.collection('leaderboard').doc(winner.uid), {
        tokens: admin.firestore.FieldValue.increment(reward),
      });

      // Record the win for potential future "last week's winner" UI
      batch.set(
        db.collection('users').doc(winner.uid).collection('weeklyWins').doc(weekId),
        {
          weekId,
          rank:         winner.rank,
          score:        winner.score,
          tokensEarned: reward,
          awardedAt:    new Date().toISOString(),
        },
      );

      console.log(`[weeklyReset] +${reward} tokens → uid=${winner.uid} (rank ${winner.rank})`);
    }

    // Reset weeklyEcoScore to 0 for all leaderboard docs
    for (const docSnap of lbSnap.docs) {
      batch.update(docSnap.ref, { weeklyEcoScore: 0 });
    }

    await batch.commit();
    console.log(`[weeklyReset] Done — reset ${lbSnap.size} docs, awarded ${top3Winners.length} winners`);
  },
);
