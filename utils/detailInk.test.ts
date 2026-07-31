/**
 * Comprueba que las tintas del detalle de transacción pasan 4.5:1 (3:1 para la
 * cifra grande) en LAS 31 PALETAS × 2 MODOS. Sin esto, el rediseño solo estaría
 * verificado en `deepWater` oscuro, que es justo donde ya se veía bien.
 *
 *   npx tsx utils/detailInk.test.ts
 */
import assert from 'node:assert';
import { PALETTES } from '../config/palettes';
import { contrastRatio } from './contrast';
import { amountInk, blend, inkOn, inkOnFill } from './detailInk';

let checks = 0;
const failures: string[] = [];

function expect(label: string, ink: string, bg: string, min: number) {
  checks++;
  const r = contrastRatio(ink, bg);
  if (r < min) failures.push(`${label}: ${r.toFixed(2)}:1 (mín ${min}) — ${ink} sobre ${bg}`);
}

for (const p of PALETTES) {
  for (const mode of ['light', 'dark'] as const) {
    const c = p.colors[mode] as Record<string, string>;
    const where = `${p.id}/${mode}`;
    const surface = c.surfaceElevated;

    // Cifra héroe (40px, bold) — gasto e ingreso
    expect(`${where} monto gasto`, amountInk(surface, c.expense), surface, 3);
    expect(`${where} monto ingreso`, amountInk(surface, c.secondary), surface, 3);

    // Kicker y sello: texto pequeño del mismo tono que el monto
    expect(`${where} kicker gasto`, inkOn(surface, c.expense), surface, 4.5);
    expect(`${where} sello fijo`, inkOn(surface, c.primary), surface, 4.5);
    expect(`${where} sello neutro`, inkOn(surface, c.textTertiary), surface, 4.5);

    // Etiquetas y valores de ficha
    expect(`${where} etiqueta`, inkOn(surface, c.textTertiary), surface, 4.5);
    expect(`${where} texto secundario`, inkOn(surface, c.textSecondary), surface, 4.5);
    expect(`${where} valor`, c.textPrimary, surface, 4.5);

    // Pill de reparto: tinte sólido del primary sobre la superficie de la ficha
    const pillBg = blend(c.primary, surface, 0.14);
    expect(`${where} pill`, inkOn(pillBg, c.primary), pillBg, 4.5);

    // Nota: tinte de lima sólido
    const noteBg = blend(c.tertiary, surface, 0.1);
    expect(`${where} nota cuerpo`, inkOn(noteBg, c.textSecondary), noteBg, 4.5);
    expect(`${where} nota etiqueta`, inkOn(noteBg, c.textTertiary), noteBg, 4.5);

    // Botones: primario (fondo de marca), destructivo y aviso de bloqueo
    expect(`${where} CTA primario`, inkOnFill(c.primary, c.onPrimary, c.textPrimary), c.primary, 4.5);
    expect(`${where} CTA destructivo`, inkOnFill(c.error, '#FFFFFF', c.textPrimary), c.error, 4.5);
    const lockBg = blend(c.primary, c.surface, 0.1);
    expect(`${where} aviso bloqueo`, inkOn(lockBg, c.primary), lockBg, 4.5);

    // Botón secundario: etiqueta de marca sobre la superficie plana
    expect(`${where} CTA secundario`, inkOn(c.surface, c.primary), c.surface, 4.5);

    // Barra de progreso y relleno de la barra de categoría. WCAG 1.4.11 pide 3:1
    // para un gráfico que transmite información: en las paletas pastel el primary
    // crudo se quedaba en 1,04-1,18:1 sobre el carril (invisible), así que el
    // relleno también se deriva con la escalera medida.
    const track = blend(c.textTertiary, surface, 0.28);
    expect(`${where} barra progreso`, inkOn(track, c.primary), track, 3);
    expect(`${where} barra categoría`, inkOn(track, c.expense), track, 3);
  }
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} de ${checks} comprobaciones por debajo del mínimo:\n`);
  failures.forEach((f) => console.error('  · ' + f));
  process.exit(1);
}
assert.ok(checks > 0);
console.log(`✓ detailInk: ${checks} pares texto/fondo miden por encima del mínimo en ${PALETTES.length} paletas × 2 modos`);
