import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { detectRecurring, type RecurringTx, type RecurringResult } from '../utils/recurring';

// Analiza los gastos de los últimos 6 meses (100% cliente, una sola lectura) y
// detecta cargos recurrentes / suscripciones. Usa el índice userId+date existente.
/** Meses transcurridos desde que se creó el fijo (mínimo 1). */
function monthsSince(dateMs: number): number {
  const from = new Date(dateMs);
  const now = new Date();
  return Math.max(1, (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth()) + 1);
}

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
        /** Fijos activos: un solo documento con mensualidades virtuales. */
        const fixed: { description: string; amount: number; category: string; dateMs: number }[] = [];

        for (const doc of snap.docs) {
          const d = doc.data();
          if (d.type !== 'expense') continue;
          if (d.isShared || d.isInstallment) continue; // compartidos y cuotas no son suscripciones
          const entry = {
            description: String(d.description ?? ''),
            amount: Number(d.amount) || 0,
            category: String(d.category ?? 'other'),
            dateMs: (d.date as Timestamp).toDate().getTime(),
          };
          if (d.isFixed === true) {
            // Cancelado a partir de un mes ya pasado → deja de ser recurrente.
            const cancelled = d.fixedCancelledFrom
              ? (d.fixedCancelledFrom as Timestamp).toDate().getTime() <= Date.now()
              : false;
            if (!cancelled) fixed.push(entry);
            continue;
          }
          txns.push(entry);
        }

        const detected = detectRecurring(txns, Date.now());
        // Los fijos entran directos: `detectRecurring` exige tres cargos en tres
        // meses distintos y aquí solo hay un documento, así que un Spotify marcado
        // como fijo nunca aparecía en la pantalla que promete "lo que se repite".
        const merged = {
          ...detected,
          items: [
            ...fixed.map((f) => {
              const months = monthsSince(f.dateMs);
              return {
                label: f.description,
                amount: f.amount,
                category: f.category,
                count: months,
                months,
                // Un fijo se cobra este mes por definición: nunca está caducado.
                lastDateMs: Date.now(),
                stale: false,
              };
            }),
            ...detected.items,
          ],
          monthlyTotal: detected.monthlyTotal + fixed.reduce((acc, f) => acc + f.amount, 0),
        };
        if (!cancelled) setData(merged);
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
