/**
 * Gate de los filtros del historial. Correr con:
 *   npx tsx utils/historyFilters.test.ts
 *
 * Siete criterios que se combinan: un `!==` mal puesto no rompe nada en pantalla,
 * simplemente esconde movimientos de dinero. Aquí se comprueba cada uno por separado
 * y dos combinaciones, incluido el caso de los documentos viejos sin `isPaid`.
 */
import assert from 'node:assert';
import { applyHistoryFilters, activeFilterCount, countWith, DEFAULT_HISTORY_FILTERS, type HistoryFilters } from './historyFilters';
import type { Transaction } from '../types/transaction';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: over.id ?? 'x', userId: 'u1', description: 'Mercado', amount: 1000,
  type: 'expense', category: 'food', date: new Date() as any, createdAt: new Date() as any,
  ...over,
} as Transaction);

const DATA: Transaction[] = [
  tx({ id: 'suelto',    description: 'Café' }),
  tx({ id: 'fijo',      description: 'Arriendo', isFixed: true }),
  tx({ id: 'cuota',     description: 'Nevera', isInstallment: true, installmentNumber: 2, installmentTotal: 12 }),
  tx({ id: 'pagado',    description: 'Luz', isPaid: true }),
  tx({ id: 'compartido',description: 'Cena', isShared: true, sharedOwnerUid: 'u1' }),
  // El caso que no aparecía: un gasto compartido que creó OTRA persona.
  tx({ id: 'compartidoAjeno', description: 'Viaje', isShared: true, sharedOwnerUid: 'u2' }),
  tx({ id: 'contarjeta',description: 'Uber', cardId: 'card-1' }),
  tx({ id: 'recibido',  description: 'Regalo', type: 'income', isSentIncome: true }),
  tx({ id: 'enviado',   description: 'Le presté', sentIncomeTransactionId: 'other-1' }),
];

const ids = (f: Partial<HistoryFilters>) =>
  applyHistoryFilters(DATA, { ...DEFAULT_HISTORY_FILTERS, paid: 'all', ...f }).map((t) => t.id).sort();

// Cada criterio, uno a uno
assert.deepEqual(ids({ kind: 'fixed' }), ['fijo']);
assert.deepEqual(ids({ kind: 'installment' }), ['cuota']);
assert.deepEqual(ids({ kind: 'single' }),
  ['compartido', 'compartidoAjeno', 'contarjeta', 'enviado', 'pagado', 'recibido', 'suelto'], 'suelto = ni fijo ni cuota');
assert.deepEqual(ids({ card: 'withCard' }), ['contarjeta']);
assert.equal(ids({ card: 'noCard' }).includes('contarjeta'), false);
assert.deepEqual(ids({ friends: 'shared' }), ['compartido', 'compartidoAjeno'], 'compartidos: los creara quien los creara');
assert.deepEqual(ids({ friends: 'received' }), ['recibido']);
assert.deepEqual(ids({ friends: 'sent' }), ['enviado']);
assert.deepEqual(ids({ friends: 'none' }), ['contarjeta', 'cuota', 'fijo', 'pagado', 'suelto'], 'sin amigos = solo lo tuyo');
assert.deepEqual(ids({ type: 'income' }), ['recibido']);
assert.deepEqual(ids({ search: 'arri' }), ['fijo'], 'la búsqueda ignora mayúsculas');

// `isPaid` ausente cuenta como pendiente: si no, los documentos viejos desaparecían
assert.deepEqual(ids({ paid: 'paid' }), ['pagado']);
assert.equal(ids({ paid: 'unpaid' }).includes('pagado'), false);
assert.equal(ids({ paid: 'unpaid' }).length, DATA.length - 1);

// Combinaciones
assert.deepEqual(ids({ kind: 'fixed', card: 'withCard' }), [], 'el fijo no tiene tarjeta');
assert.deepEqual(ids({ type: 'expense', kind: 'single', search: 'café' }), ['suelto']);

// El contador es lo que avisa de un filtro olvidado
assert.equal(activeFilterCount(DEFAULT_HISTORY_FILTERS), 0);
assert.equal(activeFilterCount({ ...DEFAULT_HISTORY_FILTERS, paid: 'all' }), 1);
assert.equal(activeFilterCount({ ...DEFAULT_HISTORY_FILTERS, kind: 'fixed', card: 'noCard', search: ' x ' }), 3);

// Conteo por opción = lo que dejaría la lista si se eligiera
const all = { ...DEFAULT_HISTORY_FILTERS, paid: 'all' as const };
assert.equal(countWith(DATA, all, 'friends', 'shared'), 2);
assert.equal(countWith(DATA, { ...all, type: 'income' }, 'friends', 'shared'), 0, 'respeta el resto de filtros');
assert.equal(countWith(DATA, all, 'type', 'all'), DATA.length);

console.log(`✓ historyFilters: ${DATA.length} movimientos, 6 criterios y sus combinaciones`);
