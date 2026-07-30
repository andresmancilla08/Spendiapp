/**
 * Self-check sin framework: `npx tsx utils/sharedCategory.test.ts`
 * (o `node --experimental-strip-types utils/sharedCategory.test.ts`).
 */
import assert from 'node:assert/strict';
import { categoryForOtherUser } from './sharedCategory';

// Por defecto y del tipo correcto → se propaga tal cual.
assert.equal(categoryForOtherUser('food', 'expense'), 'food');
assert.equal(categoryForOtherUser('salary', 'income'), 'salary');
// `other` es 'both': vale para los dos tipos.
assert.equal(categoryForOtherUser('other', 'income'), 'other');
assert.equal(categoryForOtherUser('other', 'expense'), 'other');
// Personalizada del dueño (id de doc Firestore) → el amigo no la tiene.
assert.equal(categoryForOtherUser('aB3xKq9ZmN0pQrSt', 'expense'), 'other');
// Por defecto pero del tipo equivocado → no aparecería en su selector.
assert.equal(categoryForOtherUser('food', 'income'), 'other');
assert.equal(categoryForOtherUser('salary', 'expense'), 'other');
// Basura / vacío.
assert.equal(categoryForOtherUser('', 'expense'), 'other');

console.log('sharedCategory: OK');
