/**
 * npx tsx utils/fixedSeries.test.ts
 */
import assert from 'node:assert';
import { originDateForEdit, newDocDate, futureSkipMonths, monthKey, daysIn } from './fixedSeries';

// El caso que rompió los datos: fijo que arranca el 23 de abril, editado desde la
// copia virtual de octubre sin tocar el selector de fecha.
{
  const origin = new Date(2026, 3, 23);
  const out = originDateForEdit({
    isVirtualFixed: true,
    originDate: origin,
    selectedDate: new Date(2026, 9, 23), // lo que muestra la copia virtual
    dateTouched: false,
  });
  assert.strictEqual(out.getTime(), origin.getTime(), 'el arranque de la serie no se mueve');
}

// Si el usuario SÍ cambia el día, viaja solo el día: el mes de arranque sigue siendo abril.
{
  const out = originDateForEdit({
    isVirtualFixed: true,
    originDate: new Date(2026, 3, 23),
    selectedDate: new Date(2026, 9, 5),
    dateTouched: true,
  });
  assert.strictEqual(out.getFullYear(), 2026);
  assert.strictEqual(out.getMonth(), 3);
  assert.strictEqual(out.getDate(), 5);
}

// Día 31 sobre un mes de origen de 30 días: se recorta, no desborda al mes siguiente.
{
  const out = originDateForEdit({
    isVirtualFixed: true,
    originDate: new Date(2026, 3, 15), // abril, 30 días
    selectedDate: new Date(2026, 6, 31),
    dateTouched: true,
  });
  assert.strictEqual(out.getMonth(), 3);
  assert.strictEqual(out.getDate(), 30);
}

// Una transacción normal (no virtual) guarda tal cual la fecha elegida.
{
  const picked = new Date(2026, 7, 2);
  const out = originDateForEdit({
    isVirtualFixed: false,
    originDate: new Date(2026, 3, 23),
    selectedDate: picked,
    dateTouched: true,
  });
  assert.strictEqual(out.getTime(), picked.getTime());
}

// Documento nuevo al partir la serie: cae en el mes visualizado, con el día recortado.
{
  const d = newDocDate(2026, 1, 31); // febrero 2026 → 28
  assert.strictEqual(d.getMonth(), 1);
  assert.strictEqual(d.getDate(), 28);
  assert.strictEqual(daysIn(2026, 1), 28);
}

// Los meses omitidos anteriores al corte se quedan en el documento viejo.
{
  const skips = ['2026_2', '2026_9', '2027_0'];
  assert.deepStrictEqual(futureSkipMonths(skips, 2026, 9), ['2026_9', '2027_0']);
  assert.deepStrictEqual(futureSkipMonths([], 2026, 9), []);
  assert.deepStrictEqual(futureSkipMonths(['basura'], 2026, 9), []);
  assert.strictEqual(monthKey(2026, 9), '2026_9');
}

console.log('fixedSeries: ok');
