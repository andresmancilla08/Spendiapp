// types/expenseGroup.ts
import { Timestamp } from 'firebase/firestore';

export interface ExpenseGroupParticipant {
  id: string;    // uuid local (no UID de Firebase, puede ser cualquier nombre)
  name: string;
  uid?: string;  // solo si es usuario de la app
}

export interface ExpenseGroup {
  id: string;
  title: string;
  emoji: string;
  createdBy: string; // uid del usuario que creó el grupo
  createdAt: Timestamp;
  participants: ExpenseGroupParticipant[];
  status: 'active' | 'settled';
}

export interface GroupExpense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidById: string;     // participant.id
  splitAmong: string[]; // participant.id[] — quiénes dividen este gasto
  createdAt: Timestamp;
  createdByUid?: string; // uid del usuario que creó el gasto (para permisos)
}

export interface Settlement {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number; // redondeado a entero
}
