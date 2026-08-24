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
