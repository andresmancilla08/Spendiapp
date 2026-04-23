// utils/migrateIncomeClaims.ts
// One-time migration: fix income_claim transactions that were saved with the
// wrong sharedType ('expense_share' default) and wrong sharedAmount (percentage
// portion instead of full amount). Runs once per browser session per user.

import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const SESSION_KEY = 'income_claim_migration_v1';

export async function migrateIncomeClaims(userId: string): Promise<void> {
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === userId) return;
  } catch { /* ignore */ }

  try {
    // Fetch all user's shared transactions (single equality where → no composite index needed)
    const snap = await getDocs(
      query(collection(db, 'transactions'), where('userId', '==', userId), where('isShared', '==', true))
    );

    const ownerIncomeDocs: Array<{ id: string; amount: number; sharedId: string }> = [];
    const participantExpenseDocs: Array<{ id: string; amount: number; sharedId: string }> = [];

    snap.docs.forEach((d) => {
      const data = d.data();
      if (!data.sharedId) return;
      if (data.type === 'income' && (data.sharedType !== 'income_claim' || data.sharedAmount !== data.amount)) {
        ownerIncomeDocs.push({ id: d.id, amount: data.amount, sharedId: data.sharedId });
      } else if (data.type === 'expense' && data.sharedType !== 'income_claim') {
        participantExpenseDocs.push({ id: d.id, amount: data.amount, sharedId: data.sharedId });
      }
    });

    // sharedIds that we KNOW are income_claim (because we own an income tx for them)
    const ownerSharedIds = new Set(ownerIncomeDocs.map((d) => d.sharedId));

    // Participant expense copies: check coord doc to confirm income_claim
    const expenseFixDocs: Array<{ id: string; amount: number }> = [];
    for (const expDoc of participantExpenseDocs) {
      // If already known from owner side (same user, same sharedId)
      if (ownerSharedIds.has(expDoc.sharedId)) {
        expenseFixDocs.push({ id: expDoc.id, amount: expDoc.amount });
        continue;
      }
      // Read coord doc — any participant can read sharedTransactions/{sharedId}
      try {
        const coordSnap = await getDoc(doc(db, 'sharedTransactions', expDoc.sharedId));
        if (coordSnap.exists() && coordSnap.data().sharedType === 'income_claim') {
          expenseFixDocs.push({ id: expDoc.id, amount: expDoc.amount });
        }
      } catch { /* no permission or missing */ }
    }

    if (ownerIncomeDocs.length === 0 && expenseFixDocs.length === 0) {
      _markDone(userId);
      return;
    }

    const batch = writeBatch(db);

    // Fix owner's income transactions
    ownerIncomeDocs.forEach(({ id, amount }) => {
      batch.update(doc(db, 'transactions', id), { sharedType: 'income_claim', sharedAmount: amount });
    });

    // Fix participant's expense copies
    expenseFixDocs.forEach(({ id, amount }) => {
      batch.update(doc(db, 'transactions', id), { sharedType: 'income_claim', sharedAmount: amount });
    });

    // Update coord docs so OTHER participants can detect income_claim later
    ownerSharedIds.forEach((sharedId) => {
      batch.update(doc(db, 'sharedTransactions', sharedId), { sharedType: 'income_claim' });
    });

    await batch.commit();
    _markDone(userId);
  } catch (e) {
    console.warn('[migrateIncomeClaims] skipped:', e);
  }
}

function _markDone(userId: string) {
  try { sessionStorage.setItem(SESSION_KEY, userId); } catch { /* ignore */ }
}
