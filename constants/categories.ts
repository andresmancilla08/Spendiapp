import type { Category } from '../types/category';

export const DEFAULT_CATEGORIES: Omit<Category, 'userId' | 'createdAt'>[] = [
  { id: 'food',          name: 'Comida',      icon: '🍽️', type: 'expense', isDefault: true },
  { id: 'transport',     name: 'Transporte',  icon: '🚗', type: 'expense', isDefault: true },
  { id: 'health',        name: 'Salud',       icon: '💊', type: 'expense', isDefault: true },
  { id: 'entertainment', name: 'Ocio',        icon: '🎉', type: 'expense', isDefault: true },
  { id: 'shopping',      name: 'Compras',     icon: '🛍️', type: 'expense', isDefault: true },
  { id: 'home',          name: 'Hogar',       icon: '🏡', type: 'expense', isDefault: true },
  { id: 'salary',        name: 'Salario',     icon: '💰', type: 'income',  isDefault: true },
  { id: 'other',         name: 'Otro',        icon: '📌', type: 'both',    isDefault: true },
];

export function filterCategories(
  transactionType: 'expense' | 'income',
  customCategories: Category[]
): (Omit<Category, 'userId' | 'createdAt'> | Category)[] {
  const defaults = DEFAULT_CATEGORIES.filter(c => c.type === transactionType || c.type === 'both');
  const custom = customCategories.filter(c => c.type === transactionType || c.type === 'both');
  return [...defaults, ...custom];
}

export function resolveCategory(
  id: string,
  customCategories: Category[]
): { icon: string; name: string } {
  const def = DEFAULT_CATEGORIES.find(c => c.id === id);
  if (def) return { icon: def.icon, name: def.name };
  const custom = customCategories.find(c => c.id === id);
  if (custom) return { icon: custom.icon, name: custom.name };
  return { icon: '📌', name: 'Otro' };
}
