/**
 * Self-check sin framework: `npx tsx utils/chartTrend.test.ts`
 * La serie es el balance de los últimos 6 meses terminando en el mes mostrado.
 */
import assert from 'node:assert/strict';
import { isTrendUp } from './chartTrend';

// Sube respecto al mes anterior → verde.
assert.equal(isTrendUp([0, 0, 0, 0, 500000, 900000]), true);
// Se hunde respecto al mes anterior → rojo, aunque los 5 meses previos fueran buenos.
// (Es el caso que la regla vieja pintaba de verde.)
assert.equal(isTrendUp([0, 0, 0, 0, 900000, 120000]), false);
// Cuenta nueva: 5 meses sin datos y el primer mes con balance → sube.
assert.equal(isTrendUp([0, 0, 0, 0, 0, 1006000]), true);
// Caída sostenida → rojo.
assert.equal(isTrendUp([900000, 800000, 700000, 600000, 500000, 400000]), false);
// Negativo pero mejorando respecto al mes anterior → sube.
assert.equal(isTrendUp([0, 0, 0, 0, -300000, -10000]), true);
// Empate → se considera al alza (no hay caída).
assert.equal(isTrendUp([100, 500000, 500000]), true);
// Series degeneradas → al alza por defecto, nunca rojo por falta de datos.
assert.equal(isTrendUp([]), true);
assert.equal(isTrendUp([500000]), true);
assert.equal(isTrendUp(undefined), true);

console.log('chartTrend: OK');
