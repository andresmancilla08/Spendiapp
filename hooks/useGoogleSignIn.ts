import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Devuelve true solo cuando estamos en iOS Safari en modo STANDALONE (PWA instalada).
 * En ese modo específico window.opener es null, por lo que signInWithPopup falla.
 * En Safari regular (simulador, browser normal) se usa signInWithPopup sin problema.
 */
function isIOSStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const isIOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent);
  const isStandalone = (window.navigator as any).standalone === true;
  return isIOS && isStandalone;
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
        if (isIOSStandalone()) {
          // iOS PWA instalada: redirect porque window.opener es null en standalone
          await signInWithRedirect(auth, new GoogleAuthProvider());
        } else {
          // Safari normal (simulador, browser), Android Chrome, Desktop: popup funciona
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
