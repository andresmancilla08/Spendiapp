import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  fullName?: string;
  userName: string;
  photoURL: string | null;
  createdAt: Timestamp;
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

export type NotificationType = 'friend_request' | 'friend_accepted';

export interface NotificationData {
  fromUserId: string;
  fromUserName: string;
  fromDisplayName: string;
  friendshipId: string;
}

export interface NotificationDoc {
  id: string;
  toUserId: string;
  type: NotificationType;
  data: NotificationData;
  read: boolean;
  createdAt: Timestamp;
}
