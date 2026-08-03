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
  deleteField,
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
  updateGoal: (goal: Goal, patch: { name: string; emoji: string; targetAmount: number }) => Promise<void>;
  reopenGoal: (goalId: string) => Promise<void>;
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
    }, (err) => {
      // Sin este callback, un fallo de red o de permisos dejaba el spinner
      // girando para siempre: onSnapshot no vuelve a llamar al de éxito.
      console.warn('useGoals error:', err.code);
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

  /**
   * Editar la meta puede cambiar si está cumplida: bajar el objetivo por debajo de
   * lo ahorrado la completa, y subirlo por encima la devuelve a activa. Se resuelve
   * aquí y no en la pantalla para que el documento nunca quede con un `status` que
   * contradiga sus propias cifras.
   */
  const updateGoal = async (
    goal: Goal,
    patch: { name: string; emoji: string; targetAmount: number },
  ): Promise<void> => {
    const completed = goal.savedAmount >= patch.targetAmount;
    await updateDoc(doc(db, 'goals', goal.id), {
      ...patch,
      status: completed ? 'completed' : 'active',
      ...(completed
        ? { completedAt: goal.completedAt ?? Timestamp.now() }
        : { completedAt: deleteField() }),
    });
  };

  /** Volver a ponerla en marcha: se borra la fecha de logro, no se conserva una vieja. */
  const reopenGoal = async (goalId: string): Promise<void> => {
    await updateDoc(doc(db, 'goals', goalId), {
      status: 'active',
      completedAt: deleteField(),
    });
  };

  const deleteGoal = async (goalId: string): Promise<void> => {
    await deleteDoc(doc(db, 'goals', goalId));
  };

  return { goals, loading, addGoal, addContribution, updateGoal, reopenGoal, deleteGoal };
}
