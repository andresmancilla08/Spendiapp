#!/usr/bin/env node
// Comprueba firestore.rules contra la API de test de Firebase (Rules Playground,
// sin emulador ni Java). Existe porque una regresión en `allow write` dejó TRES
// SEMANAS sin poder editar ningún gasto normal: `resource.data.isShared` sobre un
// documento que no trae el campo no es `null`, es un ERROR de evaluación, y el
// error deniega. La única forma de ver eso antes de producción es ejecutar las
// reglas contra documentos reales, que es lo que hace este script.
//
//   node scripts/check-firestore-rules.mjs
//
// Requiere estar logueado: `gcloud auth login` (usa el token de aplicación).

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PROJECT = 'spendiapp-159e7';
const RULES = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

const U1 = 'U1';           // dueño
const U2 = 'U2';           // amigo / participante
const TS = '2026-08-23T12:00:00Z';

// Un gasto normal creado por `add-transaction`: OJO, NO trae `isShared`.
const plain = { userId: U1, type: 'expense', amount: 50000, category: 'food', isFixed: false };
// Un mirror de gasto compartido, tal como lo escribe `createSharedTransaction`.
const mirror = (uid) => ({
  userId: uid, type: 'expense', amount: 50000, category: 'food', isFixed: false,
  isShared: true, sharedOwnerUid: U1, sharedId: 'S1', sharedAmount: 25000,
});

// Un gasto fijo: tampoco trae `isShared`.
const fixed = { ...plain, isFixed: true, fixedPaidMonths: [] };

// Los dos documentos de un INGRESO ENVIADO. Ninguno trae `isShared`: por eso el
// espejo del destinatario solo se puede tocar por la cláusula de `isSentIncome`.
const senderTx = {
  userId: U1, type: 'expense', amount: 1610000, category: 'home', isFixed: true,
  sentIncomeToUid: U2, sentIncomeToName: 'U2', sentIncomeTransactionId: 'T2',
};
const mirrorTx = {
  userId: U2, type: 'income', amount: 1610000, category: 'other', isFixed: true,
  isSentIncome: true, sentByUid: U1, sentByName: 'U1', sentByTransactionId: 'T1',
};

const CASES = [
  ['gasto normal · el dueño lo edita',              U1, 'update', plain, { ...plain, amount: 60000 }, 'ALLOW'],
  ['gasto normal · lo edita otro usuario',          U2, 'update', plain, { ...plain, amount: 60000 }, 'DENY'],
  ['gasto normal · le cambian el userId',           U1, 'update', plain, { ...plain, userId: U2 }, 'DENY'],
  ['gasto normal · le inyectan sharedOwnerUid',     U1, 'update', plain, { ...plain, sharedOwnerUid: 'U9' }, 'DENY'],
  ['gasto normal · el dueño lo crea',               U1, 'create', null, plain, 'ALLOW'],
  ['gasto normal · el dueño lo borra',              U1, 'delete', plain, null, 'ALLOW'],
  ['gasto normal · lo borra otro usuario',          U2, 'delete', plain, null, 'DENY'],
  ['compartido · el dueño edita el mirror ajeno',   U1, 'update', mirror(U2), { ...mirror(U2), amount: 60000 }, 'ALLOW'],
  ['compartido · el invitado cambia el importe',    U2, 'update', mirror(U2), { ...mirror(U2), amount: 60000 }, 'DENY'],
  ['compartido · el invitado solo categoría y nota', U2, 'update', mirror(U2), { ...mirror(U2), category: 'other', notes: 'mía' }, 'ALLOW'],
  ['compartido · el invitado se hace dueño',        U2, 'update', mirror(U2), { ...mirror(U2), sharedOwnerUid: U2 }, 'DENY'],
  // Las otras tres escrituras que la misma regresión dejó muertas: marcar pagado,
  // omitir un mes de un gasto fijo y cancelarlo desde este mes.
  ['gasto normal · marcar como pagado',             U1, 'update', plain, { ...plain, isPaid: true }, 'ALLOW'],
  ['gasto fijo · omitir este mes',                  U1, 'update', fixed, { ...fixed, fixedSkipMonths: ['2026_7'] }, 'ALLOW'],
  ['gasto fijo · cancelar desde este mes',          U1, 'update', fixed, { ...fixed, fixedCancelledFrom: TS }, 'ALLOW'],

  // INGRESO ENVIADO. El remitente tiene que poder mantener el espejo del otro al
  // día: sin esto, cortar la serie fija ocurría solo en su lado y el destinatario
  // se quedaba con el ingreso viejo repitiéndose todos los meses.
  ['enviado · el remitente crea el espejo',         U1, 'create', null, mirrorTx, 'ALLOW'],
  ['enviado · el remitente corta la serie',         U1, 'update', mirrorTx, { ...mirrorTx, fixedCancelledFrom: TS }, 'ALLOW'],
  ['enviado · el remitente omite un mes',           U1, 'update', mirrorTx, { ...mirrorTx, fixedSkipMonths: ['2026_8'] }, 'ALLOW'],
  ['enviado · el remitente cambia el importe',      U1, 'update', mirrorTx, { ...mirrorTx, amount: 1210000 }, 'ALLOW'],
  ['enviado · el remitente lo borra',               U1, 'delete', mirrorTx, null, 'ALLOW'],
  ['enviado · el destinatario edita su copia',      U2, 'update', mirrorTx, { ...mirrorTx, notes: 'mía' }, 'ALLOW'],
  ['enviado · el destinatario lo marca pagado',     U2, 'update', mirrorTx, { ...mirrorTx, isPaid: true }, 'ALLOW'],
  ['enviado · el destinatario lo borra',            U2, 'delete', mirrorTx, null, 'ALLOW'],
  // Y solo eso: el remitente no toca lo que es privado del otro ni se apropia del doc.
  ['enviado · el remitente marca pagado al otro',   U1, 'update', mirrorTx, { ...mirrorTx, isPaid: true }, 'DENY'],
  ['enviado · el remitente le cambia el userId',    U1, 'update', mirrorTx, { ...mirrorTx, userId: U1 }, 'DENY'],
  ['enviado · el remitente se quita el vínculo',    U1, 'update', mirrorTx, { ...mirrorTx, sentByUid: 'U9' }, 'DENY'],
  ['enviado · un tercero corta la serie',           'U9', 'update', mirrorTx, { ...mirrorTx, fixedCancelledFrom: TS }, 'DENY'],
  ['enviado · un tercero lo borra',                 'U9', 'delete', mirrorTx, null, 'DENY'],
  // El gasto del remitente es SUYO: el destinatario no lo edita ni lo borra.
  ['enviado · el destinatario edita el gasto ajeno', U2, 'update', senderTx, { ...senderTx, amount: 1 }, 'DENY'],
  ['enviado · el destinatario borra el gasto ajeno', U2, 'delete', senderTx, null, 'DENY'],
];

const token = execSync('gcloud auth print-access-token', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

const body = {
  source: { files: [{ name: 'firestore.rules', content: RULES }] },
  testSuite: {
    testCases: CASES.map(([, uid, method, before, after, expectation]) => ({
      expectation,
      request: {
        auth: { uid, token: { email: `${uid.toLowerCase()}@example.com` } },
        path: '/databases/(default)/documents/transactions/T1',
        method,
        time: TS,
        ...(after ? { resource: { data: after } } : {}),
      },
      ...(before ? { resource: { data: before } } : {}),
    })),
  },
};

const res = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}:test`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'X-Goog-User-Project': PROJECT,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const json = await res.json();
if (json.error) {
  console.error('La API de reglas rechazó la petición:', json.error.message);
  process.exit(1);
}

let failed = 0;
(json.testResults ?? []).forEach((r, i) => {
  const [name] = CASES[i];
  const ok = r.state === 'SUCCESS';
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  // El mensaje de una propiedad inexistente es justo el fallo que se busca.
  if (!ok && r.debugMessages?.length) console.log(`    ${r.debugMessages[0].replace(/\n/g, ' ')}`);
});

console.log(failed === 0
  ? `\nreglas ok · ${CASES.length} casos`
  : `\n${failed}/${CASES.length} casos FALLAN`);
process.exit(failed === 0 ? 0 : 1);
