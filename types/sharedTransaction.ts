import { Timestamp } from 'firebase/firestore';

export interface SharedParticipant {
  uid: string;
  userName: string;
  displayName: string;
  percentage: number; // 0-100, suma total debe ser 100
}

export interface MirrorRef {
  uid: string;
  transactionId: string; // ID del doc en /transactions (una entrada por doc)
  installmentGroupId?: string; // si es cuotas, mismo valor para las N entradas del participante
}

export interface SharedTransaction {
  sharedId: string;
  ownerUid: string;
  createdAt: Timestamp;
  mirrorRefs: MirrorRef[]; // incluye refs del owner Y de todos los participantes
  participantUids: string[]; // [ownerUid, p1Uid, p2Uid, ...] — array plano para reglas Firestore
}
