import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth } from '../config/firebase';

if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

const IOS_CLIENT = '859030212165-v702d1qr3aat8qr6ug2m0o0f338rla7b.apps.googleusercontent.com';
// Este es el web client ID (tiene clientSecret en Firebase). No es un cliente Android nativo.
// Para Android nativo se necesita un cliente Android separado con SHA-1 del keystore.
const WEB_CLIENT = '859030212165-oaco2j799adi2r2fpbdo3u1q5qdj3s3n.apps.googleusercontent.com';

export function useGoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, nativePromptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: IOS_CLIENT,
    androidClientId: WEB_CLIENT,
    webClientId: WEB_CLIENT,
  });

  // Plataforma nativa (Expo iOS/Android): recibe id_token via expo-auth-session
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!response) return;

    if (response.type === 'success') {
      const { id_token } = response.params;

      if (!id_token) {
        // El flujo OAuth completó pero no devolvió id_token.
        // Causas posibles: cliente OAuth mal configurado, webClientId incorrecto,
        // o la respuesta llegó como 'code' en lugar de 'id_token'.
        console.warn('[GoogleSignIn] success pero sin id_token. params:', Object.keys(response.params));
        setError('Error al iniciar sesión con Google');
        setLoading(false);
        return;
      }

      setLoading(true);
      let credential;
      try {
        credential = GoogleAuthProvider.credential(id_token);
      } catch (e) {
        console.warn('[GoogleSignIn] credential() falló:', e);
        setError('Error al iniciar sesión con Google');
        setLoading(false);
        return;
      }

      signInWithCredential(auth, credential)
        .catch((e) => {
          console.warn('[GoogleSignIn] signInWithCredential falló:', e?.code, e?.message);
          setError('Error al iniciar sesión con Google');
        })
        .finally(() => setLoading(false));

    } else if (response.type === 'error') {
      console.warn('[GoogleSignIn] error en OAuth:', response.error);
      setError('Error al iniciar sesión con Google');
      setLoading(false);
    } else if (response.type === 'dismiss' || response.type === 'cancel') {
      setLoading(false);
    }
  }, [response]);

  const promptAsync = async () => {
    setError(null);
    if (Platform.OS !== 'web') {
      setLoading(true);
      nativePromptAsync();
      return;
    }

    setLoading(true);
    const provider = new GoogleAuthProvider();

    // signInWithPopup: Firebase SDK v12 usa localStorage events (no window.opener),
    // por lo que COOP de Google no lo bloquea. Funciona en Chrome PWA sin Custom Tab.
    // Fallback a signInWithRedirect solo si el popup fue bloqueado por el browser.
    try {
      await signInWithPopup(auth, provider);
      // Loading se mantiene true hasta que onAuthStateChanged → routing → componente se desmonta.
      // No llamar setLoading(false) aquí para no mostrar el botón vacío durante el gap.
    } catch (e: any) {
      const code = e?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setLoading(false);
        return;
      }
      if (code === 'auth/popup-blocked') {
        // Popup bloqueado por el browser — fallback a redirect
        try {
          await signInWithRedirect(auth, provider);
          setLoading(false);
        } catch (e2: any) {
          console.warn('[GoogleSignIn] signInWithRedirect falló:', e2?.code, e2?.message);
          setError('Error al iniciar sesión con Google');
          setLoading(false);
        }
        return;
      }
      console.warn('[GoogleSignIn] signInWithPopup falló:', code, e?.message);
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
