#!/usr/bin/env node
/**
 * Comprueba que TODA clave usada con `t('...')` en las pantallas indicadas existe
 * en los tres idiomas, y que los tres tienen el mismo juego de claves.
 *
 * Por qué existe: el bug de `localeFor is not defined` (ver
 * docs/contexto/errores-conocidos.md) enseñó que el bundler no falla por esto —
 * revienta en runtime, o peor: pinta la clave cruda en pantalla y nadie lo nota.
 *
 *   node scripts/check-i18n-keys.js [ruta...]     (por defecto: app/ y components/)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LANGS = ['es', 'en', 'it'];
const dicts = Object.fromEntries(
  LANGS.map((l) => [l, JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', `${l}.json`), 'utf8'))]),
);

function get(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const targets = process.argv.slice(2).length
  ? process.argv.slice(2).map((p) => path.join(ROOT, p))
  : [path.join(ROOT, 'app'), path.join(ROOT, 'components')];

const files = targets.flatMap((t) =>
  fs.statSync(t).isDirectory() ? walkFiles(t) : [t]);

const missing = [];
const used = new Set();
// t('clave') y t("clave") — se ignoran las claves construidas dinámicamente
const RE = /\bt\(\s*['"]([A-Za-z0-9_.]+)['"]/g;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = RE.exec(src))) {
    const key = m[1];
    used.add(key);
    for (const lang of LANGS) {
      const v = get(dicts[lang], key);
      // Válido si existe la clave, o si existe en forma plural de i18next
      // (`clave_one` / `clave_other`, como home.pro.streakValue o friends.list.count).
      // `returnObjects` (p.ej. history.months) devuelve array: también cuenta.
      const hasPlural = get(dicts[lang], `${key}_other`) !== undefined
        || get(dicts[lang], `${key}_one`) !== undefined;
      if (v === undefined && !hasPlural) {
        missing.push(`${path.relative(ROOT, file)} → ${key} falta en ${lang}`);
      }
    }
  }
}

// Paridad de claves entre idiomas (recursiva)
function flat(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key, out);
    else out.add(key);
  }
  return out;
}
const flats = Object.fromEntries(LANGS.map((l) => [l, flat(dicts[l])]));
const parity = [];
for (const lang of LANGS.slice(1)) {
  for (const k of flats.es) if (!flats[lang].has(k)) parity.push(`${k} falta en ${lang}`);
  for (const k of flats[lang]) if (!flats.es.has(k)) parity.push(`${k} sobra en ${lang} (no está en es)`);
}

if (missing.length || parity.length) {
  if (missing.length) {
    console.error(`\n✗ ${missing.length} claves usadas que no existen:\n`);
    missing.forEach((m) => console.error('  · ' + m));
  }
  if (parity.length) {
    console.error(`\n✗ ${parity.length} desajustes de paridad entre idiomas:\n`);
    parity.slice(0, 40).forEach((m) => console.error('  · ' + m));
    if (parity.length > 40) console.error(`  … y ${parity.length - 40} más`);
  }
  process.exit(1);
}

console.log(`✓ i18n: ${used.size} claves usadas en ${files.length} archivos existen en ${LANGS.join('/')}`);
console.log(`✓ paridad: ${flats.es.size} claves idénticas en los tres idiomas`);
