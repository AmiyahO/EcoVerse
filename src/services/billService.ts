// src/services/billService.ts
// Manages bill readings in Firestore and calculates savings vs previous reading.
import { db, auth } from '@/src/firebase/config';
import {
  collection, addDoc, query, where,
  getDocs, serverTimestamp,
} from 'firebase/firestore';
import { getRegionalBaseline } from '@/src/utils/ecoLogic';

export type BillType = 'electricity' | 'water';

export interface BillReading {
  id?: string;
  type: BillType;
  reading: number;
  savedAmount: number;
  date: string;
  month: string;
  basedOnPrevious: boolean;
}

export async function getLastBill(type: BillType): Promise<BillReading | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;

  try {
    const billsRef = collection(db, 'users', uid, 'bills');
    const q = query(billsRef, where('type', '==', type));
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const sorted = snap.docs
      .filter(d => !d.data().deleted)          // ← exclude soft-deleted
      .sort((a, b) =>
        new Date(b.data().date).getTime() - new Date(a.data().date).getTime()
      );

    if (sorted.length === 0) return null;      // all bills were deleted
    return { id: sorted[0].id, ...sorted[0].data() } as BillReading;
  } catch (e) {
    console.error('getLastBill error:', e);
    return null;
  }
}

export function calculateSaving(
  type: BillType,
  newReading: number,
  previousReading: number | null,
  /** Regional monthly baseline (kWh or litres). Pass from getRegionalBaseline()
   *  in the UI layer. Falls back to a safe global average if omitted. */
  regionalBaseline?: number,
): { savedAmount: number; basedOnPrevious: boolean } {
  // Use the caller-supplied regional baseline if provided; otherwise derive a
  // reasonable default from the type so existing call-sites without the param
  // continue to work correctly.
  const monthlyBaseline = regionalBaseline
    ?? (type === 'electricity' ? 350 : 11000); // global-avg fallback

  if (previousReading !== null) {
    // Saving = how much LESS they used vs last time.
    // If they used more → 0 saving (usage went up, nothing to reward).
    return {
      savedAmount: Math.max(0, previousReading - newReading),
      basedOnPrevious: true,
    };
  } else {
    // No history — compare against the regional monthly average.
    return {
      savedAmount: Math.max(0, monthlyBaseline - newReading),
      basedOnPrevious: false,
    };
  }
}

export async function saveBillReading(
  type: BillType,
  reading: number,
  savedAmount: number,
  basedOnPrevious: boolean,
): Promise<BillReading | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const billData = {
    type, reading, savedAmount, basedOnPrevious,
    date: now.toISOString(),
    month,
    createdAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collection(db, 'users', uid, 'bills'), billData);
    return { id: docRef.id, ...billData };
  } catch (e) {
    console.error('saveBillReading error:', e);
    return null;
  }
}