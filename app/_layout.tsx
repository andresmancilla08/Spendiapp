import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { onAuthStateChanged, signOut } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { getRedirectResult } from 'firebase/auth';
import { auth } from '../config/firebase';
import { initI18n } from '../config/i18n';
import '../config/i18n';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import { isBiometricsAppEnrolled } from '../hooks/useBiometrics';
import { Text } from 'react-native';
import { Fonts } from '../config/fonts';
import { useInactivityTimer } from '../hooks/useInactivityTimer';
import AppDialog from '../components/AppDialog';
import { useTranslation } from 'react-i18next';
import { createUserProfile } from '../hooks/useUserProfile';

export default function RootLayout() {
  const { user, isLoading, justRegistered, biometricLocked, setUser, setLoading, setBiometricLocked } = useAuthStore();
  const [i18nReady, setI18nReady] = useState(false);
  const { t } = useTranslation();
  const [inactivityDialogVisible, setInactivityDialogVisible] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((authUser) => {
      if (authUser) {
        // Crear perfil Firestore si no existe (idempotente)
        createUserProfile(
          authUser.uid,
          authUser.displayName ?? authUser.email ?? 'Usuario',
          authUser.photoURL,
        ).catch(() => {
          // Fallo silencioso — el perfil se creará en el siguiente login
        });
      }
      setUser(authUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Procesar resultado de signInWithRedirect si el popup fue bloqueado y
  // se usó redirect como fallback. onAuthStateChanged se dispara automáticamente
  // cuando getRedirectResult completa con éxito.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    getRedirectResult(auth).catch((err) => {
      // Solo ignorar si no hay resultado pendiente (caso normal al cargar la app)
      if (err?.code !== 'auth/no-auth-event') {
        console.warn('[Auth] getRedirectResult error:', err?.code, err?.message);
      }
    });
  }, []);


  useEffect(() => {
    if (!i18nReady || !fontsLoaded) return;
    if (isLoading) return;
    if (justRegistered) return;

    if (user) {
      if (biometricLocked && Platform.OS !== 'web') {
        let cancelled = false;
        isBiometricsAppEnrolled()
          .then((enrolled) => {
            if (cancelled) return;
            if (enrolled) {
              router.replace('/(auth)/biometric-lock');
            } else {
              setBiometricLocked(false);
              router.replace('/(tabs)/');
            }
          })
          .catch(() => {
            if (!cancelled) {
              // Si SecureStore falla, tratar como no enrollado
              setBiometricLocked(false);
              router.replace('/(tabs)/');
            }
          });
        return () => { cancelled = true; };
      } else {
        router.replace('/(tabs)/');
      }
    } else {
      setBiometricLocked(true); // Reset para la próxima sesión
      router.replace('/(auth)/login');
    }
  }, [user, isLoading, i18nReady, fontsLoaded, justRegistered, biometricLocked]);

  const { reset: resetInactivityTimer } = useInactivityTimer({
    timeoutMs: 180_000,
    onInactive: () => {
      setCountdown(30);
      setInactivityDialogVisible(true);
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!inactivityDialogVisible) {
      if (countdownRef.current !== null) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          signOut();
          setInactivityDialogVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current !== null) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [inactivityDialogVisible]);

  const handleStay = () => {
    setInactivityDialogVisible(false);
    resetInactivityTimer();
  };

  const handleLogout = () => {
    setInactivityDialogVisible(false);
    signOut();
  };

  if (!i18nReady || !fontsLoaded) return null;

  return (
    <ThemeProvider>
      <ToastProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 280,
          }}
        />
        <AppDialog
          visible={inactivityDialogVisible}
          type="warning"
          title={t('dialogs.inactivity.title')}
          description={
            <Text style={{ fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, textAlign: 'center', alignSelf: 'stretch' }}>
              {t('dialogs.inactivity.descBefore')}{' '}
              <Text style={{ fontFamily: Fonts.bold }}>{countdown}</Text>{' '}
              {t('dialogs.inactivity.descAfter')}
            </Text>
          }
          primaryLabel={t('dialogs.inactivity.stayButton')}
          secondaryLabel={t('dialogs.inactivity.logoutButton')}
          onPrimary={handleStay}
          onSecondary={handleLogout}
          loading={false}
        />
      </ToastProvider>
    </ThemeProvider>
  );
}
