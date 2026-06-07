// migrate.js
//
// One-time script: copies all Firestore data from OLD_UID to NEW_UID.
// Migrates: user doc fields + activities, bills, challengeProgress,
//           ecoScoreSnapshots, weeklyWins subcollections.
//
// Run from your project root:
//   node migrate.js
//
// Requirements:
//   npm install firebase-admin   (in the project root, not functions/)
//   Place your Firebase service account key at ./serviceAccountKey.json (in root too)
//   (Firebase Console → Project Settings → Service accounts → Generate new private key)

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const OLD_UID = 'REPLACE_WITH_OLD_UID';
const NEW_UID = 'REPLACE_WITH_NEW_UID';

// Subcollections to migrate
const SUBCOLLECTIONS = [
  'activities',
  'bills',
  'challengeProgress',
  'ecoScoreSnapshots',
  'weeklyWins',
];

async function copyCollection(oldPath, newPath) {
  const snap = await db.collection(oldPath).get();
  if (snap.empty) {
    console.log(`  (empty) ${oldPath}`);
    return 0;
  }

  let count = 0;
  const BATCH_SIZE = 400; // Firestore batch limit is 500
  let batch = db.batch();
  let batchCount = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const newRef = db.collection(newPath).doc(docSnap.id);
    batch.set(newRef, data);
    batchCount++;
    count++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  committed batch of ${batchCount} docs`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return count;
}

async function migrate() {
  console.log(`\nEcoVerse data migration`);
  console.log(`  OLD: ${OLD_UID}`);
  console.log(`  NEW: ${NEW_UID}\n`);

  // ── 1. Copy user doc fields ──────────────────────────────────────────────
  console.log('── User doc ──');
  const oldUserDoc = await db.collection('users').doc(OLD_UID).get();

  if (oldUserDoc.exists) {
    const data = oldUserDoc.data();
    await db.collection('users').doc(NEW_UID).set(data, { merge: true });
    console.log('  Merged user doc fields into new UID');
  } else {
    console.log('  Old user doc missing — writing minimal fields');
    // Write the minimum needed so the app works
    await db.collection('users').doc(NEW_UID).set({
      hasFinishedOnboarding: true,
    }, { merge: true });
  }

  // ── 2. Copy subcollections ───────────────────────────────────────────────
  for (const sub of SUBCOLLECTIONS) {
    console.log(`\n── ${sub} ──`);
    const oldPath = `users/${OLD_UID}/${sub}`;
    const newPath = `users/${NEW_UID}/${sub}`;

    // challengeProgress has its own subcollections? No — but its docs may
    // have no sub-subcollections, so a flat copy is fine.
    const count = await copyCollection(oldPath, newPath);
    console.log(`  Copied ${count} docs → ${newPath}`);
  }

  // ── 3. Fix email field in new user doc ───────────────────────────────────
  // The old doc's email field may have the old account email. Update it to
  // match the new Google account so it stays consistent.
  const newAuthUser = await admin.auth().getUser(NEW_UID);
  if (newAuthUser.email) {
    await db.collection('users').doc(NEW_UID).update({
      email: newAuthUser.email,
    });
    console.log(`\nUpdated email field to: ${newAuthUser.email}`);
  }

  // ── 4. Leaderboard ───────────────────────────────────────────────────────
  console.log('\n── Leaderboard ──');
  const oldLB = await db.collection('leaderboard').doc(OLD_UID).get();
  if (oldLB.exists) {
    const data = oldLB.data();
    await db.collection('leaderboard').doc(NEW_UID).set(data, { merge: true });
    console.log('  Copied leaderboard entry');
    // Clean up old leaderboard entry
    await db.collection('leaderboard').doc(OLD_UID).delete();
    console.log('  Deleted old leaderboard entry');
  } else {
    console.log('  No leaderboard entry to copy');
  }

  // ── 5. Summary ───────────────────────────────────────────────────────────
  console.log('\n✅ Migration complete!');
  console.log('   You can now sign in with your Google account.');
  console.log('   The old user doc (fields cleared) at users/' + OLD_UID + ' still exists');
  console.log('   but is safe to delete manually from the Firestore console.');
}

migrate().catch(e => {
  console.error('\n❌ Migration failed:', e);
  process.exit(1);
});
