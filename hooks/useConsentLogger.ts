import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * La marca local va POR USUARIO. Con una clave global, si dos cuentas comparten
 * dispositivo la segunda entraba sin aceptar nada: el atajo local respondía que sí
 * y no se llegaba a consultar Firestore ni a registrar el consentimiento.
 */
const consentKey = (uid?: string) =>
  uid ? `spendia_consent_accepted_${uid}` : 'spendia_consent_accepted';

export type AuthMethod = 'google' | 'email';

interface PendingConsent {
  authMethod: AuthMethod;
  platform: string;
  userAgent: string;
  termsVersion: string;
  privacyVersion: string;
}

let _pending: PendingConsent | null = null;

export function hasPendingConsent(): boolean {
  return _pending !== null;
}

export function setPendingConsent(method: AuthMethod) {
  const ua =
    Platform.OS === 'web'
      ? (typeof navigator !== 'undefined' ? navigator.userAgent : 'web')
      : `${Platform.OS} ${Platform.Version ?? ''}`.trim();

  _pending = {
    authMethod: method,
    platform: Platform.OS,
    userAgent: ua,
    termsVersion: '1.0',
    privacyVersion: '1.0',
  };
}

export async function hasAcceptedConsent(uid?: string): Promise<boolean> {
  // Fast path: local cache
  try {
    if ((await AsyncStorage.getItem(consentKey(uid))) === 'true') return true;
  } catch {}

  // Authoritative path: Firestore (persists across devices/reinstalls)
  if (uid) {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists() && snap.data()?.consentAccepted === true) {
        try { await AsyncStorage.setItem(consentKey(uid), 'true'); } catch {}
        return true;
      }
    } catch {}
  }

  return false;
}

export async function savePendingConsent(userId: string) {
  if (!_pending) return;
  const data = { ..._pending };
  _pending = null;
  try { await AsyncStorage.setItem(consentKey(userId), 'true'); } catch {}

  let ipAddress = 'unknown';
  if (Platform.OS === 'web') {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const json = await res.json();
      ipAddress = json.ip ?? 'unknown';
    } catch {}
  }

  const consentRecord = {
    userId,
    accepted: true,
    acceptedAt: serverTimestamp(),
    ipAddress,
    ...data,
  };

  // Audit log — colección consents (historial inmutable)
  try {
    await addDoc(collection(db, 'consents'), consentRecord);
  } catch {}

  // Fuente de verdad — users/{uid} para verificación cross-device
  try {
    await updateDoc(doc(db, 'users', userId), {
      consentAccepted: true,
      consentAcceptedAt: serverTimestamp(),
      consentTermsVersion: data.termsVersion,
      consentPrivacyVersion: data.privacyVersion,
      consentMethod: data.authMethod,
      consentPlatform: data.platform,
      consentIp: ipAddress,
    });
  } catch {}
}
