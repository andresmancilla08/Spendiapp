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

// ── fxPortfolioStats — varios ingresos, monedas distintas ──────────────────
import { fxPortfolioStats } from './fxConvert';

const rows = [
  { date: '2026-09-07', usd: 4211, eur: 4552 },
  { date: '2026-09-06', usd: 4180, eur: 4519 },
  { date: '2026-09-05', usd: 4300, eur: 4400 }, // dólar arriba, euro abajo
  { date: '2026-09-04', usd: 4100, eur: 4610 }, // al contrario
];

const solo = fxPortfolioStats([{ amount: 2400, currency: 'EUR' }], rows, RATES, YESTERDAY)!;
assert.equal(solo.today, 10924800);
assert.equal(solo.prev, 10845600);
assert.equal(solo.variation!.direction, 'up');
assert.equal(solo.variation!.delta, 79200);
assert.equal(solo.best!.date, '2026-09-04', 'el euro hizo máximo el día 4');
assert.equal(solo.worst!.date, '2026-09-05');
assert.equal(solo.series.length, 4);
assert.equal(solo.series[0].date, '2026-09-04', 'la serie sale ascendente para la sparkline');

// Dos monedas: el mejor día del TOTAL no es el mejor de ninguna por separado.
const mixed = fxPortfolioStats(
  [{ amount: 2400, currency: 'EUR' }, { amount: 500, currency: 'USD' }],
  rows, RATES,
)!;
assert.equal(mixed.today, 10924800 + 2105500);
// día 4: 2400×4610 + 500×4100 = 11.064.000 + 2.050.000 = 13.114.000
// día 5: 2400×4400 + 500×4300 = 10.560.000 + 2.150.000 = 12.710.000
// día 7: 13.030.300 · día 6: 10.845.600 + 2.090.000 = 12.935.600
assert.equal(mixed.best!.date, '2026-09-04');
assert.equal(mixed.best!.cop, 13114000);
assert.equal(mixed.worst!.date, '2026-09-05');
assert.equal(mixed.worst!.cop, 12710000);

// Un ingreso en COP suma fijo y no exige tasa ni mueve la variación.
const withCop = fxPortfolioStats(
  [{ amount: 2400, currency: 'EUR' }, { amount: 1000000, currency: 'COP' }],
  rows, RATES, YESTERDAY,
)!;
assert.equal(withCop.today, 10924800 + 1000000);
assert.equal(withCop.variation!.delta, 79200, 'el COP no varía');

// Solo COP: no hay nada que convertir, pero el total es válido.
// Solo COP: hay total, pero no hay variación ni serie — el total no PUEDE
// variar, y una línea recta sería inventar un dato.
const onlyCop = fxPortfolioStats([{ amount: 1000000, currency: 'COP' }], rows, null)!;
assert.equal(onlyCop.today, 1000000);
assert.equal(onlyCop.variation, null);
assert.equal(onlyCop.prev, null);
assert.equal(onlyCop.series.length, 0);
assert.equal(onlyCop.best, null);

// Una fecha sin cotización del euro se DESCARTA, no cuenta como 0.
const holes = [
  { date: '2026-09-07', usd: 4211, eur: 4552 },
  { date: '2026-09-06', usd: 4180 },            // sábado: el BCE no publicó
  { date: '2026-09-05', usd: 4300, eur: 4400 },
];
const gapped = fxPortfolioStats([{ amount: 2400, currency: 'EUR' }], holes, RATES)!;
assert.equal(gapped.series.length, 2, 'el día sin euro no entra');
assert.equal(gapped.worst!.cop, 10560000, 'y no aparece un mínimo de 0');

// Pero si nadie cobra en euros, que falte el euro no descarta la fecha.
const usdOnly = fxPortfolioStats([{ amount: 500, currency: 'USD' }], holes, RATES)!;
assert.equal(usdOnly.series.length, 3);

// Sin ingresos no hay nada que calcular.
assert.equal(fxPortfolioStats([], rows, RATES), null);
assert.equal(fxPortfolioStats(null, rows, RATES), null);
// Sin tasa de hoy tampoco, aunque haya serie.
assert.equal(fxPortfolioStats([{ amount: 2400, currency: 'EUR' }], rows, null), null);
// Sin serie sí hay cifra de hoy, solo faltan mejor y peor.
const noSeries = fxPortfolioStats([{ amount: 2400, currency: 'EUR' }], [], RATES)!;
assert.equal(noSeries.today, 10924800);
assert.equal(noSeries.best, null);
assert.equal(noSeries.series.length, 0);
// Basura entre los ingresos: se ignora en vez de envenenar el total.
const dirtyIncomes = fxPortfolioStats(
  [{ amount: 2400, currency: 'EUR' }, { amount: NaN, currency: 'EUR' }, null as never,
   { amount: 100, currency: 'GBP' as never }],
  rows, RATES,
)!;
assert.equal(dirtyIncomes.today, 10924800);

console.log('fxPortfolioStats: 30 casos OK');

// ── La tasa que produce cada cifra ─────────────────────────────────────────
// Sin ella, «mejor tasa: $ 8.949.600» es una cifra que el usuario no puede
// verificar contra ninguna fuente.
const rated = fxPortfolioStats([{ amount: 2400, currency: 'EUR' }], rows, RATES)!;
assert.equal(rated.soleCurrency, 'EUR');
assert.equal(rated.todayRate, 4552);
assert.equal(rated.best!.rate, 4610, 'la tasa del mejor día');
assert.equal(rated.worst!.rate, 4400);
assert.equal(rated.series.every((p) => typeof p.rate === 'number'), true);

// Dos monedas extranjeras: NO hay una tasa única que explique el total.
const twoCur = fxPortfolioStats(
  [{ amount: 2400, currency: 'EUR' }, { amount: 500, currency: 'USD' }], rows, RATES,
)!;
assert.equal(twoCur.soleCurrency, undefined);
assert.equal(twoCur.todayRate, undefined);
assert.equal(twoCur.best!.rate, undefined);
assert.equal(twoCur.series.every((p) => p.rate === undefined), true);

// Una moneda extranjera + pesos sigue teniendo tasa única: el peso no aporta
// ninguna conversión.
const eurPlusCop = fxPortfolioStats(
  [{ amount: 2400, currency: 'EUR' }, { amount: 1000000, currency: 'COP' }], rows, RATES,
)!;
assert.equal(eurPlusCop.soleCurrency, 'EUR');
assert.equal(eurPlusCop.todayRate, 4552);
assert.equal(eurPlusCop.best!.rate, 4610);

// Dos ingresos en la MISMA moneda: también es tasa única.
const sameCur = fxPortfolioStats(
  [{ amount: 2400, currency: 'EUR' }, { amount: 300, currency: 'EUR' }], rows, RATES,
)!;
assert.equal(sameCur.soleCurrency, 'EUR');
assert.equal(sameCur.today, 2700 * 4552);

// Solo pesos: ni tasa ni moneda.
assert.equal(fxPortfolioStats([{ amount: 500, currency: 'COP' }], rows, RATES)!.soleCurrency, undefined);

console.log('tasa por dia: 15 casos OK');
