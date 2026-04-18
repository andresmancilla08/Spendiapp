// utils/settlementCalc.ts
import { ExpenseGroupParticipant, GroupExpense, Settlement } from '../types/expenseGroup';

const ROUNDING_THRESHOLD = 0.5;

export function calculateSettlements(
  participants: ExpenseGroupParticipant[],
  expenses: GroupExpense[],
): Settlement[] {
  // 1. Calcular balance por participante
  const balanceMap: Record<string, number> = {};
  for (const p of participants) {
    balanceMap[p.id] = 0;
  }

  for (const expense of expenses) {
    const splitCount = expense.splitAmong.length;
    if (splitCount === 0) continue;

    const sharePerPerson = expense.amount / splitCount;

    // El que pagó suma el monto total
    if (balanceMap[expense.paidById] !== undefined) {
      balanceMap[expense.paidById] += expense.amount;
    }

    // Cada participante en splitAmong resta su parte
    for (const participantId of expense.splitAmong) {
      if (balanceMap[participantId] !== undefined) {
        balanceMap[participantId] -= sharePerPerson;
      }
    }
  }

  // 2. Separar en deudores (balance < 0) y acreedores (balance > 0)
  const nameMap: Record<string, string> = {};
  for (const p of participants) {
    nameMap[p.id] = p.name;
  }

  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [id, balance] of Object.entries(balanceMap)) {
    if (balance < -ROUNDING_THRESHOLD) {
      debtors.push({ id, amount: -balance });
    } else if (balance > ROUNDING_THRESHOLD) {
      creditors.push({ id, amount: balance });
    }
  }

  // 3. Algoritmo greedy: match más grande posible
  const settlements: Settlement[] = [];

  let di = 0;
  let ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di];
    const creditor = creditors[ci];

    const transferAmount = Math.min(debtor.amount, creditor.amount);
    const rounded = Math.round(transferAmount);

    if (rounded > 0) {
      settlements.push({
        fromId: debtor.id,
        fromName: nameMap[debtor.id] ?? debtor.id,
        toId: creditor.id,
        toName: nameMap[creditor.id] ?? creditor.id,
        amount: rounded,
      });
    }

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    if (debtor.amount <= ROUNDING_THRESHOLD) di++;
    if (creditor.amount <= ROUNDING_THRESHOLD) ci++;
  }

  return settlements;
}
