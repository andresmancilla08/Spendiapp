/**
 * Filtros del historial. Vive fuera de la pantalla para poder probarlo: son siete
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
  shared: 'all' | 'shared' | 'notShared';
  /** Naturaleza: fijo, cuota o suelto. */
  kind: 'all' | 'fixed' | 'installment' | 'single';
  card: 'all' | 'withCard' | 'noCard';
  /** Movimientos que vienen de otra persona o van hacia ella. */
  friend: 'all' | 'received' | 'sent';
  search: string;
}

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  type: 'all', paid: 'unpaid', shared: 'all', kind: 'all', card: 'all', friend: 'all', search: '',
};

/** Cuántos criterios se han movido de su valor por defecto. Es lo que se pinta en el
 *  botón de filtros: sin ese número, un filtro olvidado parece "no tengo movimientos". */
export function activeFilterCount(f: HistoryFilters): number {
  let n = 0;
  if (f.type !== 'all') n++;
  if (f.paid !== DEFAULT_HISTORY_FILTERS.paid) n++;
  if (f.shared !== 'all') n++;
  if (f.kind !== 'all') n++;
  if (f.card !== 'all') n++;
  if (f.friend !== 'all') n++;
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
    if (f.shared !== 'all' && (f.shared === 'shared' ? t.isShared !== true : t.isShared === true)) return false;
    if (f.kind === 'fixed' && t.isFixed !== true) return false;
    if (f.kind === 'installment' && t.isInstallment !== true) return false;
    // 'single' = ni fijo ni cuota.
    if (f.kind === 'single' && (t.isFixed === true || t.isInstallment === true)) return false;
    if (f.card === 'withCard' && !t.cardId) return false;
    if (f.card === 'noCard' && !!t.cardId) return false;
    // Recibido: alguien te lo envió. Enviado: TU movimiento que generó el del otro.
    if (f.friend === 'received' && t.isSentIncome !== true) return false;
    if (f.friend === 'sent' && !t.sentIncomeTransactionId) return false;
    return true;
  });
}
