import { effectiveAmount } from './sharedCalc';

/** Forma mínima que necesita la serie: la misma que usan los totales del mes. */
interface DayTx {
  date: Date;
  type: string;
  amount: number;
  isShared?: boolean;
  isInstallment?: boolean;
  sharedAmount?: number | null;
}

/**
 * Saldo ACUMULADO día a día dentro del mes: arranca en 0 y va sumando ingresos y
 * restando gastos. El último punto vale exactamente lo mismo que el balance del
 * mes que la tarjeta muestra encima del gráfico — para eso usa `effectiveAmount`,
 * el mismo importe con el que `useTransactions` calcula sus totales. Si el
 * gráfico y la cifra no salieran del mismo sitio, contarían cosas distintas.
 *
 * Antes el gráfico del Home dibujaba la tendencia de SEIS MESES (el balance de
 * cada mes), no el mes que se está viendo: quien solo tenía datos de un mes veía
 * cinco puntos a cero y una línea pegada al suelo.
 *
 * @param txs          Movimientos del mes (incluidas las copias virtuales de fijas).
 * @param daysInMonth  Días que tiene el mes.
 * @param upToDay      Último día a dibujar. En el mes en curso, HOY: proyectar
 *                     hasta fin de mes dibujaría una recta plana inventada.
 * @returns Serie de `min(daysInMonth, upToDay) + 1` puntos — el primero es el 0
 *          de partida, así que nunca devuelve menos de dos y el gráfico siempre
 *          tiene algo que dibujar.
 */
export function dailyCumulativeBalance(
  txs: DayTx[] | undefined | null,
  daysInMonth: number,
  upToDay?: number,
): number[] {
  const lastDay = Math.max(1, Math.min(daysInMonth, upToDay ?? daysInMonth));
  const perDay = new Array<number>(lastDay + 1).fill(0);

  for (const tx of txs ?? []) {
    const day = tx.date.getDate();
    if (day < 1 || day > lastDay) continue;
    const amount = effectiveAmount(tx);
    if (tx.type === 'income') perDay[day] += amount;
    else if (tx.type === 'expense') perDay[day] -= amount;
  }

  const out = new Array<number>(lastDay + 1);
  let acc = 0;
  for (let d = 0; d <= lastDay; d++) {
    acc += perDay[d];
    out[d] = acc;
  }
  return out;
}
