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
 * Calcula porcentajes iguales para N participantes.
 * El último participante absorbe el residuo de redondeo para que la suma sea exactamente 100.
 *
 * @returns Array de N enteros que suma exactamente 100
 */
export function calcEqualPercentages(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(100 / count);
  const remainder = 100 - base * count;
  return Array.from({ length: count }, (_, i) =>
    i === count - 1 ? base + remainder : base,
  );
}
