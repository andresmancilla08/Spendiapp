import { initializeApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, browserPopupRedirectResolver, type Persistence } from 'firebase/auth';
import * as firebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS
    : process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID,
};

const app = initializeApp(firebaseConfig);

/** `getReactNativePersistence` solo lo declara la entrada React Native del SDK
 *  (`@firebase/auth/dist/index.rn.d.ts`); resolviendo `firebase/auth` para web no
 *  existe en los tipos y el import estático rompía el typecheck. Se lee del módulo
 *  en runtime, que es cuando Metro ya ha resuelto la entrada nativa. */
const getReactNativePersistence = (firebaseAuth as unknown as {
  getReactNativePersistence?: (storage: unknown) => Persistence;
}).getReactNativePersistence;

export const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web' || !getReactNativePersistence
    ? browserLocalPersistence
    : getReactNativePersistence(AsyncStorage),
  popupRedirectResolver: Platform.OS === 'web'
    ? browserPopupRedirectResolver
    : undefined,
});

export const db = getFirestore(app);
export const functions = getFunctions(app);
