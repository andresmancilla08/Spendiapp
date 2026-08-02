import type { Category } from '../types/category';
// Desde los DATOS, no desde el módulo de componentes: `categoryIcons` arrastra
// @tabler/icons-react-native y dejaba sin poder ejecutarse los tests que
// importan constantes de categorías en Node.
import { FALLBACK_ICON } from './categoryIconData';

export const DEFAULT_CATEGORIES: Omit<Category, 'userId' | 'createdAt'>[] = [
  { id: 'food',          name: 'Comida',      icon: 'tools-kitchen', type: 'expense', isDefault: true },
  { id: 'transport',     name: 'Transporte',  icon: 'car',           type: 'expense', isDefault: true },
  { id: 'health',        name: 'Salud',       icon: 'pill',          type: 'expense', isDefault: true },
  { id: 'entertainment', name: 'Ocio',        icon: 'confetti',      type: 'expense', isDefault: true },
  { id: 'shopping',      name: 'Compras',     icon: 'shopping-bag',  type: 'expense', isDefault: true },
  { id: 'home',          name: 'Hogar',       icon: 'home',          type: 'expense', isDefault: true },
  { id: 'salary',        name: 'Salario',     icon: 'cash',          type: 'income',  isDefault: true },
  { id: 'other',         name: 'Otro',        icon: 'pin',           type: 'both',    isDefault: true },
];

export function filterCategories(
  transactionType: 'expense' | 'income',
  customCategories: Category[]
): (Omit<Category, 'userId' | 'createdAt'> | Category)[] {
  const defaults = DEFAULT_CATEGORIES.filter(c => c.type === transactionType || c.type === 'both');
  const custom = customCategories.filter(c => c.type === transactionType || c.type === 'both');
  return [...defaults, ...custom];
}

/**
 * Etiqueta localizada de una categoría: usa i18n (`categories.names.<id>`) para
 * las categorías por defecto y el nombre del usuario para las personalizadas.
 * Respeta el idioma activo (no hardcodea español).
 */
export function categoryLabel(
  id: string,
  customCategories: Category[],
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const def = DEFAULT_CATEGORIES.find((c) => c.id === id);
  if (def) return t(`categories.names.${id}`, { defaultValue: def.name });
  // Id desconocido (categoría personalizada de OTRO usuario en un mirror viejo,
  // o borrada): mostrar "Otro" localizado, nunca el id crudo.
  return customCategories.find((c) => c.id === id)?.name
    ?? t('categories.names.other', { defaultValue: 'Otro' });
}

export function resolveCategory(
  id: string,
  customCategories: Category[]
): { icon: string; name: string } {
  const def = DEFAULT_CATEGORIES.find(c => c.id === id);
  if (def) return { icon: def.icon, name: def.name };
  const custom = customCategories.find(c => c.id === id);
  if (custom) return { icon: custom.icon, name: custom.name };
  return { icon: FALLBACK_ICON, name: 'Otro' };
}
