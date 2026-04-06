# Biometrics (App Lock) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar desbloqueo biométrico (Face ID / Touch ID) como app lock. Después del primer login, se ofrece activarlo. En sesiones posteriores con biometría activa, la app muestra una pantalla de bloqueo antes de entrar a los tabs.

**Architecture:** App lock pattern — Firebase mantiene la sesión activa. `biometricLocked: boolean` en authStore controla si se muestra el lock screen. `_layout.tsx` verifica si está enrollado y redirige a `/(auth)/biometric-lock` cuando corresponde. La oferta de activación aparece en el home tras el primer login.

**Tech Stack:** `expo-local-authentication`, `expo-secure-store`, React Native 0.83 + Expo SDK 55, TypeScript, Zustand, expo-router

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Crear | `hooks/useBiometrics.ts` |
| Modificar | `store/authStore.ts` |
| Crear | `app/(auth)/biometric-lock.tsx` |
| Modificar | `app/_layout.tsx` |
| Modificar | `app/(tabs)/index.tsx` |
| Modificar | `app/(tabs)/profile.tsx` |

---

## Tarea 1 — Instalar paquetes y crear `hooks/useBiometrics.ts`

**Archivos:**
- Crear: `hooks/useBiometrics.ts`

- [ ] **Paso 1: Instalar los paquetes**

```bash
cd ~/Documents/Github/Spendiapp
npx expo install expo-local-authentication expo-secure-store
```

Verificar que aparecen en `package.json` bajo `dependencies`.

- [ ] **Paso 2: Crear `hooks/useBiometrics.ts`**

```ts
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const KEY_ENROLLED = 'biometrics_enrolled';
const KEY_OFFERED = 'biometrics_offered';

/** ¿El dispositivo tiene hardware biométrico y tiene huellas/face registradas en el SO? */
export async function isBiometricsAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

/** ¿El usuario activó biometría en esta app? */
export async function isBiometricsAppEnrolled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(KEY_ENROLLED);
  return val === 'true';
}

/** Activar o desactivar la biometría en esta app */
export async function setBiometricsAppEnrolled(value: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEY_ENROLLED, value ? 'true' : 'false');
}

/** ¿Ya se le ofreció biometría al usuario en esta instalación? */
export async function wasBiometricsOffered(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(KEY_OFFERED);
  return val === 'true';
}

/** Marcar que ya se ofreció biometría (para no volver a preguntar) */
export async function markBiometricsOffered(): Promise<void> {
  await SecureStore.setItemAsync(KEY_OFFERED, 'true');
}

/** Lanzar prompt de autenticación biométrica del SO */
export async function authenticateWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Desbloquea Spendiapp',
    fallbackLabel: 'Usar PIN del dispositivo',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });
  return result.success;
}
```

- [ ] **Paso 3: Commit**

```bash
git add hooks/useBiometrics.ts package.json package-lock.json
git commit -m "feat: add useBiometrics hook and install expo-local-authentication + expo-secure-store"
```

---

## Tarea 2 — Actualizar `store/authStore.ts`

**Archivos:**
- Modificar: `store/authStore.ts`

- [ ] **Paso 1: Reemplazar el contenido completo**

```ts
import { create } from 'zustand';
import { AuthUser } from '../hooks/useAuth';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  justRegistered: boolean;
  biometricLocked: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setJustRegistered: (value: boolean) => void;
  setBiometricLocked: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  justRegistered: false,
  biometricLocked: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setJustRegistered: (justRegistered) => set({ justRegistered }),
  setBiometricLocked: (biometricLocked) => set({ biometricLocked }),
}));
```

- [ ] **Paso 2: Commit**

```bash
git add store/authStore.ts
git commit -m "feat: add biometricLocked field to authStore"
```

---

## Tarea 3 — Crear `app/(auth)/biometric-lock.tsx`

**Archivos:**
- Crear: `app/(auth)/biometric-lock.tsx`

**Contexto:** Esta pantalla se muestra cuando el usuario tiene sesión activa y biometría enrollada. Se auto-dispara el prompt biométrico al montar. Si pasa → entra a tabs. Si cancela → puede reintentar. Tiene un botón de cerrar sesión como escape de emergencia.

- [ ] **Paso 1: Crear el archivo**

```tsx
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { Fonts } from '../../config/fonts';
import { authenticateWithBiometrics, setBiometricsAppEnrolled } from '../../hooks/useBiometrics';
import { signOut } from '../../hooks/useAuth';
import AppDialog from '../../components/AppDialog';

export default function BiometricLockScreen() {
  const { colors, isDark } = useTheme();
  const { user, setBiometricLocked } = useAuthStore();
  const [authenticating, setAuthenticating] = useState(false);
  const [failed, setFailed] = useState(false);
  const [signOutDialog, setSignOutDialog] = useState(false);

  const firstName = user?.displayName?.split(' ')[0] ?? 'de vuelta';

  const gradientColors: [string, string, string] = isDark
    ? ['#0D1A1C', '#062830', '#003840']
    : ['#FFFFFF', '#F5F9FA', '#E0F7FA'];

  const handleAuthenticate = async () => {
    setAuthenticating(true);
    setFailed(false);
    const success = await authenticateWithBiometrics();
    setAuthenticating(false);
    if (success) {
      setBiometricLocked(false);
      router.replace('/(tabs)/');
    } else {
      setFailed(true);
    }
  };

  const handleSignOut = async () => {
    setSignOutDialog(false);
    await setBiometricsAppEnrolled(false);
    await signOut();
    setBiometricLocked(true);
    router.replace('/(auth)/login');
  };

  // Auto-trigger al montar
  useEffect(() => {
    handleAuthenticate();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppDialog
        visible={signOutDialog}
        type="warning"
        title="Cerrar sesión"
        description="¿Seguro que quieres cerrar sesión? Tendrás que volver a iniciar sesión la próxima vez."
        primaryLabel="Cerrar sesión"
        secondaryLabel="Cancelar"
        onPrimary={handleSignOut}
        onSecondary={() => setSignOutDialog(false)}
      />

      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.gradient}
      >
        <View style={[styles.blobTopRight, { backgroundColor: colors.primaryLight, opacity: isDark ? 0.25 : 0.6 }]} />

        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark-outline" size={64} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {`Bienvenid@, ${firstName}`}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Verifica tu identidad para continuar
          </Text>

          {failed && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              No se pudo verificar. Intenta de nuevo.
            </Text>
          )}

          <TouchableOpacity
            style={[styles.biometricBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleAuthenticate()}
            disabled={authenticating}
            activeOpacity={0.85}
          >
            {authenticating
              ? <ActivityIndicator color="#FFFFFF" />
              : (
                <>
                  <Ionicons name="finger-print" size={22} color="#FFFFFF" />
                  <Text style={styles.biometricBtnText}>Usar biometría</Text>
                </>
              )
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={() => setSignOutDialog(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.signOutText, { color: colors.textTertiary }]}>
              Cerrar sesión
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  gradient: { flex: 1 },
  blobTopRight: {
    position: 'absolute', top: -80, right: -80,
    width: 280, height: 280, borderRadius: 999,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrap: { marginBottom: 8 },
  title: { fontSize: 26, fontFamily: Fonts.bold, textAlign: 'center' },
  subtitle: { fontSize: 15, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  errorText: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center' },
  biometricBtn: {
    width: '100%',
    height: 56,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  biometricBtnText: { fontSize: 17, fontFamily: Fonts.bold, color: '#FFFFFF' },
  signOutBtn: { marginTop: 8, padding: 8 },
  signOutText: { fontSize: 14, fontFamily: Fonts.regular },
});
```

- [ ] **Paso 2: Commit**

```bash
git add "app/(auth)/biometric-lock.tsx"
git commit -m "feat: add BiometricLockScreen"
```

---

## Tarea 4 — Actualizar `app/_layout.tsx`

**Archivos:**
- Modificar: `app/_layout.tsx`

**Contexto:** El `useEffect` de routing actualmente redirige a `/(tabs)/` si `user` existe. Hay que añadir la verificación: si biometría está enrollada → ir a `/(auth)/biometric-lock` en su lugar.

- [ ] **Paso 1: Agregar imports necesarios**

Después de los imports existentes:

```tsx
import { isBiometricsAppEnrolled } from '../hooks/useBiometrics';
```

- [ ] **Paso 2: Desestructurar `biometricLocked` y `setBiometricLocked` del store**

Localizar:

```tsx
  const { user, isLoading, justRegistered, setUser, setLoading } = useAuthStore();
```

Reemplazar con:

```tsx
  const { user, isLoading, justRegistered, biometricLocked, setUser, setLoading, setBiometricLocked } = useAuthStore();
```

- [ ] **Paso 3: Reemplazar el `useEffect` de routing**

Localizar el useEffect que contiene `if (user) { router.replace('/(tabs)/') }` y reemplazarlo completo:

```tsx
  useEffect(() => {
    if (!i18nReady || !fontsLoaded) return;
    if (isLoading) return;
    if (justRegistered) return;

    if (user) {
      if (biometricLocked) {
        isBiometricsAppEnrolled().then((enrolled) => {
          if (enrolled) {
            router.replace('/(auth)/biometric-lock');
          } else {
            setBiometricLocked(false);
            router.replace('/(tabs)/');
          }
        });
      } else {
        router.replace('/(tabs)/');
      }
    } else {
      setBiometricLocked(true); // Reset para la próxima sesión
      router.replace('/(auth)/login');
    }
  }, [user, isLoading, i18nReady, fontsLoaded, justRegistered, biometricLocked]);
```

- [ ] **Paso 4: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: add biometric lock routing to _layout"
```

---

## Tarea 5 — Oferta de biometría en `app/(tabs)/index.tsx`

**Archivos:**
- Modificar: `app/(tabs)/index.tsx`

**Contexto:** Al montar el home por primera vez tras login (con `biometricLocked: false` ya), verificar si se debe ofrecer biometría. Si disponible + no enrollada + no ofrecida antes → mostrar `AppDialog`.

- [ ] **Paso 1: Agregar imports**

```tsx
import {
  isBiometricsAvailable,
  isBiometricsAppEnrolled,
  setBiometricsAppEnrolled,
  wasBiometricsOffered,
  markBiometricsOffered,
} from '../../hooks/useBiometrics';
import AppDialog from '../../components/AppDialog';
```

**Nota:** Si `AppDialog` ya está importado, omitir esa línea.

- [ ] **Paso 2: Agregar estado para el dialog de oferta**

Dentro de `HomeScreen`, después de los estados existentes:

```tsx
const [biometricOfferVisible, setBiometricOfferVisible] = useState(false);
```

- [ ] **Paso 3: Agregar `useEffect` de oferta biométrica**

Dentro de `HomeScreen`, después del primer `useEffect` existente:

```tsx
  useEffect(() => {
    async function offerBiometrics() {
      const available = await isBiometricsAvailable();
      if (!available) return;
      const alreadyEnrolled = await isBiometricsAppEnrolled();
      if (alreadyEnrolled) return;
      const offered = await wasBiometricsOffered();
      if (offered) return;
      await markBiometricsOffered();
      setBiometricOfferVisible(true);
    }
    offerBiometrics();
  }, []);
```

- [ ] **Paso 4: Renderizar el `AppDialog` de oferta**

Antes del cierre `</SafeAreaView>` (junto a otros modales si los hay):

```tsx
<AppDialog
  visible={biometricOfferVisible}
  type="info"
  title="¿Entrar más rápido?"
  description="Activa Face ID / Touch ID para abrir Spendiapp sin necesidad de escribir nada."
  primaryLabel="Activar"
  secondaryLabel="Ahora no"
  onPrimary={async () => {
    await setBiometricsAppEnrolled(true);
    setBiometricOfferVisible(false);
  }}
  onSecondary={() => setBiometricOfferVisible(false)}
/>
```

- [ ] **Paso 5: Commit**

```bash
git add "app/(tabs)/index.tsx"
git commit -m "feat: offer biometric enrollment after first login"
```

---

## Tarea 6 — Toggle de biometría en `app/(tabs)/profile.tsx`

**Archivos:**
- Modificar: `app/(tabs)/profile.tsx`

**Contexto:** Añadir una fila de toggle en la sección de seguridad del perfil (antes del botón de cerrar sesión). El toggle activa/desactiva la biometría. Si el dispositivo no soporta biometría, la fila aparece deshabilitada.

- [ ] **Paso 1: Agregar imports**

```tsx
import { Switch } from 'react-native';
import {
  isBiometricsAvailable,
  isBiometricsAppEnrolled,
  setBiometricsAppEnrolled,
} from '../../hooks/useBiometrics';
```

**Nota:** Verificar si `Switch` ya está en el import de `react-native`. Si está, no duplicar.

- [ ] **Paso 2: Agregar estados para biometría**

Dentro de `ProfileScreen`, después de los estados existentes:

```tsx
const [biometricsAvailable, setBiometricsAvailable] = useState(false);
const [biometricsEnabled, setBiometricsEnabled] = useState(false);
const [biometricToggleDialog, setBiometricToggleDialog] = useState(false);
```

- [ ] **Paso 3: Agregar `useEffect` que carga el estado inicial**

```tsx
  useEffect(() => {
    async function loadBiometricsState() {
      const available = await isBiometricsAvailable();
      setBiometricsAvailable(available);
      if (available) {
        const enrolled = await isBiometricsAppEnrolled();
        setBiometricsEnabled(enrolled);
      }
    }
    loadBiometricsState();
  }, []);
```

- [ ] **Paso 4: Agregar handler de toggle**

Después de `handleDeleteCard`:

```tsx
  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      await setBiometricsAppEnrolled(true);
      setBiometricsEnabled(true);
    } else {
      setBiometricToggleDialog(true);
    }
  };

  const confirmDisableBiometrics = async () => {
    setBiometricToggleDialog(false);
    await setBiometricsAppEnrolled(false);
    setBiometricsEnabled(false);
  };
```

- [ ] **Paso 5: Agregar la fila de biometría en el JSX**

Busca la sección `{/* SOPORTE */}` o la sección de seguridad. Agregar ANTES de esa sección (o donde estén otras filas de seguridad en el perfil):

```tsx
{/* SEGURIDAD — Biometría */}
<SectionTitle label="Seguridad" />
<View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
  <View style={[styles.optionRow, { opacity: biometricsAvailable ? 1 : 0.4 }]}>
    <View style={[styles.optionIconWrap, { backgroundColor: colors.primaryLight }]}>
      <Ionicons name="finger-print" size={18} color={colors.primary} />
    </View>
    <View style={styles.optionMeta}>
      <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
        Face ID / Touch ID
      </Text>
      <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
        {biometricsAvailable
          ? 'Desbloquea la app con tu rostro o huella'
          : 'No disponible en este dispositivo'}
      </Text>
    </View>
    <Switch
      value={biometricsEnabled}
      onValueChange={biometricsAvailable ? handleBiometricToggle : undefined}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor="#FFFFFF"
      disabled={!biometricsAvailable}
    />
  </View>
</View>
```

**Nota:** Si `optionSub` no existe en los estilos, añadirlo en el paso 6.

- [ ] **Paso 6: Agregar estilo `optionSub` si no existe**

En `StyleSheet.create`:

```tsx
  optionSub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 1 },
```

- [ ] **Paso 7: Renderizar el dialog de confirmación para desactivar**

Junto a los otros `AppDialog` del archivo:

```tsx
<AppDialog
  visible={biometricToggleDialog}
  type="warning"
  title="Desactivar biometría"
  description="La próxima vez que abras la app necesitarás hacer login completo."
  primaryLabel="Desactivar"
  secondaryLabel="Cancelar"
  onPrimary={confirmDisableBiometrics}
  onSecondary={() => setBiometricToggleDialog(false)}
/>
```

- [ ] **Paso 8: Commit**

```bash
git add "app/(tabs)/profile.tsx"
git commit -m "feat: add biometric toggle in profile security section"
```

---

## Verificación end-to-end

1. Primer login → home → aparece dialog "¿Entrar más rápido?" → "Activar" → cerrar app → reabrir → aparece `BiometricLockScreen` → Face ID pasa → entra a tabs ✓
2. En perfil → "Face ID / Touch ID" toggle ON/OFF funciona ✓
3. Desactivar desde perfil → cerrar app → reabrir → va directo a tabs sin lock ✓
4. En `BiometricLockScreen` → "Cerrar sesión" → dialog confirmación → cierra sesión → va a login ✓
5. Usuario sin biometría en el dispositivo → no aparece dialog de oferta, toggle deshabilitado en perfil ✓
