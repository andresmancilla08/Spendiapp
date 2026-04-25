import {
  doc, getDoc, setDoc, updateDoc, query, collection, where, getDocs,
  serverTimestamp, deleteDoc, arrayUnion, addDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile } from '../types/friend';
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
  const q = query(collection(db, 'users'), where('userName', '==', userName));
  const snap = await getDocs(q);
  return !snap.empty;
}

/** Guarda la paleta de colores elegida por el usuario. */
export async function updateUserColorPalette(uid: string, paletteId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { colorPalette: paletteId });
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

/** Busca un perfil por userName exacto (case-sensitive). */
export async function searchUserByUserName(userName: string): Promise<UserProfile | null> {
  const q = query(collection(db, 'users'), where('userName', '==', userName));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as UserProfile;
}
