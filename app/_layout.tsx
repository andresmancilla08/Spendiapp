import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { onAuthStateChanged } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { getRedirectResult } from 'firebase/auth';
import { auth } from '../config/firebase';
import { initI18n } from '../config/i18n';
import '../config/i18n';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import { isBiometricsAppEnrolled } from '../hooks/useBiometrics';

export default function RootLayout() {
  const { user, isLoading, justRegistered, biometricLocked, setUser, setLoading, setBiometricLocked } = useAuthStore();
  const [i18nReady, setI18nReady] = useState(false);

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
      setUser(authUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Procesar resultado de signInWithRedirect (Android Chrome PWA)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    getRedirectResult(auth).catch(() => {});
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
      </ToastProvider>
    </ThemeProvider>
  );
}
