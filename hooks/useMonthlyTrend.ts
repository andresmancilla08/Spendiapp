import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface MonthBucket {
  year: number;
  month: number;       // 0-11
  income: number;
  expenses: number;
  balance: number;
}

/** Lista ordenada de los últimos `count` meses terminando en (year, month). */
function monthSpan(year: number, month: number, count: number): Array<{ year: number; month: number }> {
  const out: Array<{ year: number; month: number }> = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(year, month - i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return out;
}

/**
 * Serie mensual (income/expenses/balance) de los últimos `count` meses, replicando
 * la lógica de useTransactions: transacciones del mes + copias virtuales de las fijas
 * creadas en meses anteriores (respetando cancelaciones y meses omitidos).
 *
 * Premium-only: pasar enabled=false para no consultar en usuarios free.
 */
export function useMonthlyTrend(
  userId: string,
  year: number,
  month: number,
  count = 6,
  enabled = true,
  dayCutoff?: number,
): { data: MonthBucket[]; loading: boolean; prevMonthToDateExpenses: number | null } {
  const [rangeDocs, setRangeDocs] = useState<any[]>([]);
  const [fixedDocs, setFixedDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const spanStartY = new Date(year, month - (count - 1), 1).getFullYear();
  const spanStartM = new Date(year, month - (count - 1), 1).getMonth();

  // Transacciones (cualquier tipo) dentro del rango de los `count` meses.
  useEffect(() => {
    if (!enabled || !userId) { setRangeDocs([]); setLoading(false); return; }
    setLoading(true);
    const start = new Date(spanStartY, spanStartM, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
    );
    const unsub = onSnapshot(q, (snap) => {
      setRangeDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => { setRangeDocs([]); setLoading(false); });
    return unsub;
  }, [enabled, userId, spanStartY, spanStartM, year, month]);

  // Todas las fijas (para generar copias virtuales en meses posteriores a su creación).
  useEffect(() => {
    if (!enabled || !userId) { setFixedDocs([]); return; }
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('isFixed', '==', true),
    );
    const unsub = onSnapshot(q, (snap) => {
      setFixedDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => setFixedDocs([]));
    return unsub;
  }, [enabled, userId]);

  const span = monthSpan(year, month, count);
  const buckets: Record<string, MonthBucket> = {};
  for (const s of span) {
    buckets[`${s.year}_${s.month}`] = { year: s.year, month: s.month, income: 0, expenses: 0, balance: 0 };
  }

  const add = (key: string, type: string, amount: number) => {
    const b = buckets[key];
    if (!b) return;
    if (type === 'income') b.income += amount;
    else if (type === 'expense') b.expenses += amount;
  };

  // 1) Transacciones reales en su mes.
  for (const d of rangeDocs) {
    const date: Date = (d.date as Timestamp).toDate();
    add(`${date.getFullYear()}_${date.getMonth()}`, d.type, d.amount);
  }

  // 2) Copias virtuales de fijas para meses posteriores a su creación.
  for (const d of fixedDocs) {
    const created: Date = (d.date as Timestamp).toDate();
    const cancelledFrom: Date | null = d.fixedCancelledFrom ? (d.fixedCancelledFrom as Timestamp).toDate() : null;
    const skip: string[] = d.fixedSkipMonths ?? [];
    for (const s of span) {
      const monthStart = new Date(s.year, s.month, 1);
      if (created >= monthStart) continue;                       // su mes de creación lo cuenta el paso 1
      if (cancelledFrom && monthStart >= cancelledFrom) continue;
      if (skip.includes(`${s.year}_${s.month}`)) continue;
      add(`${s.year}_${s.month}`, d.type, d.amount);
    }
  }

  const data = span.map((s) => {
    const b = buckets[`${s.year}_${s.month}`];
    b.balance = b.income - b.expenses;
    return b;
  });

  // Gasto del mes anterior acumulado hasta el mismo día del mes que se está
  // comparando (para "comparado con el mes pasado a esta altura" — más honesto
  // que proyectar el mes completo desde un solo día).
  let prevMonthToDateExpenses: number | null = null;
  if (dayCutoff != null) {
    const prevDate = new Date(year, month - 1, 1);
    const prevY = prevDate.getFullYear();
    const prevM = prevDate.getMonth();
    const hasPrevInSpan = span.some((s) => s.year === prevY && s.month === prevM);
    if (hasPrevInSpan) {
      let sum = 0;
      for (const d of rangeDocs) {
        if (d.type !== 'expense') continue;
        const date: Date = (d.date as Timestamp).toDate();
        if (date.getFullYear() === prevY && date.getMonth() === prevM && date.getDate() <= dayCutoff) {
          sum += d.amount;
        }
      }
      for (const d of fixedDocs) {
        const created: Date = (d.date as Timestamp).toDate();
        const cancelledFrom: Date | null = d.fixedCancelledFrom ? (d.fixedCancelledFrom as Timestamp).toDate() : null;
        const skip: string[] = d.fixedSkipMonths ?? [];
        const monthStart = new Date(prevY, prevM, 1);
        if (created >= monthStart) continue;
        if (cancelledFrom && monthStart >= cancelledFrom) continue;
        if (skip.includes(`${prevY}_${prevM}`)) continue;
        if (d.type !== 'expense') continue;
        const daysInPrevMonth = new Date(prevY, prevM + 1, 0).getDate();
        const day = Math.min(created.getDate(), daysInPrevMonth);
        if (day <= dayCutoff) sum += d.amount;
      }
      prevMonthToDateExpenses = sum;
    }
  }

  return { data, loading, prevMonthToDateExpenses };
}
