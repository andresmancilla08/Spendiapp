import { Timestamp } from 'firebase/firestore';

/** Perfil público mínimo — único dato de un usuario legible por otros.
 *  Se espeja en la colección `publicProfiles` (ver useUserProfile). No contiene
 *  PII sensible (fullName, premium, personalización) que sí vive en `users`. */
export interface PublicProfile {
  uid: string;
  userName: string;
  displayName: string;
  photoURL: string | null;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  fullName?: string;
  userName: string;
  photoURL: string | null;
  createdAt: Timestamp;
  whatsNewSeen?: boolean | string;
  colorPalette?: string;
  /** Preferencias de personalización premium — espejo de ThemeContext; viaja
   * con la cuenta para sobrevivir reinstalaciones y cambios de dispositivo. */
  /** Paletas creadas por el usuario. Se guardan sus TRES parámetros, no los
   *  sesenta colores: ocupa nada y una mejora del generador las alcanza. */
  customPalettes?: {
    id: string;
    name: string;
    hue: number;
    secondaryMode: string;
    feel: string;
    createdAt: number;
  }[];
  personalization?: {
    /** Epoch ms de la última escritura — resuelve conflictos local vs remoto. */
    updatedAt?: number;
    /** Legado: preferencia única previa a light/dark — se usa como fallback. */
    backgroundStyle?: string;
    backgroundStyleLight?: string;
    backgroundStyleDark?: string;
    backgroundIntensity?: string;
    backgroundBlurLight?: string;
    backgroundBlurDark?: string;
    chartType?: string;
    chartAnimStyle?: string;
    chartSpeed?: string;
    chartAccent?: string;
    gradientStyle?: string;
  };
  isBlocked?: boolean;
  blockedReason?: string;
  blockedUntil?: Timestamp;
  isPremium?: boolean;
  premiumSince?: Timestamp;
  premiumExpiry?: Timestamp;
  premiumWelcomeSeen?: boolean;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

export interface Friendship {
  id: string;
  fromId: string;
  toId: string;
  status: FriendshipStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'shared_transaction_added'
  | 'shared_transaction_updated'
  | 'shared_transaction_deleted'
  | 'income_claim_added'
  | 'shared_delete_request'
  | 'goal_monthly_reminder'
  | 'sent_income'
  | 'sent_income_deleted'
  | 'sent_income_delete_request'
  | 'external_participant_joined';

export interface NotificationData {
  fromUserId: string;
  fromUserName: string;
  fromDisplayName: string;
  friendshipId: string;
}

export interface SharedTransactionNotificationData {
  fromUserId: string;
  fromUserName: string;
  fromDisplayName: string;
  sharedId: string;
  description: string;
  sharedAmount: number;
  /** Mes de la transacción, para abrir el historial donde está y no en el mes
   *  actual. Opcional: las notificaciones creadas antes de 2.62.0 no lo traen. */
  txYear?: number;
  txMonth?: number; // 0-11
}

export interface GoalReminderData {
  count: number;
}

export interface NotificationDoc {
  id: string;
  toUserId: string;
  type: NotificationType;
  data: NotificationData | SharedTransactionNotificationData | GoalReminderData;
  read: boolean;
  createdAt: Timestamp;
}
