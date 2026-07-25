import {
  doc, getDoc, setDoc, updateDoc, query, collection, where, getDocs, limit,
  serverTimestamp, deleteDoc, arrayUnion, addDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile, PublicProfile } from '../types/friend';
import { generateUserName } from '../utils/generateUserName';

/** Detecta userNames que son solo iniciales mayúsculas con sufijo numérico opcional
 *  (e.g. "AM", "AM2", "ADM3") — señal de que se generaron de un displayName abreviado. */
const ABBREVIATED_PATTERN = /^[A-Z]{1,3}\d*$/;

/**
 * Crea o actualiza el perfil en Firestore.
 * - Nuevo perfil: guarda displayName como fullName y genera userName a partir de él.
 * - Perfil existente sin fullName o con userName abreviado: actualiza fullName con el
 *   displayName actual (nombre completo de Google/registro) y regenera el userName.
 */
export async function createUserProfile(
  uid: string,
  displayName: string,
  photoURL: string | null,
  email?: string | null,
  forceUpdate?: boolean,
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const existing = await getDoc(userRef);

  if (existing.exists()) {
    const data = existing.data() as UserProfile;
    const needsUpdate = forceUpdate || !data.fullName || ABBREVIATED_PATTERN.test(data.userName);

    if (needsUpdate) {
      const newUserName = await generateUniqueUserName(displayName);
      await updateDoc(userRef, { displayName, fullName: displayName, userName: newUserName, photoURL });
      await syncPublicProfile(uid, { userName: newUserName, displayName, photoURL });
    } else {
      // Backfill/refresco del perfil público en cada login (sin trigger de Functions).
      await syncPublicProfile(uid, { userName: data.userName, displayName: data.displayName, photoURL: data.photoURL ?? null });
    }
    // Intentar vincular gastos externos pendientes (no crítico)
    if (email) claimExternalLinks(email, uid).catch(() => {});
    return;
  }

  const userName = await generateUniqueUserName(displayName);
  await setDoc(userRef, {
    uid,
    displayName,
    fullName: displayName,
    userName,
    photoURL,
    createdAt: serverTimestamp(),
    whatsNewSeen: false,
  });
  await syncPublicProfile(uid, { userName, displayName, photoURL });

  // Nuevo usuario: vincular gastos externos donde aparezca este email
  if (email) claimExternalLinks(email, uid).catch(() => {});
}

async function claimExternalLinks(email: string, uid: string): Promise<void> {
  const linkRef = doc(db, 'pendingExternalLinks', email);
  const snap = await getDoc(linkRef);
  if (!snap.exists()) return;

  const data = snap.data() as {
    email: string;
    links: Array<{ ownerUid: string; sharedId: string; displayName: string; description: string }>;
  };

  for (const link of data.links) {
    // Agregar UID real a participantUids del gasto compartido
    await updateDoc(doc(db, 'sharedTransactions', link.sharedId), {
      participantUids: arrayUnion(uid),
    });
    // Notificar al dueño del gasto
    await addDoc(collection(db, 'notifications'), {
      toUserId: link.ownerUid,
      type: 'external_participant_joined',
      data: {
        participantUid: uid,
        participantDisplayName: link.displayName,
        sharedId: link.sharedId,
        description: link.description,
      },
      read: false,
      createdAt: Timestamp.fromDate(new Date()),
    });
  }

  // Limpiar el pendingLink — ya fue reclamado
  await deleteDoc(linkRef);
}

async function generateUniqueUserName(name: string): Promise<string> {
  const base = generateUserName(name);
  if (!(await userNameExists(base))) return base;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}${i}`;
    if (!(await userNameExists(candidate))) return candidate;
  }
  return `${base}${Date.now()}`;
}

async function userNameExists(userName: string): Promise<boolean> {
  const q = query(collection(db, 'publicProfiles'), where('userName', '==', userName), limit(1));
  const snap = await getDocs(q);
  return !snap.empty;
}

/** Espeja los campos públicos del perfil en la colección `publicProfiles`,
 *  la única legible por otros usuarios. Se invoca en cada login (backfill). */
export async function syncPublicProfile(
  uid: string,
  p: { userName: string; displayName: string; photoURL: string | null },
): Promise<void> {
  await setDoc(doc(db, 'publicProfiles', uid), { uid, ...p }, { merge: true });
}

/** Obtiene el perfil PÚBLICO de otro usuario por UID (sin PII sensible). */
export async function getPublicProfile(uid: string): Promise<PublicProfile | null> {
  const snap = await getDoc(doc(db, 'publicProfiles', uid));
  if (!snap.exists()) return null;
  return snap.data() as PublicProfile;
}

/** Guarda la paleta de colores elegida por el usuario. */
export async function updateUserColorPalette(uid: string, paletteId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { colorPalette: paletteId });
}

/** Sincroniza las preferencias de personalización premium con la cuenta. */
export async function updateUserPersonalization(
  uid: string,
  prefs: NonNullable<UserProfile['personalization']>,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { personalization: prefs });
}

/** Marca si el usuario ya vio la pantalla de novedades. */
export async function setWhatsNewSeen(uid: string, version: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { whatsNewSeen: version });
}

/** Obtiene el perfil de un usuario por UID. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

/** Guarda la versión de la app instalada por el usuario. */
export async function updateAppVersion(uid: string, version: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { appVersion: version });
}

/** Cambia el displayName en `users` y lo espeja en `publicProfiles` (lo que ven
 *  los amigos). Sin el trigger server-side, este espejo debe hacerse aquí o el
 *  nombre nuevo no se propaga a los contactos hasta un relogin. */
export async function updateUserDisplayName(uid: string, displayName: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { displayName });
  const snap = await getDoc(doc(db, 'users', uid));
  const data = snap.data() as UserProfile | undefined;
  await syncPublicProfile(uid, {
    userName: data?.userName ?? '',
    displayName,
    photoURL: data?.photoURL ?? null,
  });
}

/** Busca un perfil PÚBLICO por userName exacto (case-sensitive). */
export async function searchUserByUserName(userName: string): Promise<PublicProfile | null> {
  const q = query(collection(db, 'publicProfiles'), where('userName', '==', userName), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as PublicProfile;
}
