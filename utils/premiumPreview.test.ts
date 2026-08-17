/**
 * Gate de las cifras de las miniaturas premium: npx tsx utils/premiumPreview.test.ts
 *
 * Lo que se comprueba de verdad es que la comparación con el mes anterior use el
 * gasto A LA MISMA ALTURA del mes. Compararlo con el mes anterior COMPLETO pinta
 * una mejora que no existe, justo en la pantalla donde le pedimos dinero.
 */
import { strict as assert } from 'assert';
import { buildPreview, type PreviewInput } from './premiumPreview';

const t = (k: string) => k;

const base: PreviewInput = {
  transactions: [
    { type: 'expense', category: 'food', amount: 600_000 },
    { type: 'expense', category: 'transport', amount: 300_000 },
    { type: 'expense', category: 'food', amount: 100_000 },
    { type: 'income', category: 'salary', amount: 4_000_000 },
  ],
  totalIncome: 4_000_000,
  totalExpenses: 1_000_000,
  trendData: [
    { month: 2, expenses: 3_000_000 },
    { month: 3, expenses: 3_200_000 },
    { month: 4, expenses: 2_800_000 },
    { month: 5, expenses: 3_100_000 },
    { month: 6, expenses: 4_000_000 },
    { month: 7, expenses: 1_000_000 },
  ],
  prevMonthToDateExpenses: 800_000,
  goals: [
    { name: 'Viaje', status: 'active', savedAmount: 720_000, targetAmount: 1_000_000 },
    { name: 'Moto', status: 'active', savedAmount: 450_000, targetAmount: 1_000_000 },
    { name: 'Vieja', status: 'completed', savedAmount: 10, targetAmount: 10 },
  ],
  customCategories: [],
  lang: 'es',
  dayOfMonth: 10,
  daysInMonth: 30,
  t,
};

const p = buildPreview(base);

// Categorías: agrupa por id, ordena por importe y saca el porcentaje sobre el gasto.
assert.equal(p.categories!.items.length, 2);
assert.equal(p.categories!.items[0].amount, 700_000, 'las dos de comida se suman');
assert.equal(p.categories!.items[0].pct, 70);
assert.equal(p.categories!.total, 1_000_000);

// Análisis: ahorro 75%, y el mes anterior A LA MISMA ALTURA (800K), no el completo (4M).
assert.equal(p.analysis!.savingsRatePct, 75);
assert.equal(p.analysis!.vsLastPct, 25, 'gastó 1M contra 800K a la misma fecha: +25%');
assert.equal(p.analysis!.topCategory!.pct, 70);

// Proyección: 1M en 10 días → 3M en 30. Y el porcentaje sobre el ingreso.
assert.equal(p.projection!.projected, 3_000_000);
assert.equal(p.projection!.nowPct, 25);
assert.equal(p.projection!.endPct, 75);

// Metas: solo las activas, con su progreso, y el contador cuenta TODAS las activas.
assert.equal(p.goals!.active, 2);
assert.deepEqual(p.goals!.items.map((g) => g.pct), [72, 45]);

// Tendencia: seis meses, total y variación del último contra el anterior.
assert.equal(p.trend!.expenses.length, 6);
assert.equal(p.trend!.total, 17_100_000);
assert.equal(p.trend!.deltaPct, -75);

// Sin datos suficientes cada bloque cae a null y la tarjeta enseña su ejemplo.
const vacio = buildPreview({
  ...base,
  transactions: [], totalIncome: 0, totalExpenses: 0,
  trendData: base.trendData.map((b) => ({ ...b, expenses: 0 })),
  prevMonthToDateExpenses: null, goals: [],
});
assert.equal(vacio.analysis, null);
assert.equal(vacio.categories, null);
assert.equal(vacio.projection, null);
assert.equal(vacio.goals, null);
assert.equal(vacio.trend, null);

console.log('premiumPreview OK');
