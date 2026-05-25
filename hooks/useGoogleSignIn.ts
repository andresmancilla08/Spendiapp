import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
} from 'firebase/auth';
import { auth } from '../config/firebase';

// Required for expo-auth-session to close the browser after redirect on native
WebBrowser.maybeCompleteAuthSession();

const IOS_CLIENT_ID =
  '859030212165-v702d1qr3aat8qr6ug2m0o0f338rla7b.apps.googleusercontent.com';
const WEB_CLIENT_ID =
  '859030212165-oaco2j799adi2r2fpbdo3u1q5qdj3s3n.apps.googleusercontent.com';

// Key used to preserve loading state across the page navigation caused by signInWithRedirect
const REDIRECT_PENDING_KEY = 'spendia_google_redirect_pending';

// All browsers on iOS (Safari, Chrome, Firefox) use WebKit and block
// window.opener.postMessage, which breaks signInWithPopup's result callback.
function isIOSBrowser(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent)
  );
}

export { REDIRECT_PENDING_KEY };

export function useGoogleSignIn() {
  const [loading, setLoading] = useState<boolean>(() => {
    // Restore loading=true when returning from a Google redirect
    if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
      return !!sessionStorage.getItem(REDIRECT_PENDING_KEY);
    }
    return false;
  });
  const [error, setError] = useState<string | null>(null);

  // expo-auth-session Google request — used only on native.
  // Hooks must be called unconditionally; we gate execution in promptAsync.
  const [, response, nativePromptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: IOS_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
  });

  // Process the pending redirect result when returning from iOS Google auth.
  // This runs only when the flag is present, so it never conflicts with
  // the getRedirectResult call in _layout.tsx (which skips when flag is set).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof sessionStorage === 'undefined') return;
    if (!sessionStorage.getItem(REDIRECT_PENDING_KEY)) return;

    getRedirectResult(auth)
      .then((result) => {
        sessionStorage.removeItem(REDIRECT_PENDING_KEY);
        if (!result) {
          // Redirect result already consumed or user cancelled Google auth
          setLoading(false);
        }
        // If result → Firebase fires onAuthStateChanged(user) → _layout.tsx routes to /(tabs)/
        // loading stays true until this component unmounts
      })
      .catch((e) => {
        sessionStorage.removeItem(REDIRECT_PENDING_KEY);
        if (e?.code !== 'auth/no-auth-event') {
          console.warn('[GoogleSignIn] getRedirectResult failed:', e?.code, e?.message);
          setError('Error al iniciar sesión con Google');
        }
        setLoading(false);
      });
  }, []);

  // Handle native OAuth response (expo-auth-session)
  useEffect(() => {
    if (Platform.OS === 'web' || !response) return;

    if (response.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        const credential = GoogleAuthProvider.credential(id_token);
        signInWithCredential(auth, credential).catch((e) => {
          console.warn('[GoogleSignIn] signInWithCredential failed:', e?.code, e?.message);
          setError('Error al iniciar sesión con Google');
          setLoading(false);
        });
        // loading stays true until onAuthStateChanged triggers routing
      } else {
        setError('Error al iniciar sesión con Google');
        setLoading(false);
      }
    } else if (response.type === 'error') {
      console.warn('[GoogleSignIn] native auth error:', response.error);
      setError('Error al iniciar sesión con Google');
      setLoading(false);
    } else if (response.type === 'cancel' || response.type === 'dismiss') {
      setLoading(false);
    }
  }, [response]);

  const promptAsync = () => {
    setError(null);
    setLoading(true);

    // Native: expo-auth-session opens SFSafariViewController (iOS) /
    // Chrome Custom Tab (Android). Result handled by the useEffect above.
    if (Platform.OS !== 'web') {
      nativePromptAsync();
      return;
    }

    const provider = new GoogleAuthProvider();

    // iOS browsers (Safari, Chrome, Firefox on iOS) all use WebKit and block
    // window.opener.postMessage — signInWithPopup's result callback never arrives.
    // Use redirect flow instead: page navigates to Google, returns to app,
    // and getRedirectResult() above (in useEffect) picks up the auth result.
    // authDomain=spendia.co (same origin as app) avoids ITP cross-origin iframe issues.
    if (isIOSBrowser()) {
      sessionStorage.setItem(REDIRECT_PENDING_KEY, '1'); // Persist loading across page reload
      signInWithRedirect(auth, provider).catch((e) => {
        sessionStorage.removeItem(REDIRECT_PENDING_KEY);
        console.warn('[GoogleSignIn] signInWithRedirect failed:', e?.code, e?.message);
        setError('Error al iniciar sesión con Google');
        setLoading(false);
      });
      // Page navigates away — loading state persists via sessionStorage on return
      return;
    }

    // Non-iOS web (Android Chrome, desktop): pre-opened popup trick.
    // iOS Safari blocks popups opened from async code (after any await).
    // Fix: open the popup synchronously here (still in the gesture call stack),
    // then monkey-patch window.open so Firebase receives the already-approved window.
    (async () => {
      let preOpened: Window | null = null;
      const origOpen = window.open;

      try {
        preOpened = window.open('', '_blank', 'width=500,height=600');
      } catch (_) {}

      if (preOpened) {
        (window as any).open = function (url: any): Window | null {
          window.open = origOpen;
          const win = preOpened;
          preOpened = null;
          if (win && !win.closed && url) win.location.replace(String(url));
          return win;
        };
      }

      const cleanup = () => {
        window.open = origOpen;
        if (preOpened && !preOpened.closed) preOpened.close();
        preOpened = null;
      };

      try {
        await signInWithPopup(auth, provider);
        // loading stays true until onAuthStateChanged triggers routing
      } catch (e: any) {
        cleanup();
        const code = e?.code;
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          setLoading(false);
          return;
        }
        if (code === 'auth/popup-blocked') {
          try {
            await signInWithRedirect(auth, provider);
            // Browser navigates away; result handled by getRedirectResult in _layout.tsx
          } catch (e2: any) {
            console.warn('[GoogleSignIn] signInWithRedirect failed:', e2?.code, e2?.message);
            setError('Error al iniciar sesión con Google');
            setLoading(false);
          }
          return;
        }
        console.warn('[GoogleSignIn] signInWithPopup failed:', code, e?.message);
        setError('Error al iniciar sesión con Google');
        setLoading(false);
      }
    })();
  };

  return { promptAsync, loading, error };
}
