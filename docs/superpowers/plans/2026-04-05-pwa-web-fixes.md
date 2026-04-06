# PWA Web Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir 4 problemas en el despliegue web/PWA de Spendiapp: Google Sign-in en Safari standalone, PIN descentrado, scroll extra en pantallas de auth, y ausencia de PWA instalable en iOS.

**Architecture:** Cada fix es independiente y toca archivos distintos. El fix de Google usa `signInWithRedirect` + `getRedirectResult` para compatibilidad con Safari standalone. El scroll y PIN son correcciones de estilos React Native web. La PWA requiere un `+html.tsx` con meta tags Apple y un ícono en `public/`.

**Tech Stack:** React Native Web, Expo Router, Firebase Auth Web SDK v9, TypeScript

---

## File Map

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `hooks/useGoogleSignIn.ts` | Modificar | Cambiar `signInWithPopup` → `signInWithRedirect` |
| `app/_layout.tsx` | Modificar | Llamar `getRedirectResult` al montar en web |
| `components/PinInput.tsx` | Modificar | Agregar `alignSelf: 'stretch'` al row |
| `app/(auth)/login.tsx` | Modificar | `overflow: 'hidden'` para cortar blobs |
| `app/(auth)/login-email.tsx` | Modificar | `overflow: 'hidden'` + fix scroll |
| `app/(auth)/register.tsx` | Modificar | `overflow: 'hidden'` + fix scroll |
| `app/+html.tsx` | Crear | Meta tags Apple PWA |
| `public/apple-touch-icon.png` | Crear | Ícono 180×180 para iOS |

---

## Task 1: Google Sign-in con Redirect (Safari PWA compatible)

**Problema:** `signInWithPopup` no funciona en Safari en modo standalone (PWA). Safari bloquea popups en apps instaladas. Al hacer click en Google, abre algo, vuelve y no hay sesión porque el popup fue bloqueado silenciosamente.

**Solución:** `signInWithRedirect` redirige a Google y vuelve a la app. `getRedirectResult` en `_layout.tsx` completa el flujo cuando Firebase detecta que viene de un redirect.

**Files:**
- Modify: `hooks/useGoogleSignIn.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Actualizar useGoogleSignIn.ts**

Reemplazar el bloque `promptAsync` en `hooks/useGoogleSignIn.ts`. El import cambia de `signInWithPopup` a `signInWithRedirect`:

```typescript
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential, signInWithRedirect } from 'firebase/auth';
import { auth } from '../config/firebase';

if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

const IOS_CLIENT = '859030212165-v702d1qr3aat8qr6ug2m0o0f338rla7b.apps.googleusercontent.com';
const ANDROID_CLIENT = '859030212165-oaco2j799adi2r2fpbdo3u1q5qdj3s3n.apps.googleusercontent.com';

export function useGoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, nativePromptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: IOS_CLIENT,
    androidClientId: ANDROID_CLIENT,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (response?.type === 'success') {
      const { id_token } = response.params;
      setLoading(true);
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .catch(() => setError('Error al iniciar sesión con Google'))
        .finally(() => setLoading(false));
    }
  }, [response]);

  const promptAsync = async () => {
    if (Platform.OS === 'web') {
      setLoading(true);
      try {
        // signInWithRedirect funciona en Safari standalone (PWA)
        // getRedirectResult en _layout.tsx completa el flujo al volver
        await signInWithRedirect(auth, new GoogleAuthProvider());
      } catch {
        setError('Error al iniciar sesión con Google');
        setLoading(false);
      }
      return;
    }
    nativePromptAsync();
  };

  return {
    promptAsync,
    request: Platform.OS === 'web' ? true : request,
    loading: Platform.OS === 'web' ? loading : (loading || !request),
    error,
  };
}
```

- [ ] **Step 2: Agregar getRedirectResult en _layout.tsx**

Agregar import de `getRedirectResult` y un `useEffect` que se ejecuta solo en web. Cuando Firebase detecta que la app volvió de un redirect de Google, completa el sign-in. El `onAuthStateChanged` ya existente detectará el usuario automáticamente.

Agregar al inicio del archivo junto a los otros imports de Firebase:
```typescript
import { getRedirectResult } from 'firebase/auth';
```

Agregar dentro del componente `RootLayout`, antes del return, el siguiente useEffect (después de los useEffects existentes):
```typescript
// Completa el flujo de signInWithRedirect cuando Firebase vuelve de Google
useEffect(() => {
  if (Platform.OS !== 'web') return;
  getRedirectResult(auth).catch(() => {
    // Silenciar errores de redirect (e.g. usuario canceló)
  });
}, []);
```

- [ ] **Step 3: Verificar en Vercel**

Después de deploy, en Safari iOS (PWA instalada):
1. Abrir la app
2. Tocar "Continuar con Google"
3. Debe redirigir a accounts.google.com
4. Tras autenticar, debe volver a la app y entrar al home

**Nota:** En desarrollo local no funciona el redirect porque Google OAuth requiere un dominio registrado. Solo probar en Vercel.

- [ ] **Step 4: Commit**

```bash
git add hooks/useGoogleSignIn.ts app/_layout.tsx
git commit -m "fix: use signInWithRedirect for Google auth on web/PWA iOS"
```

---

## Task 2: Centrar el PIN Input en web

**Problema:** El `View` que contiene los 4 inputs del PIN no se expande al ancho completo de su parent en web. En RN web, un `View` sin `width` explícita no siempre ocupa el 100% del padre, por lo que `justifyContent: 'center'` centra dentro de un contenedor más chico que la pantalla.

**Files:**
- Modify: `components/PinInput.tsx`

- [ ] **Step 1: Agregar alignSelf al row style**

En `components/PinInput.tsx`, el style `row` actualmente es:
```typescript
row: {
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 16,
},
```

Cambiarlo a:
```typescript
row: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignSelf: 'stretch',
  gap: 16,
},
```

`alignSelf: 'stretch'` hace que el View ocupe el ancho completo del parent, permitiendo que `justifyContent: 'center'` centre correctamente los 4 inputs dentro de la pantalla.

- [ ] **Step 2: Verificar visualmente**

Probar en el navegador (web) y en la PWA instalada en iOS:
- Pantalla de registro: los 4 cuadros del PIN deben estar centrados horizontalmente
- Pantalla de login con email: igual
- Verificar que en Android nativo también se vea centrado (no debe cambiar)

- [ ] **Step 3: Commit**

```bash
git add components/PinInput.tsx
git commit -m "fix: center PIN input boxes on web by stretching row container"
```

---

## Task 3: Eliminar scroll extra en pantallas de auth

**Problema:** En web, las pantallas de login, login-email y register tienen un espacio blanco en la parte inferior que permite hacer scroll innecesario. La causa principal son los blobs decorativos con `position: 'absolute'` y coordenadas negativas (e.g. `bottom: -60`, `right: -60`) que crean overflow fuera del contenedor. En RN nativo esto no importa, pero en web genera scrollable content.

**Files:**
- Modify: `app/(auth)/login.tsx`
- Modify: `app/(auth)/login-email.tsx`
- Modify: `app/(auth)/register.tsx`

- [ ] **Step 1: Fix overflow en login.tsx**

En `app/(auth)/login.tsx`, el style `gradient` es:
```typescript
gradient: {
  flex: 1,
},
```

Cambiarlo a:
```typescript
gradient: {
  flex: 1,
  overflow: 'hidden',
},
```

Esto hace que los blobs absolutos (`blobTopRight` con `top: -80` y `blobBottomLeft` con `bottom: -60`) queden cortados dentro del LinearGradient sin crear scroll.

- [ ] **Step 2: Fix overflow en login-email.tsx**

En `app/(auth)/login-email.tsx`, el style `gradient` es:
```typescript
gradient: { flex: 1 },
```

Cambiarlo a:
```typescript
gradient: { flex: 1, overflow: 'hidden' },
```

- [ ] **Step 3: Fix overflow en register.tsx**

En `app/(auth)/register.tsx`, el style `gradient` es:
```typescript
gradient: { flex: 1 },
```

Cambiarlo a:
```typescript
gradient: { flex: 1, overflow: 'hidden' },
```

- [ ] **Step 4: Verificar en web y nativo**

Probar cada pantalla en el navegador:
- Login: No debe haber scroll. Los blobs deben verse parcialmente cortados en los bordes (comportamiento correcto).
- Login-email: No debe haber espacio blanco debajo del botón "Continuar".
- Register: No debe haber espacio blanco debajo del botón "Continuar".
- Verificar en Android nativo que las pantallas siguen viéndose igual.

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/login.tsx app/(auth)/login-email.tsx app/(auth)/register.tsx
git commit -m "fix: hide overflow on auth screens to prevent extra scroll on web"
```

---

## Task 4: PWA instalable en iOS (meta tags Apple)

**Problema:** iOS Safari requiere meta tags específicos de Apple para tratar una web app como PWA instalable. El `manifest.json` con `display: standalone` es ignorado parcialmente por Safari — necesita `apple-mobile-web-app-capable` y un `apple-touch-icon` para mostrar la opción "Agregar a pantalla de inicio" correctamente con ícono y sin barra de navegación.

**Files:**
- Create: `app/+html.tsx`
- Create: `public/apple-touch-icon.png` (copiar desde assets/icon.png)

- [ ] **Step 1: Crear la carpeta public y copiar el ícono**

Expo Router sirve automáticamente los archivos en `public/` como estáticos en la raíz del sitio web (e.g. `public/apple-touch-icon.png` → `https://spendiapp-uhgv.vercel.app/apple-touch-icon.png`).

```bash
mkdir -p /Users/andresmancilla/Documents/GitHub/Spendiapp/public
cp /Users/andresmancilla/Documents/GitHub/Spendiapp/assets/icon.png \
   /Users/andresmancilla/Documents/GitHub/Spendiapp/public/apple-touch-icon.png
```

El ícono original en `assets/icon.png` es de 1024×1024px. iOS lo redimensiona automáticamente, pero si quieres el tamaño óptimo (180×180 para iPhone Retina), usar:
```bash
# Requiere imagemagick instalado: brew install imagemagick
convert assets/icon.png -resize 180x180 public/apple-touch-icon.png
```

- [ ] **Step 2: Crear app/+html.tsx**

Expo Router usa este archivo como template HTML para todas las páginas web. Crear `app/+html.tsx` con el siguiente contenido:

```tsx
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * HTML template para la PWA web.
 * Agrega meta tags específicos de Apple para instalación en iOS.
 * https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/* PWA: iOS Safari específico */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Spendiapp" />

        {/* Ícono para iOS al agregar a pantalla de inicio */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Reset de estilos para ScrollView de Expo */}
        <ScrollViewStyleReset />

        {/* Evitar scroll del body en web (Expo Router lo maneja internamente) */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                height: 100%;
                overflow: hidden;
              }
              #root {
                height: 100%;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Nota sobre el CSS inline:** El `overflow: hidden` en `html, body` elimina el scroll del nivel del documento en web, lo que resuelve también cualquier scroll residual que no haya sido cubierto por Task 3. Expo Router usa su propio sistema de scroll interno.

- [ ] **Step 3: Verificar que app.json tiene la configuración correcta**

El `app.json` ya tiene en la sección `web`:
```json
"web": {
  "display": "standalone",
  "themeColor": "#00ACC1",
  "backgroundColor": "#FFFFFF",
  "name": "Spendiapp",
  "shortName": "Spendiapp"
}
```

Esto es correcto. Expo genera el `manifest.json` automáticamente a partir de estos valores.

- [ ] **Step 4: Deploy a Vercel y probar instalación**

Después del deploy:
1. En iPhone, abrir Safari y navegar a `https://spendiapp-uhgv.vercel.app`
2. Tocar el botón de compartir (cuadrado con flecha hacia arriba)
3. Debe aparecer la opción **"Agregar a pantalla de inicio"**
4. Al agregar, el ícono debe ser el logo de Spendiapp (no un screenshot)
5. Al abrir la app desde la pantalla de inicio, debe abrirse en modo fullscreen sin barra de Safari

- [ ] **Step 5: Commit**

```bash
git add app/+html.tsx public/apple-touch-icon.png
git commit -m "feat: add Apple PWA meta tags and touch icon for iOS installation"
```

---

## Orden de Ejecución Recomendado

1. **Task 2** (PIN centrado) — más fácil, sin dependencias
2. **Task 3** (scroll extra) — fácil, mismo patrón en 3 archivos
3. **Task 4** (PWA instalable) — crear 2 archivos nuevos
4. **Task 1** (Google Sign-in) — solo testeable en producción

---

## Self-Review

**Cobertura de spec:**
- ✅ Google Sign-in no funciona → Task 1 (signInWithRedirect)
- ✅ PIN no centrado → Task 2 (alignSelf: 'stretch')
- ✅ Scroll extra en login y login-email → Task 3 (overflow: 'hidden')
- ✅ PWA no instalable → Task 4 (+html.tsx + apple-touch-icon)

**Placeholders:** Ninguno — todos los steps tienen código completo.

**Consistencia de tipos:** No hay interfaces nuevas. Los cambios son en estilos y lógica de autenticación con tipos ya existentes de Firebase.
