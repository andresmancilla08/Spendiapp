import {
  doc, getDoc, setDoc, updateDoc, query, collection, where, getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile } from '../types/friend';
import { generateUserName } from '../utils/generateUserName';

/** Detecta userNames que son solo iniciales mayúsculas (e.g. "AM", "A", "ADM")
 *  — señal de que se generaron a partir de un displayName abreviado. */
const ABBREVIATED_PATTERN = /^[A-Z]{1,3}$/;

/** Crea el perfil en Firestore si no existe.
 *  Si el perfil ya existe pero el userName fue generado de un nombre abreviado, lo repara. */
export async function createUserProfile(
  uid: string,
  displayName: string,
  photoURL: string | null,
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const existing = await getDoc(userRef);

  if (existing.exists()) {
    const data = existing.data() as UserProfile;
    if (ABBREVIATED_PATTERN.test(data.userName)) {
      // userName es solo iniciales — regenerar con el displayName actual
      const newUserName = await generateUniqueUserName(displayName);
      await updateDoc(userRef, { displayName, userName: newUserName, photoURL });
    }
    return;
  }

  const userName = await generateUniqueUserName(displayName);
  await setDoc(userRef, {
    uid,
    displayName,
    userName,
    photoURL,
    createdAt: serverTimestamp(),
  });
}

async function generateUniqueUserName(displayName: string): Promise<string> {
  const base = generateUserName(displayName);
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
