#!/usr/bin/env node
/**
 * Comprueba que toda clave `t('...')` del código exista en los tres idiomas, y
 * lista las claves definidas que ya no se usan.
 *
 * Existe porque reescribir un bloque de `locales/*.json` deja pantallas mostrando
 * la clave cruda al usuario —`upgrade.title` apareció literal en Perfil— y ni el
 * typecheck ni el build lo detectan.
 *
 *   node scripts/check-i18n.js            # falla si falta alguna clave
 *   node scripts/check-i18n.js --unused   # además, lista las no usadas
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOCALES = ['es', 'en', 'it'];
const DIRS = ['app', 'components', 'hooks', 'utils', 'context', 'constants'];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

const files = DIRS.flatMap((d) => (fs.existsSync(path.join(ROOT, d)) ? walk(path.join(ROOT, d)) : []));

// Solo claves literales: las construidas en tiempo de ejecución no se pueden validar así.
const used = new Map(); // clave -> [archivos]
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*['"]([a-zA-Z][\w.]*)['"]/g)) {
    const rel = path.relative(ROOT, f);
    if (!used.has(m[1])) used.set(m[1], []);
    if (!used.get(m[1]).includes(rel)) used.get(m[1]).push(rel);
  }
}

const dicts = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', `${l}.json`), 'utf8'))]),
);

const get = (obj, key) => key.split('.').reduce((o, p) => (o == null ? o : o[p]), obj);

// i18next resuelve los plurales por sufijo: `x_one`, `x_other`… La clave base
// nunca existe tal cual y contarla como ausente sería un falso positivo.
const PLURAL = ['_zero', '_one', '_two', '_few', '_many', '_other'];
const has = (dict, key) =>
  get(dict, key) !== undefined || PLURAL.some((s) => get(dict, key + s) !== undefined);

let missing = 0;
for (const [key, where] of [...used].sort()) {
  const absent = LOCALES.filter((l) => !has(dicts[l], key));
  if (absent.length) {
    missing++;
    console.error(`✖ ${key}  — falta en ${absent.join(', ')}  ·  ${where.join(', ')}`);
  }
}

if (process.argv.includes('--unused')) {
  const flat = (obj, pre = '') => Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? flat(v, `${pre}${k}.`) : [`${pre}${k}`]);
  const defined = flat(dicts.es);
  const usedPrefixes = [...used.keys()];
  const unused = defined.filter((d) => !usedPrefixes.some((u) => u === d || d.startsWith(u + '.') || u.startsWith(d + '.')));
  if (unused.length) {
    console.log(`\n${unused.length} claves definidas sin usar (revisar antes de borrar):`);
    for (const u of unused) console.log('  ·', u);
  }
}

if (missing) {
  console.error(`\n${missing} clave(s) sin traducción. La app mostraría el nombre de la clave al usuario.`);
  process.exit(1);
}
console.log(`i18n ok · ${used.size} claves usadas, presentes en ${LOCALES.join('/')}`);
