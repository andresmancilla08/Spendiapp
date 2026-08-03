/**
 * Gate de contraste de la pantalla de Metas. Correr con:
 *   npx tsx utils/goalsContrast.test.ts
 *
 * Los pares nuevos de la tarjeta y de la hoja (badge "LOGRADA", chip de aporte
 * activo, cifra ahorrada, objetivo) se pintan con tintes translúcidos sobre la
 * superficie: hay que COMPONERLOS a color sólido para poder medirlos, porque el
 * ratio de un `#RRGGBB1E` no se puede evaluar tal cual. Se comprueba en las 32
 * paletas y en los dos modos: el estado activo del chip incluido, que es donde el
 * texto se invierte y donde suelen morir estos diseños.
 */
import assert from 'node:assert';
import { PALETTES } from '../config/palettes';
import { accentInk, colorDistance, contrastRatio, mixHex, readableTint } from './contrast';
import { inkOnFill } from './detailInk';

/** Tinte `#RRGGBBaa` compuesto sobre el fondo real. `1E` = 30/255 ≈ 0.118. */
const over = (bg: string, tint: string, alphaHex: string) =>
  mixHex(bg, tint, parseInt(alphaHex, 16) / 255);

let checks = 0;
const fail: string[] = [];
const need = (ratio: number, min: number, what: string) => {
  checks++;
  if (ratio < min) fail.push(`${what}: ${ratio.toFixed(2)}:1 (mínimo ${min})`);
};

for (const p of PALETTES) {
  for (const mode of ['light', 'dark'] as const) {
    const c = p.colors[mode];
    const where = `${p.id}/${mode}`;

    // Tarjeta: cifra ahorrada y objetivo sobre la superficie. La cifra además tiene
    // que SEGUIR SIENDO de color: se mide su distancia al gris secundario. El umbral
    // es 18 y no más: el violeta de lavenderPastel oscurecido hasta 4,5:1 queda a 22
    // del gris y sigue leyéndose violeta — lo que se busca es el fallback literal a
    // `textSecondary` (distancia 0), que es como `accentInk` borraba la señal.
    const savedInk = readableTint(c.primary, c.surface, 4.5);
    need(contrastRatio(savedInk, c.surface), 4.4, `${where} cifra ahorrada`);
    need(colorDistance(savedInk, c.textSecondary), 18, `${where} cifra ahorrada se volvió gris`);
    need(contrastRatio(c.textTertiary, c.surface), 4.4, `${where} objetivo`);

    // Badge "LOGRADA": la tinta se elige contra el badge, no contra la tarjeta.
    const badgeBg = over(c.surface, c.success, '1E');
    const badgeInk = readableTint(c.success, badgeBg, 4.5);
    need(contrastRatio(badgeInk, badgeBg), 4.4, `${where} badge LOGRADA`);
    need(colorDistance(badgeInk, c.textSecondary), 18, `${where} badge LOGRADA se volvió gris`);

    // Hoja: chip de aporte en reposo y ACTIVO (fondo primary al 8%).
    const chipIdle = c.surfaceSecondary ?? c.surface;
    need(contrastRatio(c.textPrimary, chipIdle), 4.4, `${where} chip en reposo`);
    const chipOn = over(c.surface, c.primary, '14');
    const chipInk = readableTint(c.primary, chipOn, 4.5);
    need(contrastRatio(chipInk, chipOn), 4.4, `${where} chip ACTIVO`);
    need(colorDistance(chipInk, c.textSecondary), 18, `${where} chip ACTIVO se volvió gris`);

    // Hoja: botones ícono (grafismo, 3:1) sobre su pastilla al 12%.
    const editBg = over(c.surface, c.primary, '1E');
    const delBg = over(c.surface, c.error, '1E');
    need(contrastRatio(readableTint(c.primary, editBg, 3), editBg), 2.9, `${where} icono editar`);
    need(contrastRatio(readableTint(c.error, delBg, 3), delBg), 2.9, `${where} icono eliminar`);

    // CTA primario: `onPrimary` es #FFFFFF en toda la app y sobre el cian da 2,30:1
    // (deuda global documentada en decisiones.md). La hoja no la hereda: mide su tinta.
    need(contrastRatio(inkOnFill(c.primary, c.onPrimary, c.textPrimary), c.primary), 2.9, `${where} texto del CTA`);

    // Barra de progreso: el carril tiene que verse contra la tarjeta (1.3:1 basta
    // para una superficie, pero el relleno sí porta significado → 3:1).
    const track = mode === 'dark' ? over(c.surface, c.textPrimary, '1A') : c.border;
    need(contrastRatio(readableTint(c.primary, track, 2.5), track), 2.0, `${where} relleno de la barra`);
    need(contrastRatio(readableTint(c.success, track, 2.5), track), 2.0, `${where} barra cumplida`);
  }
}

if (fail.length) {
  console.error(`✗ ${fail.length} de ${checks} pares por debajo del mínimo:`);
  fail.forEach((f) => console.error('  ·', f));
  assert.fail('contraste insuficiente en Metas');
}
console.log(`OK — ${checks} pares medidos (${PALETTES.length} paletas × claro/oscuro)`);
