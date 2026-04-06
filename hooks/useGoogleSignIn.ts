import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Devuelve true cuando se debe usar signInWithRedirect en lugar de signInWithPopup.
 *
 * - Cualquier mobile (iOS o Android), browser o PWA: redirect.
 *   Android Chrome bloquea popups en mobile; iOS Safari tampoco los soporta bien.
 * - Desktop (Chrome, Firefox, Safari): popup (mejor UX, no abandona la página).
 */
function shouldUseRedirect(): boolean {
  if (typeof window === 'undefined') return false;
  // PWA standalone (iOS o Android)
  if ((window.navigator as any).standalone === true) return true;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // Cualquier mobile browser
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
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
        if (shouldUseRedirect()) {
          // Mobile (cualquier browser o PWA): redirect — popup falla en Chrome mobile
          // y en iOS standalone por window.opener=null
          await signInWithRedirect(auth, new GoogleAuthProvider());
        } else {
          // Desktop browser: popup (mejor UX)
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
