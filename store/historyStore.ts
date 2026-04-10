import { create } from 'zustand';
import type { Transaction } from '../types/transaction';

type EditAction = 'saved' | 'deleted' | 'duplicated';

interface HistoryState {
  selectedTransaction: Transaction | null;
  cardsMap: Record<string, { bankName: string; nickname: string; type: string }>;
  viewYear: number;
  viewMonth: number;
  isPastMonth: boolean;
  currentUserName: string;
  pendingEditTx: Transaction | null;
  lastAction: EditAction | null;
  setSelectedTransaction: (
    tx: Transaction,
    meta: {
      cardsMap: Record<string, { bankName: string; nickname: string; type: string }>;
      viewYear: number;
      viewMonth: number;
      isPastMonth: boolean;
      currentUserName: string;
    }
  ) => void;
  setPendingEditTx: (tx: Transaction | null) => void;
  setLastAction: (action: EditAction | null) => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  selectedTransaction: null,
  cardsMap: {},
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth(),
  isPastMonth: false,
  currentUserName: '',
  pendingEditTx: null,
  lastAction: null,
  setSelectedTransaction: (tx, meta) => set({ selectedTransaction: tx, ...meta }),
  setPendingEditTx: (pendingEditTx) => set({ pendingEditTx }),
  setLastAction: (lastAction) => set({ lastAction }),
}));
