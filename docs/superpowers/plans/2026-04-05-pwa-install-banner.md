# PWA Install Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar un banner persistente en el home de Spendiapp que incentiva al usuario a instalar la app como PWA, con flujo completo de instalación para iOS y Android.

**Architecture:** El hook `usePwaInstall` encapsula toda la lógica de detección (standalone, beforeinstallprompt, appinstalled). El componente `PwaInstallBanner` es puramente visual y usa el hook. La pantalla home lo renderiza entre el greeting y el balance card. Solo visible en web, desaparece automáticamente al instalarse.

**Tech Stack:** React Native Web, Expo Router, Ionicons, react-i18next, AppDialog existente

---

## File Map

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `hooks/usePwaInstall.ts` | Crear | Detección standalone, captura `beforeinstallprompt`, expone `isStandalone`, `canNativeInstall`, `install()` |
| `components/PwaInstallBanner.tsx` | Crear | Card visual en color terciario, maneja iOS dialog |
| `app/(tabs)/index.tsx` | Modificar | Importar y renderizar `<PwaInstallBanner />` entre greeting y balance card |
| `locales/es.json` | Modificar | Agregar sección `pwaInstall` |
| `locales/en.json` | Modificar | Agregar sección `pwaInstall` |
| `locales/it.json` | Modificar | Agregar sección `pwaInstall` |

---

## Task 1: i18n — Agregar claves pwaInstall a los 3 locales

**Files:**
- Modify: `locales/es.json`
- Modify: `locales/en.json`
- Modify: `locales/it.json`

**Contexto:** Los archivos de locale son objetos JSON. La sección `cardForm` es la última. Agregar `pwaInstall` ANTES del cierre final `}` del objeto raíz, después de `cardForm`.

- [ ] **Step 1: Agregar a locales/es.json**

Buscar la llave `"cardForm"` en `locales/es.json`. Después del cierre `}` de `cardForm`, agregar una coma y la nueva sección. El archivo termina así actualmente:

```json
  "cardForm": {
    ...
    "saveError": "No se pudo guardar la tarjeta. Intenta de nuevo."
  }
}
```

Debe quedar:

```json
  "cardForm": {
    ...
    "saveError": "No se pudo guardar la tarjeta. Intenta de nuevo."
  },
  "pwaInstall": {
    "title": "Instala Spendiapp",
    "subtitle": "Agrégala a tu pantalla de inicio",
    "dialogTitle": "Cómo instalar en iOS",
    "dialogSteps": "1. Toca el ícono de compartir (cuadrado con flecha ↑)\n2. Selecciona \"Añadir a pantalla de inicio\"\n3. Toca \"Añadir\" para confirmar",
    "dialogButton": "Entendido"
  }
}
```

- [ ] **Step 2: Agregar a locales/en.json**

Mismo patrón. El archivo termina con `}` después del último bloque. Agregar antes del `}` final:

```json
  "pwaInstall": {
    "title": "Install Spendiapp",
    "subtitle": "Add it to your home screen",
    "dialogTitle": "How to install on iOS",
    "dialogSteps": "1. Tap the share icon (square with arrow ↑)\n2. Select \"Add to Home Screen\"\n3. Tap \"Add\" to confirm",
    "dialogButton": "Got it"
  }
```

- [ ] **Step 3: Agregar a locales/it.json**

```json
  "pwaInstall": {
    "title": "Installa Spendiapp",
    "subtitle": "Aggiungila alla schermata principale",
    "dialogTitle": "Come installare su iOS",
    "dialogSteps": "1. Tocca l'icona di condivisione (quadrato con freccia ↑)\n2. Seleziona \"Aggiungi alla schermata Home\"\n3. Tocca \"Aggiungi\" per confermare",
    "dialogButton": "Capito"
  }
```

- [ ] **Step 4: Validar JSON válido**

```bash
node -e "JSON.parse(require('fs').readFileSync('locales/es.json','utf8')); JSON.parse(require('fs').readFileSync('locales/en.json','utf8')); JSON.parse(require('fs').readFileSync('locales/it.json','utf8')); console.log('OK')"
```

Ejecutar desde `/Users/andresmancilla/Documents/GitHub/Spendiapp`.
Expected output: `OK`

- [ ] **Step 5: Commit**

```bash
git add locales/es.json locales/en.json locales/it.json
git commit -m "feat(i18n): add pwaInstall keys to all locales"
```

---

## Task 2: Hook usePwaInstall

**Files:**
- Create: `hooks/usePwaInstall.ts`

**Contexto:** Este hook solo corre en web. Detecta si la app está en modo standalone (ya instalada) usando dos métodos: `navigator.standalone` (iOS Safari) y `matchMedia('(display-mode: standalone)')` (Chrome/Android). Captura el evento `beforeinstallprompt` para trigger nativo en Android. Escucha `appinstalled` para saber cuándo se completó la instalación.

**IMPORTANTE:** `beforeinstallprompt` solo dispara en Chrome/Edge/Android. En iOS Safari este evento nunca dispara — por eso `canNativeInstall` será `false` en iOS y el componente mostrará el dialog manual.

- [ ] **Step 1: Crear hooks/usePwaInstall.ts**

Crear el archivo `/Users/andresmancilla/Documents/GitHub/Spendiapp/hooks/usePwaInstall.ts` con el siguiente contenido exacto:

```typescript
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function checkIsStandalone(): boolean {
  if (Platform.OS !== 'web') return true;
  if (typeof window === 'undefined') return false;
  if ((window.navigator as any).standalone === true) return true;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  return false;
}

export function usePwaInstall() {
  const [isStandalone, setIsStandalone] = useState(checkIsStandalone);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsStandalone(true);
      setDeferredPrompt(null);
    }
    return outcome === 'accepted';
  };

  return {
    isStandalone,
    canNativeInstall: !!deferredPrompt,
    install,
  };
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/andresmancilla/Documents/GitHub/Spendiapp && npx tsc --noEmit --skipLibCheck 2>&1 | grep usePwaInstall || echo "No errors in usePwaInstall"
```

Expected: `No errors in usePwaInstall`

- [ ] **Step 3: Commit**

```bash
git add hooks/usePwaInstall.ts
git commit -m "feat: add usePwaInstall hook for PWA standalone detection and install prompt"
```

---

## Task 3: Componente PwaInstallBanner

**Files:**
- Create: `components/PwaInstallBanner.tsx`

**Contexto:** Card compacta idéntica en estructura al banner `noCardsBanner` del home (`flexDirection: 'row'`, `borderLeftWidth: 3`, `borderRadius: 12`, `padding: 14`). Usa colores terciarios del tema. En iOS (sin `canNativeInstall`), al tocar muestra un `AppDialog` con instrucciones de texto. En Android (con `canNativeInstall`), al tocar llama `install()` del hook. Si `isStandalone === true`, retorna `null`.

El `AppDialog` existente acepta `description` como `string | ReactNode`. Para las instrucciones de iOS, se pasa el string de i18n `pwaInstall.dialogSteps` (que contiene `\n` para saltos de línea) directamente como string — AppDialog ya renderiza texto en un `<Text>`.

**IMPORTANTE:** Solo renderizar en `Platform.OS === 'web'`. Usar `if (Platform.OS !== 'web') return null` antes de llamar al hook no es válido (violaría las reglas de hooks). En su lugar, el hook ya maneja internamente el caso no-web retornando `isStandalone: true`, lo que causa que el componente retorne `null` de todas formas.

- [ ] **Step 1: Crear components/PwaInstallBanner.tsx**

Crear el archivo `/Users/andresmancilla/Documents/GitHub/Spendiapp/components/PwaInstallBanner.tsx` con el siguiente contenido exacto:

```tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { usePwaInstall } from '../hooks/usePwaInstall';
import AppDialog from './AppDialog';
import { Fonts } from '../config/fonts';

export default function PwaInstallBanner() {
  const { isStandalone, canNativeInstall, install } = usePwaInstall();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [dialogVisible, setDialogVisible] = useState(false);

  if (isStandalone) return null;

  const handlePress = async () => {
    if (canNativeInstall) {
      await install();
    } else {
      setDialogVisible(true);
    }
  };

  return (
    <>
      <AppDialog
        visible={dialogVisible}
        type="info"
        title={t('pwaInstall.dialogTitle')}
        description={t('pwaInstall.dialogSteps')}
        primaryLabel={t('pwaInstall.dialogButton')}
        onPrimary={() => setDialogVisible(false)}
      />

      <TouchableOpacity
        style={[
          styles.banner,
          {
            backgroundColor: colors.tertiaryLight,
            borderLeftColor: colors.tertiary,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Ionicons name="download-outline" size={24} color={colors.tertiaryDark} />
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('pwaInstall.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('pwaInstall.subtitle')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.tertiaryDark} />
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 3,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  textBlock: { flex: 1 },
  title: { fontSize: 14, fontFamily: Fonts.semiBold, marginBottom: 2 },
  subtitle: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 17 },
});
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/andresmancilla/Documents/GitHub/Spendiapp && npx tsc --noEmit --skipLibCheck 2>&1 | grep PwaInstall || echo "No errors in PwaInstallBanner"
```

Expected: `No errors in PwaInstallBanner`

- [ ] **Step 3: Commit**

```bash
git add components/PwaInstallBanner.tsx
git commit -m "feat: add PwaInstallBanner component with iOS dialog and Android native prompt"
```

---

## Task 4: Integrar banner en el Home

**Files:**
- Modify: `app/(tabs)/index.tsx`

**Contexto:** El home renderiza el contenido en un `ScrollView`. El contenido principal está dentro de `{!loading && !refreshing && <>...</>}`. La estructura actual es:

```
Greeting View
Balance Card View       ← insertar PwaInstallBanner ANTES de aquí
Income/Expenses Row
...
```

El banner debe aparecer entre el greeting y el balance card, dentro del bloque `!loading && !refreshing`.

- [ ] **Step 1: Agregar import de PwaInstallBanner**

En `app/(tabs)/index.tsx`, agregar el import de `PwaInstallBanner` junto a los otros imports de componentes. Actualmente los imports de componentes locales son:

```typescript
import { AddTransactionModal } from '../../components/AddTransactionModal';
...
import AppDialog from '../../components/AppDialog';
```

Agregar:

```typescript
import PwaInstallBanner from '../../components/PwaInstallBanner';
```

- [ ] **Step 2: Insertar el banner en el JSX**

En `app/(tabs)/index.tsx`, dentro del bloque `{!loading && !refreshing && <>`, localizar el comentario `{/* Balance card */}`. El bloque actualmente es:

```tsx
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={[styles.greetingHi, { color: colors.textSecondary }]}>
            {t('home.greeting', { name: displayName })}
          </Text>
          <Text style={[styles.greetingTitle, { color: colors.textPrimary }]}>
            {t('home.progressTitle')}
          </Text>
        </View>

        {/* Balance card */}
        <View style={[styles.balanceCard, { backgroundColor: colors.primaryDark }]}>
```

Insertar `<PwaInstallBanner />` entre el greeting y el balance card:

```tsx
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={[styles.greetingHi, { color: colors.textSecondary }]}>
            {t('home.greeting', { name: displayName })}
          </Text>
          <Text style={[styles.greetingTitle, { color: colors.textPrimary }]}>
            {t('home.progressTitle')}
          </Text>
        </View>

        {/* PWA Install Banner */}
        <PwaInstallBanner />

        {/* Balance card */}
        <View style={[styles.balanceCard, { backgroundColor: colors.primaryDark }]}>
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd /Users/andresmancilla/Documents/GitHub/Spendiapp && npx tsc --noEmit --skipLibCheck 2>&1 | head -20 || echo "Check output above"
```

Expected: Sin errores relacionados con PwaInstallBanner o index.tsx

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: integrate PwaInstallBanner in home screen between greeting and balance card"
```

---

## Orden de ejecución

1. **Task 1** (i18n) — sin dependencias
2. **Task 2** (hook) — sin dependencias, paralelo con Task 1
3. **Task 3** (componente) — requiere Task 1 y Task 2 completadas
4. **Task 4** (integración) — requiere Task 3 completada

---

## Self-Review

**Spec coverage:**
- ✅ Solo visible en web → `usePwaInstall` retorna `isStandalone: true` en no-web, banner retorna `null`
- ✅ Se oculta si ya está instalado → `checkIsStandalone()` detecta `navigator.standalone` e iOS `matchMedia`
- ✅ Android: native install prompt → `canNativeInstall` + `install()`
- ✅ iOS: AppDialog con instrucciones → `!canNativeInstall` → `setDialogVisible(true)`
- ✅ Posición: entre greeting y balance card → Task 4
- ✅ Color terciario → `colors.tertiaryLight` / `colors.tertiary` / `colors.tertiaryDark`
- ✅ i18n completo (es/en/it) → Task 1
- ✅ Desaparece al instalar → evento `appinstalled` → `setIsStandalone(true)`
- ✅ Persistente (no dismissable) → no hay botón de cerrar en el banner

**Placeholder scan:** Ninguno.

**Consistencia de tipos:** `usePwaInstall` retorna `{ isStandalone: boolean, canNativeInstall: boolean, install: () => Promise<boolean> }`. `PwaInstallBanner` consume exactamente estos. `install()` en Task 3 coincide con la firma definida en Task 2.
