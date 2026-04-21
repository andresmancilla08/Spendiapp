import {
  collection,
  doc,
  writeBatch,
  Timestamp,
  addDoc,
  getDoc,
  setDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { SharedParticipant, MirrorRef, SharedTransaction } from '../types/sharedTransaction';
import type { TransactionType } from '../types/transaction';
import { calcSharedAmount } from '../utils/sharedCalc';
import { calculateInstallments, calculateInstallmentDates } from '../utils/installmentCalc';
import * as Crypto from 'expo-crypto';

interface CreateSharedParams {
  participants: SharedParticipant[]; // incluye al owner con su porcentaje como primer elemento
  ownerUid: string;
  ownerUserName: string;
  baseDoc: {
    type: TransactionType;
    category: string;
    description: string;
    cardId?: string;
    isFixed: boolean;
  };
  amount: number;
  installmentCount: number;
  withInterest: boolean;
  teaValue: number | null;
  selectedDate: Date;
}

interface DeleteSharedParams {
  sharedId: string;
  currentUserUid: string;
  currentUserName: string;
  description: string;
}

export function useSharedTransactions() {
  async function createSharedTransaction(params: CreateSharedParams): Promise<void> {
    const {
      participants, ownerUid, ownerUserName, baseDoc,
      amount, installmentCount, withInterest, teaValue, selectedDate,
    } = params;

    const sharedId = doc(collection(db, 'sharedTransactions')).id;
    const batch = writeBatch(db);
    const mirrorRefs: MirrorRef[] = [];
    const interestRate = (withInterest && teaValue != null) ? teaValue : 0;
    const isInstallment = installmentCount > 1;

    // Separar participantes con cuenta de externos
    const realParticipants = participants.filter((p) => !p.isExternal);
    const externalParticipants = participants.filter((p) => p.isExternal);
    const participantUids = realParticipants.map((p) => p.uid);

    // Extraer cardId para no propagarlo a mirrors
    const { cardId, ...baseDocWithoutCard } = baseDoc;

    for (const participant of realParticipants) {
      const isOwner = participant.uid === ownerUid;

      const sharedFields = {
        isShared: true,
        sharedId,
        sharedOwnerUid: ownerUid,
        sharedOwnerUserName: ownerUserName,
        sharedParticipants: participants,
        sharedAmount: calcSharedAmount(amount, interestRate, installmentCount, participant.percentage),
      };

      if (isInstallment) {
        // Para cuotas: calcular sobre el monto proporcional al porcentaje del participante
        const participantBaseAmount = Math.round(amount * participant.percentage / 100);
        const amounts = calculateInstallments(
          participantBaseAmount,
          installmentCount,
          withInterest ? teaValue : null,
        );
        const dates = calculateInstallmentDates(selectedDate, installmentCount);
        const groupId = Crypto.randomUUID();

        amounts.forEach((amt, i) => {
          const ref = doc(collection(db, 'transactions'));
          batch.set(ref, {
            userId: participant.uid,
            ...baseDocWithoutCard,
            ...(isOwner && cardId ? { cardId } : {}),
            amount: amt,
            date: Timestamp.fromDate(dates[i]),
            createdAt: Timestamp.fromDate(new Date()),
            isFixed: false,
            installmentGroupId: groupId,
            installmentNumber: i + 1,
            installmentTotal: installmentCount,
            isInstallment: true,
            ...sharedFields,
          });
          mirrorRefs.push({
            uid: participant.uid,
            transactionId: ref.id,
            installmentGroupId: groupId,
          });
        });
      } else {
        const ref = doc(collection(db, 'transactions'));
        const sharedAmount = calcSharedAmount(amount, interestRate, 1, participant.percentage);
        batch.set(ref, {
          userId: participant.uid,
          ...baseDocWithoutCard,
          ...(isOwner && cardId ? { cardId } : {}),
          amount,
          date: Timestamp.fromDate(selectedDate),
          createdAt: Timestamp.fromDate(new Date()),
          ...sharedFields,
          sharedAmount,
        });
        mirrorRefs.push({ uid: participant.uid, transactionId: ref.id });
      }
    }

    // Doc de coordinación en /sharedTransactions/{sharedId}
    const coordRef = doc(db, 'sharedTransactions', sharedId);
    const coordData: SharedTransaction = {
      sharedId,
      ownerUid,
      createdAt: Timestamp.fromDate(new Date()),
      mirrorRefs,
      participantUids,
      ...(externalParticipants.length > 0 && {
        externalParticipants: externalParticipants.map((p) => ({
          email: p.email!,
          displayName: p.displayName,
          percentage: p.percentage,
        })),
      }),
    };
    batch.set(coordRef, coordData);

    await batch.commit();

    // Registrar pendingExternalLinks para futura vinculación (fuera del batch — no crítico)
    for (const ext of externalParticipants) {
      await setDoc(
        doc(db, 'pendingExternalLinks', ext.email!),
        {
          email: ext.email,
          links: arrayUnion({
            ownerUid,
            sharedId,
            displayName: ext.displayName,
            percentage: ext.percentage,
            description: baseDoc.description,
            createdAt: Timestamp.fromDate(new Date()),
          }),
        },
        { merge: true },
      );
    }

    // Enviar notificaciones a participantes no-owner con cuenta (fuera del batch — no crítico)
    const nonOwners = realParticipants.filter((p) => p.uid !== ownerUid);
    for (const p of nonOwners) {
      await addDoc(collection(db, 'notifications'), {
        toUserId: p.uid,
        type: 'shared_transaction_added',
        data: {
          fromUserId: ownerUid,
          fromUserName: ownerUserName,
          fromDisplayName: ownerUserName,
          sharedId,
          description: baseDoc.description,
          sharedAmount: calcSharedAmount(amount, interestRate, installmentCount, p.percentage),
        },
        read: false,
        createdAt: Timestamp.fromDate(new Date()),
      });
    }
  }

  async function deleteSharedTransaction(params: DeleteSharedParams): Promise<void> {
    const { sharedId, currentUserUid, currentUserName, description } = params;

    const coordSnap = await getDoc(doc(db, 'sharedTransactions', sharedId));
    if (!coordSnap.exists()) return;

    const coordData = coordSnap.data() as SharedTransaction;
    const batch = writeBatch(db);

    // Eliminar todos los docs de transacciones (owner + mirrors)
    for (const ref of coordData.mirrorRefs) {
      batch.delete(doc(db, 'transactions', ref.transactionId));
    }

    // Eliminar doc de coordinación
    batch.delete(doc(db, 'sharedTransactions', sharedId));

    await batch.commit();

    // Notificaciones a todos los participantes excepto quien eliminó
    const others = coordData.participantUids.filter((uid) => uid !== currentUserUid);
    for (const uid of others) {
      await addDoc(collection(db, 'notifications'), {
        toUserId: uid,
        type: 'shared_transaction_deleted',
        data: {
          fromUserId: currentUserUid,
          fromUserName: currentUserName,
          fromDisplayName: currentUserName,
          sharedId,
          description,
          sharedAmount: 0,
        },
        read: false,
        createdAt: Timestamp.fromDate(new Date()),
      });
    }
  }

  return { createSharedTransaction, deleteSharedTransaction };
}
