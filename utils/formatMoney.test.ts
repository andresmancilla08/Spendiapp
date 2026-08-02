/**
 * Gate del formateador de dinero: npx tsx utils/formatMoney.test.ts
 *
 * El signo importa. Una versión de este helper aplicaba `Math.abs` siempre y, al
 * adoptarla en las pantallas de balance, −$500.000 se mostraba como "$ 500.000":
 * el usuario en rojo veía la misma cifra que uno en verde y solo el color lo
 * distinguía.
 */
import assert from 'node:assert';
import { formatMoney, formatMoneyAbs } from './formatMoney';

const negativo = formatMoney(-500000);
assert.ok(
  negativo.includes('-') || negativo.includes('−'),
  `un importe negativo debe verse negativo, salió "${negativo}"`,
);
assert.ok(!formatMoney(500000).includes('-'), 'un positivo no lleva signo menos');
assert.strictEqual(formatMoney(0).includes('-'), false, 'el cero no es negativo');

const abs = formatMoneyAbs(-500000);
assert.ok(!abs.includes('-') && !abs.includes('−'), `formatMoneyAbs quita el signo, salió "${abs}"`);
assert.strictEqual(formatMoneyAbs(-500000), formatMoneyAbs(500000), 'abs iguala los dos signos');

// Sin decimales y con la cifra completa
for (const n of [1234567, -1234567, 999, 0]) {
  const out = formatMoney(n);
  assert.ok(!out.includes(','), `sin decimales: ${out}`);
  assert.ok(/\d/.test(out), `debe llevar dígitos: ${out}`);
}


// El código de moneda de tres letras no debe aparecer en ningún idioma: ocupaba
// más que la cifra en cada fila.
for (const lang of ['es', 'en', 'it']) {
  const out = formatMoney(1234567, lang);
  assert.ok(!out.includes('COP'), `${lang}: se cuela el código de moneda → "${out}"`);
  assert.ok(out.includes('$'), `${lang}: falta el símbolo → "${out}"`);
}

console.log('✓ formatMoney: el signo se conserva y formatMoneyAbs lo quita a propósito');
