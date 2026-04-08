import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Budget } from '../types/budget';

interface UseBudgetsResult {
  budgets: Budget[];
  loading: boolean;
  error: string | null;
  addOrUpdateBudget: (
    categoryId: string,
    categoryName: string,
    categoryIcon: string,
    limitAmount: number
  ) => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
}

export function useBudgets(
  userId: string,
  year: number,
  month: number
): UseBudgetsResult {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBudgets([]);
    setLoading(true);
  }, [userId, year, month]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'budgets'),
      where('userId', '==', userId),
      where('year', '==', year),
      where('month', '==', month)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setBudgets(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              userId: data.userId,
              categoryId: data.categoryId,
              categoryName: data.categoryName,
              categoryIcon: data.categoryIcon,
              limitAmount: data.limitAmount,
              month: data.month,
              year: data.year,
              createdAt:
                data.createdAt instanceof Timestamp
                  ? data.createdAt.toDate()
                  : new Date(data.createdAt),
            } as Budget;
          })
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.code ?? 'unknown');
        setLoading(false);
      }
    );

    return unsub;
  }, [userId, year, month]);

  const addOrUpdateBudget = async (
    categoryId: string,
    categoryName: string,
    categoryIcon: string,
    limitAmount: number
  ) => {
    // ID determinístico: evita query compuesto y maneja create/update en una sola operación
    const docId = `${userId}_${categoryId}_${year}_${month}`;
    await setDoc(
      doc(db, 'budgets', docId),
      { userId, categoryId, categoryName, categoryIcon, limitAmount, month, year, createdAt: Timestamp.now() },
      { merge: true }
    );
  };

  const deleteBudget = async (budgetId: string) => {
    await deleteDoc(doc(db, 'budgets', budgetId));
  };

  return { budgets, loading, error, addOrUpdateBudget, deleteBudget };
}
