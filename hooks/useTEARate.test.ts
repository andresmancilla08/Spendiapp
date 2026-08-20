/**
 * npx tsx hooks/useTEARate.test.ts
 */
import assert from 'node:assert';
import { resolveTEARate } from './useTEARate';
import { isTeaStale, teaAgeInMonths, TEA_STALE_MONTHS } from '../types/card';

// ── Caducidad de la tasa de usura ───────────────────────────────────────────
{
  // Dentro del mismo trimestre que certifica el valor (Q1 2026): al día
  const r = resolveTEARate(new Date(2026, 1, 15));
  assert.strictEqual(r.tea, 25.52);
  assert.strictEqual(r.isStale, false, 'feb 2026 está dentro de Q1 2026');
  assert.strictEqual(r.quartersBehind, 0);
}
{
  // Hoy, 20 de agosto de 2026 = Q3. El valor es de Q1 → dos trimestres viejo.
  const r = resolveTEARate(new Date(2026, 7, 20));
  assert.strictEqual(r.isStale, true, 'ago 2026 ya no es Q1');
  assert.strictEqual(r.quartersBehind, 2, 'Q1 → Q3 son dos trimestres');
}
{
  // Cruce de año
  const r = resolveTEARate(new Date(2027, 0, 5));
  assert.strictEqual(r.quartersBehind, 4, 'Q1 2026 → Q1 2027 son cuatro trimestres');
}
{
  // Límites de trimestre exactos
  assert.strictEqual(resolveTEARate(new Date(2026, 2, 31)).quartersBehind, 0, '31 mar sigue en Q1');
  assert.strictEqual(resolveTEARate(new Date(2026, 3, 1)).quartersBehind, 1, '1 abr ya es Q2');
}

// ── Antigüedad de la tasa de UNA tarjeta ────────────────────────────────────
{
  const now = new Date(2026, 7, 20);
  assert.strictEqual(teaAgeInMonths({ tea: undefined, teaUpdatedAt: undefined }, now), null,
    'sin tasa no hay edad que calcular');
  assert.strictEqual(teaAgeInMonths({ tea: 25.5, teaUpdatedAt: undefined }, now), null,
    'una tasa sin fecha no se puede envejecer');
  assert.strictEqual(teaAgeInMonths({ tea: 25.5, teaUpdatedAt: new Date(2026, 7, 1) }, now), 0,
    'este mes = 0 meses');
  assert.strictEqual(teaAgeInMonths({ tea: 25.5, teaUpdatedAt: new Date(2025, 7, 20) }, now), 12,
    'hace un año = 12 meses');
}
{
  const now = new Date(2026, 7, 20);
  assert.strictEqual(isTeaStale({ tea: 25.5, teaUpdatedAt: new Date(2026, 4, 1) }, now), false,
    `3 meses < ${TEA_STALE_MONTHS}`);
  assert.strictEqual(isTeaStale({ tea: 25.5, teaUpdatedAt: new Date(2026, 1, 1) }, now), true,
    `6 meses alcanza el umbral`);
  assert.strictEqual(isTeaStale({ tea: undefined, teaUpdatedAt: undefined }, now), false,
    'sin tasa no se avisa de nada: no hay dato viejo, hay ausencia de dato');
}

console.log('✓ useTEARate + antigüedad de tarjeta: gates OK');
