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
  /** `vigenciadesde`: el día en que se publicó. */
  date: string;
  /** `vigenciahasta`, INCLUSIVO. La TRM del viernes rige también sábado,
   *  domingo y lunes, así que el punto más reciente casi nunca lleva la fecha
   *  de hoy. Sin esto, la tasa vigente aparecía rotulada «5 de sep.» un día 7 y
   *  parecía que faltaban datos. */
  until?: string;
  /** Cuando la fila es un DÍA expandido, el día en que se publicó la tasa que
   *  hereda. Igual a `date` si ese día tuvo publicación propia. */
  publishedOn?: string;
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

/** Lo mínimo que hace falta de un ingreso para convertirlo. */
export interface FxConvertible {
  amount: number;
  currency: FxCurrency;
}

export interface FxPortfolioDay {
  date: string;
  /** Último día en que rige esta tasa, inclusivo. Ver `FxSeriesRow.until`. */
  until?: string;
  /** Día en que se publicó la tasa de esta jornada. Ver `FxSeriesRow.publishedOn`. */
  publishedOn?: string;
  cop: number;
  /** Tasa de ESA fecha, solo si la cartera tiene UNA sola moneda extranjera.
   *  Con dos no existe una tasa única que explique el total, y mostrar la de
   *  una de ellas junto a un importe que suma las dos sería mentir. */
  rate?: number;
}

export interface FxPortfolioStats {
  /** Total de hoy en pesos. */
  today: number;
  /** Tasa de hoy, con la misma condición de moneda única que `FxPortfolioDay`. */
  todayRate?: number;
  /** La moneda extranjera, si es una sola. Para rotular «COP por €». */
  soleCurrency?: FxCurrency;
  /** Total con la publicación anterior de la TRM, o `null` si no hay con qué. */
  prev: number | null;
  /** Variación contra la publicación anterior. `null` si no hay `prev`. */
  variation: FxVariation | null;
  /** Mejor y peor día de la serie, con su diferencia contra hoy. */
  best: (FxPortfolioDay & { delta: number }) | null;
  worst: (FxPortfolioDay & { delta: number }) | null;
  /** Total por fecha, de más antiguo a más reciente — para la sparkline. */
  series: FxPortfolioDay[];
}

/**
 * Todo lo que la pantalla «Mi salario» necesita mostrar, calculado de una vez.
 *
 * Existe porque la pantalla puede tener varios ingresos en monedas distintas
 * (2.400 € y 500 US$) y el total de un día NO es la suma de los mejores días de
 * cada moneda: el euro y el dólar no hacen máximo el mismo día. Hay que sumar
 * la cartera completa fecha a fecha y buscar el máximo del TOTAL.
 *
 * Una fecha solo cuenta si tiene tasa para TODAS las monedas presentes. Con las
 * que faltan sumando 0, un día sin cotización del euro aparecía como el peor del
 * mes con una caída de millones que nunca ocurrió.
 *
 * Los ingresos en COP se suman tal cual y no exigen tasa: son un valor fijo que
 * no varía con el cambio.
 */
export function fxPortfolioStats(
  incomes: FxConvertible[] | null | undefined,
  rows: FxSeriesRow[] | null | undefined,
  rates: FxRates | null | undefined,
  prevRates?: FxRates | null,
): FxPortfolioStats | null {
  const valid = (Array.isArray(incomes) ? incomes : []).filter(
    (i) => i && Number.isFinite(i.amount) && isFxCurrency(i.currency),
  );
  if (valid.length === 0) return null;

  const sumWith = (r: FxRates | null | undefined): number | null => {
    let total = 0;
    for (const income of valid) {
      const cop = toCop(income.amount, income.currency, r);
      if (cop === null) return null;
      total += cop;
    }
    return total;
  };

  const today = sumWith(rates);
  if (today === null) return null;

  // Monedas que de verdad hacen falta: si nadie cobra en dólares, que falte la
  // cotización del dólar no puede descartar la fecha.
  const needed = new Set(valid.map((i) => i.currency).filter((c) => c !== 'COP'));

  // Cartera entera en pesos: no hay tipo de cambio de por medio, así que no hay
  // variación ni serie que dibujar. Devolver `flat` y una línea recta sería
  // inventar un dato: el total no varía porque no PUEDE variar.
  if (needed.size === 0) {
    return { today, prev: null, variation: null, best: null, worst: null, series: [] };
  }

  // Con una sola moneda extranjera se puede rotular la tasa que produce cada
  // cifra, que es lo que permite verificarla. Con dos, no.
  const soleCurrency = needed.size === 1 ? [...needed][0] : undefined;
  const rateOf = (r: FxRates | null | undefined): number | undefined => {
    if (!soleCurrency) return undefined;
    const value = rateFor(soleCurrency, r);
    return value === null ? undefined : value;
  };
  const todayRate = rateOf(rates);

  const prev = sumWith(prevRates ?? null);
  const variation = prev === null
    ? null
    : { delta: today - prev, direction: (today > prev ? 'up' : today < prev ? 'down' : 'flat') as FxDirection };

  const series: FxPortfolioDay[] = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row.date !== 'string') continue;
    const rowRates: FxRates = { usd: row.usd ?? 0, eur: row.eur ?? 0 };
    const complete = [...needed].every((c) => isUsableRate(c === 'EUR' ? rowRates.eur : rowRates.usd));
    if (!complete) continue;
    const cop = sumWith(rowRates);
    if (cop === null) continue;
    const rate = rateOf(rowRates);
    series.push({
      date: row.date,
      ...(row.until ? { until: row.until } : {}),
      ...(row.publishedOn ? { publishedOn: row.publishedOn } : {}),
      cop,
      ...(rate === undefined ? {} : { rate }),
    });
  }
  series.sort((a, b) => (a.date < b.date ? -1 : 1));

  let best: FxPortfolioStats['best'] = null;
  let worst: FxPortfolioStats['worst'] = null;
  if (series.length > 0) {
    let hi = series[0];
    let lo = series[0];
    for (const p of series) {
      if (p.cop > hi.cop) hi = p;
      if (p.cop < lo.cop) lo = p;
    }
    best = { ...hi, delta: hi.cop - today };
    worst = { ...lo, delta: lo.cop - today };
  }

  return {
    today,
    ...(todayRate === undefined ? {} : { todayRate }),
    ...(soleCurrency ? { soleCurrency } : {}),
    prev, variation, best, worst, series,
  };
}

/**
 * Fecha de HOY en formato ISO corto, en la zona del dispositivo.
 *
 * `toISOString().slice(0, 10)` daría la fecha UTC: en Colombia (UTC−5), a las
 * 19:00 del día 7 ya devuelve el 8, y la tasa vigente pasaría a leerse como
 * caducada durante las últimas cinco horas de cada día.
 */
export function localIsoDate(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * ¿Esta publicación de la TRM es la que rige hoy?
 *
 * Es lo que permite decir «hoy» en vez de «5 de sep.» al seleccionar el último
 * punto del gráfico un día 7. Sin `until` se cae a comparar solo la fecha de
 * publicación, que es lo máximo que se puede afirmar con ese dato.
 */
export function isRateCurrent(
  day: Pick<FxPortfolioDay, 'date' | 'until'>,
  now: Date = new Date(),
): boolean {
  const today = localIsoDate(now);
  if (!day?.date) return false;
  return today >= day.date && today <= (day.until ?? day.date);
}

/**
 * Convierte las publicaciones de la TRM en **días naturales**, uno por barra,
 * desde hoy hacia atrás.
 *
 * La TRM se publica en días hábiles y cada valor rige hasta `until`: la del
 * viernes vale sábado, domingo y lunes. Pintar una barra por publicación
 * dejaba un gráfico con menos puntos que días y fechas que no cuadraban («30
 * publicaciones» abarcan unas 6 semanas). Aquí cada día del rango recibe la
 * tasa que rige ESE día, así que 7 barras son 7 días de calendario.
 *
 * Cada día expandido conserva en `publishedOn` la fecha de la publicación que
 * hereda, que es lo que permite explicar por qué la tasa de hoy lleva fecha de
 * anteayer sin dejar huecos en el gráfico.
 *
 * Un día para el que no hay ninguna publicación anterior conocida se omite: es
 * el borde de la serie, no un día sin valor. Devuelve de más reciente a más
 * antiguo, igual que llegan del endpoint.
 */
export function expandRowsToDays(
  rows: FxSeriesRow[] | null | undefined,
  days: number,
  now: Date = new Date(),
): FxSeriesRow[] {
  const source = (Array.isArray(rows) ? rows : [])
    .filter((r) => r && typeof r.date === 'string' && r.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // desc
  if (source.length === 0 || !Number.isInteger(days) || days < 1) return [];

  const out: FxSeriesRow[] = [];
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let i = 0; i < days; i++) {
    const day = localIsoDate(cursor);
    // La publicación vigente ese día: la más reciente que ya existía. `until`
    // se usa como confirmación, no como filtro — si un día cayera en un hueco
    // entre vigencias, heredar la última conocida es mejor que un agujero.
    const row = source.find((r) => r.date <= day);
    if (row) {
      out.push({
        date: day,
        publishedOn: row.date,
        ...(row.until ? { until: row.until } : {}),
        ...(row.usd !== undefined ? { usd: row.usd } : {}),
        ...(row.eur !== undefined ? { eur: row.eur } : {}),
      });
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return out;
}
