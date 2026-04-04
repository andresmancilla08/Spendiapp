/**
 * Retorna un array de n montos enteros (pesos colombianos).
 * La diferencia de redondeo se absorbe en la última cuota.
 *
 * @param amount  Monto total de la compra (entero, pesos COP)
 * @param n       Número de cuotas (≥ 1)
 * @param tea     Tasa Efectiva Anual en % (ej: 26.4) — null = sin interés
 */
export function calculateInstallments(
  amount: number,
  n: number,
  tea: number | null,
): number[] {
  if (n <= 1) return [amount];

  if (!tea || tea === 0) {
    // Sin interés: división exacta, residuo en última cuota
    const base = Math.floor(amount / n);
    const last = amount - base * (n - 1);
    return [...Array(n - 1).fill(base), last];
  }

  // Con interés: amortización francesa (PMT fijo)
  // r = tasa mensual equivalente a TEA
  const r = Math.pow(1 + tea / 100, 1 / 12) - 1;
  // PMT = PV * r / (1 - (1+r)^-n)
  const pmt = (amount * r) / (1 - Math.pow(1 + r, -n));
  const rounded = Math.round(pmt);
  // Primeras (n-1) cuotas = PMT redondeado
  // Última cuota absorbe residuo acumulado de redondeo
  const installments = Array(n - 1).fill(rounded);
  const lastInstallment = Math.round(pmt * n) - rounded * (n - 1);
  installments.push(lastInstallment);
  return installments;
}

/**
 * Calcula la fecha de cada cuota a partir de una fecha inicial.
 * Si el día no existe en el mes destino (ej: 31 ene → feb), ajusta al último día.
 */
export function calculateInstallmentDates(startDate: Date, n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate());
    // Si el mes se desbordó (ej: 31 ene + 1 = 3 mar), retroceder al último día del mes
    if (d.getDate() !== startDate.getDate()) {
      d.setDate(0);
    }
    return d;
  });
}
