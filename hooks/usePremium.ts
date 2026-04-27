import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import type { UserProfile } from '../types/friend';

export interface PremiumStatus {
  isPremium: boolean;
  isExpired: boolean;
  loading: boolean;
}

export function usePremium(): PremiumStatus {
  const { user } = useAuthStore();
  const [isPremium, setIsPremium] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setIsPremium(false);
      setIsExpired(false);
      setLoading(false);
      return;
    }
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) { setIsPremium(false); setIsExpired(false); setLoading(false); return; }
      const profile = snap.data() as UserProfile;
      const hasPremium = !!profile.isPremium;
      const expiry = profile.premiumExpiry;
      const expired = expiry ? expiry.toDate() < new Date() : false;
      setIsPremium(hasPremium && !expired);
      setIsExpired(hasPremium && expired);
      setLoading(false);
    }, () => { setIsPremium(false); setIsExpired(false); setLoading(false); });
    return unsub;
  }, [user?.uid]);

  return { isPremium, isExpired, loading };
}
