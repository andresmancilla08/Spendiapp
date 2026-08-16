import type { AppColors } from '../config/colors';
import type { PaletteDefinition } from '../config/palettes';

/**
 * Construye una paleta completa —unos sesenta colores, en claro y en oscuro— a
 * partir de tres decisiones que una persona sí puede tomar.
 *
 * Nadie elige sesenta colores a mano, y pedirlos sería la forma más rápida de
 * que el editor no se usara nunca. Lo que sí se puede elegir es un color
 * principal, cómo acompañarlo y si se quiere vivo o suave; el resto —fondos,
 * superficies, textos, bordes, manchas del fondo animado— sale de ahí por
 * armonía cromática, igual que están construidas las paletas del sistema.
 *
 * Todos los neutros se tiñen ligeramente con el matiz elegido: un gris puro
 * junto a un color saturado se ve sucio, y esa pizca de tinte es lo que hace
 * que una paleta parezca diseñada y no ensamblada.
 */

export type SecondaryMode = 'analogous' | 'complementary' | 'triadic';
export type PaletteFeel = 'vivid' | 'soft';

export interface DerivePaletteInput {
  /** Matiz del color principal, 0–360. */
  hue: number;
  secondaryMode: SecondaryMode;
  feel: PaletteFeel;
}

/** Paleta creada por el usuario, tal como se guarda. */
export interface CustomPalette extends DerivePaletteInput {
  /** `custom_<epoch>` — nunca choca con los ids del sistema. */
  id: string;
  name: string;
  /** Epoch ms de creación, para ordenarlas. */
  createdAt: number;
}

// ── Conversión de color ──────────────────────────────────────────────────────

/** HSL → hex. h en 0–360, s y l en 0–100. */
export function hsl(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  const [r, g, b] =
    hh < 60 ? [c, x, 0] :
    hh < 120 ? [x, c, 0] :
    hh < 180 ? [0, c, x] :
    hh < 240 ? [0, x, c] :
    hh < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/** hex → HSL. Se usa para leer un color pegado por el usuario. */
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  let v = hex.trim().replace('#', '');
  if (v.length === 3) v = v.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(v)) return null;
  const n = parseInt(v, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return { h: 0, s: 0, l: Math.round(l * 100) };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r ? 60 * (((g - b) / d) % 6) :
    max === g ? 60 * ((b - r) / d + 2) :
                60 * ((r - g) / d + 4);
  return { h: Math.round(((h % 360) + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Luminancia relativa (WCAG) a partir de un hex. */
function luminance(hex: string): number {
  const v = hex.replace('#', '');
  const n = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v, 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** Razón de contraste entre dos colores, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Acerca `color` a blanco o a negro hasta que contrasta lo pedido sobre `bg`.
 *
 * Es la red de seguridad del editor: un usuario puede elegir un amarillo
 * precioso que sobre fondo blanco no se lee. En vez de prohibirle el color, se
 * ajusta la luminosidad del texto hasta que la cifra sea legible.
 */
function ensureContrast(color: string, bg: string, min: number): string {
  if (contrastRatio(color, bg) >= min) return color;
  const parsed = hexToHsl(color);
  if (!parsed) return color;
  // Se prueban las DOS direcciones: alejarse del fondo por el lado que primero
  // funcione. Probar solo una dejaba sin solución los tonos medios, donde no hay
  // margen hacia ese lado pero sí hacia el contrario.
  const first = luminance(bg) > 0.5 ? -1 : 1;
  for (const dir of [first, -first]) {
    for (let step = 1; step <= 25; step++) {
      const l = parsed.l + dir * step * 4;
      if (l < 0 || l > 100) break;
      const next = hsl(parsed.h, parsed.s, l);
      if (contrastRatio(next, bg) >= min) return next;
    }
  }
  // Último recurso: el extremo que mejor contraste dé.
  return contrastRatio('#FFFFFF', bg) >= contrastRatio('#111111', bg) ? '#FFFFFF' : '#111111';
}

/** Texto que va ENCIMA de un color de marca. No se busca un tono intermedio: o
 *  blanco o la tinta oscura de la paleta, el que más contraste dé. Un texto
 *  sobre un botón tiene que ser rotundo, no ajustado al mínimo. */
function onColor(bg: string, ink: string): string {
  return contrastRatio('#FFFFFF', bg) >= contrastRatio(ink, bg) ? '#FFFFFF' : ink;
}

// ── Derivación ───────────────────────────────────────────────────────────────

const OFFSETS: Record<SecondaryMode, [number, number]> = {
  analogous: [30, 60],
  complementary: [180, 210],
  triadic: [120, 240],
};

/** Contraste mínimo para texto normal (WCAG AA). */
const AA = 4.5;

export function derivePalette(input: DerivePaletteInput, id: string): PaletteDefinition {
  const { hue: h, secondaryMode, feel } = input;
  const [offA, offB] = OFFSETS[secondaryMode];
  const h2 = h + offA;
  const h3 = h + offB;

  // "Vivo" satura y oscurece el color base; "suave" lo aclara y lo desatura.
  const S = feel === 'vivid' ? 70 : 45;
  const L = feel === 'vivid' ? 48 : 60;

  const primary = hsl(h, S, L);
  const secondary = hsl(h2, S - 10, L + 3);
  const tertiary = hsl(h3, S - 15, L + 6);

  // ── CLARO ──
  const lightBg = hsl(h, 8, 99);
  const lightSurface = '#FFFFFF';
  const lightInk = hsl(h, 25, 12);
  const light: AppColors = {
    primary, primaryLight: hsl(h, S - 25, L + 34), primaryDark: hsl(h, S + 5, L - 14),
    onPrimary: onColor(primary, lightInk),
    secondary, secondaryLight: hsl(h2, S - 25, L + 32), secondaryDark: hsl(h2, S, L - 16),
    onSecondary: onColor(secondary, lightInk),
    tertiary, tertiaryLight: hsl(h3, S - 28, L + 33), tertiaryDark: hsl(h3, S, L - 18),
    onTertiary: onColor(tertiary, lightInk),
    error: '#EF4444', errorLight: '#FEE2E2',
    success: hsl(150, 55, 36), successLight: hsl(150, 45, 92),
    warning: '#F59E0B', warningLight: '#FEF3C7', warningDark: '#B45309',
    info: primary, infoLight: hsl(h, S - 25, L + 34),
    expense: '#FF6B6B', expenseLight: '#FFF0F0',
    achievement: '#F59E0B',
    background: lightBg,
    backgroundSecondary: hsl(h, 10, 96),
    surface: lightSurface,
    surfaceSecondary: hsl(h, 12, 95),
    surfaceElevated: hsl(h, 9, 97),
    textPrimary: lightInk,
    textSecondary: ensureContrast(hsl(h, 12, 42), lightSurface, AA),
    textTertiary: ensureContrast(hsl(h, 10, 50), lightSurface, 3),
    textInverse: '#FFFFFF',
    border: hsl(h, 16, 89),
    borderFocus: primary,
    inputBackground: hsl(h, 10, 97),
    inputBorder: hsl(h, 14, 86),
    overlay: 'rgba(0,0,0,0.45)', overlayLight: 'rgba(0,0,0,0.3)',
  };

  // ── OSCURO ──
  // El color base se aclara: sobre un fondo casi negro, el mismo tono se lee
  // apagado y pierde el carácter que tenía en claro.
  const dPrimary = hsl(h, Math.min(S + 8, 85), Math.min(L + 12, 66));
  const dSecondary = hsl(h2, Math.min(S, 78), Math.min(L + 12, 64));
  const dTertiary = hsl(h3, Math.min(S, 75), Math.min(L + 16, 68));
  const darkSurface = hsl(h, 18, 10);
  const dark: AppColors & { surfaceOverlay: string } = {
    primary: dPrimary, primaryLight: hsl(h, 45, 14), primaryDark: hsl(h, S + 5, L + 2),
    onPrimary: onColor(dPrimary, hsl(h, 25, 10)),
    secondary: dSecondary, secondaryLight: hsl(h2, 42, 13), secondaryDark: hsl(h2, S, L),
    onSecondary: onColor(dSecondary, hsl(h, 25, 10)),
    tertiary: dTertiary, tertiaryLight: hsl(h3, 40, 12), tertiaryDark: hsl(h3, S, L + 2),
    onTertiary: onColor(dTertiary, hsl(h, 25, 10)),
    error: '#F87171', errorLight: '#3D1515',
    success: hsl(150, 50, 52), successLight: hsl(150, 40, 12),
    warning: '#FBBF24', warningLight: '#2D1F00', warningDark: '#F59E0B',
    info: dPrimary, infoLight: hsl(h, 45, 14),
    expense: '#FF8E8E', expenseLight: '#3D1515',
    achievement: '#FBBF24',
    background: hsl(h, 18, 7),
    backgroundSecondary: hsl(h, 18, 9),
    surface: darkSurface,
    surfaceSecondary: hsl(h, 18, 13),
    surfaceElevated: hsl(h, 18, 14),
    surfaceOverlay: hsl(h, 18, 17),
    textPrimary: ensureContrast(hsl(h, 15, 94), darkSurface, AA),
    textSecondary: ensureContrast(hsl(h, 12, 68), darkSurface, AA),
    textTertiary: ensureContrast(hsl(h, 10, 58), darkSurface, 3),
    textInverse: hsl(h, 25, 12),
    border: hsl(h, 20, 18),
    borderFocus: dPrimary,
    inputBackground: hsl(h, 18, 12),
    inputBorder: hsl(h, 20, 20),
    overlay: 'rgba(0,0,0,0.65)', overlayLight: 'rgba(0,0,0,0.5)',
  };

  // Las manchas del fondo animado rotan entre las tres familias en tres
  // luminosidades — es como están hechas las del sistema.
  const blobHues = [h, h2, h3, h, h2, h3];
  const auroraDark = blobHues.map((bh, i) => [
    hsl(bh, 60 - (i % 3) * 6, 42 - (i % 3) * 6),
    hsl(bh, 55 - (i % 3) * 6, 24 - (i % 3) * 4),
  ] as [string, string]);
  const auroraLight = blobHues.map((bh, i) => [
    hsl(bh, 55 - (i % 3) * 8, 86 - (i % 3) * 3),
    hsl(bh, 50 - (i % 3) * 8, 78 - (i % 3) * 3),
  ] as [string, string]);

  return {
    id: id as PaletteDefinition['id'],
    previewColors: [primary, secondary, tertiary],
    gradientLight: [hsl(h, 30, 99), hsl(h, 32, 96), hsl(h, 38, 92)],
    gradientDark: [hsl(h, 30, 8), hsl(h, 40, 12), hsl(h, 45, 17)],
    auroraBlobs: { dark: auroraDark, light: auroraLight },
    colors: { light, dark },
  };
}

/** Comprueba los pares que de verdad tienen que leerse. Lo usa el editor para
 *  avisar, y la prueba de humo de abajo para no romperlo sin enterarse. */
export function paletteContrastReport(p: PaletteDefinition) {
  const l = p.colors.light;
  const d = p.colors.dark;
  return [
    { pair: 'texto claro', ratio: contrastRatio(l.textPrimary, l.surface), min: AA },
    { pair: 'texto secundario claro', ratio: contrastRatio(l.textSecondary, l.surface), min: AA },
    { pair: 'texto oscuro', ratio: contrastRatio(d.textPrimary, d.surface), min: AA },
    { pair: 'texto secundario oscuro', ratio: contrastRatio(d.textSecondary, d.surface), min: AA },
    { pair: 'texto sobre primario', ratio: contrastRatio(l.onPrimary, l.primary), min: 3 },
  ];
}
