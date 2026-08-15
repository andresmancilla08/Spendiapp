import { calculateInstallments } from './installmentCalc';

/**
 * Calcula el monto mensual que corresponde a un participante.
 *
 * @param amount          Monto base de la transacción (entero, sin interés)
 * @param interestRate    TEA en porcentaje (0 si no aplica)
 * @param installmentTotal Número de cuotas (1 = pago único)
 * @param percentage      Porcentaje del participante (0-100)
 * @returns Monto redondeado al entero más cercano
 */
export function calcSharedAmount(
  amount: number,
  interestRate: number,
  installmentTotal: number,
  percentage: number,
): number {
  const withInterest = amount + (amount * interestRate / 100);
  const perPerson = withInterest * (percentage / 100);
  const monthly = perPerson / installmentTotal;
  return Math.round(monthly);
}

/**
 * Porcentajes iguales para N participantes, sumando exactamente 100.
 *
 * El residuo se reparte de uno en uno entre los primeros, NO se le carga entero al
 * último: con seis personas, `[16,16,16,16,16,20]` hacía que una pagara un 25% de
 * más (200.000 de un millón en vez de 166.667). Ahora el reparto más desigual
 * posible entre dos personas es de un punto porcentual.
 *
 * @returns Array de N enteros que suma exactamente 100
 */
export function calcEqualPercentages(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(100 / count);
  const remainder = 100 - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Cuota que le corresponde a `percentage` en un gasto compartido A CUOTAS, leída
 * desde el documento de OTRO participante.
 *
 * Mi documento guarda MI cuota, ya amortizada sobre mi porcentaje, así que la del
 * otro se obtiene reescalando por el mío. Cuando el mío es 0 —registré el gasto pero
 * lo asume la otra persona: pagué con su tarjeta, o ella con la mía— mis cuotas son
 * de cero y no escalan a nada: entonces se reconstruye desde el total del grupo que
 * `createSharedTransaction` guarda en el doc (`sharedGroupAmount` / `sharedInterestRate`),
 * con la misma amortización que se escribió en el documento del otro.
 */
export function installmentPortion(
  tx: {
    amount: number;
    installmentTotal?: number;
    installmentNumber?: number;
    sharedGroupAmount?: number;
    sharedInterestRate?: number;
  },
  percentage: number,
  myPct: number | undefined,
): number {
  if (myPct && myPct > 0) return Math.round((tx.amount * percentage) / myPct);
  if (!tx.sharedGroupAmount) return 0; // docs anteriores a este campo: sin base no se inventa cifra
  const base = Math.round((tx.sharedGroupAmount * percentage) / 100);
  const cuotas = calculateInstallments(base, tx.installmentTotal ?? 1, tx.sharedInterestRate || null);
  return cuotas[(tx.installmentNumber ?? 1) - 1] ?? 0;
}

/** Forma mínima de un documento compartido para repartirlo entre sus participantes. */
interface SplittableTx {
  userId?: string;
  amount: number;
  isShared?: boolean;
  isInstallment?: boolean;
  installmentTotal?: number;
  installmentNumber?: number;
  sharedType?: 'expense_share' | 'income_claim';
  sharedParticipants?: { uid: string; percentage: number }[];
  sharedGroupAmount?: number;
  sharedInterestRate?: number;
}

const pctIn = (tx: SplittableTx, uid?: string): number | undefined =>
  tx.sharedParticipants?.find((p) => p.uid === uid)?.percentage;

/**
 * Importe del GRUPO que representa esta fila, no solo mi parte.
 *
 * Sin cuotas el documento ya guarda el total del grupo en `amount`. En cuotas guarda
 * MI cuota, así que la del grupo se reconstruye igual que la de cualquier otro
 * participante, pidiendo el 100%.
 */
export function groupAmount(tx: SplittableTx): number {
  if (!tx.isShared || tx.sharedType === 'income_claim') return tx.amount;
  if (!tx.isInstallment) return tx.amount;
  return installmentPortion(tx, 100, pctIn(tx, tx.userId));
}

export interface ShareLine {
  uid: string;
  percentage: number;
  /** Lo que le toca en CADA cuota — igual al total si el gasto no va a cuotas. */
  perInstallment: number;
  /** Lo que le toca por el gasto entero, sumadas todas las cuotas. */
  total: number;
}

/**
 * Reparto del gasto persona a persona, visto desde MI documento: cuánto asume cada
 * uno en la cuota de este mes y en el total. Con 0% las cifras son cero, que es
 * justamente el dato: el movimiento se le registra para que sepa que existe, pero no
 * lo asume.
 */
export function splitBreakdown(tx: SplittableTx): ShareLine[] {
  const participants = tx.sharedParticipants ?? [];
  if (!tx.isShared || tx.sharedType === 'income_claim') return [];
  const myPct = pctIn(tx, tx.userId);
  const n = tx.isInstallment ? Math.max(1, tx.installmentTotal ?? 1) : 1;

  return participants.map((p) => {
    if (!tx.isInstallment) {
      const total = Math.round((tx.amount * p.percentage) / 100);
      return { uid: p.uid, percentage: p.percentage, perInstallment: total, total };
    }
    const perInstallment = installmentPortion(tx, p.percentage, myPct);
    // Con el total del grupo se suma la amortización real (la última cuota absorbe el
    // redondeo); sin él —docs viejos— se estima multiplicando, que es lo único que hay.
    const total = tx.sharedGroupAmount
      ? calculateInstallments(
          Math.round((tx.sharedGroupAmount * p.percentage) / 100),
          n,
          tx.sharedInterestRate || null,
        ).reduce((s, c) => s + c, 0)
      : perInstallment * n;
    return { uid: p.uid, percentage: p.percentage, perInstallment, total };
  });
}

/**
 * Importe que esta transacción representa PARA EL USUARIO dueño del doc.
 *
 * En un gasto compartido sin cuotas, `amount` es el total del grupo y `sharedAmount` la parte
 * de este usuario: todo agregado propio (balance, tendencia, categorías, reportes) debe usar
 * `sharedAmount`, o la fila y el balance cuentan cosas distintas.
 *
 * En cuotas es al revés: `amount` ya es la cuota amortizada sobre la base de este participante,
 * y `sharedAmount` sería un gemelo redondeado de esa misma cuota (división plana) — usarlo
 * introduce un error de redondeo en la última cuota.
 *
 * En `income_claim` ambos campos valen lo mismo, así que el resultado no cambia.
 */
export function effectiveAmount(tx: {
  amount: number;
  isShared?: boolean;
  isInstallment?: boolean;
  sharedAmount?: number | null;
}): number {
  if (tx.isShared && !tx.isInstallment && tx.sharedAmount != null) return tx.sharedAmount;
  return tx.amount;
}
