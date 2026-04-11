import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  fullName?: string;
  userName: string;
  photoURL: string | null;
  createdAt: Timestamp;
  whatsNewSeen?: boolean;
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
  | 'goal_monthly_reminder';

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
