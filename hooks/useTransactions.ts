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
  const [regular, setRegular] = useState<Transaction[]>([]);
  const [fixed, setFixed] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Limpiar datos al cambiar mes/año para no mostrar datos obsoletos
  useEffect(() => {
    setRegular([]);
    setFixed([]);
    setLoading(true);
  }, [userId, year, month]);

  // Query 1: transacciones normales del mes (incluyendo las fijas creadas este mes)
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);

    const start = new Date(year, month, 1);
    const end   = new Date(year, month + 1, 0, 23, 59, 59);

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setRegular(snap.docs.map((doc) => {
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
          isFixed: d.isFixed ?? false,
          isPaid: d.isPaid ?? false,
          cardId: d.cardId,
          installmentGroupId: d.installmentGroupId,
          installmentNumber: d.installmentNumber,
          installmentTotal: d.installmentTotal,
          isInstallment: d.isInstallment ?? false,
        };
      }));
      setError(null);
      setLoading(false);
    }, (err) => {
      console.warn('useTransactions error:', err.code);
      setError(err.code);
      setLoading(false);
    });

    return unsub;
  }, [userId, year, month, refreshKey]);

  // Query 2: TODAS las transacciones fijas del usuario (sin filtro de fecha para evitar
  // índice compuesto de 3 campos). Filtramos client-side para solo incluir las de meses
  // anteriores al que se está viendo, generando "copias virtuales" para ese mes.
  useEffect(() => {
    if (!userId) return;

    // No mostrar copias virtuales en meses futuros
    const now = new Date();
    const isViewingFuture = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());
    if (isViewingFuture) { setFixed([]); return; }

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('isFixed', '==', true)
    );

    const unsub = onSnapshot(q, (snap) => {
      const start = new Date(year, month, 1);
      const copies: Transaction[] = snap.docs
        .filter((doc) => {
          // Solo incluir si la transacción fija fue creada ANTES del mes que se visualiza
          const d = doc.data();
          const date: Date = (d.date as Timestamp).toDate();
          return date < start;
        })
        .map((doc) => {
          const d = doc.data();
          const originalDate: Date = (d.date as Timestamp).toDate();
          // Ajustar fecha al mes visualizado, mismo día (clamped al último día del mes)
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const adjustedDay = Math.min(originalDate.getDate(), daysInMonth);
          return {
            id: `${doc.id}_virtual_${year}_${month}`,
            userId: d.userId,
            type: d.type,
            amount: d.amount,
            category: d.category,
            description: d.description,
            date: new Date(year, month, adjustedDay),
            createdAt: (d.createdAt as Timestamp).toDate(),
            isFixed: true,
            isVirtualFixed: true,
            cardId: d.cardId,
          };
        });
      setFixed(copies);
    }, (err) => {
      console.warn('useTransactions fixed query error:', err.code);
      setFixed([]);
    });

    return unsub;
  }, [userId, year, month, refreshKey]);

  // Combinar y ordenar por fecha desc
  const transactions: Transaction[] = [...regular, ...fixed].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  const totalIncome   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance       = totalIncome - totalExpenses;

  return { transactions, totalIncome, totalExpenses, balance, loading, error };
}
