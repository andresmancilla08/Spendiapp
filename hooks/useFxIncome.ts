import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { updateFxIncomes } from './useUserProfile';
import { FX_INCOME_MAX, type FxIncome } from '../types/fxIncome';
import { isFxCurrency } from '../utils/fxConvert';
import type { UserProfile } from '../types/friend';

/**
 * Los ingresos declarados en moneda extranjera del usuario.
 *
 * Viven dentro del documento `users/{uid}`, así que se leen con un `onSnapshot`
 * al perfil y se escriben con la lista COMPLETA. Son 10 como máximo: una
 * subcolección para eso sería más código y una lectura más por arranque.
 *
 * Se sanea al leer: un documento escrito por una versión anterior de la app (o
 * a mano) no puede tumbar la pantalla. Lo que no cuadra se descarta en silencio
 * en vez de propagarse a los cálculos.
 */
function sanitize(raw: unknown): FxIncome[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i): i is FxIncome =>
      !!i
      && typeof i.id === 'string'
      && typeof i.label === 'string'
      && typeof i.amount === 'number'
      && Number.isFinite(i.amount)
      && isFxCurrency(i.currency))
    .slice(0, FX_INCOME_MAX);
}

export interface UseFxIncomeResult {
  incomes: FxIncome[];
  loading: boolean;
  /** No se pudo leer el perfil. */
  error: boolean;
  /** Hay una escritura en vuelo. */
  busy: boolean;
  /** `false` si ya se alcanzó el máximo. */
  canAdd: boolean;
  add: (income: Omit<FxIncome, 'id' | 'createdAt'>) => Promise<void>;
  update: (id: string, patch: Omit<FxIncome, 'id' | 'createdAt'>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useFxIncome(uid: string): UseFxIncomeResult {
  const [incomes, setIncomes] = useState<FxIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) { setIncomes([]); setLoading(false); return; }
    const unsub = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        const profile = snap.data() as UserProfile | undefined;
        setIncomes(sanitize(profile?.fxIncomes));
        setError(false);
        setLoading(false);
      },
      () => { setError(true); setLoading(false); },
    );
    return unsub;
  }, [uid]);

  // Se escribe SIEMPRE sobre `incomes`, que es lo último que dijo Firestore, no
  // sobre una copia de estado local: dos dispositivos editando a la vez y el
  // último en escribir gana la lista entera, no la mitad.
  const write = useCallback(async (next: FxIncome[]) => {
    if (!uid) return;
    setBusy(true);
    try {
      await updateFxIncomes(uid, next);
    } finally {
      setBusy(false);
    }
  }, [uid]);

  const add = useCallback(async (income: Omit<FxIncome, 'id' | 'createdAt'>) => {
    if (incomes.length >= FX_INCOME_MAX) return;
    const record: FxIncome = { ...income, id: `fx_${Date.now()}`, createdAt: Date.now() };
    await write([...incomes, record]);
  }, [incomes, write]);

  const update = useCallback(async (id: string, patch: Omit<FxIncome, 'id' | 'createdAt'>) => {
    const target = incomes.find((i) => i.id === id);
    if (!target) return;
    await write(incomes.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, [incomes, write]);

  const remove = useCallback(async (id: string) => {
    await write(incomes.filter((i) => i.id !== id));
  }, [incomes, write]);

  const canAdd = useMemo(() => incomes.length < FX_INCOME_MAX, [incomes.length]);

  return { incomes, loading, error, busy, canAdd, add, update, remove };
}
