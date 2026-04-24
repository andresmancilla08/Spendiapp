// hooks/useExpenseGroups.ts
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
  getDocs,
  writeBatch,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ExpenseGroup, ExpenseGroupParticipant, GroupExpense } from '../types/expenseGroup';

// ─── useExpenseGroups ────────────────────────────────────────────────────────

interface UseExpenseGroupsResult {
  groups: ExpenseGroup[];
  loading: boolean;
  createGroup: (
    title: string,
    emoji: string,
    participants: ExpenseGroupParticipant[],
  ) => Promise<string>;
  deleteGroup: (groupId: string) => Promise<void>;
  settleGroup: (groupId: string) => Promise<void>;
  reopenGroup: (groupId: string) => Promise<void>;
}

export function useExpenseGroups(userId: string): UseExpenseGroupsResult {
  const [groups, setGroups] = useState<ExpenseGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'expenseGroups'),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(q, (snap) => {
      setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExpenseGroup)));
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    return unsub;
  }, [userId]);

  const createGroup = async (
    title: string,
    emoji: string,
    participants: ExpenseGroupParticipant[],
  ): Promise<string> => {
    const ref = await addDoc(collection(db, 'expenseGroups'), {
      title,
      emoji,
      createdBy: userId,
      createdAt: Timestamp.now(),
      participants,
      status: 'active' as const,
    });
    return ref.id;
  };

  const deleteGroup = async (groupId: string): Promise<void> => {
    const batch = writeBatch(db);

    // Eliminar subcollección expenses
    const expensesSnap = await getDocs(
      collection(db, 'expenseGroups', groupId, 'expenses'),
    );
    for (const expenseDoc of expensesSnap.docs) {
      batch.delete(expenseDoc.ref);
    }

    // Eliminar doc principal
    batch.delete(doc(db, 'expenseGroups', groupId));

    await batch.commit();
  };

  const settleGroup = async (groupId: string): Promise<void> => {
    await updateDoc(doc(db, 'expenseGroups', groupId), { status: 'settled' });
  };

  const reopenGroup = async (groupId: string): Promise<void> => {
    await updateDoc(doc(db, 'expenseGroups', groupId), { status: 'active' });
  };

  return { groups, loading, createGroup, deleteGroup, settleGroup, reopenGroup };
}

// ─── useGroupExpenses ────────────────────────────────────────────────────────

interface UseGroupExpensesResult {
  expenses: GroupExpense[];
  loading: boolean;
  addExpense: (
    description: string,
    amount: number,
    paidById: string,
    splitAmong: string[],
    createdByUid?: string,
  ) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
}

export function useGroupExpenses(groupId: string): UseGroupExpensesResult {
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'expenseGroups', groupId, 'expenses'),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupExpense)));
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    return unsub;
  }, [groupId]);

  const addExpense = async (
    description: string,
    amount: number,
    paidById: string,
    splitAmong: string[],
    createdByUid?: string,
  ): Promise<void> => {
    await addDoc(collection(db, 'expenseGroups', groupId, 'expenses'), {
      groupId,
      description,
      amount,
      paidById,
      splitAmong,
      createdAt: Timestamp.now(),
      ...(createdByUid ? { createdByUid } : {}),
    });
  };

  const deleteExpense = async (expenseId: string): Promise<void> => {
    await deleteDoc(doc(db, 'expenseGroups', groupId, 'expenses', expenseId));
  };

  return { expenses, loading, addExpense, deleteExpense };
}
