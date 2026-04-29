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

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

function toAuthUser(user: User): AuthUser {
  return { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL };
}

export async function registerWithEmailAndPin(
  name: string,
  email: string,
  pin: string
): Promise<void> {
  const { user } = await createUserWithEmailAndPassword(auth, email, pin + '00');
  await updateProfile(user, { displayName: name });
}

export async function loginWithEmailAndPin(email: string, pin: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, pin + '00');
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
  const credential = EmailAuthProvider.credential(user.email, currentPin + '00');
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPin + '00');
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

