import {
  collection,
  doc,
  writeBatch,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface CreateSentIncomeParams {
  senderUid: string;
  senderName: string;      // displayName del remitente
  recipientUid: string;
  recipientName: string;   // displayName del destinatario
  amount: number;
  category: string;
  description: string;
  date: Date;
  cardId?: string;
}

export function useSentIncome() {
  async function createSentIncome(params: CreateSentIncomeParams): Promise<void> {
    const { senderUid, senderName, recipientUid, recipientName, amount, category, description, date, cardId } = params;

    const batch = writeBatch(db);
    const now = new Date();

    const senderRef = doc(collection(db, 'transactions'));
    const incomeRef = doc(collection(db, 'transactions'));

    // Gasto del remitente
    batch.set(senderRef, {
      userId: senderUid,
      type: 'expense',
      amount,
      category,
      description,
      date: Timestamp.fromDate(date),
      createdAt: Timestamp.fromDate(now),
      isFixed: false,
      ...(cardId ? { cardId } : {}),
      sentIncomeToUid: recipientUid,
      sentIncomeToName: recipientName,
      sentIncomeTransactionId: incomeRef.id,
    });

    // Ingreso del destinatario
    batch.set(incomeRef, {
      userId: recipientUid,
      type: 'income',
      amount,
      category,
      description,
      date: Timestamp.fromDate(date),
      createdAt: Timestamp.fromDate(now),
      isFixed: false,
      isSentIncome: true,
      sentByUid: senderUid,
      sentByName: senderName,
      sentByTransactionId: senderRef.id,
    });

    await batch.commit();

    // Notificación al destinatario (no crítica)
    addDoc(collection(db, 'notifications'), {
      toUserId: recipientUid,
      type: 'sent_income',
      data: {
        fromUserId: senderUid,
        fromUserName: senderName,
        description,
        amount,
      },
      read: false,
      createdAt: Timestamp.fromDate(now),
    }).catch(() => {});
  }

  async function deleteSentIncome(params: {
    senderTransactionId: string;
    incomeTransactionId: string;
    senderUid: string;
    senderName: string;
    recipientUid: string;
    description: string;
    amount: number;
  }): Promise<void> {
    const { senderTransactionId, incomeTransactionId, senderUid, senderName, recipientUid, description, amount } = params;
    const batch = writeBatch(db);
    batch.delete(doc(db, 'transactions', senderTransactionId));
    batch.delete(doc(db, 'transactions', incomeTransactionId));
    await batch.commit();

    addDoc(collection(db, 'notifications'), {
      toUserId: recipientUid,
      type: 'sent_income_deleted',
      data: {
        fromUserId: senderUid,
        fromUserName: senderName,
        description,
        amount,
      },
      read: false,
      createdAt: Timestamp.fromDate(new Date()),
    }).catch(() => {});
  }

  return { createSentIncome, deleteSentIncome };
}
