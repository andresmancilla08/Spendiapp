import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
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
            lastFour: v.lastFour,
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
  lastFour: string,
): Promise<string> {
  const ref = await addDoc(collection(db, 'cards'), {
    userId,
    bankId,
    bankName,
    type,
    lastFour,
    createdAt: Timestamp.fromDate(new Date()),
  });
  return ref.id;
}

export async function deleteCard(cardId: string): Promise<void> {
  await deleteDoc(doc(db, 'cards', cardId));
}
