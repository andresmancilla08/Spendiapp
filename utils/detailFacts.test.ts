/**
 * npx tsx utils/detailFacts.test.ts
 */
import assert from 'node:assert';
import { addMonths, fixedTimeline, installmentPlan, monthsBetween, nextMonthSameDay } from './detailFacts';

// ── addMonths / monthsBetween ────────────────────────────────────────────────
assert.strictEqual(addMonths(new Date(2026, 6, 22), 1).getMonth(), 7, 'jul + 1 = ago');
assert.strictEqual(addMonths(new Date(2026, 11, 15), 1).getFullYear(), 2027, 'dic + 1 cruza de año');
assert.strictEqual(addMonths(new Date(2026, 0, 5), -1).getMonth(), 11, 'ene - 1 = dic');
assert.strictEqual(monthsBetween(new Date(2026, 0, 1), 2026, 6), 6, 'ene→jul = 6');
assert.strictEqual(monthsBetween(new Date(2025, 10, 1), 2026, 1), 3, 'nov 2025 → feb 2026 = 3');

// ── nextMonthSameDay ────────────────────────────────────────────────────────
{
  const n = nextMonthSameDay(new Date(2026, 6, 22));
  assert.strictEqual(n.getMonth(), 7); assert.strictEqual(n.getDate(), 22, 'conserva el día');
}
{
  const n = nextMonthSameDay(new Date(2026, 0, 31));
  assert.strictEqual(n.getMonth(), 1); assert.strictEqual(n.getDate(), 28, '31 ene → 28 feb 2026');
}
{
  const n = nextMonthSameDay(new Date(2026, 11, 15));
  assert.strictEqual(n.getFullYear(), 2027); assert.strictEqual(n.getMonth(), 0, 'dic → ene del año siguiente');
}

// ── Plan de cuotas ───────────────────────────────────────────────────────────
{
  // Cuota 4 de 6 vista en julio 2026 → la 1 cayó en abril
  const plan = installmentPlan(new Date(2026, 6, 14), 4, 6);
  assert.strictEqual(plan.length, 6);
  assert.deepStrictEqual(plan.map((c) => c.month), [3, 4, 5, 6, 7, 8], 'abr→sep');
  assert.deepStrictEqual(plan.map((c) => c.state), ['done', 'done', 'done', 'now', 'pending', 'pending']);
}
{
  // Cuota 1 de 3: nada pagado antes
  const plan = installmentPlan(new Date(2026, 6, 1), 1, 3);
  assert.deepStrictEqual(plan.map((c) => c.state), ['now', 'pending', 'pending']);
}
{
  // Última cuota: todo lo anterior pagado y nada pendiente
  const plan = installmentPlan(new Date(2026, 6, 1), 3, 3);
  assert.deepStrictEqual(plan.map((c) => c.state), ['done', 'done', 'now']);
}
{
  // 36 cuotas: se recortan a 12 y SIEMPRE se ve la actual dentro de la ventana
  const plan = installmentPlan(new Date(2026, 6, 1), 30, 36, 12);
  assert.strictEqual(plan.length, 12);
  assert.strictEqual(plan.filter((c) => c.state === 'now').length, 1, 'la cuota actual sigue visible');
}
{
  // Cruce de año: cuota 3 de 4 en enero 2027 → empezó en noviembre 2026
  const plan = installmentPlan(new Date(2027, 0, 10), 3, 4);
  assert.deepStrictEqual(plan.map((c) => [c.year, c.month]), [[2026, 10], [2026, 11], [2027, 0], [2027, 1]]);
}
assert.deepStrictEqual(installmentPlan(new Date(2026, 6, 1), 0, 0), [], 'sin cuotas, sin plan');

// ── Vida de un gasto fijo ────────────────────────────────────────────────────
{
  // Creado en enero, visto en julio → 7 meses, el actual marcado
  const { chips, months, skipped } = fixedTimeline(new Date(2026, 0, 1), 2026, 6);
  assert.strictEqual(months, 7);
  assert.strictEqual(skipped, 0);
  assert.deepStrictEqual(chips.map((c) => c.state),
    ['done', 'done', 'done', 'done', 'done', 'done', 'now']);
}
{
  // Un mes saltado se marca y NO cuenta como pagado
  const { chips, skipped } = fixedTimeline(new Date(2026, 0, 1), 2026, 6, ['2026_3']);
  assert.strictEqual(skipped, 1);
  assert.strictEqual(chips[3].state, 'skipped', 'abril tachado');
  assert.strictEqual(chips[6].state, 'now');
}
{
  // Claves de salto fuera del rango vivido no cuentan (mes futuro o basura)
  const { skipped } = fixedTimeline(new Date(2026, 0, 1), 2026, 6, ['2026_9', 'basura', '2025_1']);
  assert.strictEqual(skipped, 0);
}
{
  // Más de 12 meses: ventana de los últimos 12 con el actual al final
  const { chips, months } = fixedTimeline(new Date(2024, 0, 1), 2026, 6, [], 12);
  assert.strictEqual(months, 31);
  assert.strictEqual(chips.length, 12);
  assert.strictEqual(chips[chips.length - 1].state, 'now');
}
{
  // Mes de creación = mes visto → un solo chip, y es el actual
  const { chips, months } = fixedTimeline(new Date(2026, 6, 1), 2026, 6);
  assert.strictEqual(months, 1);
  assert.deepStrictEqual(chips.map((c) => c.state), ['now']);
}
{
  // Mes visto ANTERIOR a la creación (mes pasado de un fijo nuevo): nunca negativo
  const { months, chips } = fixedTimeline(new Date(2026, 6, 1), 2026, 2);
  assert.strictEqual(months, 1);
  assert.strictEqual(chips.length, 1);
}

console.log('✓ detailFacts: plan de cuotas y vida del fijo correctos (bordes de año, recorte y saltos incluidos)');
