// npx tsx utils/dailyBalance.test.ts
import assert from 'node:assert';
import { dailyCumulativeBalance } from './dailyBalance';
import { effectiveAmount } from './sharedCalc';

const d = (day: number) => new Date(2026, 7, day); // agosto 2026
const inc = (day: number, amount: number) => ({ date: d(day), type: 'income', amount });
const exp = (day: number, amount: number) => ({ date: d(day), type: 'expense', amount });

// ── LA invariante: el último punto ES el balance que muestra la tarjeta ──────
{
  const txs = [inc(1, 3_000_000), exp(3, 500_000), exp(10, 250_000), inc(20, 100_000)];
  const serie = dailyCumulativeBalance(txs, 31);
  const balanceTarjeta = txs.filter((t) => t.type === 'income').reduce((s, t) => s + effectiveAmount(t), 0)
    - txs.filter((t) => t.type === 'expense').reduce((s, t) => s + effectiveAmount(t), 0);
  assert.strictEqual(serie[serie.length - 1], balanceTarjeta,
    'el gráfico y la cifra de la tarjeta tienen que contar lo mismo');
  assert.strictEqual(serie[0], 0, 'arranca en 0');
  assert.strictEqual(serie.length, 32, '31 días + el 0 de partida');
}

// Acumula de verdad: no baja salvo que haya gasto ese día.
{
  const serie = dailyCumulativeBalance([inc(1, 100), exp(2, 30), inc(3, 10)], 5);
  assert.deepStrictEqual(serie, [0, 100, 70, 80, 80, 80]);
}

// ── Mes en curso: corta en hoy, no proyecta una recta plana inventada ────────
{
  const serie = dailyCumulativeBalance([inc(1, 100), inc(20, 900)], 31, 10);
  assert.strictEqual(serie.length, 11, 'del 0 al día 10');
  assert.strictEqual(serie[serie.length - 1], 100, 'lo del día 20 aún no cuenta');
}

// ── Compartido sin cuotas: cuenta MI parte, igual que los totales del mes ────
{
  const compartido = { date: d(5), type: 'expense', amount: 100_000, isShared: true, sharedAmount: 40_000 };
  const serie = dailyCumulativeBalance([compartido], 31);
  assert.strictEqual(serie[serie.length - 1], -40_000,
    'usa effectiveAmount: el total del grupo es 100k pero yo asumo 40k');
}

// ── Bordes: nunca devuelve menos de dos puntos ni revienta ───────────────────
assert.deepStrictEqual(dailyCumulativeBalance([], 31), new Array(32).fill(0));
assert.strictEqual(dailyCumulativeBalance(undefined, 31).length, 32);
assert.strictEqual(dailyCumulativeBalance([], 31, 0).length, 2, 'día 0 se sube a 1 → [0, 0]');
// Un movimiento fuera de rango (fija clonada mal, dato corrupto) se ignora.
assert.deepStrictEqual(dailyCumulativeBalance([inc(99, 500)], 5), [0, 0, 0, 0, 0, 0]);

console.log('dailyBalance ok');
