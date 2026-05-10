import { setGlobalOptions } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Cost control: this function runs once a week so 1 instance is plenty.
// Prevents runaway containers if something triggers it unexpectedly.
setGlobalOptions({ maxInstances: 1 });

const db = admin.firestore();

// Runs every Sunday at 00:01 Cyprus time (UTC+2 winter / UTC+3 summer).
// Cron "1 22 * * 0" = 22:01 Saturday UTC = 00:01 Sunday Cyprus (winter).
// For summer (EEST, UTC+3) change to "1 21 * * 0".
export const rotateChallenges = onSchedule(
  { schedule: '1 22 * * 0', timeZone: 'Asia/Nicosia' },
  async () => {
    // 1. Load all weekly templates
    const weeklySnap = await db.collection('challengeTemplates')
      .where('challengeType', '==', 'weekly')
      .get();

    // 2. Load all monthly templates if today is the 1st of the month
    const now = new Date();
    const isFirstOfMonth = now.getDate() === 1 ||
      (now.getDay() === 0 && now.getDate() <= 7); // first Sunday of month

    let monthlySnap: admin.firestore.QuerySnapshot | null = null;
    if (isFirstOfMonth) {
      monthlySnap = await db.collection('challengeTemplates')
        .where('challengeType', '==', 'monthly')
        .get();
    }

    // 3. Compute week ID (Sunday date string, e.g. "2026-05-11")
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());
    sunday.setHours(0, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const weekId = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;

    // 4. Delete this week's old challenges (keeps Firestore clean)
    const oldSnap = await db.collection('challenges')
      .where('weekId', '==', weekId)
      .get();
    await Promise.all(oldSnap.docs.map(d => d.ref.delete()));

    // 5. Randomly pick 5 weekly challenges
    const weeklyTemplates = weeklySnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const shuffled = weeklyTemplates.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(5, shuffled.length));

    // 6. Write weekly challenges
    const batch = db.batch();
    for (const t of picked) {
      const { id: _id, ...fields } = t as any;
      batch.set(db.collection('challenges').doc(), { ...fields, weekId });
    }

    // 7. Write monthly challenges if applicable
    if (monthlySnap && !monthlySnap.empty) {
      for (const d of monthlySnap.docs) {
        const { id: _id, ...fields } = { id: d.id, ...d.data() } as any;
        batch.set(db.collection('challenges').doc(), { ...fields, weekId });
      }
    }

    await batch.commit();
    console.log(`Rotated ${picked.length} weekly challenges for week ${weekId}`);
  }
);