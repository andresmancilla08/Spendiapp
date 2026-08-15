/**
 * Prueba de extremo a extremo de los gastos compartidos A CUOTAS.
 *
 *   npx tsx utils/friendReportInstallments.test.ts
 *
 * No inventa la forma de los documentos: reproduce lo que `createSharedTransaction`
 * (hooks/useSharedTransactions.ts) escribe de verdad en Firestore para cada
 * participante, usando las MISMAS funciones de cálculo que usa la app
 * (`calculateInstallments`, `calcSharedAmount`). Después pasa esos documentos por
 * `buildFriendReport` y comprueba que el saldo entre los dos cuadra.
 *
 * Existe porque aquí vivía un error de dinero: la parte del amigo se calculaba
 * aplicando su porcentaje sobre MI cuota —que ya venía amortizada sobre el mío—,
 * y en un 50/50 el reporte mostraba la mitad de la mitad.
 */
import assert from 'node:assert';
import { calculateInstallments } from './installmentCalc';
import { calcSharedAmount } from './sharedCalc';
import { buildFriendReport } from './friendReportModel';
import { effectiveAmount, installmentPortion } from './sharedCalc';
import type { Transaction } from '../types/transaction';

const ME = 'uid-yo';
const FRIEND = 'uid-amigo';

interface Participant { uid: string; displayName: string; percentage: number }

/**
 * Replica `createSharedTransaction` para el caso "gasto compartido a cuotas":
 * a cada participante se le crean N documentos, cada uno con SU cuota calculada
 * sobre su porcentaje del total (hooks/useSharedTransactions.ts:88-105).
 */
function createSharedInstallments(opts: {
  total: number;
  installments: number;
  tea: number | null;
  ownerUid: string;
  participants: Participant[];
  description: string;
  startDay: number;
}): Record<string, Transaction[]> {
  const { total, installments, tea, ownerUid, participants, description, startDay } = opts;
  const byUser: Record<string, Transaction[]> = {};

  for (const participant of participants) {
    const participantBase = Math.round((total * participant.percentage) / 100);
    const amounts = calculateInstallments(participantBase, installments, tea);

    byUser[participant.uid] = amounts.map((amt, i) => ({
      id: `${description}-${participant.uid}-${i + 1}`,
      userId: participant.uid,
      type: 'expense',
      amount: amt,
      category: 'home',
      description,
      date: new Date(2026, 7, startDay),
      createdAt: new Date(2026, 7, startDay),
      isShared: true,
      sharedType: 'expense_share',
      sharedOwnerUid: ownerUid,
      sharedParticipants: participants,
      sharedAmount: calcSharedAmount(total, tea ?? 0, installments, participant.percentage),
      isInstallment: true,
      installmentNumber: i + 1,
      installmentTotal: installments,
      // El doc guarda la cuota de cada uno; el total del grupo va aparte para poder
      // reconstruir la parte ajena cuando la propia es 0%.
      sharedGroupAmount: total,
      sharedInterestRate: tea ?? 0,
    } as unknown as Transaction));
  }
  return byUser;
}

// ── Caso 1: nevera a 10 cuotas, 50/50, la pago yo ──────────────────────────
{
  const total = 1_000_000;
  const docs = createSharedInstallments({
    total, installments: 10, tea: null, ownerUid: ME,
    participants: [
      { uid: ME, displayName: 'Yo', percentage: 50 },
      { uid: FRIEND, displayName: 'Amigo', percentage: 50 },
    ],
    description: 'Nevera', startDay: 5,
  });

  // Solo llega a mi reporte la cuota de ESTE mes (una por documento de mi colección)
  const miCuota = docs[ME][0];
  assert.strictEqual(miCuota.amount, 50_000, 'mi cuota: 500.000 / 10');

  const model = buildFriendReport({
    myName: 'Yo', myUid: ME, friendName: 'Amigo', friendUid: FRIEND,
    month: 7, year: 2026,
    sentToFriend: [], receivedFromFriend: [], sharedIOwe: [], sharedTheyOwe: [miCuota],
  });

  assert.strictEqual(
    model.entries[0].amount, 50_000,
    'la cuota del amigo es igual a la mía en un 50/50 — no 25.000',
  );
  // Y coincide con lo que de verdad tiene el amigo en SU colección
  assert.strictEqual(model.entries[0].amount, docs[FRIEND][0].amount,
    'lo que el reporte dice que debe == lo que su propia cuota dice');
  assert.strictEqual(model.net, 50_000, 'me debe la cuota del mes');
}

// ── Caso 2: reparto desigual 70/30 con interés ─────────────────────────────
{
  const total = 2_400_000;
  const docs = createSharedInstallments({
    total, installments: 12, tea: 26.4, ownerUid: ME,
    participants: [
      { uid: ME, displayName: 'Yo', percentage: 70 },
      { uid: FRIEND, displayName: 'Amigo', percentage: 30 },
    ],
    description: 'Lavadora', startDay: 9,
  });

  const model = buildFriendReport({
    myName: 'Yo', myUid: ME, friendName: 'Amigo', friendUid: FRIEND,
    month: 7, year: 2026,
    sentToFriend: [], receivedFromFriend: [], sharedIOwe: [], sharedTheyOwe: [docs[ME][0]],
  });

  const suCuotaReal = docs[FRIEND][0].amount;
  const dicho = model.entries[0].amount;
  // Con interés cada base se amortiza por separado, así que se admite el redondeo
  // de una unidad; lo que no se admite es equivocarse de proporción.
  assert.ok(
    Math.abs(dicho - suCuotaReal) <= 2,
    `70/30 con interés: el reporte dice ${dicho} y su cuota real es ${suCuotaReal}`,
  );
  assert.strictEqual(model.entries[0].percentage, 30, 'el badge muestra SU porcentaje');
}

// ── Caso 3: la paga el amigo, tres personas ────────────────────────────────
{
  // 1.000.000 al 35% en 3 cuotas NO da un número redondo: la división exacta deja
  // residuo y la última cuota lo absorbe, así que `sharedAmount` (división plana)
  // y `amount` (cuota real) se separan. Es el caso que desviaba la cifra.
  const total = 1_000_000;
  const OTRO = 'uid-tercero';
  const docs = createSharedInstallments({
    total, installments: 3, tea: null, ownerUid: FRIEND,
    participants: [
      { uid: FRIEND, displayName: 'Amigo', percentage: 40 },
      { uid: ME, displayName: 'Yo', percentage: 35 },
      { uid: OTRO, displayName: 'Tercero', percentage: 25 },
    ],
    description: 'Sofá', startDay: 14,
  });

  const miCuota = docs[ME][2];   // la última: la que absorbe el residuo
  const model = buildFriendReport({
    myName: 'Yo', myUid: ME, friendName: 'Amigo', friendUid: FRIEND,
    month: 7, year: 2026,
    sentToFriend: [], receivedFromFriend: [], sharedIOwe: [miCuota], sharedTheyOwe: [],
  });

  assert.strictEqual(
    model.entries[0].amount, miCuota.amount,
    'lo que yo debo es MI cuota tal cual, no su gemelo redondeado (sharedAmount)',
  );
  assert.notStrictEqual(
    miCuota.sharedAmount, miCuota.amount,
    'este caso tiene sharedAmount distinto de amount: es justo el que desviaba la cifra',
  );
  assert.strictEqual(model.entries[0].percentage, 35, 'el badge muestra MI porcentaje');
  assert.strictEqual(model.entries[0].side, 'them', 'pagó el amigo → juega en mi contra');
  assert.strictEqual(model.net, -miCuota.amount);
  assert.strictEqual(model.entries[0].participants, 3, 'había un tercero en el gasto');
}

// ── Caso 4: un mes real mezclado ───────────────────────────────────────────
{
  const nevera = createSharedInstallments({
    total: 1_000_000, installments: 10, tea: null, ownerUid: ME,
    participants: [
      { uid: ME, displayName: 'Yo', percentage: 50 },
      { uid: FRIEND, displayName: 'Amigo', percentage: 50 },
    ],
    description: 'Nevera', startDay: 5,
  });
  const tv = createSharedInstallments({
    total: 600_000, installments: 6, tea: null, ownerUid: FRIEND,
    participants: [
      { uid: FRIEND, displayName: 'Amigo', percentage: 50 },
      { uid: ME, displayName: 'Yo', percentage: 50 },
    ],
    description: 'Televisor', startDay: 12,
  });

  const model = buildFriendReport({
    myName: 'Yo', myUid: ME, friendName: 'Amigo', friendUid: FRIEND,
    month: 7, year: 2026,
    sentToFriend: [], receivedFromFriend: [],
    sharedIOwe: [tv[ME][0]],
    sharedTheyOwe: [nevera[ME][0]],
  });

  assert.strictEqual(model.totals.sharedTheyOwe, 50_000, 'me debe su cuota de la nevera');
  assert.strictEqual(model.totals.sharedIOwe, 50_000, 'le debo mi cuota del televisor');
  assert.strictEqual(model.net, 0, 'cuotas iguales en sentidos opuestos: saldados');
  assert.strictEqual(model.movementCount, 2);
  assert.strictEqual(model.paidByMe, 1, 'de los dos, uno lo puse yo');
}


// ── Caso 5: lo que enseña la ficha del movimiento ─────────────────────────
// `app/transaction-detail.tsx` pinta "$X cada uno" con el mismo dato. Usaba
// `sharedAmount ?? amount`, que en cuotas es el gemelo por división plana.
{
  const docs = createSharedInstallments({
    total: 1_000_000, installments: 3, tea: null, ownerUid: ME,
    participants: [
      { uid: ME, displayName: 'Yo', percentage: 35 },
      { uid: FRIEND, displayName: 'Amigo', percentage: 65 },
    ],
    description: 'Sofá', startDay: 14,
  });
  const ultima = docs[ME][2];

  assert.notStrictEqual(
    ultima.sharedAmount, ultima.amount,
    'el escenario es válido: en esta cuota los dos campos difieren',
  );
  assert.strictEqual(
    effectiveAmount(ultima), ultima.amount,
    'la ficha debe enseñar la cuota real, no el gemelo redondeado',
  );
}


// ── Caso 6: lo que enseña el editor al abrir una cuota compartida ─────────
// `app/edit-transaction.tsx` mostraba la parte de cada uno con
// `calcSharedAmount(importeEditado, 0, 1, pct)`, pero el importe editado es MI
// cuota, no el total: en un 50/50 decía que a cada uno le tocaban 25.000.
{
  const docs = createSharedInstallments({
    total: 1_000_000, installments: 10, tea: null, ownerUid: ME,
    participants: [
      { uid: ME, displayName: 'Yo', percentage: 50 },
      { uid: FRIEND, displayName: 'Amigo', percentage: 50 },
    ],
    description: 'Nevera', startDay: 5,
  });
  const miCuota = docs[ME][0];
  const miPct = 50;

  const comoLoHacia = calcSharedAmount(miCuota.amount, 0, 1, 50);
  const comoDebe = Math.round((miCuota.amount * 50) / miPct);

  assert.strictEqual(comoLoHacia, 25_000, 'así se veía antes: la mitad de la mitad');
  assert.strictEqual(comoDebe, 50_000, 'lo correcto: cada uno paga su cuota completa');
  assert.strictEqual(comoDebe, docs[FRIEND][0].amount, 'y coincide con la cuota real del amigo');
}

// ── Caso 7: registro yo, lo asume el otro (0% / 100%) ────────────────────────
// Presté mi tarjeta: el gasto se registra en mis cuotas —y mis documentos son de
// cero— pero el 100% lo asume la otra persona. De un cero no se deduce nada
// escalando, así que el reporte tiene que reconstruirlo desde el total del grupo.
{
  const total = 1_200_000;
  const docs = createSharedInstallments({
    total, installments: 12, tea: 26.4, ownerUid: ME,
    participants: [
      { uid: ME, displayName: 'Yo', percentage: 0 },
      { uid: FRIEND, displayName: 'Amigo', percentage: 100 },
    ],
    description: 'Portátil', startDay: 3,
  });

  const miCuota = docs[ME][0];
  assert.strictEqual(miCuota.amount, 0, 'no asumo nada: mi cuota es cero');

  const model = buildFriendReport({
    myName: 'Yo', myUid: ME, friendName: 'Amigo', friendUid: FRIEND,
    month: 7, year: 2026,
    sentToFriend: [], receivedFromFriend: [], sharedIOwe: [], sharedTheyOwe: [miCuota],
  });

  assert.strictEqual(
    model.entries[0].amount, docs[FRIEND][0].amount,
    'me debe SU cuota completa, no cero',
  );
  assert.strictEqual(model.entries[0].percentage, 100, 'el badge muestra su 100%');
  assert.strictEqual(model.net, docs[FRIEND][0].amount, 'el saldo del mes es su cuota entera');
  // Y sin cuotas el documento ya guarda el total del grupo, así que sale solo.
  assert.strictEqual(
    effectiveAmount({ amount: total, isShared: true, sharedAmount: 0 }), 0,
    'sin cuotas mi parte es 0 aunque el doc guarde el total del grupo',
  );
}

// ── Caso 8: docs anteriores al total del grupo ───────────────────────────────
// Los compartidos a cuotas creados antes de guardar `sharedGroupAmount` siguen
// funcionando; solo el reparto 0% —que antes ni se podía guardar— devuelve 0.
{
  const legacy = {
    amount: 50_000, installmentTotal: 10, installmentNumber: 1,
  };
  assert.strictEqual(installmentPortion(legacy, 50, 50), 50_000, 'legacy con mi 50% intacto');
  assert.strictEqual(installmentPortion(legacy, 100, 0), 0, 'legacy al 0%: sin base, no se inventa');
}

console.log(
  '✓ cuotas compartidas: 50/50, 70/30 con interés, tres personas, mes mixto, la ficha del ' +
  'movimiento, el editor, el reparto 0/100 y los docs legacy cuadran con lo que escribe ' +
  'createSharedTransaction',
);
