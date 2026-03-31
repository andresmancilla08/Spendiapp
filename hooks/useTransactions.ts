import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Transaction } from '../types/transaction';

interface UseTransactionsResult {
  transactions: Transaction[];
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  loading: boolean;
  error: string | null;
}

export function useTransactions(userId: string, year: number, month: number, refreshKey = 0): UseTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data: Transaction[] = snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            userId: d.userId,
            type: d.type,
            amount: d.amount,
            category: d.category,
            description: d.description,
            date: (d.date as Timestamp).toDate(),
            createdAt: (d.createdAt as Timestamp).toDate(),
          };
        });
        setTransactions(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.warn('useTransactions error:', err.code);
        setError(err.code);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId, year, month, refreshKey]);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  return { transactions, totalIncome, totalExpenses, balance, loading, error };
}
