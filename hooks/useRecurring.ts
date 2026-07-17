import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { detectRecurring, type RecurringTx, type RecurringResult } from '../utils/recurring';

// Analiza los gastos de los últimos 6 meses (100% cliente, una sola lectura) y
// detecta cargos recurrentes / suscripciones. Usa el índice userId+date existente.
export function useRecurring(userId: string): { data: RecurringResult; loading: boolean; error: boolean } {
  const [data, setData] = useState<RecurringResult>({ items: [], monthlyTotal: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(false);

    (async () => {
      try {
        const since = new Date();
        since.setMonth(since.getMonth() - 6);
        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', userId),
          where('date', '>=', Timestamp.fromDate(since)),
          orderBy('date', 'desc'),
        );
        const snap = await getDocs(q);
        const txns: RecurringTx[] = [];
        for (const doc of snap.docs) {
          const d = doc.data();
          if (d.type !== 'expense') continue;
          if (d.isShared || d.isInstallment) continue; // compartidos y cuotas no son suscripciones
          txns.push({
            description: String(d.description ?? ''),
            amount: Number(d.amount) || 0,
            category: String(d.category ?? 'other'),
            dateMs: (d.date as Timestamp).toDate().getTime(),
          });
        }
        if (!cancelled) setData(detectRecurring(txns, Date.now()));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  return { data, loading, error };
}
