import { useEffect, useRef, useState } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Friendship } from '../types/friend';

/** Escucha en tiempo real todas las friendships del usuario (from o to). */
export function useFriends(uid: string) {
  const fromRef = useRef<Record<string, Friendship>>({});
  const toRef = useRef<Record<string, Friendship>>({});
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const merge = () => {
      setFriendships(Object.values({ ...fromRef.current, ...toRef.current }));
    };

    const q1 = query(collection(db, 'friendships'), where('fromId', '==', uid));
    const q2 = query(collection(db, 'friendships'), where('toId', '==', uid));

    const unsub1 = onSnapshot(q1, (snap) => {
      fromRef.current = {};
      snap.docs.forEach((d) => {
        fromRef.current[d.id] = { id: d.id, ...d.data() } as Friendship;
      });
      merge();
      setLoading(false);
    });

    const unsub2 = onSnapshot(q2,
      (snap) => {
        toRef.current = {};
        snap.docs.forEach((d) => {
          toRef.current[d.id] = { id: d.id, ...d.data() } as Friendship;
        });
        merge();
        setLoading(false);
      },
      (error) => {
        console.error('[useFriends] incoming query error:', error.code, error.message);
        setLoading(false);
      },
    );

    return () => {
      unsub1();
      unsub2();
    };
  }, [uid]);

  const acceptedFriends = friendships.filter((f) => f.status === 'accepted');
  const incomingRequests = friendships.filter(
    (f) => f.status === 'pending' && f.toId === uid,
  );
  const outgoingRequests = friendships.filter(
    (f) => f.status === 'pending' && f.fromId === uid,
  );

  return { acceptedFriends, incomingRequests, outgoingRequests, loading };
}

/** Envía una solicitud de amistad y crea la notificación para el destinatario. */
export async function sendFriendRequest(
  fromId: string,
  toId: string,
  fromProfile: { userName: string; displayName: string },
): Promise<void> {
  const ref = await addDoc(collection(db, 'friendships'), {
    fromId,
    toId,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'notifications'), {
    toUserId: toId,
    type: 'friend_request',
    data: {
      fromUserId: fromId,
      fromUserName: fromProfile.userName,
      fromDisplayName: fromProfile.displayName,
      friendshipId: ref.id,
    },
    read: false,
    createdAt: serverTimestamp(),
  });
}

/** Acepta una solicitud: actualiza status y notifica al remitente. */
export async function acceptFriendRequest(
  friendshipId: string,
  acceptorId: string,
  acceptorProfile: { userName: string; displayName: string },
  requestorId: string,
): Promise<void> {
  await updateDoc(doc(db, 'friendships', friendshipId), {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'notifications'), {
    toUserId: requestorId,
    type: 'friend_accepted',
    data: {
      fromUserId: acceptorId,
      fromUserName: acceptorProfile.userName,
      fromDisplayName: acceptorProfile.displayName,
      friendshipId,
    },
    read: false,
    createdAt: serverTimestamp(),
  });
}

/** Rechaza la solicitud (status → rejected). */
export async function rejectFriendRequest(friendshipId: string): Promise<void> {
  await updateDoc(doc(db, 'friendships', friendshipId), {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  });
}

/** Cancela una solicitud saliente (elimina el doc). */
export async function cancelFriendRequest(friendshipId: string): Promise<void> {
  await deleteDoc(doc(db, 'friendships', friendshipId));
}

/** Elimina una amistad aceptada. */
export async function removeFriend(friendshipId: string): Promise<void> {
  await deleteDoc(doc(db, 'friendships', friendshipId));
}
