# Biometría (App Lock) — Diseño

> **Para agentes:** Usar `superpowers:subagent-driven-development` para implementar este plan tarea por tarea.

**Objetivo:** Después del primer login exitoso, ofrecer al usuario activar Face ID / Touch ID como método de desbloqueo rápido. En sesiones posteriores, si la biometría está activada, la app muestra una pantalla de bloqueo antes de entrar a los tabs. El usuario nunca es forzado — siempre hay un fallback.

**Arquitectura:** App lock pattern. Firebase mantiene la sesión activa. La biometría actúa como "portero" — verifica identidad local sin tocar Firebase. Funciona igual para usuarios Google y email+PIN. Nuevo campo `biometricLocked` en authStore; nueva ruta `/(auth)/biometric-lock`; nuevo hook `useBiometrics`.

**Tech Stack:** `expo-local-authentication`, `expo-secure-store`, React Native, expo-router, Zustand

**Paquetes a instalar:**
```bash
npx expo install expo-local-authentication expo-secure-store
```

---

## Modelo de datos

### SecureStore keys
```
biometrics_enrolled   →  'true' | 'false'   (si el usuario activó biometría)
biometrics_offered    →  'true'             (para no mostrar la oferta más de una vez por instalación)
```

### `store/authStore.ts` — campo nuevo
```ts
biometricLocked: boolean;       // true al iniciar la app, false después de desbloquear
setBiometricLocked: (v: boolean) => void;
```

---

## Archivos nuevos

### `hooks/useBiometrics.ts`

```ts
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export async function isBiometricsAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

export async function isBiometricsAppEnrolled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync('biometrics_enrolled');
  return val === 'true';
}

export async function setBiometricsAppEnrolled(value: boolean): Promise<void> {
  await SecureStore.setItemAsync('biometrics_enrolled', value ? 'true' : 'false');
}

export async function wasBiometricsOffered(): Promise<boolean> {
  const val = await SecureStore.getItemAsync('biometrics_offered');
  return val === 'true';
}

export async function markBiometricsOffered(): Promise<void> {
  await SecureStore.setItemAsync('biometrics_offered', 'true');
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Desbloquea Spendiapp',
    fallbackLabel: 'Usar PIN',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });
  return result.success;
}
```

### `app/(auth)/biometric-lock.tsx`

Pantalla de bloqueo. Se muestra cuando el usuario tiene sesión activa + biometría enrollada.

**UI:**
- Fondo con gradiente (igual que login)
- Logo centrado
- Texto: `"Bienvenid@ de vuelta, {firstName}"` — Fonts.bold 24px
- Subtexto: `"Verifica tu identidad para continuar"` — Fonts.regular 14px, textSecondary
- Ícono grande de Face ID / Touch ID (detectado en runtime via `LocalAuthentication.supportedAuthenticationTypesAsync()`)
- Botón primario: `"Usar biometría"` — llama `authenticateWithBiometrics()` → si exitoso → `setBiometricLocked(false)` → `router.replace('/(tabs)/')`
- Botón secundario: `"Cerrar sesión"` — `AppDialog` de confirmación tipo `'warning'` → llama `signOut()` + `setBiometricsAppEnrolled(false)` → `router.replace('/(auth)/login')`

**Auto-trigger:** Al montar la pantalla (`useEffect`), llama `authenticateWithBiometrics()` automáticamente — el sistema operativo muestra Face ID / Touch ID sin que el usuario toque nada.

---

## Modificaciones a archivos existentes

### `store/authStore.ts`

```ts
biometricLocked: boolean;
setBiometricLocked: (v: boolean) => void;
// Valor inicial: true
```

### `app/_layout.tsx`

En el `useEffect` de routing, agregar caso biométrico:

```ts
useEffect(() => {
  if (!i18nReady || !fontsLoaded || isLoading) return;
  if (justRegistered) return;

  if (user) {
    if (biometricLocked) {
      // Verificar si biometría está activada antes de redirigir al lock
      isBiometricsAppEnrolled().then((enrolled) => {
        if (enrolled) {
          router.replace('/(auth)/biometric-lock');
        } else {
          router.replace('/(tabs)/');
        }
      });
    } else {
      router.replace('/(tabs)/');
    }
  } else {
    router.replace('/(auth)/login');
  }
}, [user, isLoading, i18nReady, fontsLoaded, justRegistered, biometricLocked]);
```

### `app/(tabs)/index.tsx` — oferta de biometría

En el home, al montar por primera vez tras login, verificar si se debe ofrecer biometría:

```ts
useEffect(() => {
  async function offerBiometrics() {
    const available = await isBiometricsAvailable();
    const alreadyEnrolled = await isBiometricsAppEnrolled();
    const offered = await wasBiometricsOffered();
    if (available && !alreadyEnrolled && !offered) {
      await markBiometricsOffered();
      // Mostrar AppDialog de oferta
      setBiometricOfferVisible(true);
    }
  }
  offerBiometrics();
}, []);
```

`AppDialog` de oferta:
- `type: 'info'`
- `title: '¿Entrar más rápido?'`
- `description: 'Activa Face ID / Touch ID para abrir Spendiapp sin necesidad de escribir nada.'`
- `primaryLabel: 'Activar'` → `setBiometricsAppEnrolled(true)` → cerrar dialog
- `secondaryLabel: 'Ahora no'` → cerrar dialog

### `app/(tabs)/profile.tsx` — settings de biometría

En la sección de seguridad (antes del botón de cerrar sesión), agregar fila toggle:

```
[Biometría / Face ID]     [Toggle ON/OFF]
Desbloqueo con tu huella o rostro
```

- Toggle ON → `setBiometricsAppEnrolled(true)` (solo si `isBiometricsAvailable()`)
- Toggle OFF → `AppDialog` de confirmación → `setBiometricsAppEnrolled(false)`
- Si no hay biometría disponible en el dispositivo → fila deshabilitada con subtexto "No disponible en este dispositivo"

---

## Flujo completo

```
App abre (sesión activa + biometría ON)
  └─ _layout.tsx detecta: user ✓ + biometricLocked ✓ + enrolled ✓
      └─ router.replace('/(auth)/biometric-lock')
          └─ BiometricLockScreen monta → auto-trigger Face ID/Touch ID
              ├─ Éxito → setBiometricLocked(false) → /(tabs)/
              └─ Fallo/cancelar → usuario puede reintentar o cerrar sesión

App abre (sesión activa + biometría OFF)
  └─ _layout.tsx detecta: user ✓ + enrolled ✗
      └─ router.replace('/(tabs)/')  [directo, sin lock]

Primer login exitoso
  └─ Home monta → oferta de biometría (AppDialog) si disponible y no ofrecida antes
      ├─ "Activar" → enrolled = true
      └─ "Ahora no" → no vuelve a preguntar en esta instalación

Cierre de sesión desde BiometricLockScreen
  └─ signOut() + setBiometricsAppEnrolled(false) + router.replace('/(auth)/login')
```

---

## Reglas de validación

| Caso | Comportamiento |
|------|---------------|
| Dispositivo sin biometría de hardware | Toggle en perfil deshabilitado |
| Dispositivo con hardware pero sin huella/face registrada en SO | No se ofrece ni se puede activar |
| Biometría falla 3 veces | El SO muestra su propio fallback (PIN/contraseña del dispositivo) — `disableDeviceFallback: false` |
| Usuario en proceso de onboarding (`justRegistered: true`) | No se muestra lock screen aunque esté enrollada |

---

## Lo que NO entra en este spec

- Re-lock automático por inactividad (coming soon en settings)
- PIN propio de la app como fallback del lock screen (el SO ya provee el suyo)
- Biometría para aprobar transacciones individuales
