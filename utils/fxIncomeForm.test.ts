import { strict as assert } from 'node:assert';
import { parseAmount, parsePayDay, validateFxForm } from './fxIncomeForm';

// ── parseAmount: el separador decimal cambia con el idioma ─────────────────
assert.equal(parseAmount('2400'), 2400);
assert.equal(parseAmount('2.400'), 2400, 'formato español: punto de miles');
assert.equal(parseAmount('2,400'), 2400, 'formato inglés: coma de miles');
assert.equal(parseAmount('2400,50'), 2400.5, 'coma decimal');
assert.equal(parseAmount('2400.50'), 2400.5, 'punto decimal');
assert.equal(parseAmount('2.400,50'), 2400.5, 'ambos, español');
assert.equal(parseAmount('2,400.50'), 2400.5, 'ambos, inglés');
assert.equal(parseAmount('1.234.567'), 1234567);
assert.equal(parseAmount('€ 2.400'), 2400, 'el símbolo se ignora');
assert.equal(parseAmount('2 400'), 2400, 'el espacio también');
assert.equal(parseAmount(''), null);
assert.equal(parseAmount('abc'), null);
assert.equal(parseAmount(undefined as never), null);
assert.equal(parseAmount('0'), 0);
assert.equal(parseAmount('1.234.567'), 1234567, 'miles repetidos, no decimal');
assert.equal(parseAmount('1,234,567'), 1234567);
assert.equal(parseAmount('1.234.567,89'), 1234567.89);
assert.equal(parseAmount('1,234,567.89'), 1234567.89);
assert.equal(parseAmount('2400,5'), 2400.5, 'un decimal');
assert.equal(parseAmount('2400,5678'), 2400.5678, 'cuatro decimales no son miles');
assert.equal(parseAmount('0,50'), 0.5);
assert.equal(parseAmount(',50'), 0.5);
assert.equal(parseAmount('100.'), 100);

// ── parsePayDay ────────────────────────────────────────────────────────────
assert.equal(parsePayDay('15'), 15);
assert.equal(parsePayDay('1'), 1);
assert.equal(parsePayDay('31'), 31);
assert.equal(parsePayDay('0'), undefined);
assert.equal(parsePayDay('32'), undefined);
assert.equal(parsePayDay(''), undefined);
assert.equal(parsePayDay('abc'), undefined);

// ── validateFxForm ─────────────────────────────────────────────────────────
const base = { label: 'Salario', amount: '2400', currency: 'EUR' as const, payDay: '' };

const ok = validateFxForm(base);
assert.equal(ok.missing, null);
assert.deepEqual(ok.value, { label: 'Salario', amount: 2400, currency: 'EUR' });

assert.equal(validateFxForm({ ...base, label: '   ' }).missing, 'label');
assert.equal(validateFxForm({ ...base, label: '' }).missing, 'label');
assert.equal(validateFxForm({ ...base, amount: '' }).missing, 'amount');
assert.equal(validateFxForm({ ...base, amount: '0' }).missing, 'amount', 'cero no es un ingreso');
// El menos se ignora igual que el símbolo de moneda: no existe un ingreso
// negativo, así que «-100» se lee como 100 en vez de bloquear el formulario.
assert.equal(validateFxForm({ ...base, amount: '-100' }).value!.amount, 100);
assert.equal(parseAmount('-2.400'), 2400);
assert.equal(validateFxForm({ ...base, amount: '999999999999' }).missing, 'amount', 'tope superior');

// El label se recorta y se limpia, no se rechaza por longitud.
const long = validateFxForm({ ...base, label: 'x'.repeat(80) });
assert.equal(long.missing, null);
assert.equal(long.value!.label.length, 40);

// Falta el label ANTES que el importe: se avisa del primer campo, en orden.
assert.equal(validateFxForm({ ...base, label: '', amount: '' }).missing, 'label');

// El día de cobro es opcional y no bloquea nunca.
assert.equal(validateFxForm({ ...base, payDay: '99' }).value!.payDay, undefined);
assert.equal(validateFxForm({ ...base, payDay: '30' }).value!.payDay, 30);

// Una moneda que no existe cae a EUR en vez de guardar basura.
assert.equal(validateFxForm({ ...base, currency: 'GBP' as never }).value!.currency, 'EUR');

console.log('fxIncomeForm: 41 casos OK');
