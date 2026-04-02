import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Category } from '../types/category';

export function useCategories(userId: string): { categories: Category[]; loading: boolean } {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const q = query(
      collection(db, 'categories'),
      where('userId', '==', userId),
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          userId: d['userId'] as string,
          name: d['name'] as string,
          icon: d['icon'] as string,
          type: d['type'] as Category['type'],
          isDefault: false,
          createdAt: (d['createdAt'] as Timestamp).toDate(),
        };
      });
      // Ordenar por fecha de creación en JS (evita requerir índice compuesto en Firestore)
      docs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      setCategories(docs);
      setLoading(false);
    }, (err) => {
      console.warn('useCategories error:', err.code, err.message);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { categories, loading };
}
