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
import { Card, CardType } from '../types/card';

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
  });
  return ref.id;
}

export async function updateCard(
  cardId: string,
  updates: { bankId?: string; bankName?: string; type?: CardType; nickname?: string; isDefault?: boolean },
): Promise<void> {
  await updateDoc(doc(db, 'cards', cardId), updates);
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
