/**
 * Gate de color del reporte entre amigos. Correr con:
 *   npx tsx utils/reportPalette.test.ts
 *
 * Los dos lados (tú / la otra persona) salen de la paleta elegida, así que el
 * contraste ya no está garantizado por dos hex escritos a mano: se comprueba en
 * las 32 paletas, en claro y en oscuro, que cada lado se lee Y que los dos siguen
 * siendo distinguibles entre sí.
 */
import assert from 'node:assert';
import { PALETTES } from '../config/palettes';
import { colorDistance, contrastRatio, readableTint } from './contrast';
import { reportPalette, sideColors } from './friendReportColors';

/**
 * Dos lados se distinguen por DISTANCIA de color, no por contraste: el cian y el
 * oliva de Deep Water en claro tienen casi la misma luminancia (ratio 1,05) y aun
 * así nadie los confunde. Se mide la distancia en RGB, sobre un máximo de 441.
 */
const distinguishable = (a: string, b: string) => colorDistance(a, b) >= 60;

for (const p of PALETTES) {
  for (const mode of ['light', 'dark'] as const) {
    const colors = p.colors[mode];
    const c = sideColors(colors);
    const where = `${p.id}/${mode}`;

    assert.ok(contrastRatio(c.mine, colors.surface) >= 4.4, `${where}: "tú" como texto (${c.mine})`);
    assert.ok(contrastRatio(c.theirs, colors.surface) >= 4.4, `${where}: la otra persona como texto (${c.theirs})`);
    assert.ok(contrastRatio(c.mineFill, colors.surface) >= 2.9, `${where}: relleno "tú" (${c.mineFill})`);
    assert.ok(contrastRatio(c.theirsFill, colors.surface) >= 2.9, `${where}: relleno de la otra persona (${c.theirsFill})`);
    assert.ok(contrastRatio(c.onMine, c.mineFill) >= 4.4, `${where}: inicial sobre el avatar propio`);
    assert.ok(contrastRatio(c.onTheirs, c.theirsFill) >= 4.4, `${where}: inicial sobre el avatar ajeno`);
    assert.ok(distinguishable(c.mineFill, c.theirsFill), `${where}: los dos lados se ven iguales (${c.mineFill})`);
  }

  // El documento va siempre en oscuro, con la paleta del usuario.
  const doc = reportPalette(p.colors.dark);
  assert.ok(contrastRatio(doc.mine, doc.bg) >= 4.4, `${p.id}/doc: "tú" (${doc.mine})`);
  assert.ok(contrastRatio(doc.theirs, doc.bg) >= 4.4, `${p.id}/doc: la otra persona (${doc.theirs})`);
  assert.ok(contrastRatio(doc.graphic, doc.bg) >= 2.9, `${p.id}/doc: carriles y ejes (${doc.graphic})`);
  assert.ok(contrastRatio(doc.ink, doc.bg) >= 4.4, `${p.id}/doc: tinta (${doc.ink})`);
  assert.ok(contrastRatio(doc.onMine, doc.mine) >= 4.4, `${p.id}/doc: inicial sobre el avatar propio`);
  assert.ok(contrastRatio(doc.onTheirs, doc.theirs) >= 4.4, `${p.id}/doc: inicial sobre el avatar ajeno`);
  assert.ok(distinguishable(doc.mine, doc.theirs), `${p.id}/doc: los dos lados se ven iguales (${doc.mine})`);
}

// readableTint no debe tocar lo que ya se lee, y sí lo que no.
assert.equal(readableTint('#00838F', '#FFFFFF', 4.5).toUpperCase(), '#00838F');
assert.ok(contrastRatio(readableTint('#F8BBD0', '#FFFFFF', 4.5), '#FFFFFF') >= 4.4);

console.log(`OK — ${PALETTES.length} paletas × claro/oscuro + documento`);
