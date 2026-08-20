import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { effectiveAmount } from '../utils/sharedCalc';
import { median, monthKey } from '../utils/simulator';
import { useMonthlyTrend } from './useMonthlyTrend';
import { useRecurring } from './useRecurring';

export interface PurchaseImpact {
  /** Cuotas ya comprometidas, indexadas por `año_mes` (mes 0-11). */
  committedByMonth: Record<string, number>;
  /** Ingreso mensual típico: MEDIANA de los meses cerrados con ingreso. */
  typicalIncome: number;
  /** Gasto fijo mensual (suscripciones y cargos recurrentes detectados). */
  fixedExpenses: number;
  /** Sin esto, el bloque de impacto no se pinta: no se afirma con ceros. */
  hasIncomeData: boolean;
  loading: boolean;
}

const EMPTY: PurchaseImpact = {
  committedByMonth: {},
  typicalIncome: 0,
  fixedExpenses: 0,
  hasIncomeData: false,
  loading: false,
};

/**
 * Los tres datos que convierten la calculadora en «¿me cabe esto?».
 *
 * `enabled` es la llave maestra: mientras la pestaña de Impacto no se abra (o el
 * usuario no sea premium) no se consulta nada. Con `userId` vacío, `useRecurring`
 * y `useMonthlyTrend` también se quedan quietos.
 *
 * El ingreso sale de `useMonthlyTrend` a propósito y no de una consulta propia:
 * ese hook ya clona los ingresos FIJOS creados hace más de seis meses (una nómina
 * registrada como fija en enero no aparece en una consulta por rango de fechas) y
 * ya pasa todo por `effectiveAmount`. Reescribirlo aquí sería reescribir el bug.
 */
export function usePurchaseImpact(userId: string, enabled: boolean): PurchaseImpact {
  const uid = enabled ? userId : '';
  const now = new Date();

  const { data: trend, loading: trendLoading } = useMonthlyTrend(
    uid,
    now.getFullYear(),
    now.getMonth(),
    7,          // 6 meses cerrados + el actual, que se descarta por incompleto
    !!uid,
  );
  const { data: recurring, loading: recurringLoading } = useRecurring(uid);

  const [committedByMonth, setCommitted] = useState<Record<string, number>>({});
  const [committedLoading, setCommittedLoading] = useState(false);

  // Cuotas futuras ya comprometidas. Una sola lectura sobre el índice
  // userId + date que ya existe; `isInstallment` se filtra en cliente porque el
  // volumen de cuotas vivas de un usuario es pequeño y así no hace falta índice nuevo.
  useEffect(() => {
    if (!uid) { setCommitted({}); setCommittedLoading(false); return; }
    let cancelled = false;
    setCommittedLoading(true);
    (async () => {
      try {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const snap = await getDocs(query(
          collection(db, 'transactions'),
          where('userId', '==', uid),
          where('date', '>=', Timestamp.fromDate(monthStart)),
        ));
        const acc: Record<string, number> = {};
        for (const d of snap.docs) {
          const v = d.data();
          if (v.isInstallment !== true || v.type !== 'expense') continue;
          const date = (v.date as Timestamp).toDate();
          const k = monthKey(date);
          acc[k] = (acc[k] ?? 0) + effectiveAmount(v as any);
        }
        if (!cancelled) setCommitted(acc);
      } catch {
        if (!cancelled) setCommitted({});
      } finally {
        if (!cancelled) setCommittedLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  if (!enabled || !userId) return EMPTY;

  // El mes en curso va incompleto: incluirlo hunde la mediana el día 3.
  const closedMonths = trend.slice(0, -1);
  const incomes = closedMonths.map((b) => b.income).filter((n) => n > 0);

  return {
    committedByMonth,
    typicalIncome: median(incomes),
    fixedExpenses: recurring.monthlyTotal,
    hasIncomeData: incomes.length > 0,
    loading: trendLoading || recurringLoading || committedLoading,
  };
}
