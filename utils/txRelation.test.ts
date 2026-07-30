/**
 * Self-check sin framework: `npx tsx utils/txRelation.test.ts`
 * (o `node --experimental-strip-types utils/txRelation.test.ts`).
 */
import assert from 'node:assert/strict';
import { initialsOf, readableOn, contrastRatio, splitByPerson } from './txRelation';

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

// ── Color del pie de relación (texto directo sobre el fondo de la fila) ─────
// cottonCandy dark: el tono oscuro se lee sobre surface.
assert.equal(readableOn('#221530', ['#F472B6', '#F5EEF8']), '#F472B6');
// cottonCandy light: #F472B6 sobre blanco da 3.1:1 → cae a textPrimary.
assert.equal(readableOn('#FFFFFF', ['#F472B6', '#1E1028']), '#1E1028');
// Lo que devuelva se lee, también en fila pagada (fondo `primaryLight`).
const ROWS: Array<{ bg: string; deep: string; fallback: string }> = [
  { bg: '#FFFFFF', deep: '#005F56', fallback: '#1A2428' }, // deepWater light · surface
  { bg: '#E0F7FA', deep: '#005F56', fallback: '#1A2428' }, // deepWater light · pagada
  { bg: '#162428', deep: '#00897B', fallback: '#EEF6F8' }, // deepWater dark · surface
  { bg: '#003840', deep: '#00897B', fallback: '#EEF6F8' }, // deepWater dark · pagada
  { bg: '#221530', deep: '#F472B6', fallback: '#F5EEF8' }, // cottonCandy dark · surface
  { bg: '#FCE7F3', deep: '#F472B6', fallback: '#1E1028' }, // cottonCandy light · pagada
];
for (const { bg, deep, fallback } of ROWS) {
  const picked = readableOn(bg, [deep, fallback]);
  const ratio = contrastRatio(picked, bg);
  assert.ok(ratio >= 4.5, `pie ilegible sobre ${bg}: ${picked} da ${ratio.toFixed(2)}:1`);
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

// ── splitByPerson ───────────────────────────────────────────────────────────
// Nombre al final.
assert.deepEqual(splitByPerson('Enviado por María Victoria', 'María Victoria'),
  { before: 'Enviado por ', name: 'María Victoria', after: '' });
// Nombre en medio (el caso de "y N más").
assert.deepEqual(splitByPerson('Compartido con Andrés y 2 más', 'Andrés'),
  { before: 'Compartido con ', name: 'Andrés', after: ' y 2 más' });
// Nombre ausente o vacío: frase intacta y sin nombre → el render no lo duplica.
assert.deepEqual(splitByPerson('Compartido con —', 'Beatriz'),
  { before: 'Compartido con —', name: '', after: '' });
assert.deepEqual(splitByPerson('Compartido', ''),
  { before: 'Compartido', name: '', after: '' });
// Reconstrucción exacta en todos los casos (nunca se pierde ni se duplica texto).
for (const [label, person] of [
  ['Enviado por Ana', 'Ana'],
  ['Compartido con Ana y 3 más', 'Ana'],
  ['Le debes a Ana Ana', 'Ana'],
  ['Sin nombre', 'Ana'],
] as Array<[string, string]>) {
  const { before, name, after } = splitByPerson(label, person);
  assert.equal(before + name + after, label, `reconstrucción rota para "${label}"`);
}

console.log('✓ utils/txRelation: initialsOf, readableOn y splitByPerson OK');
