import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../config/firebase';
import { markPinV2 } from './useUserProfile';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

function toAuthUser(user: User): AuthUser {
  return { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL };
}

// El PIN ES la contraseña de Firebase. Cuando era de 4 dígitos había que
// rellenarlo con '00' para llegar al mínimo de 6 que exige Firebase; con 6
// dígitos ese apaño sobra. Todas las cuentas anteriores se reescriben en la
// migración a 6 dígitos (scripts/migrate-pin-v2.js), así que no queda ninguna
// contraseña con el sufijo viejo.
export async function registerWithEmailAndPin(
  name: string,
  email: string,
  pin: string
): Promise<void> {
  const { user } = await createUserWithEmailAndPassword(auth, email, pin);
  await updateProfile(user, { displayName: name });
}

export async function loginWithEmailAndPin(email: string, pin: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, pin);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function updateDisplayName(name: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('No hay sesión activa');
  await updateProfile(user, { displayName: name });
}

export async function changePin(currentPin: string, newPin: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('No hay sesión activa');
  const credential = EmailAuthProvider.credential(user.email, currentPin);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPin);
}

/**
 * Sustituye el PIN por defecto de la migración por uno propio y marca la cuenta
 * como migrada. No pide el PIN actual: el usuario acaba de entrar con él y el
 * gate no le deja hacer otra cosa.
 *
 * `pinV2` es la única señal de que el PIN es suyo; sin ella el gate le vuelve a
 * pedir uno en el siguiente arranque. Por eso se escribe DESPUÉS de que la
 * contraseña haya cambiado de verdad.
 */
export async function setOwnPin(newPin: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('No hay sesión activa');
  await updatePassword(user, newPin);
  await markPinV2(user.uid);
}

export async function sendPinResetEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function sendOtpEmail(email: string): Promise<void> {
  const fn = httpsCallable(functions, 'sendPinResetOtp');
  await fn({ email });
}

export async function verifyOtp(email: string, otp: string): Promise<void> {
  const fn = httpsCallable(functions, 'verifyPinResetOtp');
  await fn({ email, otp });
}

export async function resetPinWithOtp(email: string, otp: string, newPin: string): Promise<void> {
  const fn = httpsCallable(functions, 'resetPinWithOtp');
  await fn({ email, otp, newPin });
}

export function onAuthStateChanged(callback: (user: AuthUser | null) => void) {
  return firebaseOnAuthStateChanged(auth, (user) => {
    callback(user ? toAuthUser(user) : null);
  });
}

