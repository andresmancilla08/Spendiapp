import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface FeatureFlags {
  maintenanceMode: boolean;
  registrationOpen: boolean;
  sharedTransactionsEnabled: boolean;
  expenseGroupsEnabled: boolean;
  goalsEnabled: boolean;
  cardsEnabled: boolean;
  friendsEnabled: boolean;
  budgetsEnabled: boolean;
  categoriesEnabled: boolean;
  reportsEnabled: boolean;
  notificationsEnabled: boolean;
  installmentsEnabled: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  maintenanceMode: false,
  registrationOpen: true,
  sharedTransactionsEnabled: true,
  expenseGroupsEnabled: true,
  goalsEnabled: true,
  cardsEnabled: true,
  friendsEnabled: true,
  budgetsEnabled: true,
  categoriesEnabled: true,
  reportsEnabled: true,
  notificationsEnabled: true,
  installmentsEnabled: true,
};

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, 'config', 'featureFlags');
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let unsub: (() => void) | null = null;

    const subscribe = () => {
      unsub = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            setFlags({ ...DEFAULT_FEATURE_FLAGS, ...(snap.data() as Partial<FeatureFlags>) });
          }
          setLoading(false);
        },
        () => {
          setLoading(false);
          // Re-intentar en 5s por si el error fue transitorio (ej. auth aún no resuelto)
          retryTimer = setTimeout(() => { unsub?.(); subscribe(); }, 5000);
        }
      );
    };

    subscribe();
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      unsub?.();
    };
  }, []);

  return { flags, loading };
}
