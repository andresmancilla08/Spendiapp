// hooks/useGoals.ts
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
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Goal } from '../types/goal';

interface UseGoalsResult {
  goals: Goal[];
  loading: boolean;
  addGoal: (name: string, emoji: string, targetAmount: number) => Promise<void>;
  addContribution: (
    goalId: string,
    amount: number,
    currentSaved: number,
    targetAmount: number,
  ) => Promise<boolean>;
  deleteGoal: (goalId: string) => Promise<void>;
}

export function useGoals(userId: string): UseGoalsResult {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'goals'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(q, (snap) => {
      setGoals(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Goal)));
      setLoading(false);
    });

    return unsub;
  }, [userId]);

  const addGoal = async (name: string, emoji: string, targetAmount: number): Promise<void> => {
    await addDoc(collection(db, 'goals'), {
      userId,
      name,
      emoji,
      targetAmount,
      savedAmount: 0,
      status: 'active' as const,
      createdAt: Timestamp.now(),
    });
  };

  // Returns true if the contribution completes the goal
  const addContribution = async (
    goalId: string,
    amount: number,
    currentSaved: number,
    targetAmount: number,
  ): Promise<boolean> => {
    const newSaved = currentSaved + amount;
    const completed = newSaved >= targetAmount;
    await updateDoc(doc(db, 'goals', goalId), {
      savedAmount: newSaved,
      ...(completed ? { status: 'completed', completedAt: Timestamp.now() } : {}),
    });
    return completed;
  };

  const deleteGoal = async (goalId: string): Promise<void> => {
    await deleteDoc(doc(db, 'goals', goalId));
  };

  return { goals, loading, addGoal, addContribution, deleteGoal };
}
