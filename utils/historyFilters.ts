/**
 * Filtros del historial. Vive fuera de la pantalla para poder probarlo: son seis
 * criterios que se combinan y un `!==` mal puesto esconde movimientos de dinero sin
 * que nada falle en pantalla.
 *
 * Gate: `npx tsx utils/historyFilters.test.ts`
 */
import type { Transaction } from '../types/transaction';

export interface HistoryFilters {
  /** Ingreso, gasto o todo. */
  type: 'all' | 'income' | 'expense';
  /** Pagado / pendiente. Por defecto la pantalla muestra 'unpaid'. */
  paid: 'all' | 'paid' | 'unpaid';
  /** Naturaleza: fijo, cuota o suelto. */
  kind: 'all' | 'fixed' | 'installment' | 'single';
  card: 'all' | 'withCard' | 'noCard';
  /**
   * Relación con amigos. Antes eran dos criterios («Compartido» y «Con amigos») y
   * «Recibidos» solo miraba los ingresos enviados: un gasto compartido que creó un
   * amigo no salía en ningún lado de ese filtro, y parecía que no existía.
   *  · none     — solo lo tuyo: ni compartido ni enviado ni recibido.
   *  · shared   — gastos divididos, los creara quien los creara.
   *  · sent     — ingresos que le enviaste a alguien.
   *  · received — ingresos que un amigo te envió.
   */
  friends: 'all' | 'none' | 'shared' | 'sent' | 'received';
  search: string;
}

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  type: 'all', paid: 'unpaid', kind: 'all', card: 'all', friends: 'all', search: '',
};

/** Cuántos criterios se han movido de su valor por defecto. Es lo que se pinta en el
 *  botón de filtros: sin ese número, un filtro olvidado parece "no tengo movimientos". */
export function activeFilterCount(f: HistoryFilters): number {
  let n = 0;
  if (f.type !== 'all') n++;
  if (f.paid !== DEFAULT_HISTORY_FILTERS.paid) n++;
  if (f.kind !== 'all') n++;
  if (f.card !== 'all') n++;
  if (f.friends !== 'all') n++;
  if (f.search.trim() !== '') n++;
  return n;
}

export function applyHistoryFilters(txs: Transaction[], f: HistoryFilters): Transaction[] {
  const q = f.search.trim().toLowerCase();
  return txs.filter((t) => {
    if (f.type !== 'all' && t.type !== f.type) return false;
    if (q && !t.description.toLowerCase().includes(q)) return false;
    // `isPaid` puede venir undefined en documentos viejos: ausente = pendiente.
    if (f.paid !== 'all' && (f.paid === 'paid' ? t.isPaid !== true : t.isPaid === true)) return false;
    if (f.kind === 'fixed' && t.isFixed !== true) return false;
    if (f.kind === 'installment' && t.isInstallment !== true) return false;
    // 'single' = ni fijo ni cuota.
    if (f.kind === 'single' && (t.isFixed === true || t.isInstallment === true)) return false;
    if (f.card === 'withCard' && !t.cardId) return false;
    if (f.card === 'noCard' && !!t.cardId) return false;
    const received = t.isSentIncome === true;
    const sent = !!t.sentIncomeTransactionId;
    const shared = t.isShared === true;
    if (f.friends === 'none' && (shared || sent || received)) return false;
    if (f.friends === 'shared' && !shared) return false;
    if (f.friends === 'sent' && !sent) return false;
    if (f.friends === 'received' && !received) return false;
    return true;
  });
}

/** Filtros que viven en la hoja (sin pendientes/pagados ni búsqueda). */
export type SheetFilterKey = 'type' | 'friends' | 'kind' | 'card';

export const SHEET_FILTER_OPTIONS: { [K in SheetFilterKey]: HistoryFilters[K][] } = {
  type: ['all', 'income', 'expense'],
  friends: ['all', 'none', 'shared', 'sent', 'received'],
  kind: ['all', 'fixed', 'installment', 'single'],
  card: ['all', 'withCard', 'noCard'],
};

/** Cuántos movimientos quedarían si ese criterio pasara a `value` y el resto
 *  siguiera igual. Es el número de cada chip: evita elegir algo que vacíe la lista. */
export function countWith<K extends SheetFilterKey>(
  txs: Transaction[], f: HistoryFilters, key: K, value: HistoryFilters[K],
): number {
  return applyHistoryFilters(txs, { ...f, [key]: value }).length;
}
