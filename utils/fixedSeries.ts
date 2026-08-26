/**
 * Reglas de la SERIE de un gasto fijo.
 *
 * Un fijo es UN documento de Firestore: su `date` marca el mes de ARRANQUE y la app
 * clona copias virtuales en los meses siguientes. Escribir en ese documento la fecha
 * de la copia virtual reubicaba el arranque, y el gasto desaparecía de todo el
 * histórico anterior (bug real: un fijo de abril acabó empezando en octubre).
 *
 * Lógica pura para poder testearla: `npx tsx utils/fixedSeries.test.ts`.
 */

export const daysIn = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

export const monthKey = (year: number, month: number) => `${year}_${month}`;

/**
 * Fecha que debe llevar el documento REAL tras editar.
 * En una copia virtual el mes/año no se tocan nunca; si el usuario cambió el
 * selector, solo viaja el DÍA (recortado al último día del mes de origen).
 */
export function originDateForEdit(args: {
  isVirtualFixed: boolean;
  originDate: Date;
  selectedDate: Date;
  dateTouched: boolean;
}): Date {
  const { isVirtualFixed, originDate, selectedDate, dateTouched } = args;
  if (!isVirtualFixed) return selectedDate;
  if (!dateTouched) return originDate;
  const y = originDate.getFullYear();
  const m = originDate.getMonth();
  return new Date(y, m, Math.min(selectedDate.getDate(), daysIn(y, m)));
}

/** Fecha del documento nuevo al partir la serie: el mes que se está mirando. */
export function newDocDate(viewYear: number, viewMonth: number, day: number): Date {
  return new Date(viewYear, viewMonth, Math.min(day, daysIn(viewYear, viewMonth)));
}

/**
 * Meses omitidos que debe heredar la serie nueva: los del mes de corte en adelante.
 * Los anteriores siguen siendo asunto del documento viejo.
 */
export function futureSkipMonths(skips: string[], viewYear: number, viewMonth: number): string[] {
  return skips.filter((k) => {
    const [y, m] = k.split('_').map(Number);
    if (Number.isNaN(y) || Number.isNaN(m)) return false;
    return y > viewYear || (y === viewYear && m >= viewMonth);
  });
}
