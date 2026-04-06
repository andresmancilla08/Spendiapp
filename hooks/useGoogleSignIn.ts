import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Devuelve true cuando la app corre como PWA instalada (standalone).
 * En ese modo window.opener es null tanto en iOS Safari como en Android Chrome,
 * por lo que signInWithPopup falla — se usa signInWithRedirect en su lugar.
 *
 * iOS: navigator.standalone === true
 * Android/Chrome: matchMedia('display-mode: standalone')
 */
function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  if ((window.navigator as any).standalone === true) return true;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  return false;
}

if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

const IOS_CLIENT = '859030212165-v702d1qr3aat8qr6ug2m0o0f338rla7b.apps.googleusercontent.com';
const ANDROID_CLIENT = '859030212165-oaco2j799adi2r2fpbdo3u1q5qdj3s3n.apps.googleusercontent.com';

export function useGoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, nativePromptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: IOS_CLIENT,
    androidClientId: ANDROID_CLIENT,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (response?.type === 'success') {
      const { id_token } = response.params;
      setLoading(true);
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .catch(() => setError('Error al iniciar sesión con Google'))
        .finally(() => setLoading(false));
    }
  }, [response]);

  const promptAsync = async () => {
    if (Platform.OS === 'web') {
      setLoading(true);
      try {
        if (isStandaloneMode()) {
          // PWA instalada (iOS o Android): redirect — popup falla porque
          // window.opener es null en standalone (Chrome Custom Tab / Safari window)
          await signInWithRedirect(auth, new GoogleAuthProvider());
        } else {
          // Browser normal (simulador, Safari, Chrome desktop/mobile): popup funciona
          await signInWithPopup(auth, new GoogleAuthProvider());
        }
      } catch {
        setError('Error al iniciar sesión con Google');
        setLoading(false);
      }
      return;
    }
    nativePromptAsync();
  };

  return {
    promptAsync,
    request: Platform.OS === 'web' ? true : request,
    loading: Platform.OS === 'web' ? loading : (loading || !request),
    error,
  };
}
