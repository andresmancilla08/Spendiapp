import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { ThemeProvider as NavigationThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { onAuthStateChanged, signOut } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { auth, db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { initI18n } from '../config/i18n';
import '../config/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme, PaletteId, BACKGROUND_STYLE_VALUES, CHART_ACCENT_VALUES, normalizeChartAnim, PERSONALIZATION_SYNCED_AT_KEY, BackgroundStyle, AuroraIntensity, ChartType, ChartAnimStyle, ChartSpeed, ChartAccent,
  CHART_TYPE_VALUES, GRADIENT_STYLE_VALUES, BACKGROUND_BLUR_VALUES, type GradientStyle, type BackgroundBlur,
} from '../context/ThemeContext';
import { PALETTE_MAP, resolvePaletteId } from '../config/palettes';
import type { CustomPalette } from '../utils/derivePalette';
import AppBackground from '../components/AppBackground';
import { ToastProvider } from '../context/ToastContext';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import WebAppShell from '../components/WebAppShell';
import { useTranslation } from 'react-i18next';
import { savePendingConsent, hasAcceptedConsent, hasPendingConsent, setPendingConsent } from '../hooks/useConsentLogger';
import ConsentModal from '../components/ConsentModal';
import { createUserProfile, getUserProfile, updateAppVersion } from '../hooks/useUserProfile';
import Constants from 'expo-constants';
import { FeatureFlagsProvider, useFlags } from '../context/FeatureFlagsContext';

function PaletteLoader() {
  const { user } = useAuthStore();
  const {
    setPaletteId, saveCustomPalette, setBackgroundStyleFor, setBackgroundIntensity, setBackgroundBlurFor,
    setChartType, setChartAnimStyle, setChartSpeed, setChartAccent, setGradientStyle,
  } = useTheme();

  useEffect(() => {
    if (!user?.uid) return;
    Promise.all([getUserProfile(user.uid), AsyncStorage.getItem(PERSONALIZATION_SYNCED_AT_KEY)])
      .then(([profile, localTsRaw]) => {
        // Las paletas propias PRIMERO: si la activa es una de ellas, tiene que
        // existir ya cuando se resuelve, o caería a la de por defecto.
        if (Array.isArray(profile?.customPalettes)) {
          for (const c of profile.customPalettes) {
            saveCustomPalette(c as CustomPalette).catch(() => {});
          }
        }
        const remoteId = profile?.colorPalette;
        const isOwn = Array.isArray(profile?.customPalettes)
          && profile.customPalettes.some((c) => c.id === remoteId);
        const resolved = resolvePaletteId(remoteId);
        if (resolved) setPaletteId(resolved);
        else if (remoteId && isOwn) setPaletteId(remoteId);
        const p = profile?.personalization;
        if (!p) return;
        // Solo aplicar lo remoto si es MÁS RECIENTE que la última escritura
        // local — si este dispositivo tiene elecciones frescas, no se pisan.
        // (Doc remoto sin updatedAt = legado: solo se usa si aquí nunca se
        // personalizó nada.)
        const localTs = localTsRaw ? Number(localTsRaw) : 0;
        const remoteTs = typeof p.updatedAt === 'number' ? p.updatedAt : 0;
        if (localTs && remoteTs <= localTs) return;
        // Fondo por modo — el campo legado (backgroundStyle único) siembra ambos.
        const legacyBg = BACKGROUND_STYLE_VALUES.includes(p.backgroundStyle as BackgroundStyle)
          ? (p.backgroundStyle as BackgroundStyle) : null;
        const bgLight = BACKGROUND_STYLE_VALUES.includes(p.backgroundStyleLight as BackgroundStyle)
          ? (p.backgroundStyleLight as BackgroundStyle) : legacyBg;
        const bgDark = BACKGROUND_STYLE_VALUES.includes(p.backgroundStyleDark as BackgroundStyle)
          ? (p.backgroundStyleDark as BackgroundStyle) : legacyBg;
        if (bgLight) setBackgroundStyleFor('light', bgLight);
        if (bgDark) setBackgroundStyleFor('dark', bgDark);
        if (['subtle', 'default', 'intense'].includes(p.backgroundIntensity as string)) setBackgroundIntensity(p.backgroundIntensity as AuroraIntensity);
        if (BACKGROUND_BLUR_VALUES.includes(p.backgroundBlurLight as BackgroundBlur)) setBackgroundBlurFor('light', p.backgroundBlurLight as BackgroundBlur);
        if (BACKGROUND_BLUR_VALUES.includes(p.backgroundBlurDark as BackgroundBlur)) setBackgroundBlurFor('dark', p.backgroundBlurDark as BackgroundBlur);
        // Se valida contra la lista EXPORTADA, no contra una copia: con la lista
        // escrita a mano aquí, cada tipo nuevo (stepped, lollipop) se descartaba al
        // llegar desde otro dispositivo y parecía que la elección no se guardaba.
        if (CHART_TYPE_VALUES.includes(p.chartType as ChartType)) setChartType(p.chartType as ChartType);
        const migratedAnim = normalizeChartAnim(p.chartAnimStyle);
        if (migratedAnim) setChartAnimStyle(migratedAnim);
        if (['slow', 'normal', 'fast'].includes(p.chartSpeed as string)) setChartSpeed(p.chartSpeed as ChartSpeed);
        // Validado como sus hermanos: un acento remoto viejo o retirado se
        // colaba en el contexto y `resolveChartAccent` caía al color del tema —
        // se veía como "el acento elegido no se aplica".
        if (CHART_ACCENT_VALUES.includes(p.chartAccent as ChartAccent)) setChartAccent(p.chartAccent as ChartAccent);
        if (GRADIENT_STYLE_VALUES.includes(p.gradientStyle as GradientStyle)) setGradientStyle(p.gradientStyle as GradientStyle);
      })
      .catch(() => {});
  }, [user?.uid]);

  return null;
}

function ThemedStack() {
  const { isDark } = useTheme();
  // El fondo real es AppBackground, global y persistente detrás del Stack.
  // No basta contentStyle: el <Background> de react-navigation pinta
  // colors.background del THEME de navegación en cada pantalla — hay que
  // hacerlo transparente también, o tapa el fondo global con gris plano.
  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: 'transparent' },
  };
  return (
    <NavigationThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </NavigationThemeProvider>
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

function AppGuard({ i18nReady, fontsLoaded }: { i18nReady: boolean; fontsLoaded: boolean }) {
  const { flags, flagsLoading } = useFlags();
  const pathname = usePathname();
  const { user, isLoading, justRegistered, setIsPremium } = useAuthStore();
  const [isBlockedChecked, setIsBlockedChecked] = useState(false);
  const [userIsBlocked, setUserIsBlocked] = useState(false);
  /** Migración a PIN de 6 dígitos: mientras `pinV2` no sea true, la cuenta sigue
   *  con el PIN por defecto (público) y no se deja entrar a ninguna pantalla. */
  const [needsPin, setNeedsPin] = useState(false);
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
          // Sin conexión, Firestore emite el snapshot desde una caché vacía: eso
          // NO significa que la cuenta se haya borrado. Cerrar sesión ahí dejaba
          // fuera a cualquiera que abriera la app sin red.
          if (snap.metadata.fromCache) return;
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
        setNeedsPin(data.pinV2 !== true);
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
        // Error de red o permiso: no se sabe nada nuevo del usuario. Se desbloquea
        // la pantalla, pero NO se degrada el premium — un usuario de pago sin
        // cobertura perdía sus funciones sin explicación.
        setUserIsBlocked(false);
        setIsBlockedChecked(true);
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
    if (!i18nReady || !fontsLoaded || isLoading || justRegistered) return;
    if (user && (flagsLoading || !versionChecked || !isBlockedChecked)) return;

    const navigate = (path: string) => {
      if (lastNav.current === path) return;
      lastNav.current = path;
      router.replace(path as Parameters<typeof router.replace>[0]);
    };

    // 0. Versión mínima (máxima prioridad absoluta — solo cuando ya se cargó)
    if (versionChecked && needsUpdate) {
      navigate('/update-required');
      return;
    }

    // 1. Mantenimiento (solo cuando flags ya cargaron)
    if (!flagsLoading && flags.maintenanceMode) {
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
      // 3. PIN por defecto de la migración: no se entra a ningún sitio hasta
      //    tener uno propio. Va después de "bloqueado" y antes que todo lo demás.
      if (needsPin) {
        navigate('/(auth)/set-pin');
        return;
      }
      navigate('/(tabs)/');
    } else {
      if (PUBLIC_ROUTES.has(pathname)) return;
      navigate('/(auth)/login');
    }
  }, [user, isLoading, i18nReady, fontsLoaded, justRegistered, flags.maintenanceMode, flagsLoading, userIsBlocked, isBlockedChecked, needsPin, versionChecked, needsUpdate, pathname]);

  return null;
}

function ConsentGuard({ consentRequired, onAccept }: { consentRequired: boolean; onAccept: () => void }) {
  const pathname = usePathname();
  const visible = consentRequired && pathname !== '/terms' && pathname !== '/privacy';
  return (
    <ConsentModal
      visible={visible}
      method="email"
      onAccept={onAccept}
      onCancel={() => {}}
      required
      onTermsPress={() => router.push('/terms' as any)}
      onPrivacyPress={() => router.push('/privacy' as any)}
    />
  );
}

export default function RootLayout() {
  const { user, isLoading, setUser, setLoading, setJustLoggedIn } = useAuthStore();
  const [i18nReady, setI18nReady] = useState(false);
  const isFirstAuthCall = useRef(true);
  const prevUserRef = useRef<boolean>(false);
  const [consentRequired, setConsentRequired] = useState(false);
  const consentUserUidRef = useRef<string | null>(null);

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((authUser) => {
      // Actualizar estado inmediatamente — sin bloquear en Firestore
      if (!isFirstAuthCall.current && !prevUserRef.current && authUser) {
        setJustLoggedIn(true);
      }
      isFirstAuthCall.current = false;
      prevUserRef.current = !!authUser;
      setUser(authUser);
      setLoading(false);

      if (authUser) {
        // Operaciones en background — no bloquean el routing
        const pendingExists = hasPendingConsent();
        savePendingConsent(authUser.uid).catch(() => {});
        createUserProfile(
          authUser.uid,
          authUser.displayName ?? authUser.email ?? 'Usuario',
          authUser.photoURL,
          authUser.email,
        ).catch(() => {});
        const appVersion = Constants.expoConfig?.version;
        if (appVersion) updateAppVersion(authUser.uid, appVersion).catch(() => {});

        if (!pendingExists) {
          hasAcceptedConsent(authUser.uid).then((accepted) => {
            if (!accepted) {
              consentUserUidRef.current = authUser.uid;
              setConsentRequired(true);
            }
          });
        }
      } else {
        consentUserUidRef.current = null;
        setConsentRequired(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleConsentAccept = () => {
    setConsentRequired(false);
    setPendingConsent('email');
    if (consentUserUidRef.current) {
      savePendingConsent(consentUserUidRef.current).catch(() => {});
    }
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        <FeatureFlagsProvider>
          <AppGuard i18nReady={i18nReady} fontsLoaded={!!fontsLoaded} />
          <WebAppShell>
            <PaletteLoader />
            <View style={{ flex: 1 }}>
              <AppBackground />
              <ThemedStack />
            </View>
          </WebAppShell>
          <ConsentGuard consentRequired={consentRequired} onAccept={handleConsentAccept} />
        </FeatureFlagsProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
