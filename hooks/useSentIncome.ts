import {
  collection,
  doc,
  writeBatch,
  Timestamp,
  addDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { categoryForOtherUser } from '../utils/sharedCategory';

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
  isFixed?: boolean;
}

/** Lo único que el remitente puede escribir en el documento del destinatario.
 *  Las reglas de Firestore aplican exactamente esta lista: `isPaid`, `notes`,
 *  `fixedPaidMonths` y `cardId` son suyos y no se tocan desde aquí. */
export type SentIncomeMirrorPatch = Partial<Record<
  'amount' | 'date' | 'description' | 'category' | 'isFixed'
  | 'fixedCancelledFrom' | 'fixedSkipMonths' | 'fixedSplitInto' | 'fixedOriginDate',
  unknown
>>;

export function useSentIncome() {
  async function createSentIncome(params: CreateSentIncomeParams): Promise<{ senderId: string; incomeId: string }> {
    const { senderUid, senderName, recipientUid, recipientName, amount, category, description, date, cardId, isFixed = false } = params;

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
      isFixed,
      ...(cardId ? { cardId } : {}),
      sentIncomeToUid: recipientUid,
      sentIncomeToName: recipientName,
      sentIncomeTransactionId: incomeRef.id,
    });

    // Ingreso del destinatario. La categoría no puede ser una personalizada mía
    // (no existe en su cuenta) ni una de gasto: cae a `other`.
    batch.set(incomeRef, {
      userId: recipientUid,
      type: 'income',
      amount,
      category: categoryForOtherUser(category, 'income'),
      description,
      date: Timestamp.fromDate(date),
      createdAt: Timestamp.fromDate(now),
      isFixed,
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
        // Para abrir el historial en el mes del ingreso, no en el actual.
        txYear: date.getFullYear(),
        txMonth: date.getMonth(),
      },
      read: false,
      createdAt: Timestamp.fromDate(now),
    }).catch(() => {});

    // Partir una serie fija necesita el id del par recién creado para enlazar la
    // vieja (`fixedSplitInto`) en AMBOS lados.
    return { senderId: senderRef.id, incomeId: incomeRef.id };
  }

  /**
   * Propaga al documento del destinatario un cambio hecho en el del remitente.
   * Existe porque un ingreso enviado son DOS documentos sin doc de coordinación:
   * sin esto, editar el importe o cortar la serie fija ocurría solo en el lado de
   * quien lo edita y el otro seguía viendo el movimiento viejo, mes tras mes.
   */
  async function syncSentIncomeMirror(mirrorId: string, patch: SentIncomeMirrorPatch): Promise<void> {
    if (Object.keys(patch).length === 0) return;
    await updateDoc(doc(db, 'transactions', mirrorId), patch);
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

  return { createSentIncome, deleteSentIncome, syncSentIncomeMirror };
}
