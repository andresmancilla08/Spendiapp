/**
 * npx tsx hooks/useTEARate.test.ts
 */
import assert from 'node:assert';
import { resolveTEARate } from './useTEARate';
import { isTeaStale, teaAgeInMonths, TEA_STALE_MONTHS } from '../types/card';

// ── Caducidad de la tasa de usura ───────────────────────────────────────────
// La SFC certifica el IBC (y con él la usura) POR MES natural, no por trimestre.
{
  // Dentro del mes que certifica el valor: al día
  const r = resolveTEARate(new Date(2026, 7, 20));
  assert.strictEqual(r.tea, 29.66, 'usura de agosto 2026 = 1,5 × IBC 19,77 %');
  assert.strictEqual(r.isStale, false, 'el 20 de agosto sigue dentro de agosto');
  assert.strictEqual(r.monthsBehind, 0);
}
{
  // Primer y último día del mes certificado
  assert.strictEqual(resolveTEARate(new Date(2026, 7, 1)).monthsBehind, 0, '1 de agosto');
  assert.strictEqual(resolveTEARate(new Date(2026, 7, 31)).monthsBehind, 0, '31 de agosto');
  assert.strictEqual(resolveTEARate(new Date(2026, 8, 1)).monthsBehind, 1, '1 de septiembre ya es otro mes');
}
{
  // Cruce de año
  assert.strictEqual(resolveTEARate(new Date(2027, 1, 5)).monthsBehind, 6, 'ago 2026 → feb 2027');
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
