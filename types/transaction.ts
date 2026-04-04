export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: Date;
  createdAt: Date;
  isFixed?: boolean;
  isVirtualFixed?: boolean;
  // Tarjeta
  cardId?: string;
  // Cuotas
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  isInstallment?: boolean;
}
