/**
 * Gate del catálogo de iconos: cada icono existe, cada keyword apunta a un icono
 * real, y los nombres que escribe la gente caen donde deben. Correr con:
 *   npx tsx utils/suggestIcon.test.ts
 */
import assert from 'node:assert';
import { CATEGORY_ICON_NAMES, CATEGORY_ICON_GROUPS, KEYWORD_ICONS, EMOJI_TO_ICON, FALLBACK_ICON } from '../constants/categoryIconData';
import { suggestIconLocal } from './suggestIcon';

// 1. Integridad del catálogo
const keys = new Set(CATEGORY_ICON_NAMES);
assert.ok(keys.has(FALLBACK_ICON), 'FALLBACK_ICON debe existir en el catálogo');

for (const group of CATEGORY_ICON_GROUPS) {
  for (const icon of group.icons) {
    assert.ok(keys.has(icon), `grupo ${group.id}: "${icon}" no está en el catálogo`);
  }
}

const grouped = new Set(CATEGORY_ICON_GROUPS.flatMap((g) => g.icons));
for (const key of keys) {
  assert.ok(grouped.has(key), `"${key}" está en el catálogo pero en ningún grupo (el picker no lo muestra)`);
}

for (const [words, icon] of KEYWORD_ICONS) {
  assert.ok(keys.has(icon), `keyword ${words[0]} apunta a "${icon}", que no existe`);
  assert.ok(words.length > 0, 'grupo de keywords vacío');
}

for (const [emoji, icon] of Object.entries(EMOJI_TO_ICON)) {
  assert.ok(keys.has(icon), `EMOJI_TO_ICON["${emoji}"] apunta a "${icon}", que no existe`);
}

// 2. Lo que la gente escribe de verdad
const CASES: [string, string][] = [
  ['Almuerzos', 'tools-kitchen'],
  ['Domicilios Rappi', 'scooter'],
  ['Gasolina', 'gas-station'],
  ['Uber al trabajo', 'car'],
  ['Gimnasio', 'barbell'],
  ['Farmacia', 'pill'],
  ['Netflix', 'tv'],
  ['Arriendo', 'home'],
  ['Servicios de luz', 'bulb'],
  ['Internet fibra', 'wifi'],
  ['Veterinario', 'stethoscope'],
  ['Comida del perro', 'dog'],
  ['Universidad', 'school'],
  ['Impuestos DIAN', 'receipt-tax'],
  ['Ahorro para el viaje', 'pig-money'],
  ['Peluquería', 'haircut'],
  ['Regalo de cumpleaños', 'gift'],
  ['Hotel en Cartagena', 'bed'],
  ['Pañales del bebé', 'baby'],
  ['Diezmo', 'church'],
];

for (const [input, expected] of CASES) {
  const got = suggestIconLocal(input);
  assert.strictEqual(got, expected, `"${input}" → esperaba "${expected}", devolvió "${got}"`);
}

// 3. Sin coincidencia: null en local (el llamador cae a IA y luego a "Otro")
assert.strictEqual(suggestIconLocal('zzqx'), null);
assert.strictEqual(suggestIconLocal('a'), null, 'menos de 2 caracteres no sugiere');

// 4. Tildes y mayúsculas no rompen la búsqueda
assert.strictEqual(suggestIconLocal('MEDICÓ'), suggestIconLocal('medico'));

console.log(
  `✓ suggestIcon: ${keys.size} iconos, ${KEYWORD_ICONS.length} grupos de palabras, ` +
  `${Object.keys(EMOJI_TO_ICON).length} emoji migrables, ${CASES.length} casos reales OK`,
);
