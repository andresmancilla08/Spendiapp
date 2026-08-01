/**
 * Gate del modelo del reporte entre amigos. Correr con:
 *   npx tsx utils/friendReportModel.test.ts
 *
 * Los datos son los mismos que se usaron en las propuestas de diseño: si el neto
 * deja de dar $ 134.500 con estos siete movimientos, la pantalla y el documento
 * están mintiendo.
 */
import assert from 'node:assert';
import { buildFriendReport, scaleTilt, initialOf } from './friendReportModel';
import type { Transaction } from '../types/transaction';

const ME = 'uid-david';
const FRIEND = 'uid-ana';

const tx = (over: Partial<Transaction> & { id: string; amount: number; date: Date }): Transaction =>
  ({
    userId: ME,
    type: 'expense',
    category: 'other',
    description: '',
    createdAt: over.date,
    ...over,
  } as Transaction);

const shared = (
  id: string, day: number, description: string, amount: number, friendPct: number,
  ownerUid: string, category: string,
): Transaction =>
  tx({
    id, amount, date: new Date(2026, 7, day), description, category,
    isShared: true,
    sharedOwnerUid: ownerUid,
    sharedParticipants: [
      { uid: ME, displayName: 'David', percentage: 100 - friendPct },
      { uid: FRIEND, displayName: 'Ana', percentage: friendPct },
    ],
    sharedAmount: Math.round((amount * (100 - friendPct)) / 100),
  } as Partial<Transaction> as any);

// Los 4 gastos compartidos que pagué yo → Ana debe su porcentaje
const cena = shared('t1', 24, 'Cena Andrés Carne de Res', 192000, 50, ME, 'food');
const mercado = shared('t2', 21, 'Mercado del mes', 321000, 40, ME, 'other');
const gasolina = shared('t5', 11, 'Gasolina viaje Villeta', 188182, 33, ME, 'transport');

// Los que pagó Ana → yo debo mi parte (sharedAmount ya es MI parte)
const concierto = tx({
  id: 't4', amount: 420000, date: new Date(2026, 7, 15), description: 'Concierto Bad Bunny',
  category: 'entertainment', isShared: true, sharedOwnerUid: FRIEND,
  sharedAmount: 210000,
  sharedParticipants: [
    { uid: FRIEND, displayName: 'Ana', percentage: 50 },
    { uid: ME, displayName: 'David', percentage: 50 },
  ],
} as any);
const almuerzo = tx({
  id: 't7', amount: 94000, date: new Date(2026, 7, 3), description: 'Almuerzo trabajo',
  category: 'food', isShared: true, sharedOwnerUid: FRIEND,
  sharedAmount: 47000,
  sharedParticipants: [
    { uid: FRIEND, displayName: 'Ana', percentage: 50 },
    { uid: ME, displayName: 'David', percentage: 50 },
  ],
} as any);

const taxi = tx({
  id: 't3', amount: 45000, date: new Date(2026, 7, 18), description: 'Taxi aeropuerto',
  category: 'transport', sentIncomeTransactionId: 'x', sentIncomeToUid: FRIEND,
} as any);
const devolucion = tx({
  id: 't6', amount: 150000, date: new Date(2026, 7, 7), description: 'Ella me devolvió',
  category: 'other', type: 'income', isSentIncome: true, sentByUid: FRIEND,
} as any);

const model = buildFriendReport({
  myName: 'David Osorio', myUid: ME,
  friendName: 'Ana Ruiz', friendUserName: 'anaruiz', friendUid: FRIEND,
  month: 7, year: 2026,
  sentToFriend: [taxi],
  receivedFromFriend: [devolucion],
  sharedIOwe: [concierto, almuerzo],
  sharedTheyOwe: [cena, mercado, gasolina],
});

// 1. Reparto por porcentajes
assert.strictEqual(model.entries.find((e) => e.id === 't1')!.amount, 96000, 'cena 50% de 192.000');
assert.strictEqual(model.entries.find((e) => e.id === 't2')!.amount, 128400, 'mercado 40% de 321.000');
assert.strictEqual(model.entries.find((e) => e.id === 't5')!.amount, 62100, 'gasolina 33% de 188.182');

// 2. Lo que pagó la otra persona usa MI parte, no el total
assert.strictEqual(model.entries.find((e) => e.id === 't4')!.amount, 210000, 'concierto: mi mitad');
assert.strictEqual(model.entries.find((e) => e.id === 't7')!.amount, 47000, 'almuerzo: mi mitad');

// 3. Lados
const sideOf = (id: string) => model.entries.find((e) => e.id === id)!.side;
assert.strictEqual(sideOf('t1'), 'me', 'lo que pagué yo juega a mi favor');
assert.strictEqual(sideOf('t3'), 'them', 'lo que envié juega en mi contra');
assert.strictEqual(sideOf('t4'), 'them', 'lo que pagó Ana lo debo yo');
assert.strictEqual(sideOf('t6'), 'me', 'lo que recibí juega a mi favor');

// 4. Totales y neto
assert.strictEqual(model.totals.sent, 45000);
assert.strictEqual(model.totals.received, 150000);
assert.strictEqual(model.totals.sharedIOwe, 257000);
assert.strictEqual(model.totals.sharedTheyOwe, 286500);
assert.strictEqual(model.totals.mine, 436500);
assert.strictEqual(model.totals.theirs, 302000);
assert.strictEqual(model.net, 134500, 'Ana te debe $ 134.500');

// 5. Orden cronológico inverso y dato social
assert.strictEqual(model.entries[0].id, 't1', 'el más reciente primero');
assert.strictEqual(model.entries[model.entries.length - 1].id, 't7');
assert.strictEqual(model.movementCount, 7);
assert.strictEqual(model.paidByMe, 4, 'pagaste tú 4 de las 7 veces');
assert.strictEqual(model.volume, 738500);

// 6. La balanza cae del lado de quien debe
assert.ok(scaleTilt(model.totals) < 0, 'con saldo a mi favor la balanza cae hacia mí');
assert.strictEqual(scaleTilt({ ...model.totals, mine: 0, theirs: 0 }), 0, 'sin movimientos, nivelada');

// 7. Iniciales
assert.strictEqual(initialOf('Ana Ruiz'), 'A');
assert.strictEqual(initialOf('  '), '·');

console.log(
  `✓ friendReportModel: ${model.movementCount} movimientos, neto $ ${model.net.toLocaleString('es-CO')}, ` +
  `${model.paidByMe} de ${model.movementCount} puestos por mí`,
);
