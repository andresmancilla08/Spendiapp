// types/goal.ts
import { Timestamp } from 'firebase/firestore';

export type GoalStatus = 'active' | 'completed';

export interface Goal {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;
  status: GoalStatus;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}
