import { calculateTokens, calculateCarbonSaved } from '@/src/utils/ecoLogic';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/src/firebase/config';
import { useActivityStore } from '@/src/store/activityStore';

export async function recalculateTokens() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const { activities, userRegion } = useActivityStore.getState();
  const tokens = activities.reduce((sum, a) => sum + calculateTokens(a), 0);
  const carbon = activities.reduce((sum, a) => sum + calculateCarbonSaved(a, userRegion), 0);
  await updateDoc(doc(db, 'users', uid), { tokens, totalCarbonSaved: carbon });
  console.log('✅ Recalculated tokens:', tokens, 'carbon:', carbon);
}

// This utility can be used to recalculate tokens and carbon saved for all activities, e.g. after fixing a bug in the calculation logic. It iterates through all logged activities, recalculates their tokens and carbon savings, and updates the user's total in Firestore.
// import { recalculateTokens } from '@/src/utils/recalculateTokens'; in app/_layout.tsx and call recalculateTokens() once to perform the recalculation. in preload with audio