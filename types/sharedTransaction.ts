import { Timestamp } from 'firebase/firestore';

export interface SharedParticipant {
  uid: string;          // UID real para usuarios de la app; email para externos (solo UI/tracking)
  userName: string;     // @userName para usuarios de la app; '' para externos
  displayName: string;
  percentage: number;   // 0-100, suma total debe ser 100
  isExternal?: boolean; // true si la persona aún no tiene cuenta en la app
  email?: string;       // solo para externos — clave única para vinculación futura
}

export interface ExternalParticipantRef {
  email: string;
  displayName: string;
  percentage: number;
}

export interface MirrorRef {
  uid: string;
  transactionId: string;
  installmentGroupId?: string;
}

export interface SharedTransaction {
  sharedId: string;
  ownerUid: string;
  createdAt: Timestamp;
  mirrorRefs: MirrorRef[];
  participantUids: string[];            // solo UIDs reales para reglas Firestore
  externalParticipants?: ExternalParticipantRef[]; // sin cuenta, vinculables por email
}
