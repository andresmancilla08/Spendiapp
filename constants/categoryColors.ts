/**
 * Colores de identidad para categorías (data-viz). Son fijos a propósito:
 * deben distinguirse entre sí, no seguir la paleta del tema.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  food: '#EF4444',
  transport: '#F59E0B',
  health: '#10B981',
  entertainment: '#8B5CF6',
  shopping: '#EC4899',
  home: '#00897B',
  salary: '#00ACC1',
  other: '#737879',
};

/** Paleta de respaldo para categorías personalizadas (sin color semántico). */
export const DONUT_PALETTE = ['#00ACC1', '#FFB74D', '#00A896', '#B39DDB', '#FF8E8E', '#9CCC65'];

export function categoryColor(id: string, index: number): string {
  return CATEGORY_COLORS[id] ?? DONUT_PALETTE[index % DONUT_PALETTE.length];
}
