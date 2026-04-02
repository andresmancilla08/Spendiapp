import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { onAuthStateChanged } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { initI18n } from '../config/i18n';
import '../config/i18n';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';

export default function RootLayout() {
  const { user, isLoading, setUser, setLoading } = useAuthStore();
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

  useEffect(() => {
    if (!i18nReady || !fontsLoaded) return;
    if (isLoading) return;
    if (user) {
      router.replace('/(tabs)/');
    } else {
      router.replace('/(auth)/login');
    }
  }, [user, isLoading, i18nReady, fontsLoaded]);

  if (!i18nReady || !fontsLoaded) return null;

  return (
    <ThemeProvider>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ToastProvider>
    </ThemeProvider>
  );
}
