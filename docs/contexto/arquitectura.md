# Arquitectura

**En una frase:** App de finanzas personales (Spendia) en Expo, hoy publicada como PWA web y con el salto a iOS/Android planificado, sobre Firebase.

## Stack
- **Runtime/Framework:** Expo + Expo Router. React Native + react-native-web. TypeScript.
- **Estado:** Zustand (`store/`). **i18n:** i18next + react-i18next (`locales/`).
- **Backend:** Firebase (Auth, Firestore) + **Cloud Functions** (`functions/`). `api/` para endpoints.
- **Extras:** expo-crypto, jspdf (+autotable). **Iconos:** `@tabler/icons-react-native`, siempre vía `components/AppIcon.tsx` — ninguna otra librería de iconos.
- **Deploy:** export web Expo → Vercel (`vercel.json`); `npm run deploy`. Bundle web ÚNICO de ~8,5 MB (`vercel.json` reescribe todo a `/index.html`): dividirlo por rutas exige rehacer el despliegue, ver `decisiones.md`.
- **Nativo:** perfiles EAS listos (`eas.json`), bundle IDs `com.spendiapp`; `ios/` y `android/` están en `.gitignore` (generación nativa continua). Lo que falta para publicar está en `docs/checklist-tiendas.md`.
- **Movimiento:** `components/fx/` — `FxLayer` (animación por compositor), `SoftOrb` (bordes difusos sin blur), `hooks/useIsActive.ts` (pausa en segundo plano).

## Mapa de carpetas
- `app/` — rutas: `(tabs)`, `(onboarding)`, `(auth)`. `components/`, `hooks/`, `context/`, `store/`.
- `functions/` — Cloud Functions (`functions/src`). `api/` — endpoints. `config/` — Firebase.
- `locales/` — i18n. `utils/`, `constants/`, `types/`. `scripts/` — build/PWA/reset-whats-new.
- `assets/` (incl. `assets/banks`). `email-preview/`, `hosting-public/` — recursos auxiliares.

## Flujo de datos
UI → store/hooks → Firestore (client SDK) o Cloud Functions (`functions/`) para lógica server → reglas `firestore.rules`.

## Lo que NO existe
- **Biometría.** El producto es web (PWA): `expo-local-authentication` no funciona en el navegador, así que el subsistema entero (hook nativo + su stub `.web`, pantalla `biometric-lock`, gate en `_layout`, toggle en Perfil, `biometricLocked` del store y sus 28 claves i18n) se eliminó en 2.53.1. Volver a añadirlo solo tiene sentido junto con una build nativa.
- **Otras librerías de iconos.** Ni `@expo/vector-icons` ni Ionicons/Material/FontAwesome: solo Tabler a través de `AppIcon`.
- `expo-secure-store`, `expo-blur`, `expo-status-bar`, `lottie-react-native`, `react-native-qrcode-svg`: instaladas y sin un solo import; fuera en 2.53.1. `StatusBar` se usa desde `react-native`, y la pantalla de pago no dibuja ningún QR.
- TODO: confirmar qué lógica vive en Functions vs cliente directo.
