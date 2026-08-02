/**
 * Gate de las liquidaciones de un grupo de gastos:
 *   npx tsx utils/settlementCalc.test.ts
 *
 * Lo que se comprueba es lo único que de verdad importa aquí: que después de hacer
 * las transferencias propuestas TODO EL MUNDO quede a cero. Antes las partes se
 * repartían en coma flotante y cada transferencia se redondeaba por su cuenta, así
 * que con 100 pesos entre 3 el acreedor cobraba 66 de los 67 que le debían, y con
 * cantidades pequeñas la pantalla decía "todo balanceado" con saldos vivos.
 */
import assert from 'node:assert';
import { calculateSettlements, splitInteger, shareOf } from './settlementCalc';
import type { ExpenseGroupParticipant, GroupExpense } from '../types/expenseGroup';

const people = (n: number): ExpenseGroupParticipant[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` } as ExpenseGroupParticipant));

const expense = (amount: number, paidBy: string, among: string[]): GroupExpense =>
  ({ id: `e-${amount}-${paidBy}`, amount, paidById: paidBy, splitAmong: among } as GroupExpense);

/** Balance de cada persona según los gastos, con el reparto entero oficial. */
function balances(ps: ExpenseGroupParticipant[], exps: GroupExpense[]): Record<string, number> {
  const map: Record<string, number> = {};
  ps.forEach((p) => { map[p.id] = 0; });
  for (const e of exps) {
    map[e.paidById] += Math.round(e.amount);
    for (const id of e.splitAmong) map[id] -= shareOf(e, id);
  }
  return map;
}

// ── splitInteger reparte sin perder ni inventar pesos ─────────────────────
for (const [total, n] of [[100, 3], [1_000_001, 7], [2, 3], [999_999, 6], [1, 8], [0, 4]]) {
  const parts = splitInteger(total, n);
  assert.strictEqual(parts.reduce((a, b) => a + b, 0), total, `${total} entre ${n} suma el total`);
  assert.ok(Math.max(...parts) - Math.min(...parts) <= 1, `${total} entre ${n}: reparto parejo`);
}

// ── Después de liquidar, nadie debe ni le deben ───────────────────────────
const scenarios: { name: string; ps: number; exps: (ids: string[]) => GroupExpense[] }[] = [
  { name: '100 entre 3', ps: 3, exps: (id) => [expense(100, id[0], id)] },
  { name: '1.000.001 entre 7', ps: 7, exps: (id) => [expense(1_000_001, id[0], id)] },
  { name: '2 pesos entre 3', ps: 3, exps: (id) => [expense(2, id[0], id)] },
  { name: '3 pesos entre 7', ps: 7, exps: (id) => [expense(3, id[0], id)] },
  {
    name: 'varios gastos y pagadores',
    ps: 4,
    exps: (id) => [
      expense(100_000, id[0], id),
      expense(45_001, id[1], [id[1], id[2]]),
      expense(7, id[2], id),
      expense(333_333, id[3], [id[0], id[3]]),
    ],
  },
  {
    name: 'alguien no participa en un gasto',
    ps: 5,
    exps: (id) => [
      expense(1_000, id[0], [id[0], id[1], id[2]]),
      expense(999, id[4], id),
    ],
  },
];

for (const sc of scenarios) {
  const ps = people(sc.ps);
  const ids = ps.map((p) => p.id);
  const exps = sc.exps(ids);
  const before = balances(ps, exps);
  const settlements = calculateSettlements(ps, exps);

  // Aplicar las transferencias propuestas
  const after = { ...before };
  for (const s of settlements) {
    assert.ok(s.amount > 0, `${sc.name}: no se proponen transferencias de cero`);
    assert.ok(Number.isInteger(s.amount), `${sc.name}: las transferencias son enteras`);
    after[s.fromId] += s.amount;
    after[s.toId] -= s.amount;
  }

  for (const id of ids) {
    assert.strictEqual(
      after[id], 0,
      `${sc.name}: ${id} queda en ${after[id]} después de liquidar (debería ser 0)`,
    );
  }

  // Y nunca más transferencias de las necesarias
  const conSaldo = ids.filter((id) => before[id] !== 0).length;
  assert.ok(
    settlements.length <= Math.max(0, conSaldo - 1),
    `${sc.name}: ${settlements.length} transferencias para ${conSaldo} personas con saldo`,
  );
}

// ── La parte de cada uno coincide con la que descuenta la liquidación ─────
{
  const ps = people(3);
  const ids = ps.map((p) => p.id);
  const e = expense(100, ids[0], ids);
  const partes = ids.map((id) => shareOf(e, id));
  assert.strictEqual(partes.reduce((a, b) => a + b, 0), 100, 'las partes suman el gasto');
  assert.deepStrictEqual(partes, [34, 33, 33]);
}

console.log(
  `✓ settlementCalc: ${scenarios.length} escenarios quedan a cero tras liquidar, ` +
  'sin transferencias de cero ni residuos colgados',
);
