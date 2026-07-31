/**
 * Tintas MEDIDAS para el detalle de transacción.
 *
 * Por qué existe: el rediseño del detalle usa cifras grandes de color, chips sobre
 * tinte y botones con fondo de marca. Con hex fijos se leía bien en `deepWater`
 * oscuro y se rompía en el resto — medido: el monto `expense` sobre superficie
 * clara da 2,78:1 y el texto blanco sobre el cian de marca 2,30:1, ambos por
 * debajo del mínimo. Y hay 31 paletas × 2 modos, así que mantener excepciones a
 * mano no es viable: se mide y se elige, igual que `utils/txRelation` para las
 * filas del historial.
 *
 * Sin imports de React Native a propósito, para poder testearlo:
 *   npx tsx utils/detailInk.test.ts
 */
import { contrastRatio, readableOn } from './contrast';

const HEX = /^#([0-9a-f]{6})$/i;

function channels(hex: string): [number, number, number] | null {
  const m = HEX.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  const p = (c: number) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
  return `#${p(r)}${p(g)}${p(b)}`;
}

/** Compone `fg` al `alpha` dado sobre `bg` y devuelve un color SÓLIDO.
 * Se usa para los fondos tintados (nota en lima, pill, botón de icono): al ser
 * sólidos, su contraste se puede medir de verdad en vez de asumirlo. */
export function blend(fg: string, bg: string, alpha: number): string {
  const f = channels(fg);
  const b = channels(bg);
  if (!f || !b) return bg;
  const a = Math.max(0, Math.min(1, alpha));
  return toHex([f[0] * a + b[0] * (1 - a), f[1] * a + b[1] * (1 - a), f[2] * a + b[2] * (1 - a)]);
}

/** Oscurece multiplicando los canales (factor < 1). */
export function darken(hex: string, factor: number): string {
  const c = channels(hex);
  if (!c) return hex;
  return toHex([c[0] * factor, c[1] * factor, c[2] * factor]);
}

/** Aclara acercando los canales al blanco (amount 0-1). */
export function lighten(hex: string, amount: number): string {
  const c = channels(hex);
  if (!c) return hex;
  const a = Math.max(0, Math.min(1, amount));
  return toHex([c[0] + (255 - c[0]) * a, c[1] + (255 - c[1]) * a, c[2] + (255 - c[2]) * a]);
}

/**
 * Tinta legible que CONSERVA el tono de `base`: prueba el color tal cual y, si no
 * llega a 4.5:1 sobre `bg`, va oscureciéndolo (fondos claros) o aclarándolo
 * (fondos oscuros) hasta que pase. Devuelve el primero que cumple; si ninguno
 * llega, `readableOn` devuelve el de mayor contraste.
 */
export function inkOn(bg: string, base: string): string {
  const bgCh = channels(bg);
  const bgIsDark = bgCh ? (0.2126 * bgCh[0] + 0.7152 * bgCh[1] + 0.0722 * bgCh[2]) / 255 < 0.5 : false;
  const ladder = bgIsDark
    ? [base, lighten(base, 0.18), lighten(base, 0.34), lighten(base, 0.5), lighten(base, 0.66), '#FFFFFF']
    : [base, darken(base, 0.78), darken(base, 0.6), darken(base, 0.46), darken(base, 0.34), darken(base, 0.24), '#000000'];
  return readableOn(bg, ladder);
}

/** Tinta para texto SOBRE un fondo de marca sólido (botón primario, chip activo).
 * Prueba primero el `onColor` del tema y cae al texto oscuro/claro que sí se lea. */
export function inkOnFill(fill: string, onColor: string, darkInk: string, lightInk = '#FFFFFF'): string {
  return readableOn(fill, [onColor, darkInk, lightInk, '#000000']);
}

/** Cifra grande (≥24px bold): el mínimo WCAG baja a 3:1, pero se exige 4.5 y solo
 * se acepta 3:1 si la escalera no alcanza — así el monto nunca queda flojo. */
export function amountInk(bg: string, base: string): string {
  const ink = inkOn(bg, base);
  return contrastRatio(ink, bg) >= 3 ? ink : readableOn(bg, [ink, '#000000', '#FFFFFF']);
}
