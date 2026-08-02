// utils/settlementCalc.ts
import { ExpenseGroupParticipant, GroupExpense, Settlement } from '../types/expenseGroup';

/**
 * Quién le paga a quién para saldar un grupo de gastos.
 *
 * Todo se calcula en PESOS ENTEROS. Antes las partes se repartían en coma
 * flotante (`amount / n`) y cada transferencia se redondeaba por separado: con
 * 100 entre 3, las dos transferencias de 33 dejaban al acreedor cobrando 66 de
 * los 67 que le debían, y quedaban residuos que ya no se liquidaban nunca —la
 * pestaña decía "todo está balanceado" mientras la tarjeta seguía marcando +3.
 *
 * Ahora cada gasto se reparte con el método del resto mayor (los primeros
 * participantes asumen el peso sobrante), así que los balances son enteros, sumen
 * lo que sumen, y las transferencias cuadran al peso.
 */

/** Reparte `total` entre `n` en enteros que suman exactamente `total`. */
export function splitInteger(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function calculateSettlements(
  participants: ExpenseGroupParticipant[],
  expenses: GroupExpense[],
): Settlement[] {
  // 1. Balance por participante, en enteros
  const balanceMap: Record<string, number> = {};
  for (const p of participants) {
    balanceMap[p.id] = 0;
  }

  for (const expense of expenses) {
    const splitCount = expense.splitAmong.length;
    if (splitCount === 0) continue;

    const shares = splitInteger(Math.round(expense.amount), splitCount);

    if (balanceMap[expense.paidById] !== undefined) {
      balanceMap[expense.paidById] += Math.round(expense.amount);
    }

    expense.splitAmong.forEach((participantId, i) => {
      if (balanceMap[participantId] !== undefined) {
        balanceMap[participantId] -= shares[i];
      }
    });
  }

  // 2. Deudores y acreedores. Con balances enteros no hay umbral que ajustar:
  //    o debes un peso o no debes nada.
  const nameMap: Record<string, string> = {};
  for (const p of participants) {
    nameMap[p.id] = p.name;
  }

  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [id, balance] of Object.entries(balanceMap)) {
    if (balance < 0) debtors.push({ id, amount: -balance });
    else if (balance > 0) creditors.push({ id, amount: balance });
  }

  // 3. Greedy: el mayor emparejamiento posible en cada paso
  const settlements: Settlement[] = [];
  let di = 0;
  let ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di];
    const creditor = creditors[ci];

    const transfer = Math.min(debtor.amount, creditor.amount);
    if (transfer > 0) {
      settlements.push({
        fromId: debtor.id,
        fromName: nameMap[debtor.id] ?? debtor.id,
        toId: creditor.id,
        toName: nameMap[creditor.id] ?? creditor.id,
        amount: transfer,
      });
    }

    debtor.amount -= transfer;
    creditor.amount -= transfer;

    if (debtor.amount === 0) di++;
    if (creditor.amount === 0) ci++;
  }

  return settlements;
}

/**
 * Lo que le corresponde a una persona de un gasto del grupo, con el mismo reparto
 * entero que usa la liquidación. La pantalla calculaba su parte por separado con
 * `amount / n`, así que el balance de la tarjeta y la suma de las filas de
 * liquidación no coincidían.
 */
export function shareOf(expense: GroupExpense, participantId: string): number {
  const idx = expense.splitAmong.indexOf(participantId);
  if (idx < 0) return 0;
  return splitInteger(Math.round(expense.amount), expense.splitAmong.length)[idx];
}
