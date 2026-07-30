import { DEFAULT_CATEGORIES } from '../constants/categories';

/**
 * Categoría segura para escribir en la transacción de OTRO usuario (mirror de un
 * gasto compartido, o el ingreso que recibe un amigo).
 *
 * Las categorías personalizadas son docs privados en `categories` (las reglas
 * solo permiten leer las propias): un id ajeno no significa nada en la app del
 * amigo y se pintaría como texto crudo. Tampoco sirve una categoría por defecto
 * del tipo equivocado (p. ej. `food` en un ingreso, que ni aparece en su
 * selector). En ambos casos cae a `other`, que existe para todos y sirve para
 * ingresos y gastos.
 */
export function categoryForOtherUser(categoryId: string, type: 'expense' | 'income'): string {
  const def = DEFAULT_CATEGORIES.find((c) => c.id === categoryId);
  if (!def) return 'other';
  return def.type === type || def.type === 'both' ? def.id : 'other';
}
