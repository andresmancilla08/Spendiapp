import { strict as assert } from 'node:assert';
import {
  rateFor, toCop, fxVariation, fxSeriesStats, isMonthClosed, isFxCurrency,
  type FxRates,
} from './fxConvert';

const RATES: FxRates = { usd: 4211, eur: 4552 };
const YESTERDAY: FxRates = { usd: 4180, eur: 4519 };

// ── rateFor ────────────────────────────────────────────────────────────────
assert.equal(rateFor('COP', RATES), 1);
assert.equal(rateFor('COP', null), 1, 'COP no necesita tasa');
assert.equal(rateFor('EUR', RATES), 4552);
assert.equal(rateFor('USD', RATES), 4211);
assert.equal(rateFor('EUR', null), null);
assert.equal(rateFor('EUR', { usd: 4211, eur: 0 }), null, 'tasa 0 no es tasa');
assert.equal(rateFor('EUR', { usd: 4211, eur: -1 }), null);
assert.equal(rateFor('EUR', { usd: 4211, eur: NaN }), null);
assert.equal(rateFor('EUR', { usd: 4211, eur: Infinity }), null);
assert.equal(rateFor('EUR', { eur: '4552' } as never), null, 'string no es tasa');

// ── toCop ──────────────────────────────────────────────────────────────────
assert.equal(toCop(2400, 'EUR', RATES), 10924800);
assert.equal(toCop(2400, 'USD', RATES), 10106400);
assert.equal(toCop(1500000, 'COP', RATES), 1500000, 'COP pasa tal cual');
assert.equal(toCop(2400, 'EUR', null), null, 'sin tasa NO se inventa 1:1');
assert.equal(toCop(2400, 'EUR', { usd: 4211, eur: 0 }), null);
assert.equal(toCop(NaN, 'EUR', RATES), null);
assert.equal(toCop(0, 'EUR', RATES), 0, 'cero es un importe válido');

// Redondeo a peso entero: 100,5 × 4552 = 457.476 exacto; 0,001 × 4552 = 4,552
assert.equal(toCop(100.5, 'EUR', RATES), 457476);
assert.equal(toCop(0.001, 'EUR', RATES), 5, 'redondea, no trunca');
assert.equal(Number.isInteger(toCop(1234.567, 'EUR', RATES)!), true);

// Negativo: no es un ingreso, pero el conversor no juzga el signo.
assert.equal(toCop(-2400, 'EUR', RATES), -10924800);

// ── fxVariation — el banner ⚡ ──────────────────────────────────────────────
const up = fxVariation(2400, 'EUR', RATES, YESTERDAY)!;
assert.equal(up.direction, 'up');
assert.equal(up.delta, 79200, '2400 × (4552 − 4519)');

const down = fxVariation(2400, 'EUR', YESTERDAY, RATES)!;
assert.equal(down.direction, 'down');
assert.equal(down.delta, -79200);

// La TRM se publica UNA vez al día: dos consultas del mismo día no cambian.
// 'flat' es normal, no un fallo, y con él el banner no se pinta.
assert.equal(fxVariation(2400, 'EUR', RATES, RATES)!.direction, 'flat');
assert.equal(fxVariation(2400, 'EUR', RATES, RATES)!.delta, 0);

// Primer arranque: no hay tasa anterior guardada → no hay nada que comparar.
assert.equal(fxVariation(2400, 'EUR', RATES, null), null);
assert.equal(fxVariation(2400, 'EUR', RATES, { usd: 0, eur: 0 }), null);
assert.equal(fxVariation(2400, 'EUR', null, YESTERDAY), null);
// COP no varía nunca contra sí mismo.
assert.equal(fxVariation(2400, 'COP', RATES, YESTERDAY), null);

// ── fxSeriesStats — mejor y peor del mes ───────────────────────────────────
const series = [
  { date: '2026-09-07', rate: 4552 },
  { date: '2026-09-04', rate: 4610 },
  { date: '2026-09-02', rate: 4371 },
  { date: '2026-08-30', rate: 4500 },
];
const stats = fxSeriesStats(2400, 'EUR', series, RATES)!;
assert.equal(stats.best.date, '2026-09-04');
assert.equal(stats.best.cop, 11064000);
assert.equal(stats.best.delta, 139200, 'mejor día vs hoy');
assert.equal(stats.worst.date, '2026-09-02');
assert.equal(stats.worst.cop, 10490400);
assert.equal(stats.worst.delta, -434400);

// Un 0 colado en la serie no puede convertirse en el «peor del mes».
const dirty = fxSeriesStats(2400, 'EUR', [
  { date: '2026-09-07', rate: 4552 },
  { date: '2026-09-06', rate: 0 },
  { date: '2026-09-05', rate: NaN },
  { date: '2026-09-04', rate: 4610 },
], RATES)!;
assert.equal(dirty.worst.date, '2026-09-07', 'el 0 se descarta, no gana');
assert.equal(dirty.worst.cop, 10924800, 'y el peor real sigue siendo un importe de verdad');
assert.equal(dirty.best.date, '2026-09-04');

// Serie de un solo día: mejor y peor son el mismo.
const single = fxSeriesStats(2400, 'EUR', [{ date: '2026-09-07', rate: 4552 }], RATES)!;
assert.equal(single.best.date, single.worst.date);
assert.equal(single.best.delta, 0);

assert.equal(fxSeriesStats(2400, 'EUR', [], RATES), null);
assert.equal(fxSeriesStats(2400, 'EUR', null, RATES), null);
assert.equal(fxSeriesStats(2400, 'EUR', series, null), null, 'sin tasa de hoy no hay con qué comparar');
assert.equal(fxSeriesStats(2400, 'COP', series, RATES), null);

// ── isMonthClosed — la regla del pasado inmutable ──────────────────────────
const now = new Date(2026, 8, 7); // 7 sep 2026 (mes índice 8)
assert.equal(isMonthClosed(2026, 8, now), false, 'el mes en curso está ABIERTO');
assert.equal(isMonthClosed(2026, 7, now), true, 'agosto está cerrado');
assert.equal(isMonthClosed(2025, 11, now), true, 'diciembre del año pasado, cerrado');
assert.equal(isMonthClosed(2026, 9, now), false, 'octubre es futuro, no cerrado');
assert.equal(isMonthClosed(2027, 0, now), false);
// Frontera: el 1 del mes siguiente cierra el anterior.
assert.equal(isMonthClosed(2026, 8, new Date(2026, 9, 1)), true);
// Y el último instante del mes todavía lo deja abierto.
assert.equal(isMonthClosed(2026, 8, new Date(2026, 8, 30, 23, 59, 59)), false);

// ── isFxCurrency ───────────────────────────────────────────────────────────
assert.equal(isFxCurrency('EUR'), true);
assert.equal(isFxCurrency('GBP'), false, 'la app solo trae USD y EUR');
assert.equal(isFxCurrency(undefined), false);
assert.equal(isFxCurrency(null), false);

console.log('fxConvert: 56 casos OK');
