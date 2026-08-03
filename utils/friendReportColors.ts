/**
 * Color del reporte entre amigos — la ÚNICA fuente para la pantalla y para el
 * documento que se comparte.
 *
 * Los dos lados salen de la paleta que el usuario tiene elegida: `primary` es él y
 * `tertiary` —o el token que de verdad se distinga— la otra persona. Antes eran dos
 * hex escritos a mano (el cian y el lima de Deep Water), iguales para las 32 paletas.
 *
 * Vive aparte de los componentes porque no depende de React Native: así el gate de
 * contraste (`utils/reportPalette.test.ts`) puede recorrer las 32 paletas en Node.
 */
import { readableOn, readableTint, mixHex, colorDistance } from './contrast';
import type { AppColors } from '../config/colors';

type Tokens = Record<string, string | undefined>;

/** Candidatos para el lado ajeno, por orden de preferencia. */
const OTHER_KEYS = ['tertiary', 'secondary', 'success', 'info', 'achievement', 'warning', 'expense'] as const;

/**
 * Color de "la otra persona". Normalmente `tertiary`, pero en varias paletas
 * (nordic, mint, peachPastel, mochaPastel…) `tertiary` es casi el mismo color que
 * `primary` —hasta 12 puntos de distancia sobre 441— y los dos lados del reporte
 * dejarían de leerse como dos. Cuando eso pasa gana el token de la paleta que MÁS
 * se aleja del propio: sigue siendo su paleta, pero se distingue.
 */
function otherToken(tokens: Tokens, bg: string): string {
  const mine = readableTint(tokens.primary ?? '#00BCD4', bg, 3);
  const scored = OTHER_KEYS
    .filter((k) => tokens[k])
    .map((k) => ({ color: tokens[k]!, d: colorDistance(mine, readableTint(tokens[k]!, bg, 3)) }));
  if (!scored.length) return '#C0CA33';
  // Por orden de preferencia, el primero que ya se distinga; el rojo de gasto y el
  // ámbar de aviso van al final porque arrastran significado ajeno al reporte.
  const clear = scored.find((s) => s.d >= 70);
  return (clear ?? scored.reduce((best, s) => (s.d > best.d ? s : best), scored[0])).color;
}

/**
 * Identidad de cada lado en PANTALLA (sigue el modo claro/oscuro de la app).
 *
 * Los tonos crudos no sirven tal cual: en claro, medidos sobre `surface` (#FFFFFF
 * en las 32 paletas) el cian de Deep Water da 2,74:1 y su lima 1,79:1, y las
 * pastel bajan a ~1,2:1. `readableTint` los acerca al blanco o al negro solo hasta
 * pasar el ratio y CONSERVA el tono: dos grises legibles se leerían como el mismo
 * lado, que es justo lo que la pieza tiene que distinguir.
 */
export function sideColors(colors: AppColors) {
  const bg = colors.surface;
  const other = otherToken(colors as Tokens, bg);
  const mineFill = readableTint(colors.primary, bg, 3);      // rellenos y carriles: 3:1
  const theirsFill = readableTint(other, bg, 3);
  return {
    mine: readableTint(colors.primary, bg, 4.5),             // texto: 4,5:1
    theirs: readableTint(other, bg, 4.5),
    mineFill,
    theirsFill,
    // Tinta sobre el relleno (avatares, chips): la que de verdad se lea encima.
    onMine: readableOn(mineFill, ['#0A1416', '#FFFFFF']),
    onTheirs: readableOn(theirsFill, ['#0A1416', '#FFFFFF']),
  };
}

/**
 * Colores del DOCUMENTO. Salen de la misma paleta, siempre en su variante oscura:
 * la pieza se va a leer en un chat ajeno, así que no sigue el modo claro/oscuro de
 * la app, pero sí su color.
 */
export interface ReportPalette {
  bg: string;
  panel: string;
  hairline: string;
  /** Carriles, ejes y mástil: portan significado, así que necesitan 3:1 (WCAG 1.4.11). */
  graphic: string;
  ink: string;
  inkSoft: string;
  inkDim: string;
  mine: string;      // tú
  theirs: string;    // la otra persona
  onMine: string;
  onTheirs: string;
  gradTop: string;
  gradBottom: string;
}

/** Deep Water en oscuro — lo que se dibujaba antes de que la paleta contara. */
export const DEFAULT_REPORT_PALETTE: ReportPalette = {
  bg: '#0B1618', panel: '#101E22', hairline: '#22353A', graphic: '#5C686B',
  ink: '#EEF6F8', inkSoft: '#9EABAF', inkDim: '#7E9198',
  mine: '#00BCD4', theirs: '#C0CA33', onMine: '#04252B', onTheirs: '#1E2200',
  gradTop: '#0E2126', gradBottom: '#0A1315',
};

/** Traduce los tokens oscuros de una paleta a los colores del documento. */
export function reportPalette(dark: Record<string, string | undefined>): ReportPalette {
  const D = DEFAULT_REPORT_PALETTE;
  const bg = dark.background ?? D.bg;
  const ink = dark.textPrimary ?? D.ink;
  const inkDim = dark.textTertiary ?? D.inkDim;
  // Los dos lados se distinguen por el TONO, no por el brillo: se aclaran sobre el
  // fondo oscuro solo hasta pasar 4,5:1, sin volverse blancos.
  const mine = readableTint(dark.primary ?? D.mine, bg, 4.5);
  const theirs = readableTint(otherToken(dark, bg), bg, 4.5);
  return {
    bg,
    panel: dark.surface ?? D.panel,
    hairline: dark.border ?? D.hairline,
    graphic: readableTint(inkDim, bg, 3),
    ink,
    inkSoft: dark.textSecondary ?? D.inkSoft,
    inkDim,
    mine,
    theirs,
    onMine: readableOn(mine, [bg, ink]),
    onTheirs: readableOn(theirs, [bg, ink]),
    gradTop: mixHex(bg, mine, 0.12),
    gradBottom: mixHex(bg, '#000000', 0.25),
  };
}
