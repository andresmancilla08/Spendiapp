import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Card, CardType, TeaSource } from '../types/card';

interface UseCardsResult {
  cards: Card[];
  loading: boolean;
  error: string | null;
}

export function useCards(userId: string): UseCardsResult {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const q = query(
      collection(db, 'cards'),
      where('userId', '==', userId),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: Card[] = snap.docs.map((d) => {
          const v = d.data();
          return {
            id: d.id,
            userId: v.userId,
            bankId: v.bankId,
            bankName: v.bankName,
            type: v.type as CardType,
            nickname: v.nickname ?? v.lastFour ?? '',
            isDefault: v.isDefault ?? false,
            createdAt: (v.createdAt as Timestamp).toDate(),
            cutoffDay: v.cutoffDay ?? undefined,
            tea: typeof v.tea === 'number' ? v.tea : undefined,
            teaUpdatedAt: v.teaUpdatedAt ? (v.teaUpdatedAt as Timestamp).toDate() : undefined,
            teaSource: (v.teaSource as TeaSource) ?? undefined,
          };
        });
        // Sort client-side: más reciente primero
        data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setCards(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn('useCards error:', err.code);
        setError(err.code);
        setLoading(false);
      },
    );

    return unsub;
  }, [userId]);

  return { cards, loading, error };
}

export async function addCard(
  userId: string,
  bankId: string,
  bankName: string,
  type: CardType,
  nickname: string,
  isDefault = false,
  cutoffDay?: number,
  tea?: number,
): Promise<string> {
  if (isDefault) {
    const snap = await getDocs(query(collection(db, 'cards'), where('userId', '==', userId)));
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach((d) => batch.update(d.ref, { isDefault: false }));
      await batch.commit();
    }
  }
  const ref = await addDoc(collection(db, 'cards'), {
    userId,
    bankId,
    bankName,
    type,
    nickname,
    isDefault,
    createdAt: Timestamp.fromDate(new Date()),
    ...(cutoffDay ? { cutoffDay } : {}),
    ...(tea != null ? { tea, teaUpdatedAt: Timestamp.fromDate(new Date()), teaSource: 'manual' } : {}),
  });
  return ref.id;
}

export async function updateCard(
  cardId: string,
  updates: {
    bankId?: string; bankName?: string; type?: CardType; nickname?: string;
    isDefault?: boolean; cutoffDay?: number | null;
    /** null borra la tasa guardada; un número la fija y sella la fecha. */
    tea?: number | null;
  },
): Promise<void> {
  const { tea, ...rest } = updates;
  const payload: Record<string, unknown> = { ...rest };
  if (tea !== undefined) {
    // La fecha viaja SIEMPRE con el valor: una tasa sin fecha no se puede
    // envejecer, y una tasa que no se puede envejecer acaba mintiendo en silencio.
    payload.tea = tea;
    payload.teaUpdatedAt = tea == null ? null : Timestamp.fromDate(new Date());
    payload.teaSource = tea == null ? null : 'manual';
  }
  await updateDoc(doc(db, 'cards', cardId), payload);
}

/**
 * Aprende la tasa de una tarjeta a partir de una compra REAL a cuotas.
 *
 * Es el mecanismo que mantiene el dato al día sin que el usuario haga nada: si
 * registró una compra a 25,52 % con esa tarjeta, esa es la tasa que le cobran.
 *
 * No pisa una tasa escrita a mano el mismo día ni una idéntica a la que ya hay
 * (evita una escritura por cada cuota registrada), y nunca borra: sin tasa
 * nueva válida, no toca nada.
 */
export async function learnCardTea(
  cardId: string,
  tea: number,
  current?: { tea?: number; teaSource?: TeaSource },
): Promise<void> {
  if (!Number.isFinite(tea) || tea <= 0 || tea > 200) return;
  if (current?.tea === tea) return;
  await updateDoc(doc(db, 'cards', cardId), {
    tea,
    teaUpdatedAt: Timestamp.fromDate(new Date()),
    teaSource: 'learned',
  });
}

export async function setDefaultCard(cardId: string, userId: string): Promise<void> {
  const snap = await getDocs(query(collection(db, 'cards'), where('userId', '==', userId)));
  const batch = writeBatch(db);
  snap.forEach((d) => batch.update(d.ref, { isDefault: d.id === cardId }));
  await batch.commit();
}

export async function deleteCard(cardId: string): Promise<void> {
  await deleteDoc(doc(db, 'cards', cardId));
}

/** Elimina la tarjeta y TODAS sus transacciones asociadas en un solo batch. */
export async function deleteCardAndTransactions(cardId: string, userId: string): Promise<void> {
  const txSnap = await getDocs(
    query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('cardId', '==', cardId),
    ),
  );
  const batch = writeBatch(db);
  txSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'cards', cardId));
  await batch.commit();
}
