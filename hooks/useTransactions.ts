import { useState, useEffect, useRef } from 'react';
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

  // Ambas queries deben resolver antes de quitar el loading
  const q1Done = useRef(false);
  const q2Done = useRef(false);
  const resolveLoading = () => {
    if (q1Done.current && q2Done.current) setLoading(false);
  };

  // Limpiar datos al cambiar mes/año/refreshKey para no mostrar datos obsoletos
  useEffect(() => {
    q1Done.current = false;
    q2Done.current = false;
    setRegular([]);
    setFixed([]);
    setLoading(true);
  }, [userId, year, month, refreshKey]);

  // Query 1: transacciones normales del mes (incluyendo las fijas creadas este mes)
  useEffect(() => {
    if (!userId) { q1Done.current = true; resolveLoading(); return; }

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
      const viewStart = new Date(year, month, 1);
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
          isShared: d.isShared ?? false,
          sharedId: d.sharedId,
          sharedOwnerUid: d.sharedOwnerUid,
          sharedOwnerUserName: d.sharedOwnerUserName,
          sharedParticipants: d.sharedParticipants,
          sharedAmount: d.sharedAmount,
          cardId: d.cardId,
          installmentGroupId: d.installmentGroupId,
          installmentNumber: d.installmentNumber,
          installmentTotal: d.installmentTotal,
          isInstallment: d.isInstallment ?? false,
          fixedCancelledFrom: d.fixedCancelledFrom ? (d.fixedCancelledFrom as Timestamp).toDate() : undefined,
          fixedSkipMonths: d.fixedSkipMonths ?? [],
          // Ingreso enviado — remitente
          sentIncomeToUid: d.sentIncomeToUid,
          sentIncomeToName: d.sentIncomeToName,
          sentIncomeTransactionId: d.sentIncomeTransactionId,
          // Ingreso enviado — destinatario
          isSentIncome: d.isSentIncome ?? false,
          sentByUid: d.sentByUid,
          sentByName: d.sentByName,
          sentByTransactionId: d.sentByTransactionId,
        };
      }).filter((tx) => {
        if (!tx.isFixed) return true;
        // Cancelado a partir de este mes
        if (tx.fixedCancelledFrom && viewStart >= tx.fixedCancelledFrom) return false;
        // Mes omitido individualmente
        if ((tx.fixedSkipMonths ?? []).includes(`${year}_${month}`)) return false;
        return true;
      }));
      setError(null);
      q1Done.current = true;
      resolveLoading();
    }, (err) => {
      console.warn('useTransactions error:', err.code);
      setError(err.code);
      q1Done.current = true;
      resolveLoading();
    });

    return unsub;
  }, [userId, year, month, refreshKey]);

  // Query 2: TODAS las transacciones fijas del usuario (sin filtro de fecha para evitar
  // índice compuesto de 3 campos). Filtramos client-side para solo incluir las de meses
  // anteriores al que se está viendo, generando "copias virtuales" para ese mes.
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('isFixed', '==', true)
    );

    const unsub = onSnapshot(q, (snap) => {
      const start = new Date(year, month, 1);
      const copies: Transaction[] = snap.docs
        .filter((doc) => {
          const d = doc.data();
          // Solo incluir si la transacción fija fue creada ANTES del mes que se visualiza
          const date: Date = (d.date as Timestamp).toDate();
          if (date >= start) return false;
          // Excluir si fue cancelada a partir de este mes
          if (d.fixedCancelledFrom) {
            const cancelledFrom: Date = (d.fixedCancelledFrom as Timestamp).toDate();
            if (start >= cancelledFrom) return false;
          }
          // Excluir si este mes fue omitido individualmente
          const skipMonths: string[] = d.fixedSkipMonths ?? [];
          if (skipMonths.includes(`${year}_${month}`)) return false;
          return true;
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
            isPaid: d.isPaid ?? false,
            cardId: d.cardId,
            isShared: d.isShared ?? false,
            sharedId: d.sharedId,
            sharedOwnerUid: d.sharedOwnerUid,
            sharedOwnerUserName: d.sharedOwnerUserName,
            sharedParticipants: d.sharedParticipants,
            sharedAmount: d.sharedAmount,
            sentIncomeToUid: d.sentIncomeToUid,
            sentIncomeToName: d.sentIncomeToName,
            sentIncomeTransactionId: d.sentIncomeTransactionId,
            isSentIncome: d.isSentIncome ?? false,
            sentByUid: d.sentByUid,
            sentByName: d.sentByName,
            sentByTransactionId: d.sentByTransactionId,
          };
        });
      setFixed(copies);
      q2Done.current = true;
      resolveLoading();
    }, (err) => {
      console.warn('useTransactions fixed query error:', err.code);
      setFixed([]);
      q2Done.current = true;
      resolveLoading();
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
