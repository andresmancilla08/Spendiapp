import { useEffect, useRef, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { onAuthStateChanged, signOut } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { getRedirectResult } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { initI18n } from '../config/i18n';
import '../config/i18n';
import { ThemeProvider, useTheme, PaletteId } from '../context/ThemeContext';
import { PALETTE_MAP } from '../config/palettes';
import { ToastProvider } from '../context/ToastContext';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import { isBiometricsAppEnrolled } from '../hooks/useBiometrics';
import { Text } from 'react-native';
import { Fonts } from '../config/fonts';
import { useInactivityTimer } from '../hooks/useInactivityTimer';
import AppDialog from '../components/AppDialog';
import WebAppShell from '../components/WebAppShell';
import AnimatedSplash from '../components/AnimatedSplash';
import { useTranslation } from 'react-i18next';
import { savePendingConsent } from '../hooks/useConsentLogger';
import { createUserProfile, getUserProfile, updateAppVersion } from '../hooks/useUserProfile';
import Constants from 'expo-constants';
import { FeatureFlagsProvider, useFlags } from '../context/FeatureFlagsContext';

function PaletteLoader() {
  const { user } = useAuthStore();
  const { setPaletteId } = useTheme();

  useEffect(() => {
    if (!user?.uid) return;
    getUserProfile(user.uid)
      .then((profile) => {
        if (profile?.colorPalette && PALETTE_MAP[profile.colorPalette as PaletteId]) {
          setPaletteId(profile.colorPalette as PaletteId);
        }
      })
      .catch(() => {});
  }, [user?.uid]);

  return null;
}

function ThemedSplash({ onComplete }: { onComplete: () => void }) {
  const { colors, isDark } = useTheme();
  return (
    <AnimatedSplash
      onComplete={onComplete}
      backgroundColor={colors.background}
      isDark={isDark}
    />
  );
}

function NavReadyOverlay() {
  const { colors } = useTheme();
  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background, zIndex: 9998 }]} />
  );
}

function ThemedStack() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}

function InactivityDialog({
  visible,
  countdown,
  onStay,
  onLogout,
}: {
  visible: boolean;
  countdown: number;
  onStay: () => void;
  onLogout: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <AppDialog
      visible={visible}
      type="warning"
      title={t('dialogs.inactivity.title')}
      description={
        <Text style={{ fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, textAlign: 'center', alignSelf: 'stretch', color: colors.textPrimary }}>
          {t('dialogs.inactivity.descBefore')}{' '}
          <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{countdown}</Text>{' '}
          {t('dialogs.inactivity.descAfter')}
        </Text>
      }
      primaryLabel={t('dialogs.inactivity.stayButton')}
      secondaryLabel={t('dialogs.inactivity.logoutButton')}
      onPrimary={onStay}
      onSecondary={onLogout}
      loading={false}
    />
  );
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}

const PUBLIC_ROUTES = new Set(['/privacy', '/terms']);

function AppGuard({ i18nReady, fontsLoaded, onFirstNav }: { i18nReady: boolean; fontsLoaded: boolean; onFirstNav: () => void }) {
  const { flags, flagsLoading } = useFlags();
  const pathname = usePathname();
  const { user, isLoading, justRegistered, biometricLocked, setBiometricLocked, setIsPremium } = useAuthStore();
  const [isBlockedChecked, setIsBlockedChecked] = useState(false);
  const [userIsBlocked, setUserIsBlocked] = useState(false);
  const [versionChecked, setVersionChecked] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const knownSessionVersion = useRef<number | null>(null);
  const lastNav = useRef<string | null>(null);
  const prevIsPremiumRef = useRef<boolean | null>(null);

  // Reset lastNav when user identity changes so new-session routing always fires
  useEffect(() => { lastNav.current = null; }, [user?.uid]);

  // Versión mínima — onSnapshot para detectar cambios remotos
  useEffect(() => {
    const ref = doc(db, 'config', 'appConfig');
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) { setVersionChecked(true); return; }
      const data = snap.data() as { minimumVersion?: string };
      const minVersion = data.minimumVersion;
      const currentVersion = Constants.expoConfig?.version;
      if (minVersion && currentVersion) {
        setNeedsUpdate(compareVersions(currentVersion, minVersion) < 0);
      }
      setVersionChecked(true);
    }, () => setVersionChecked(true));
    return unsub;
  }, []);

  // isBlocked + isPremium — onSnapshot en tiempo real: admin cambia → app reacciona instantáneamente
  useEffect(() => {
    if (!user?.uid) {
      setUserIsBlocked(false);
      setIsBlockedChecked(true);
      setIsPremium(false);
      prevIsPremiumRef.current = null;
      return;
    }
    setIsBlockedChecked(false);
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          if (useAuthStore.getState().justRegistered) return;
          // Extra guard: cuenta creada hace menos de 2 min — doc Firestore puede no haberse escrito aún
          const cu = auth.currentUser;
          if (cu?.metadata?.creationTime) {
            if (Date.now() - new Date(cu.metadata.creationTime).getTime() < 120_000) return;
          }
          signOut();
          router.replace('/(auth)/login' as Parameters<typeof router.replace>[0]);
          return;
        }
        const data = snap.data();
        const now = new Date();
        const blockedByFlag = !!data.isBlocked;
        const blockedByTime =
          data.blockedUntil != null &&
          typeof data.blockedUntil.toDate === 'function' &&
          data.blockedUntil.toDate() > now;
        setUserIsBlocked(blockedByFlag || blockedByTime);
        setIsBlockedChecked(true);
        // Premium: activo si isPremium === true y (sin expiración o expiración futura)
        const premiumActive = !!data.isPremium && (
          !data.premiumExpiry ||
          (typeof data.premiumExpiry.toDate === 'function' && data.premiumExpiry.toDate() > now)
        );
        const prevWasPremium = prevIsPremiumRef.current;
        prevIsPremiumRef.current = premiumActive;
        setIsPremium(premiumActive);
        // Trigger welcome screen only on free→premium transition (not on first load already premium)
        if (prevWasPremium === false && premiumActive && !data.premiumWelcomeSeen) {
          router.push('/premium-welcome' as Parameters<typeof router.push>[0]);
        }
      },
      () => {
        setUserIsBlocked(false);
        setIsBlockedChecked(true);
        setIsPremium(false);
      }
    );
    return unsub;
  }, [user?.uid]);

  // sessionVersion — force logout global: admin incrementa → todos los usuarios pierden sesión
  // Si el doc no existe aún, tratamos sessionVersion como 0 para detectar la primera creación
  useEffect(() => {
    const ref = doc(db, 'config', 'security');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const sv: number = snap.exists() ? (snap.data()?.sessionVersion ?? 0) : 0;
        if (knownSessionVersion.current === null) {
          knownSessionVersion.current = sv;
        } else if (sv !== knownSessionVersion.current) {
          knownSessionVersion.current = sv;
          signOut();
          router.replace('/(auth)/login' as Parameters<typeof router.replace>[0]);
        }
      },
      () => { /* permission-denied antes de que se restaure el auth state — ignorar silenciosamente */ }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!i18nReady || !fontsLoaded || isLoading || flagsLoading || justRegistered || !versionChecked) return;
    if (user && !isBlockedChecked) return;

    const navigate = (path: string) => {
      if (lastNav.current === path) return;
      lastNav.current = path;
      onFirstNav();
      router.replace(path as Parameters<typeof router.replace>[0]);
    };

    // 0. Versión mínima (máxima prioridad absoluta)
    if (needsUpdate) {
      navigate('/update-required');
      return;
    }

    // 1. Mantenimiento
    if (flags.maintenanceMode) {
      navigate('/maintenance');
      return;
    }

    if (user) {
      // 2. Bloqueado
      if (userIsBlocked) {
        signOut();
        navigate('/blocked');
        return;
      }
      // 3. Biométrico (solo nativo)
      if (biometricLocked && Platform.OS !== 'web') {
        let cancelled = false;
        isBiometricsAppEnrolled()
          .then((enrolled) => {
            if (cancelled) return;
            if (enrolled) {
              navigate('/(auth)/biometric-lock');
            } else {
              setBiometricLocked(false);
              navigate('/(tabs)/');
            }
          })
          .catch(() => {
            if (!cancelled) {
              setBiometricLocked(false);
              navigate('/(tabs)/');
            }
          });
        return () => { cancelled = true; };
      } else {
        navigate('/(tabs)/');
      }
    } else {
      if (PUBLIC_ROUTES.has(pathname)) { onFirstNav(); return; }
      setBiometricLocked(true);
      navigate('/(auth)/login');
    }
  }, [user, isLoading, i18nReady, fontsLoaded, justRegistered, biometricLocked, flags.maintenanceMode, flagsLoading, userIsBlocked, isBlockedChecked, versionChecked, needsUpdate, pathname]);

  return null;
}

export default function RootLayout() {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const { user, isLoading, setUser, setLoading, setJustLoggedIn } = useAuthStore();
  const [i18nReady, setI18nReady] = useState(false);
  const isFirstAuthCall = useRef(true);
  const prevUserRef = useRef<boolean>(false);
  const [inactivityDialogVisible, setInactivityDialogVisible] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [splashDone, setSplashDone] = useState(false);
  const [navReady, setNavReady] = useState(false);

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
        savePendingConsent(authUser.uid).catch(() => {});
        // Crear perfil Firestore si no existe (idempotente)
        createUserProfile(
          authUser.uid,
          authUser.displayName ?? authUser.email ?? 'Usuario',
          authUser.photoURL,
          authUser.email,
        ).catch(() => {
          // Fallo silencioso — el perfil se creará en el siguiente login
        });
        const appVersion = Constants.expoConfig?.version;
        if (appVersion) {
          updateAppVersion(authUser.uid, appVersion).catch(() => {});
        }
        // Login fresco: la sesión no venía persistida (primer callback fue sin usuario)
        if (!isFirstAuthCall.current && !prevUserRef.current) {
          setJustLoggedIn(true);
        }
      }
      isFirstAuthCall.current = false;
      prevUserRef.current = !!authUser;
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


  const { reset: resetInactivityTimer } = useInactivityTimer({
    timeoutMs: 300_000,
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

  const splashVisible = Platform.OS !== 'web' && !isPublicRoute && (!splashDone || !i18nReady || !fontsLoaded || isLoading);

  return (
    <ThemeProvider>
      <ToastProvider>
        <FeatureFlagsProvider>
          {splashVisible ? (
            <ThemedSplash onComplete={() => setSplashDone(true)} />
          ) : (
            <>
              <AppGuard i18nReady={i18nReady} fontsLoaded={!!fontsLoaded} onFirstNav={() => setNavReady(true)} />
              <WebAppShell>
                <PaletteLoader />
                <ThemedStack />
                <InactivityDialog
                  visible={inactivityDialogVisible}
                  countdown={countdown}
                  onStay={handleStay}
                  onLogout={handleLogout}
                />
              </WebAppShell>
              {!navReady && !isPublicRoute && <NavReadyOverlay />}
            </>
          )}
        </FeatureFlagsProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
