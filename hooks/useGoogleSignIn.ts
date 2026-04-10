import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import i18next from 'i18next';
import { auth } from '../config/firebase';

if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

const IOS_CLIENT = '859030212165-v702d1qr3aat8qr6ug2m0o0f338rla7b.apps.googleusercontent.com';
const ANDROID_CLIENT = '859030212165-oaco2j799adi2r2fpbdo3u1q5qdj3s3n.apps.googleusercontent.com';

// Códigos que NO son errores reales (usuario canceló o cerró el popup)
const USER_CANCELLED_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

export function useGoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, nativePromptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: IOS_CLIENT,
    androidClientId: ANDROID_CLIENT,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  // Plataforma nativa (Expo iOS/Android): recibe id_token via expo-auth-session
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (response?.type === 'success') {
      const { id_token } = response.params;
      setLoading(true);
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .catch(() => setError('Error al iniciar sesión con Google'))
        .finally(() => setLoading(false));
    } else if (response?.type === 'error') {
      setError('Error al iniciar sesión con Google');
    }
  }, [response]);

  const promptAsync = async () => {
    if (Platform.OS !== 'web') {
      nativePromptAsync();
      return;
    }

    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();

    try {
      // signInWithPopup funciona en todos los contextos web cuando es disparado
      // directamente por un gesto del usuario (click). Es la estrategia más
      // confiable para PWA iOS/Android/Desktop.
      await signInWithPopup(auth, provider);
      // onAuthStateChanged en _layout.tsx detecta el usuario y enruta a /(tabs)/
    } catch (err: any) {
      const code: string = err?.code ?? '';

      if (USER_CANCELLED_CODES.has(code)) {
        // El usuario cerró el popup — no es un error
        setLoading(false);
        return;
      }

      if (code === 'auth/popup-blocked') {
        // iOS Safari PWA bloquea popups y signInWithRedirect falla por sessionStorage
        // particionado — no hay fallback confiable. Indicar al usuario que use email/PIN.
        setError(i18next.t('login.errors.popupBlocked'));
        setLoading(false);
        return;
      }

      setError('Error al iniciar sesión con Google');
      setLoading(false);
    }
  };

  return {
    promptAsync,
    request: Platform.OS === 'web' ? true : request,
    loading: Platform.OS === 'web' ? loading : (loading || !request),
    error,
  };
}
