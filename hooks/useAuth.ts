import { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithCredential,
  fetchSignInMethodsForEmail,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User,
} from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { auth } from '../config/firebase';

WebBrowser.maybeCompleteAuthSession();

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

// Returns 'google', 'pin', or 'none'
export async function getEmailProvider(email: string): Promise<'google' | 'pin' | 'none'> {
  const methods = await fetchSignInMethodsForEmail(auth, email);
  if (methods.includes('google.com')) return 'google';
  if (methods.includes('password')) return 'pin';
  return 'none';
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

export function onAuthStateChanged(callback: (user: AuthUser | null) => void) {
  return firebaseOnAuthStateChanged(auth, (user) => {
    callback(user ? toAuthUser(user) : null);
  });
}

export function useGoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: '859030212165-v702d1qr3aat8qr6ug2m0o0f338rla7b.apps.googleusercontent.com',
    androidClientId: '859030212165-oaco2j799adi2r2fpbdo3u1q5qdj3s3n.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      setLoading(true);
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .catch(() => setError('Error al iniciar sesión con Google'))
        .finally(() => setLoading(false));
    }
  }, [response]);

  return {
    promptAsync,
    request,
    loading: loading || !request,
    error,
  };
}
