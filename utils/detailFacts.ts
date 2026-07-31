/**
 * Hechos derivados del detalle de una transacción: el plan de cuotas y la vida de
 * un gasto fijo, en chips de mes. Puro y sin React Native para poder testearlo:
 *
 *   npx tsx utils/detailFacts.test.ts
 */
export type ChipState = 'done' | 'now' | 'pending' | 'skipped';
export interface MonthChip {
  /** Índice de mes 0-11 — el nombre lo pone la vista con `history.months`. */
  month: number;
  year: number;
  state: ChipState;
}

/** Primer día del mes desplazado `n` meses. */
export function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

/** Mismo día del mes siguiente, recortado si ese día no existe (31 ene → 28 feb).
 * `addMonths` devuelve el día 1, que servía para los chips pero convertía
 * «próxima cuota el 22 de agosto» en «1 ago». */
export function nextMonthSameDay(date: Date): Date {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(date.getDate(), lastDay));
}

export function monthsBetween(from: Date, toYear: number, toMonth: number): number {
  return (toYear - from.getFullYear()) * 12 + (toMonth - from.getMonth());
}

/**
 * Plan de una compra a cuotas. `date` es la fecha de la cuota que se está viendo,
 * así que el mes de la cuota 1 se deduce hacia atrás. Si hay más cuotas que
 * `maxChips`, se muestran las ÚLTIMAS (las que quedan por pagar importan más).
 */
export function installmentPlan(
  date: Date,
  current: number,
  total: number,
  maxChips = 12,
): MonthChip[] {
  if (!Number.isFinite(total) || total <= 0) return [];
  const cur = Math.min(Math.max(1, current || 1), total);
  const first = addMonths(date, -(cur - 1));
  const shown = Math.min(total, maxChips);
  const offset = total > maxChips ? total - maxChips : 0;
  return Array.from({ length: shown }, (_, i) => {
    const idx = offset + i;
    const d = addMonths(first, idx);
    return {
      month: d.getMonth(),
      year: d.getFullYear(),
      state: (idx + 1 === cur ? 'now' : idx + 1 < cur ? 'done' : 'pending') as ChipState,
    };
  });
}

/**
 * Vida de un gasto fijo: desde su creación hasta el mes que se está viendo.
 * Los meses saltados (`fixedSkipMonths`, formato `AAAA_M`) se marcan como tal y
 * no cuentan para el total pagado.
 */
export function fixedTimeline(
  createdAt: Date,
  viewYear: number,
  viewMonth: number,
  skipMonths: string[] = [],
  maxChips = 12,
): { chips: MonthChip[]; months: number; skipped: number } {
  const months = Math.max(1, monthsBetween(createdAt, viewYear, viewMonth) + 1);
  const shown = Math.min(months, maxChips);
  const offset = months > maxChips ? months - maxChips : 0;
  const chips = Array.from({ length: shown }, (_, i) => {
    const idx = offset + i;
    const d = addMonths(createdAt, idx);
    const key = `${d.getFullYear()}_${d.getMonth()}`;
    const isViewed = d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    return {
      month: d.getMonth(),
      year: d.getFullYear(),
      state: (skipMonths.includes(key) ? 'skipped' : isViewed ? 'now' : 'done') as ChipState,
    };
  });
  // Solo cuentan los saltos dentro del rango vivido, no cualquier clave suelta.
  const skipped = skipMonths.filter((k) => {
    const [y, m] = k.split('_').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return false;
    const diff = monthsBetween(createdAt, y, m);
    return diff >= 0 && diff < months;
  }).length;
  return { chips, months, skipped };
}
