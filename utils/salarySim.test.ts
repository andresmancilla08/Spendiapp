/**
 * Gate del simulador de sueldo. Correr con:
 *   npx tsx utils/salarySim.test.ts
 *
 * Es dinero: cada caso es un número que, si cambia, cambia lo que el usuario
 * cree que le queda a fin de mes.
 */
import assert from 'node:assert';
import {
  simulate, monthExpenses, baseTxId, sanitizeScenario, clampPct,
  clampPayments, monthKind, daysLeft, rateDeltaPct, DEFAULT_SCENARIO, DEFAULT_PAYMENTS,
} from './salarySim';

let n = 0;
const eq = (a: unknown, b: unknown, msg?: string) => { assert.deepStrictEqual(a, b, msg); n++; };
const near = (a: number, b: number, msg?: string) => { assert.ok(Math.abs(a - b) < 0.01, `${msg}: ${a} ≠ ${b}`); n++; };

// ── simulate: TODOS los gastos restan; el fondo solo cubre los fijos ──
const base = { salary: 2400, rate: 3632, expensesTotal: 6_520_000, fixedTotal: 2_920_000, savePct: 30, paymentsPerMonth: 2 };
let r = simulate(base);
eq(r.income, 8_716_800, 'ingreso = sueldo × tasa');
eq(r.available, 2_196_800, 'disponible = ingreso − todos los gastos');
near(r.save, 659_040, 'ahorro 30 % del disponible');
near(r.free, 1_537_760, 'libre 70 %');
near(r.save + r.free, r.available, 'ahorro + libre = disponible');
eq(r.perPaymentCop, 1_460_000, 'el fondo divide SOLO los fijos');
near(r.perPaymentFx, 1_460_000 / 3632, 'fondo en divisa');
eq(r.deficit, false);

// COP: tasa 1
r = simulate({ ...base, salary: 7_500_000, rate: 1 });
eq(r.income, 7_500_000);
eq(r.perPaymentFx, r.perPaymentCop, 'en COP el fondo en divisa es el mismo');

// Gastos > ingreso
r = simulate({ ...base, salary: 1500, rate: 3192 });
eq(r.deficit, true);
eq(r.save, 0); eq(r.free, 0);
eq(r.available, 1500 * 3192 - 6_520_000, 'el negativo se conserva para mostrarlo');

// Apagar todo
r = simulate({ ...base, expensesTotal: 0, fixedTotal: 0 });
eq(r.available, 8_716_800); eq(r.perPaymentCop, 0);

// Extremos del reparto
eq(simulate({ ...base, savePct: 0 }).save, 0);
eq(simulate({ ...base, savePct: 100 }).free, 0);
eq(simulate({ ...base, savePct: 140 }).free, 0, 'se corta a 100');
eq(simulate({ ...base, savePct: -5 }).save, 0, 'se corta a 0');

// Pagos al mes
eq(simulate({ ...base, paymentsPerMonth: 4 }).perPaymentCop, 730_000, 'semanal ×4');
eq(simulate({ ...base, paymentsPerMonth: 5 }).perPaymentCop, 584_000, 'semanal ×5 personalizado');
eq(simulate({ ...base, paymentsPerMonth: 0 }).perPaymentCop, 2_920_000, 'nunca divide por cero');
eq(simulate({ ...base, rate: 0 }).perPaymentFx, 0, 'sin tasa no inventa divisa');
eq(simulate({ ...base, rate: 0 }).income, 0);

// ── gastos del mes ──
const txs = [
  { id: 'a_virtual_2026_8', type: 'expense' as const, amount: 2_200_000, description: 'Arriendo', isFixed: true, isPaid: true },
  { id: 'g', type: 'expense' as const, amount: 130_000, description: 'Gimnasio', isFixed: true },
  { id: 'c', type: 'expense' as const, amount: 300_000, description: 'Cena', isShared: true, sharedAmount: 100_000 },
  { id: 'm', type: 'expense' as const, amount: 50_000, description: 'Café' },
  { id: 's', type: 'income' as const, amount: 9_000_000, description: 'Sueldo', isFixed: true },
  { id: 'f', type: 'expense' as const, amount: 400_000, description: 'Luz compartida', isFixed: true, isShared: true, sharedAmount: 200_000 },
];
const ex = monthExpenses(txs);
eq(ex.map((e) => e.id), ['a', 'f', 'g', 'c', 'm'], 'fijos primero, luego variables; cada grupo de mayor a menor; sin ingresos');
eq(ex.map((e) => e.fixed), [true, true, true, false, false]);
eq(ex[0].paid, true);
eq(ex[1].amount, 200_000, 'compartido fijo: tu parte');
eq(ex[3].amount, 100_000, 'compartido variable: tu parte');
eq(ex[3].id, 'c', 'un variable conserva su id');
eq(baseTxId('abc_virtual_2026_11'), 'abc');
eq(baseTxId('abc'), 'abc');

// ── sanitize ──
eq(sanitizeScenario(null), DEFAULT_SCENARIO, 'nada guardado = por defecto');
eq(sanitizeScenario({ currency: 'JPY', salary: -3, savePct: 'x', frequency: 'daily' }), DEFAULT_SCENARIO);
const s = sanitizeScenario({
  currency: 'EUR', salary: 2400, manualRates: { EUR: 3480, USD: -1, GBP: 5 }, savePct: 20.4,
  frequency: 'weekly', excludedTxIds: ['g', 3], simulated: [{ id: 'x', name: 'Arriendo nuevo', amount: 300000 }, { id: 'y' }],
});
eq(s.manualRates, { EUR: 3480 }, 'solo tasas válidas de USD/EUR');
eq(s.savePct, 20);
eq(s.paymentsPerMonth, DEFAULT_PAYMENTS.weekly, 'sin pagos guardados, el de la frecuencia');
eq(s.excludedTxIds, ['g']);
eq(s.simulated.length, 1);
eq(sanitizeScenario({ frequency: 'weekly', paymentsPerMonth: 9 }).paymentsPerMonth, 5, 'tope de pagos');

// ── helpers ──
eq(clampPct(33.6), 34); eq(clampPct(NaN), 0);
eq(clampPayments(0), 1); eq(clampPayments(7), 5);
const now = new Date(2026, 8, 28);
eq(monthKind(2026, 7, now), 'past'); eq(monthKind(2026, 8, now), 'current'); eq(monthKind(2026, 9, now), 'future');
eq(monthKind(2025, 11, now), 'past', 'cruce de año');
eq(daysLeft(2026, 8, now), 3, '28, 29 y 30 de septiembre');
eq(daysLeft(2026, 9, now), 31, 'mes futuro: el mes entero');
eq(daysLeft(2026, 7, now), 1, 'mes pasado: nunca cero');
near(rateDeltaPct(3480, 3632), -4.185, 'tasa manual vs TRM');
eq(rateDeltaPct(3480, 0), 0);

console.log(`✓ salarySim: ${n} comprobaciones`);
