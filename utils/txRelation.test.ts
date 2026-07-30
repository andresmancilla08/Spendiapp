/**
 * Self-check sin framework: `npx tsx utils/txRelation.test.ts`
 * (o `node --experimental-strip-types utils/txRelation.test.ts`).
 */
import assert from 'node:assert/strict';
import { initialsOf, readableOn, readableChipText, contrastRatio, tintedChipBg } from './txRelation';

// ── initialsOf ───────────────────────────────────────────────────────────────
assert.equal(initialsOf('Andrés Mancilla'), 'AM');
assert.equal(initialsOf('Beatriz'), 'B');
assert.equal(initialsOf('  mariana   castañeda '), 'MC');
assert.equal(initialsOf(''), '·');
assert.equal(initialsOf('   '), '·');
// Emoji: por code point, nunca un surrogate suelto (Array.from lo mantiene entero).
assert.equal(initialsOf('😀 Juan'), '😀J');
assert.equal([...initialsOf('😀 Juan')].length, 2);

// ── readableOn ───────────────────────────────────────────────────────────────
// Sobre fondo oscuro gana el candidato claro (el primero que pasa 4.5:1).
assert.equal(readableOn('#221530', ['#F472B6', '#F5EEF8']), '#F472B6');
// Sobre rosa pastel el tinte no se lee → cae al texto oscuro.
assert.equal(readableOn('#FDEEF6', ['#F472B6', '#1E1028']), '#1E1028');
// Si NINGUNO llega a 4.5:1, devuelve el de mayor contraste, no el último del array.
// #00897B: blanco 4.32:1, #1A2428 3.67:1 → debe ganar el blanco.
assert.equal(readableOn('#00897B', ['#FFFFFF', '#FFFFFF', '#1A2428']), '#FFFFFF');
// Hex inválido → último candidato, sin excepción.
assert.equal(readableOn('rgba(0,0,0,0.5)', ['#F472B6', '#1E1028']), '#1E1028');

// ── readableChipText ─────────────────────────────────────────────────────────
// cottonCandy dark, chip primary: el tinte oscuro sí se lee sobre el fondo mezclado.
assert.equal(readableChipText('#F472B6', '#F9A8D4', '#221530', '#F5EEF8'), '#F472B6');
// cottonCandy light: primaryDark sobre el chip da ~2.4:1 → textPrimary.
assert.equal(readableChipText('#F472B6', '#F9A8D4', '#FFFFFF', '#1E1028'), '#1E1028');
// Lo que devuelva se lee sobre el chip real, también en fila pagada (fondo `primaryLight`).
const CASES: Array<{ rowBg: string; fallback: string }> = [
  { rowBg: '#221530', fallback: '#F5EEF8' }, // cottonCandy dark · surface
  { rowBg: '#4A1035', fallback: '#F5EEF8' }, // cottonCandy dark · pagada
  { rowBg: '#FFFFFF', fallback: '#1E1028' }, // cottonCandy light · surface
  { rowBg: '#FCE7F3', fallback: '#1E1028' }, // cottonCandy light · pagada
  { rowBg: '#162428', fallback: '#EEF6F8' }, // deepWater dark · surface
  { rowBg: '#003840', fallback: '#EEF6F8' }, // deepWater dark · pagada
];
for (const { rowBg, fallback } of CASES) {
  const picked = readableChipText('#F472B6', '#F9A8D4', rowBg, fallback);
  const chipBg = tintedChipBg('#F9A8D4', rowBg)!;
  const ratio = contrastRatio(picked, chipBg);
  assert.ok(ratio >= 4.5, `chip ilegible sobre ${rowBg}: ${picked} da ${ratio.toFixed(2)}:1`);
}

// ── Notch: el relleno cae al tono oscuro cuando el tono medio no admite texto legible ──────
// deepWater light secondary: #00897B da como máximo 4.32:1; #005F56 llega a 7.58:1 con blanco.
for (const [tint, deep, surface, textPrimary] of [
  ['#00897B', '#005F56', '#FFFFFF', '#1A2428'], // deepWater light · secondary (el caso que fallaba)
  ['#00ACC1', '#00838F', '#FFFFFF', '#1A2428'], // deepWater light · primary
  ['#F9A8D4', '#F472B6', '#221530', '#F5EEF8'], // cottonCandy dark · primary
  ['#93C5FD', '#60A5FA', '#FFFFFF', '#1E1028'], // cottonCandy light · secondary
]) {
  const candidates = [surface, textPrimary];
  const fill = contrastRatio(readableOn(tint, candidates), tint) >= 4.5 ? tint : deep;
  const ratio = contrastRatio(readableOn(fill, candidates), fill);
  assert.ok(ratio >= 4.5, `notch ilegible con tinte ${tint}: ${ratio.toFixed(2)}:1`);
}

console.log('✓ utils/txRelation: initialsOf, readableOn y readableChipText OK');
