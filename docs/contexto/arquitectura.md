# Arquitectura

**En una frase:** App de finanzas personales (Spendia) en Expo, web + iOS/Android, con Firebase.

## Stack
- **Runtime/Framework:** Expo + Expo Router. React Native + react-native-web. TypeScript.
- **Estado:** Zustand (`store/`). **i18n:** i18next + react-i18next (`locales/`).
- **Backend:** Firebase (Auth, Firestore) + **Cloud Functions** (`functions/`). `api/` para endpoints.
- **Extras:** expo-secure-store, expo-local-authentication (biométrico), expo-crypto, jspdf (+autotable), lottie.
- **Deploy:** export web Expo → Vercel (`vercel.json`); `npm run deploy`. iOS nativo (`ios/`, EAS `eas.json`).

## Mapa de carpetas
- `app/` — rutas: `(tabs)`, `(onboarding)`, `(auth)`. `components/`, `hooks/`, `context/`, `store/`.
- `functions/` — Cloud Functions (`functions/src`). `api/` — endpoints. `config/` — Firebase.
- `locales/` — i18n. `utils/`, `constants/`, `types/`. `scripts/` — build/PWA/reset-whats-new.
- `assets/` (incl. `assets/banks`). `email-preview/`, `hosting-public/` — recursos auxiliares.

## Flujo de datos
UI → store/hooks → Firestore (client SDK) o Cloud Functions (`functions/`) para lógica server → reglas `firestore.rules`. Auth con biometría local (expo-local-authentication) + secure-store.

## Lo que NO existe
- TODO: confirmar qué lógica vive en Functions vs cliente directo.
