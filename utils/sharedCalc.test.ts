/**
 * Self-check sin framework: `npx tsx utils/sharedCalc.test.ts`
 * (o `node --experimental-strip-types utils/sharedCalc.test.ts`).
 */
import assert from 'node:assert/strict';
import { effectiveAmount, calcSharedAmount, calcEqualPercentages } from './sharedCalc';

// ── effectiveAmount ──────────────────────────────────────────────────────────
// Transacción normal: el importe es el importe.
assert.equal(effectiveAmount({ amount: 9800 }), 9800);
// Gasto compartido sin cuotas: `amount` es el total del grupo → cuenta TU parte.
assert.equal(effectiveAmount({ amount: 600000, isShared: true, sharedAmount: 200000 }), 200000);
// Cuotas compartidas: `amount` ya es tu cuota amortizada → NUNCA `sharedAmount`.
assert.equal(
  effectiveAmount({ amount: 12334, isShared: true, isInstallment: true, sharedAmount: 12333 }),
  12334,
);
// income_claim: ambos coinciden, da igual la rama.
assert.equal(effectiveAmount({ amount: 100000, isShared: true, sharedAmount: 100000 }), 100000);
// Docs legacy sin `sharedAmount`.
assert.equal(effectiveAmount({ amount: 50000, isShared: true }), 50000);
assert.equal(effectiveAmount({ amount: 50000, isShared: true, sharedAmount: null }), 50000);

// El balance de un compartido 3-way debe cuadrar con lo que muestran las filas.
const partes = [1, 2, 3].map(() => effectiveAmount({ amount: 600000, isShared: true, sharedAmount: 200000 }));
assert.equal(partes.reduce((s, n) => s + n, 0), 600000);

// ── calcSharedAmount / calcEqualPercentages (comportamiento ya existente) ────
assert.equal(calcSharedAmount(100000, 0, 1, 50), 50000);
assert.equal(calcSharedAmount(100000, 0, 3, 30), 10000);
// El punto sobrante va al PRIMERO, no al último: cargarle todo el residuo al
// último hacía que en grupos de 6 u 8 alguien pagara hasta un 28% de más.
assert.deepEqual(calcEqualPercentages(3), [34, 33, 33]);
assert.equal(calcEqualPercentages(3).reduce((s, n) => s + n, 0), 100);
assert.deepEqual(calcEqualPercentages(0), []);


// El residuo se reparte de uno en uno: cargárselo entero al último hacía que en un
// grupo de seis una persona pagara un 25% de más.
for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10, 13]) {
  const pcts = calcEqualPercentages(n);
  assert.strictEqual(pcts.reduce((a, b) => a + b, 0), 100, `suman 100 con ${n}`);
  assert.ok(
    Math.max(...pcts) - Math.min(...pcts) <= 1,
    `con ${n} personas nadie puede pagar más de un punto por encima de otro: ${pcts.join(',')}`,
  );
}
assert.deepStrictEqual(calcEqualPercentages(6), [17, 17, 17, 17, 16, 16], 'seis personas');
assert.deepStrictEqual(calcEqualPercentages(3), [34, 33, 33], 'tres personas');

console.log('✓ utils/sharedCalc: effectiveAmount, calcSharedAmount y calcEqualPercentages OK');
