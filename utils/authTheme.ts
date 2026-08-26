/**
 * Tokens de las pantallas de autenticación.
 *
 * Nada se hardcodea: la app tiene 31 paletas de usuario, así que el teal accesible
 * y su tinta se DERIVAN de la paleta activa. Con la paleta por defecto el resultado
 * es #007A8A sobre blanco (5.06:1) y #00BCD4 sobre el fondo oscuro (7.74:1) — el
 * `colors.primary` crudo daba 2.30:1 y no pasaba AA ni en claro ni en oscuro, que es
 * el motivo por el que el CTA y el enlace "¿Olvidaste tu PIN?" se veían apagados.
 */
import { readableTint, readableOn, mixHex } from './contrast';

export interface AuthTokens {
  /** Acción principal de la portada. Es el texto de la app, no la marca. */
  ink: string;
  onInk: string;
  /** Acción principal de las pantallas de formulario, ya legible. */
  accent: string;
  onAccent: string;
  /** Campos: relleno, trazo en reposo y trazo con foco. */
  fieldBg: string;
  fieldLine: string;
  fieldLineFocus: string;
  /** Fondo suave de marca: badge del candado, iconos de la portada. */
  soft: string;
  /**
   * Relleno del botón secundario. NO es `surfaceSecondary` a secas: en 51 de las 60
   * combinaciones de paleta y modo ese token queda por debajo de 1.3:1 contra el
   * fondo de la pantalla, así que el botón se lee como texto suelto en vez de como
   * botón. Aquí se separa del fondo lo justo, conservando el tono de la paleta.
   */
  secondaryBg: string;
}

export function authTokens(
  colors: Record<string, string | undefined>,
  isDark: boolean,
): AuthTokens {
  const bg = colors.background ?? (isDark ? '#0D1A1C' : '#FFFFFF');
  const primary = colors.primary ?? '#00BCD4';
  const ink = colors.textPrimary ?? (isDark ? '#EEF6F8' : '#1A2428');
  const accent = readableTint(primary, bg, 4.5);
  return {
    ink,
    onInk: readableOn(ink, [bg, '#FFFFFF', '#000000']),
    accent,
    onAccent: readableOn(accent, ['#FFFFFF', ink, '#000000']),
    fieldBg: colors.inputBackground ?? (isDark ? '#1A2C30' : '#F5F9FA'),
    // Trazo de marca, claro a propósito: es la forma que se eligió para el campo.
    // Es decorativo — quien delimita el campo de verdad es el relleno; con el foco
    // el trazo sube a 2px con `fieldLineFocus`, que sí es legible.
    fieldLine: mixHex(primary, bg, isDark ? 0.74 : 0.58),
    fieldLineFocus: accent,
    soft: mixHex(primary, bg, isDark ? 0.86 : 0.88),
    secondaryBg: readableTint(colors.surfaceSecondary ?? bg, bg, 1.35),
  };
}
