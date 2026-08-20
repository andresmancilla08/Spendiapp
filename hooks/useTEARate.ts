import { useMemo } from 'react';

/**
 * Tasa de Usura certificada por la Superfinanciera para Consumo y Ordinario:
 * el TECHO LEGAL de interés, no la tasa de ninguna tarjeta concreta.
 *
 * SE CERTIFICA **CADA MES**, no cada trimestre. El código heredado decía
 * «actualizar cada trimestre» en un comentario y sobre esa premisa falsa se
 * construyó la primera versión de este hook. La certificación es por periodos
 * de mes natural: el IBC de agosto de 2026 quedó en 19,77 % E.A. «para el
 * periodo comprendido entre el 1 y el 31 de agosto», y la usura es 1,5 × IBC.
 *
 * Y se mueve mucho: 24,36 % en enero de 2026, 28,79 % en julio, 29,66 % en
 * agosto. Un valor quemado aquí caduca en semanas, no en meses — por eso el
 * hook avisa en cuanto pasa su mes en vez de fingir vigencia.
 *
 * Fuentes: Resolución 1139 de 2026 (SFC) · https://www.superfinanciera.gov.co/Superfinanciera-Tasas/
 */
interface UsuryMonth {
  year: number;
  /** Mes 0-11, como en Date. */
  month: number;
  rate: number;
}

/** Histórico conocido, del más reciente al más antiguo. Añadir arriba. */
const USURY_HISTORY: UsuryMonth[] = [
  { year: 2026, month: 7, rate: 29.66 },  // agosto 2026 · IBC 19,77 % × 1,5
  { year: 2026, month: 6, rate: 28.79 },  // julio 2026
  { year: 2026, month: 0, rate: 24.36 },  // enero 2026
];

function monthIndex(y: number, m: number): number {
  return y * 12 + m;
}

export interface TEARateResult {
  /** El último valor certificado que conocemos, en % E.A. */
  tea: number;
  /** Mes al que corresponde ese valor. */
  year: number;
  /** Mes 0-11. */
  month: number;
  /** true si el mes en curso ya no es el del valor: el dato está viejo. */
  isStale: boolean;
  /** Cuántos meses lleva sin actualizarse (0 = al día). */
  monthsBehind: number;
  loading: boolean;
}

/**
 * `now` es inyectable para poder ejercitar la caducidad en un test sin viajar
 * en el tiempo. En la app nadie lo pasa.
 */
export function useTEARate(now?: Date): TEARateResult {
  return useMemo(() => resolveTEARate(now ?? new Date()), [now?.getTime()]);
}

/** Lógica pura, sin React: la usa el hook y su gate. */
export function resolveTEARate(now: Date): TEARateResult {
  const latest = USURY_HISTORY[0];
  const monthsBehind = Math.max(
    0,
    monthIndex(now.getFullYear(), now.getMonth()) - monthIndex(latest.year, latest.month),
  );
  return {
    tea: latest.rate,
    year: latest.year,
    month: latest.month,
    isStale: monthsBehind > 0,
    monthsBehind,
    loading: false,
  };
}
