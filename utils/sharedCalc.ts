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
