/**
 * Conversión de un ingreso en moneda extranjera a pesos.
 *
 * Reglas del producto que están codificadas aquí (decisiones tomadas, no
 * suposiciones):
 *
 * 1. La tasa es la **TRM oficial** del Banco de la República tal cual, sin
 *    spread. La app enseña la referencia pública y verificable, NO lo que el
 *    banco del usuario acaba consignando (que suele ser un 1-3% menos). Por eso
 *    todo texto de UI dice «según la TRM oficial»: prometer la cifra bruta como
 *    «lo que vas a recibir» sería mentir por unos 230.000 pesos al mes en una
 *    nómina de 2.400 €.
 * 2. **Sin tasa no hay cifra.** Si la tasa falta, es 0, negativa o no es un
 *    número, se devuelve `null` y quien llama decide qué pintar. Nunca se
 *    inventa un 1:1 ni se cae a un valor por defecto: un ingreso de 2.400 €
 *    mostrado como «$ 2.400» es peor que un guion.
 * 3. El resultado se **redondea a peso entero**: no existe el centavo de peso y
 *    `formatMoney` ya imprime sin decimales. Redondear aquí evita que la suma de
 *    los movimientos y el total mostrado difieran en unos pesos.
 *
 * Módulo puro y sin React ni Firestore a propósito: se ejecuta en Node con
 * `npx tsx utils/fxConvert.test.ts`, que es el gate de esta feature.
 */

/** Monedas que la app sabe convertir. `api/exchange-rates` solo devuelve estas. */
export type FxCurrency = 'COP' | 'EUR' | 'USD';

export const FX_CURRENCIES: FxCurrency[] = ['COP', 'EUR', 'USD'];

/** Cuántos pesos vale una unidad de cada moneda. La forma que ya devuelve
 *  `api/exchange-rates` y `useExchangeRates`. */
export interface FxRates {
  usd: number;
  eur: number;
}

export function isFxCurrency(value: unknown): value is FxCurrency {
  return typeof value === 'string' && (FX_CURRENCIES as string[]).includes(value);
}

/** ¿Es una tasa usable? Cubre 0, negativos, NaN, Infinity, null y strings. */
function isUsableRate(rate: unknown): rate is number {
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0;
}

/**
 * Pesos que vale una unidad de `currency`. COP siempre vale 1.
 * `null` cuando no hay tasa utilizable — ver regla 2.
 */
export function rateFor(currency: FxCurrency, rates: FxRates | null | undefined): number | null {
  if (currency === 'COP') return 1;
  if (!rates) return null;
  const rate = currency === 'EUR' ? rates.eur : rates.usd;
  return isUsableRate(rate) ? rate : null;
}

/**
 * Importe convertido a pesos enteros, o `null` si no se puede convertir.
 * Un importe COP se devuelve redondeado igual, para que el llamante no tenga que
 * distinguir el caso.
 */
export function toCop(
  amount: number,
  currency: FxCurrency,
  rates: FxRates | null | undefined,
): number | null {
  if (!Number.isFinite(amount)) return null;
  const rate = rateFor(currency, rates);
  if (rate === null) return null;
  return Math.round(amount * rate);
}

export type FxDirection = 'up' | 'down' | 'flat';

export interface FxVariation {
  /** Diferencia en pesos contra la tasa anterior. Con signo. */
  delta: number;
  direction: FxDirection;
}

/**
 * Cuánto más (o menos) vale el mismo importe con la tasa de hoy respecto a la
 * anterior. Alimenta el banner «⚡ El euro subió hoy: tu nómina vale X más que
 * ayer».
 *
 * `null` cuando no hay con qué comparar: falta una de las dos tasas, o la
 * anterior es 0 porque es el primer arranque y todavía no había nada guardado.
 * `direction: 'flat'` es un caso NORMAL y frecuente, no un error: la TRM se
 * publica una vez al día, así que entre dos consultas de la misma jornada no
 * cambia nada y el banner no debe aparecer.
 */
export function fxVariation(
  amount: number,
  currency: FxCurrency,
  rates: FxRates | null | undefined,
  prevRates: FxRates | null | undefined,
): FxVariation | null {
  if (currency === 'COP') return null;
  const now = toCop(amount, currency, rates);
  const before = toCop(amount, currency, prevRates);
  if (now === null || before === null) return null;
  const delta = now - before;
  return { delta, direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat' };
}

/** Fila cruda de la serie tal como la devuelve `api/exchange-rates?days=N`:
 *  una fecha con los pesos que valía cada moneda ese día. `eur` puede faltar
 *  si el BCE no publicó (no cotiza fines de semana ni festivos). */
export interface FxSeriesRow {
  date: string;
  usd?: number;
  eur?: number;
}

/** Serie ya reducida a UNA moneda, que es lo que consume `fxSeriesStats`. */
export interface FxSeriesPoint {
  /** ISO 'YYYY-MM-DD' — la fecha de vigencia que publica la TRM. */
  date: string;
  /** Pesos por unidad de la moneda ese día. */
  rate: number;
}

export interface FxSeriesStats {
  best: { date: string; cop: number; delta: number };
  worst: { date: string; cop: number; delta: number };
}

/**
 * Mejor y peor día de la serie para un importe dado, con su diferencia contra
 * la tasa de HOY (`rates`), que es lo que se compara en pantalla.
 *
 * Los puntos con tasa inservible se descartan en lugar de envenenar el máximo:
 * un 0 colado en la serie convertía el «peor del mes» en «$ 0».
 */
export function fxSeriesStats(
  amount: number,
  currency: FxCurrency,
  series: FxSeriesPoint[] | null | undefined,
  rates: FxRates | null | undefined,
): FxSeriesStats | null {
  if (currency === 'COP' || !Array.isArray(series)) return null;
  const today = toCop(amount, currency, rates);
  if (today === null || !Number.isFinite(amount)) return null;

  const valid = series.filter((p) => p && typeof p.date === 'string' && isUsableRate(p.rate));
  if (valid.length === 0) return null;

  let best = valid[0];
  let worst = valid[0];
  for (const p of valid) {
    if (p.rate > best.rate) best = p;
    if (p.rate < worst.rate) worst = p;
  }
  const at = (p: FxSeriesPoint) => {
    const cop = Math.round(amount * p.rate);
    return { date: p.date, cop, delta: cop - today };
  };
  return { best: at(best), worst: at(worst) };
}

/**
 * ¿El mes (year, month) ya terminó? `month` es índice 0-11, igual que
 * `Date.getMonth()` y que las claves `año_mesIndex` de los fijos.
 *
 * Es la regla de la decisión «los meses cerrados son inmutables»: un ingreso de
 * un mes cerrado NO se vuelve a convertir, se queda con los pesos que tenía. Sin
 * esto, el sueldo de abril cambiaría de valor cada día y la tendencia de 6 meses
 * dejaría de ser comparable consigo misma.
 */
export function isMonthClosed(year: number, month: number, now: Date = new Date()): boolean {
  const y = now.getFullYear();
  const m = now.getMonth();
  return year < y || (year === y && month < m);
}
