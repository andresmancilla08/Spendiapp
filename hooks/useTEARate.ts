import { useMemo } from 'react';

/**
 * Tasa de Usura certificada por la Superfinanciera para Consumo y Ordinario:
 * el TECHO LEGAL de interés, no la tasa de ninguna tarjeta concreta.
 *
 * Antes esto era una constante suelta con el trimestre escrito en un comentario.
 * El 2026-08-20 seguía devolviendo el valor de enero–marzo y la app lo ofrecía
 * como «referencia vigente» sin que nada avisara: un comentario que pide
 * «actualizar cada trimestre» no actualiza nada. Ahora el valor va CON su
 * trimestre y el propio hook sabe decir que ha caducado.
 *
 * Fuente: https://www.superfinanciera.gov.co/publicaciones/10097710
 */
interface UsuryQuarter {
  /** Año y trimestre (1-4) que certifica el valor. */
  year: number;
  quarter: 1 | 2 | 3 | 4;
  rate: number;
}

/** Histórico conocido, del más reciente al más antiguo. Añadir arriba. */
const USURY_HISTORY: UsuryQuarter[] = [
  { year: 2026, quarter: 1, rate: 25.52 },
];

function quarterOf(date: Date): { year: number; quarter: 1 | 2 | 3 | 4 } {
  return { year: date.getFullYear(), quarter: (Math.floor(date.getMonth() / 3) + 1) as 1 | 2 | 3 | 4 };
}

function quarterIndex(y: number, q: number): number {
  return y * 4 + q;
}

export interface TEARateResult {
  /** El último valor certificado que conocemos, en % E.A. */
  tea: number;
  /** Trimestre al que corresponde ese valor. */
  year: number;
  quarter: number;
  /** true si el trimestre en curso ya no es el del valor: el dato está viejo. */
  isStale: boolean;
  /** Cuántos trimestres lleva sin actualizarse (0 = al día). */
  quartersBehind: number;
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
  const cur = quarterOf(now);
  const quartersBehind = Math.max(
    0,
    quarterIndex(cur.year, cur.quarter) - quarterIndex(latest.year, latest.quarter),
  );
  return {
    tea: latest.rate,
    year: latest.year,
    quarter: latest.quarter,
    isStale: quartersBehind > 0,
    quartersBehind,
    loading: false,
  };
}
