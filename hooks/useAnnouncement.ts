import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Announcement {
  message: string;
  type: 'info' | 'warning' | 'promo';
  active: boolean;
  cta?: string;
}

export function useAnnouncement() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    const ref = doc(db, 'config', 'announcement');
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) { setAnnouncement(null); return; }
      const data = snap.data() as Announcement;
      setAnnouncement(data.active ? data : null);
    }, () => setAnnouncement(null));
    return unsub;
  }, []);

  return announcement;
}
