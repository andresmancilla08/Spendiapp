import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, Timestamp, doc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Category } from '../types/category';
import { isCategoryIcon, EMOJI_TO_ICON, FALLBACK_ICON } from '../constants/categoryIconData';

/**
 * Categorías guardadas con emoji (todo lo anterior al catálogo de iconos) → clave
 * del catálogo. Se hace una sola vez por sesión y en un batch: el snapshot que
 * dispara la escritura vuelve a entrar aquí, y sin el guard sería un bucle.
 */
async function migrateEmojiIcons(docs: Category[]): Promise<void> {
  const pending = docs.filter((c) => c.icon && !isCategoryIcon(c.icon));
  if (pending.length === 0) return;
  const batch = writeBatch(db);
  for (const c of pending) {
    batch.update(doc(db, 'categories', c.id), { icon: EMOJI_TO_ICON[c.icon] ?? FALLBACK_ICON });
  }
  await batch.commit();
}

export function useCategories(userId: string): { categories: Category[]; loading: boolean } {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const migrated = useRef(false);

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
      if (!migrated.current) {
        migrated.current = true;
        migrateEmojiIcons(docs).catch((err) => {
          console.warn('useCategories: migración de iconos falló:', err?.code, err?.message);
        });
      }
    }, (err) => {
      console.warn('useCategories error:', err.code, err.message);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { categories, loading };
}
