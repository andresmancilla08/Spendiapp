/**
 * Pide la foto de perfil al TAMAÑO al que se va a pintar.
 *
 * Todas las fotos vienen de `lh3.googleusercontent.com` con `=s96-c`, es decir
 * 96×96 px. En un iPhone la pantalla es de 3×: el avatar de 60 pt del perfil
 * necesita 180 px reales y recibía 96, así que el navegador lo ampliaba. De ahí
 * el "blur" que se veía en las barras superiores de TODA la app — no era el
 * sistema ni el fondo, era una imagen pequeña estirada. En el navegador de
 * escritorio (1× o 2×) 96 px bastaban y por eso no se notaba.
 *
 * Google sirve cualquier tamaño cambiando ese parámetro, sin coste ni API: basta
 * pedir `=s180-c`. Para el resto de URLs se devuelve tal cual.
 */

/** Tope: más allá de esto solo se gastan datos. */
const MAX_PX = 512;
/** Densidad asumida. 3 es la de los iPhone actuales; pedir de más a una pantalla
 *  2× cuesta unos pocos KB, pedir de menos se ve borroso, que es lo que pasaba. */
const DEFAULT_DPR = 3;

export function avatarUrl(
  url: string | null | undefined,
  sizePt: number,
  dpr: number = DEFAULT_DPR,
): string | undefined {
  if (!url) return undefined;
  if (!/(^|\.)googleusercontent\.com/.test(url)) return url;

  // A múltiplos de 32: Google cachea por tamaño y no tiene sentido pedir 97 y 98.
  const px = Math.min(MAX_PX, Math.max(96, Math.ceil((sizePt * dpr) / 32) * 32));

  if (/=s\d+(-c)?/.test(url)) return url.replace(/=s\d+(-c)?/, `=s${px}-c`);
  if (url.includes('=')) return url; // otro formato con parámetros: no tocar
  return `${url}=s${px}-c`;
}

if (require.main === module) {
  // npx tsx utils/avatarUrl.ts
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const assert: typeof import('assert').strict = require('assert').strict;
  const g = 'https://lh3.googleusercontent.com/a/ACg8ocABC';

  assert.equal(avatarUrl(`${g}=s96-c`, 32), `${g}=s96-c`, '32pt×3 = 96, no hace falta más');
  assert.equal(avatarUrl(`${g}=s96-c`, 60), `${g}=s192-c`, '60pt×3 = 180 → 192');
  assert.equal(avatarUrl(`${g}=s96-c`, 40), `${g}=s128-c`);
  assert.equal(avatarUrl(`${g}=s96`, 60), `${g}=s192-c`, 'también sin el -c');
  assert.equal(avatarUrl(g, 60), `${g}=s192-c`, 'sin parámetro se añade');
  assert.equal(avatarUrl(`${g}=s96-c`, 400), `${g}=s512-c`, 'tope de 512');
  assert.equal(avatarUrl('https://otro.host/foto.jpg', 60), 'https://otro.host/foto.jpg');
  assert.equal(avatarUrl(null, 60), undefined);
  assert.equal(avatarUrl(`${g}=s96-c`, 60, 1), `${g}=s96-c`, 'en 1× no se pide de más');

  console.log('avatarUrl OK');
}
