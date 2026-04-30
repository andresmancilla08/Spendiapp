import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const CONSENT_KEY = 'spendia_consent_accepted';

export type AuthMethod = 'google' | 'email';

interface PendingConsent {
  authMethod: AuthMethod;
  platform: string;
  userAgent: string;
  termsVersion: string;
  privacyVersion: string;
}

let _pending: PendingConsent | null = null;

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

export async function hasAcceptedConsent(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CONSENT_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function savePendingConsent(userId: string) {
  if (!_pending) return;
  const data = { ..._pending };
  _pending = null;
  try { await AsyncStorage.setItem(CONSENT_KEY, 'true'); } catch {}

  let ipAddress = 'unknown';
  if (Platform.OS === 'web') {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const json = await res.json();
      ipAddress = json.ip ?? 'unknown';
    } catch {}
  }

  try {
    await addDoc(collection(db, 'consents'), {
      userId,
      accepted: true,
      acceptedAt: serverTimestamp(),
      ipAddress,
      ...data,
    });
  } catch {}
}
