#!/usr/bin/env node
// Audita y repara los espejos de INGRESO ENVIADO. Existe porque un ingreso enviado
// son DOS documentos sueltos sin doc de coordinación, y hasta v2.72.0 las reglas
// dejaban al remitente crearlos y borrarlos pero NO actualizarlos: editar el importe
// o cortar la serie fija ocurría solo en su lado y el destinatario se quedaba con el
// movimiento viejo repitiéndose todos los meses.
//
//   node scripts/sync-sent-income.mjs            → solo audita, no escribe nada
//   node scripts/sync-sent-income.mjs --fix      → arregla lo que es dinero MAL: el
//                                                  corte de serie que no viajó y los
//                                                  importes divergentes
//   node scripts/sync-sent-income.mjs --fix-all  → además alinea date/isFixed/description
//
// `--fix-all` va aparte a propósito: `isFixed` y `date` mueven el movimiento de
// calendario y pueden AÑADIR ingresos pasados a la cuenta de otra persona. Eso es una
// decisión, no una reparación.
//
// Nunca toca `isPaid`, `notes`, `fixedPaidMonths`, `cardId` ni `category`: son del
// destinatario, que puede haberlos cambiado a propósito.
//
// Requiere estar logueado: `gcloud auth login`.

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PROJECT = 'spendiapp-159e7';
const MODE = process.argv.includes('--fix-all') ? 'all'
  : process.argv.includes('--fix') ? 'money'
  : 'dry';

const token = execSync('gcloud auth print-access-token', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const H = { Authorization: `Bearer ${token}`, 'X-Goog-User-Project': PROJECT, 'Content-Type': 'application/json' };

// Campos que el remitente manda, repartidos por lo que significa desalinearlos.
const MONEY = ['amount', 'fixedCancelledFrom', 'fixedSkipMonths', 'fixedSplitInto'];
const SHAPE = ['date', 'isFixed', 'description'];

function decode(f) {
  const k = Object.keys(f)[0];
  if (k === 'integerValue') return Number(f[k]);
  if (k === 'arrayValue') return (f[k].values ?? []).map(decode);
  if (k === 'mapValue') return flat(f[k].fields ?? {});
  return f[k];
}
function flat(fields) { const o = {}; for (const [k, f] of Object.entries(fields)) o[k] = decode(f); return o; }
/** El valor crudo, tal cual lo devuelve la API: es lo que hay que reescribir. */
function rawOf(doc, key) { return doc?._raw?.[key]; }

async function runQuery(body) {
  const r = await fetch(`${BASE}:runQuery`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return (Array.isArray(j) ? j : []).filter((x) => x.document).map((x) => ({
    id: x.document.name.split('/').pop(), ...flat(x.document.fields ?? {}), _raw: x.document.fields ?? {},
  }));
}
async function getDocById(id) {
  const r = await fetch(`${BASE}/transactions/${id}`, { headers: H });
  if (r.status === 404) return null;
  const j = await r.json();
  if (j.error) return null;
  return { id, ...flat(j.fields ?? {}), _raw: j.fields ?? {} };
}
async function patch(id, fields) {
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&');
  const r = await fetch(`${BASE}/transactions/${id}?${mask}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
}

const mirrors = await runQuery({
  structuredQuery: {
    from: [{ collectionId: 'transactions' }],
    where: { fieldFilter: { field: { fieldPath: 'isSentIncome' }, op: 'EQUAL', value: { booleanValue: true } } },
  },
});

const money = [];
const shape = [];
const orphans = [];
const backup = {};

for (const mirror of mirrors) {
  const sender = mirror.sentByTransactionId ? await getDocById(mirror.sentByTransactionId) : null;
  if (!sender) { orphans.push(mirror); continue; }

  const diff = (keys) => keys.filter((k) => JSON.stringify(mirror[k] ?? null) !== JSON.stringify(sender[k] ?? null));
  const badMoney = diff(MONEY);
  const badShape = diff(SHAPE);
  if (badMoney.length) money.push({ mirror, sender, keys: badMoney });
  if (badShape.length) shape.push({ mirror, sender, keys: badShape });
}

/** `fixedSplitInto` del remitente apunta a un documento SUYO. En el espejo tiene que
 *  apuntar al espejo de esa serie nueva; si esa serie nunca llegó a tener espejo (el
 *  bug), se corta la vieja y ya: inventar un id dejaría un puntero roto. */
async function mirrorOfSplit(senderSplitId) {
  const hit = await runQuery({
    structuredQuery: {
      from: [{ collectionId: 'transactions' }],
      where: { fieldFilter: { field: { fieldPath: 'sentByTransactionId' }, op: 'EQUAL', value: { stringValue: senderSplitId } } },
      limit: 1,
    },
  });
  return hit[0] ?? null;
}

function money2(n) { return typeof n === 'number' ? n.toLocaleString('es-CO') : String(n); }

async function report(title, group) {
  if (group.length === 0) { console.log(`\n${title}: ninguno`); return; }
  console.log(`\n${title}: ${group.length}`);
  for (const { mirror, sender, keys } of group) {
    console.log(`  · "${mirror.description}" ${money2(mirror.amount)} · de ${mirror.sentByName} · espejo ${mirror.id}`);
    for (const k of keys) console.log(`      ${k}: tiene ${JSON.stringify(mirror[k] ?? null)} → debería ${JSON.stringify(sender[k] ?? null)}`);
  }
}

console.log(`Espejos de ingreso enviado: ${mirrors.length}`);
await report('Dinero mal (corte de serie que no viajó, importes divergentes)', money);
await report('Calendario/aspecto (mueve el movimiento: decisión, no reparación)', shape);
if (orphans.length) {
  console.log(`\nEspejos huérfanos (el gasto del remitente ya no existe): ${orphans.length}`);
  for (const m of orphans) console.log(`  · "${m.description}" ${money2(m.amount)} · de ${m.sentByName} · ${m.id}`);
  console.log('  No se tocan: borrarlos quita dinero de la cuenta de alguien. Revisar uno a uno.');
}

if (MODE === 'dry') {
  console.log('\nSimulacro. Nada escrito. `--fix` para el dinero, `--fix-all` para todo.');
  process.exit(0);
}

const targets = MODE === 'all' ? [...money, ...shape] : money;
const merged = new Map();
for (const t of targets) {
  const prev = merged.get(t.mirror.id);
  merged.set(t.mirror.id, prev ? { ...t, keys: [...new Set([...prev.keys, ...t.keys])] } : t);
}

for (const { mirror, sender, keys } of merged.values()) backup[mirror.id] = mirror._raw;
writeFileSync(new URL('./sent-income-backup.json', import.meta.url), JSON.stringify(backup, null, 2));
console.log(`\nBackup del estado previo → scripts/sent-income-backup.json`);

let done = 0;
for (const { mirror, sender, keys } of merged.values()) {
  const fields = {};
  for (const k of keys) {
    if (k === 'fixedSplitInto') {
      const target = sender.fixedSplitInto ? await mirrorOfSplit(sender.fixedSplitInto) : null;
      if (target) fields.fixedSplitInto = { stringValue: target.id };
      continue;
    }
    const raw = rawOf(sender, k);
    if (raw !== undefined) fields[k] = raw;
    // Un campo que el remitente NO tiene y el espejo sí se deja estar: quitarlo
    // requiere borrar el campo, y ninguno de los casos vistos lo necesita.
  }
  if (Object.keys(fields).length === 0) continue;
  try {
    await patch(mirror.id, fields);
    done++;
    console.log(`✓ ${mirror.id} · "${mirror.description}" · ${Object.keys(fields).join(', ')}`);
  } catch (e) {
    console.log(`✗ ${mirror.id}: ${e.message}`);
  }
}
console.log(`\n${done} espejo(s) sincronizado(s).`);
