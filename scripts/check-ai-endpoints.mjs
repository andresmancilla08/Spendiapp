// Comprobación runnable de los tres endpoints de IA (api/ocr, api/categorize, api/insight)
// contra la API real de Gemini, sin desplegar: monta req/res falsos y llama al handler.
//
// Existe porque los endpoints se rompieron en silencio: el modelo fijado
// (gemini-2.0-flash) se quedó sin cuota en el tier gratuito y los tres devolvían
// 502 para siempre. Este check falla si vuelve a pasar.
//
//   node scripts/check-ai-endpoints.mjs        (lee GEMINI_API_KEY de .env.local)
//
// La imagen es un recibo FICTICIO (scripts/fixtures/receipt-demo.jpg).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^GEMINI_API_KEY=(.*)$/);
  if (m) process.env.GEMINI_API_KEY = m[1].trim().replace(/^["']|["']$/g, '');
}
assert.ok(process.env.GEMINI_API_KEY, 'falta GEMINI_API_KEY en .env.local');

// res mínimo compatible con lo que usan los handlers.
function fakeRes() {
  const res = { code: 0, body: null, headers: {} };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.status = (c) => { res.code = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.end = () => res;
  return res;
}

const call = async (mod, body) => {
  const { default: handler } = await import(join(ROOT, 'api', mod));
  const res = fakeRes();
  await handler({ method: 'POST', body }, res);
  return res;
};

let failed = 0;
const check = async (name, fn) => {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`✗ ${name}\n  ${e.message}`);
  }
};

await check('ocr: lee el recibo ficticio', async () => {
  const image = readFileSync(join(ROOT, 'scripts/fixtures/receipt-demo.jpg')).toString('base64');
  const res = await call('ocr.js', { image, mimeType: 'image/jpeg' });
  assert.equal(res.code, 200, `HTTP ${res.code} ${JSON.stringify(res.body)}`);
  assert.equal(res.body.amount, 26500, `amount=${res.body.amount} (esperado 26500)`);
  assert.match(res.body.merchant, /ficticia/i);
  assert.equal(res.body.date, '2026-07-15');
});

await check('categorize: clasifica una descripción', async () => {
  const res = await call('categorize.js', { description: 'almuerzo en restaurante del centro' });
  assert.equal(res.code, 200, `HTTP ${res.code} ${JSON.stringify(res.body)}`);
  assert.equal(res.body.category, 'food');
});

await check('insight: devuelve frase + chip', async () => {
  const res = await call('insight.js', {
    monthLabel: 'julio', dayOfMonth: 15, daysInMonth: 31,
    income: 5_000_000, expenses: 2_400_000, balance: 2_600_000,
    prevMonthExpenses: 4_100_000, prevMonthToDateExpenses: 2_000_000, savingsRate: 52,
    topCategories: [{ label: 'food', amount: 900_000 }],
  });
  assert.equal(res.code, 200, `HTTP ${res.code} ${JSON.stringify(res.body)}`);
  assert.ok(res.body.sentence.length > 10 && res.body.sentence.length <= 140);
});

await check('suggest-icon: elige del catálogo recibido', async () => {
  // Catálogo reducido a propósito: el endpoint no guarda copia del real
  // (constants/categoryIconData.ts), lo recibe y valida contra él.
  const catalog = ['fish', 'bowl', 'paw', 'plane', 'book', 'car', 'pin'];
  const res = await call('suggest-icon.js', { name: 'sushi para llevar', catalog, fallback: 'pin' });
  assert.equal(res.code, 200, `HTTP ${res.code} ${JSON.stringify(res.body)}`);
  assert.ok(catalog.includes(res.body.icon), `icon=${res.body.icon} fuera del catálogo`);
  assert.notEqual(res.body.icon, 'pin', 'debería reconocer comida, no caer al fallback');
});

await check('suggest-icon: rechaza catálogo vacío', async () => {
  const res = await call('suggest-icon.js', { name: 'gimnasio', catalog: [] });
  assert.equal(res.code, 400);
  assert.equal(res.body.error, 'no_catalog');
});

// El parser debe rechazar un recibo ilegible para que el formulario no se prellene con nada.
await check('ocr.parse: descarta salida vacía', async () => {
  const { parse } = await import(join(ROOT, 'api/ocr.js'));
  assert.equal(parse('{"merchant":"","amount":0,"category":"other","date":""}'), null); // recibo ilegible
  assert.equal(parse('no es json'), null);
  const wrapped = parse('```json\n{"merchant":"Bar Demo","amount":"12500","category":"nope","date":"15/07/2026"}\n```');
  assert.deepEqual(wrapped, { merchant: 'Bar Demo', amount: 12500, category: 'other', date: '' });
});

process.exit(failed ? 1 : 0);
