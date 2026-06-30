import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  const q1Done = useRef(false);
  const q2Done = useRef(false);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  const resolveLoading = useCallback(() => {
    if (q1Done.current && q2Done.current) setLoading(false);
  }, []);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }

    q1Done.current = false;
    q2Done.current = false;
    setLoading(true);

    // ponytail: red de seguridad — los listeners onSnapshot de Firestore no
    // disparan error al no poder conectar, se quedan esperando para siempre.
    // Si en 8s ningún listener respondió, dejamos de mostrar el spinner; los
    // datos reales llegan luego cuando el listener resuelva.
    const safety = setTimeout(() => setLoading(false), 8000);

    const merge = () => {
      setFriendships(Object.values({ ...fromRef.current, ...toRef.current }));
    };

    const q1 = query(collection(db, 'friendships'), where('fromId', '==', uid));
    const q2 = query(collection(db, 'friendships'), where('toId', '==', uid));

    const unsub1 = onSnapshot(q1,
      (snap) => {
        fromRef.current = {};
        snap.docs.forEach((d) => {
          fromRef.current[d.id] = { id: d.id, ...d.data() } as Friendship;
        });
        merge();
        q1Done.current = true;
        resolveLoading();
      },
      (error) => {
        console.error('[useFriends] outgoing query error:', error.code, error.message);
        q1Done.current = true;
        resolveLoading();
      },
    );

    const unsub2 = onSnapshot(q2,
      (snap) => {
        toRef.current = {};
        snap.docs.forEach((d) => {
          toRef.current[d.id] = { id: d.id, ...d.data() } as Friendship;
        });
        merge();
        q2Done.current = true;
        resolveLoading();
      },
      (error) => {
        console.error('[useFriends] incoming query error:', error.code, error.message);
        q2Done.current = true;
        resolveLoading();
      },
    );

    return () => {
      clearTimeout(safety);
      unsub1();
      unsub2();
    };
  }, [uid, resolveLoading]);

  // useMemo estabiliza la referencia de los arrays derivados: sin esto se crea
  // un array nuevo en cada render, y los consumidores que lo usan en deps de
  // useEffect entran en bucle infinito (lista → loading → lista → loading...).
  const acceptedFriends = useMemo(
    () => friendships.filter((f) => f.status === 'accepted'),
    [friendships],
  );
  const incomingRequests = useMemo(
    () => friendships.filter((f) => f.status === 'pending' && f.toId === uid),
    [friendships, uid],
  );
  const outgoingRequests = useMemo(
    () => friendships.filter((f) => f.status === 'pending' && f.fromId === uid),
    [friendships, uid],
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
