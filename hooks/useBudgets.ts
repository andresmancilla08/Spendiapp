import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  getDocs,
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
    const q = query(
      collection(db, 'budgets'),
      where('userId', '==', userId),
      where('categoryId', '==', categoryId),
      where('year', '==', year),
      where('month', '==', month)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(doc(db, 'budgets', snap.docs[0].id), {
        limitAmount,
        categoryName,
        categoryIcon,
      });
    } else {
      await addDoc(collection(db, 'budgets'), {
        userId,
        categoryId,
        categoryName,
        categoryIcon,
        limitAmount,
        month,
        year,
        createdAt: Timestamp.now(),
      });
    }
  };

  const deleteBudget = async (budgetId: string) => {
    await deleteDoc(doc(db, 'budgets', budgetId));
  };

  return { budgets, loading, error, addOrUpdateBudget, deleteBudget };
}
