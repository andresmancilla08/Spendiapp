import {
  doc, getDoc, setDoc, updateDoc, query, collection, where, getDocs,
  serverTimestamp,
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
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const existing = await getDoc(userRef);

  if (existing.exists()) {
    const data = existing.data() as UserProfile;
    const needsUpdate = !data.fullName || ABBREVIATED_PATTERN.test(data.userName);

    if (needsUpdate) {
      const newUserName = await generateUniqueUserName(displayName);
      await updateDoc(userRef, { displayName, fullName: displayName, userName: newUserName, photoURL });
    }
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

/** Marca si el usuario ya vio la pantalla de novedades. */
export async function setWhatsNewSeen(uid: string, seen: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { whatsNewSeen: seen });
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
