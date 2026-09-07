import { strict as assert } from 'node:assert';
import { mergeCustomPalettes } from './customPalettes';

const p = (id: string, name = id) => ({ id, name });

// El caso del bug: dos paletas remotas y ninguna local. Antes se perdía una.
assert.deepEqual(
  mergeCustomPalettes([], [p('custom_1'), p('custom_2')]).map((x) => x.id),
  ['custom_1', 'custom_2'],
);

// Lo remoto manda para un mismo id (es lo que sobrevive a reinstalar).
assert.deepEqual(
  mergeCustomPalettes([p('custom_1', 'viejo')], [p('custom_1', 'nuevo')]),
  [p('custom_1', 'nuevo')],
);

// Una paleta local que aún no subió a Firestore no se borra.
assert.deepEqual(
  mergeCustomPalettes([p('custom_local')], [p('custom_remota')]).map((x) => x.id),
  ['custom_remota', 'custom_local'],
);

// Sin duplicados aunque el id aparezca en las dos listas.
assert.equal(mergeCustomPalettes([p('a'), p('b')], [p('b'), p('c')]).length, 3);

// Basura de entrada: un perfil viejo puede traer null o algo que no es lista.
assert.deepEqual(mergeCustomPalettes([], undefined as never), []);
assert.deepEqual(mergeCustomPalettes(null as never, [p('a')]), [p('a')]);
assert.deepEqual(
  mergeCustomPalettes([], [p('a'), null as never, { name: 'sin id' } as never]),
  [p('a')],
);

console.log('customPalettes: 8 casos OK');
