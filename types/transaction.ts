import type { SharedParticipant } from './sharedTransaction';

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
  isVirtualFixed?: boolean; // true cuando es una copia virtual de un fijo en otro mes
  fixedCancelledFrom?: Date; // si está seteado, el fijo no aparece desde este mes en adelante
  // Tarjeta
  cardId?: string;
  // Cuotas
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  isInstallment?: boolean;
  isPaid?: boolean;
  // Gastos compartidos — solo presentes si isShared === true
  isShared?: boolean;
  sharedId?: string;
  sharedOwnerUid?: string;
  sharedOwnerUserName?: string;
  sharedParticipants?: SharedParticipant[];
  sharedAmount?: number; // monto calculado para ESTE usuario específico
}
