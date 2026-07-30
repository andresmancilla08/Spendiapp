/**
 * Lógica pura del card de transacción: iniciales del amigo para el notch y elección de un color
 * de texto legible sobre un fondo tintado. Vive fuera del componente para poder comprobarse
 * sin React Native (ver `utils/txRelation.test.ts`).
 */

/** 1-2 iniciales en mayúscula. Itera por code point: un nombre con emoji partido por índice
 *  dejaría un surrogate suelto y el glifo se rompe. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  const firstCharOf = (s: string) => Array.from(s)[0] ?? '';
  const first = firstCharOf(parts[0]);
  const second = parts.length > 1 ? firstCharOf(parts[1]) : '';
  return (first + second).toUpperCase();
}

// ── Contraste ────────────────────────────────────────────────────────────────
// Las paletas pastel (cottonCandy, sakura, peach…) tienen `primary` clarísimo: usarlo como color
// de texto sobre un chip tintado da ratios de 1.5:1. Se mide y se elige el candidato legible.
// ponytail: math WCAG mínima, sin dependencias.

export const CHIP_ALPHA = 0.13;

function rgbOf(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function contrastRatio(a: string, b: string): number {
  const ra = rgbOf(a);
  const rb = rgbOf(b);
  if (!ra || !rb) return 0;
  const la = relLuminance(ra);
  const lb = relLuminance(rb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Primer candidato que llega a 4.5:1 sobre `bg`. Si ninguno llega (paletas pastel donde ni el
 * texto claro ni el oscuro pasan sobre el tinte), devuelve el de MAYOR contraste disponible.
 */
export function readableOn(bg: string, candidates: string[]): string {
  if (!rgbOf(bg)) return candidates[candidates.length - 1];
  let best = candidates[0];
  let bestRatio = -1;
  for (const c of candidates) {
    if (!rgbOf(c)) continue;
    const r = contrastRatio(c, bg);
    if (r >= 4.5) return c;
    if (r > bestRatio) {
      best = c;
      bestRatio = r;
    }
  }
  return best;
}

/** Mezcla `tint` al 13% sobre `rowBg` (el fondo REAL de la fila) y devuelve el hex resultante. */
export function tintedChipBg(tint: string, rowBg: string): string | null {
  const over = rgbOf(tint);
  const base = rgbOf(rowBg);
  if (!over || !base) return null;
  const blended = base.map((c, i) => Math.round(c * (1 - CHIP_ALPHA) + over[i] * CHIP_ALPHA));
  return `#${blended.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Color de texto legible para un chip tintado sobre el fondo real de la fila. */
export function readableChipText(tintCandidate: string, tint: string, rowBg: string, fallback: string): string {
  const bg = tintedChipBg(tint, rowBg);
  if (!bg) return fallback;
  return readableOn(bg, [tintCandidate, fallback]);
}
