import { useEffect, useState } from 'react';
import {
  collection, query, where, onSnapshot, updateDoc, doc,
  orderBy, writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { NotificationDoc } from '../types/friend';

export function useNotifications(uid: string) {
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', uid),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotificationDoc),
      );
      setLoading(false);
    });

    return unsub;
  }, [uid]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (notifId: string): Promise<void> => {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  };

  const markAllAsRead = async (): Promise<void> => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead };
}
