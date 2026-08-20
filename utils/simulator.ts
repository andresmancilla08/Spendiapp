/**
 * Motor del simulador de compras a cuotas.
 *
 * Lógica PURA: no importa react-native, hooks ni Firestore (igual que
 * `formatMoney` y `premiumPreview`) para que su gate corra en Node:
 *   npx tsx utils/simulator.test.ts
 *
 * REGLA DURA: la cuota NO se recalcula aquí. Sale de `calculateInstallments`,
 * el mismo array que `add-transaction` escribe en Firestore. Si el simulador
 * hiciera su propio PMT, la cifra simulada y la registrada se separarían en
 * pesos y el usuario vería dos números para la misma compra.
 */
import { calculateInstallments, calculateInstallmentDates } from './installmentCalc';

/** Tope de cuotas del simulador. Es el mismo de `add-transaction`: simular 48 y
 *  no poder registrarlo es una promesa rota. */
export const MAX_INSTALLMENTS = 36;

/** Plazos de la tabla comparativa. */
export const COMPARE_TERMS = [1, 3, 6, 12, 24, 36];

/**
 * Cómo reparte el banco capital e intereses.
 *
 * `french` (cuota fija) es lo que usan las tarjetas de crédito colombianas y es
 * el defecto. `german` (abono a capital constante) da una cuota DECRECIENTE:
 * arranca más cara y sale más barata en total. Existe en el mercado para otros
 * productos de crédito y se ofrece para poder contrastar.
 */
export type AmortizationSystem = 'french' | 'german';

export interface SimulationInput {
  /** Precio de la compra en pesos enteros. */
  price: number;
  /** Cuota inicial (se descuenta del capital financiado). */
  downPayment?: number;
  /** Número de cuotas (1..MAX_INSTALLMENTS). */
  installments: number;
  /** Tasa Efectiva Anual en % (ej: 25.52). null o 0 = sin interés. */
  tea: number | null;
  /** Cargo fijo mensual atribuible a la compra (cuota de manejo, seguro…). */
  monthlyFee?: number;
  /** Fecha de la primera cuota (ya ajustada por fecha de corte). */
  startDate: Date;
  /** Sistema de amortización. Por defecto `french`, que es el de las tarjetas. */
  system?: AmortizationSystem;
}

export interface ScheduleRow {
  number: number;
  date: Date;
  /** Lo que se paga ese mes: cuota + cargo fijo. */
  payment: number;
  /** Solo la cuota, sin el cargo. */
  installment: number;
  interest: number;
  principal: number;
  /** Saldo de capital DESPUÉS de pagar esta cuota. */
  balance: number;
}

export interface SimulationResult {
  financed: number;
  /** La cifra grande: primera cuota + cargo fijo. */
  monthlyPayment: number;
  /** Última cuota + cargo: absorbe el residuo de redondeo. */
  lastPayment: number;
  /** true si todas las cuotas valen lo mismo. */
  levelPayments: boolean;
  /** Tasa mensual equivalente, en fracción (0.019 = 1,9 %). */
  monthlyRate: number;
  /** TEA nominal en % (la que entró). */
  tea: number;
  schedule: ScheduleRow[];
  /** Σ pagos + cuota inicial. */
  totalPaid: number;
  /** totalPaid − precio. Cuánto cuesta financiar. */
  creditCost: number;
  /** creditCost sobre el precio, en %. */
  overheadPct: number;
  /**
   * TEA real del plan calculada por TIR sobre el flujo de caja. Solo tiene
   * sentido —y solo se devuelve— cuando hay cargos fijos: sin ellos coincide
   * con la TEA nominal y mostrarla dos veces es ruido.
   */
  effectiveTea: number | null;
  lastDate: Date;
  system: AmortizationSystem;
}

// ── Conversión de tasas ────────────────────────────────────────────────────

/** TEA (%) → tasa mensual equivalente (fracción). */
export function monthlyRateFromTea(tea: number | null): number {
  if (!tea || tea <= 0) return 0;
  return Math.pow(1 + tea / 100, 1 / 12) - 1;
}

/** Tasa mensual (%) → TEA (%). */
export function teaFromMonthlyPct(monthlyPct: number | null): number {
  if (!monthlyPct || monthlyPct <= 0) return 0;
  return (Math.pow(1 + monthlyPct / 100, 12) - 1) * 100;
}

/** TEA (%) → tasa mensual en %, para mostrarla junto a la anual. */
export function monthlyPctFromTea(tea: number | null): number {
  return monthlyRateFromTea(tea) * 100;
}

// ── TIR ────────────────────────────────────────────────────────────────────

/**
 * Tasa mensual que iguala el valor presente de los pagos al capital recibido.
 *
 * Bisección y no Newton-Raphson a propósito: son diez líneas, no diverge y el
 * VPN es monótono decreciente en x, así que el intervalo [0, 1] siempre acota
 * la solución de un crédito real.
 */
export function irrMonthly(principal: number, payments: number[]): number {
  if (principal <= 0 || payments.length === 0) return 0;
  const npv = (x: number) =>
    payments.reduce((acc, p, k) => acc + p / Math.pow(1 + x, k + 1), 0) - principal;
  // Si ni al 0 % los pagos cubren el capital, no hay tasa positiva que resolver.
  if (npv(0) <= 0) return 0;
  let lo = 0;
  let hi = 1; // 100 % mensual: techo absurdo a propósito, para no dejar fuera nada real
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ── Simulación ─────────────────────────────────────────────────────────────

function clampInstallments(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_INSTALLMENTS, Math.max(1, Math.round(n)));
}

export function simulate(input: SimulationInput): SimulationResult {
  const price = Math.max(0, Math.round(input.price));
  const downPayment = Math.min(price, Math.max(0, Math.round(input.downPayment ?? 0)));
  const fee = Math.max(0, Math.round(input.monthlyFee ?? 0));
  const n = clampInstallments(input.installments);
  const financed = price - downPayment;
  const tea = input.tea && input.tea > 0 ? input.tea : 0;
  const i = monthlyRateFromTea(tea);

  const system: AmortizationSystem = input.system ?? 'french';
  const dates = calculateInstallmentDates(input.startDate, n);
  /**
   * En francés la cuota sale de `calculateInstallments` — la MISMA función que
   * escribe `add-transaction`, para que la cifra simulada y la registrada no se
   * separen en pesos.
   *
   * En alemán ese contrato no aplica: la app no registra planes alemanes, así
   * que este reparto es informativo. Abono a capital constante y el interés del
   * mes sobre el saldo vivo; la última cuota cierra el redondeo.
   */
  const amounts = system === 'german'
    ? germanInstallments(financed, n, i)
    : calculateInstallments(financed, n, tea || null);

  const schedule: ScheduleRow[] = [];
  let balance = financed;
  for (let k = 0; k < n; k++) {
    const installment = amounts[k];
    const isLast = k === n - 1;
    // La última cuota cierra el saldo: `calculateInstallments` le mete el residuo
    // de redondeo, así que su capital es lo que quede y el interés, el resto.
    const principal = isLast
      ? balance
      // Acotado por arriba y por abajo: nunca más capital del que queda, y nunca
      // negativo (un interés mayor que la cuota haría CRECER la deuda en la tabla).
      : Math.max(0, Math.min(balance, installment - Math.round(balance * i)));
    const interest = installment - principal;
    balance = Math.max(0, balance - principal);
    schedule.push({
      number: k + 1,
      date: dates[k],
      payment: installment + fee,
      installment,
      interest,
      principal,
      balance,
    });
  }

  const totalPayments = schedule.reduce((acc, r) => acc + r.payment, 0);
  const totalPaid = totalPayments + downPayment;
  const creditCost = totalPaid - price;
  const first = schedule[0];
  const last = schedule[schedule.length - 1];

  return {
    financed,
    monthlyPayment: first.payment,
    lastPayment: last.payment,
    levelPayments: first.payment === last.payment,
    monthlyRate: i,
    tea,
    schedule,
    totalPaid,
    creditCost,
    overheadPct: price > 0 ? (creditCost / price) * 100 : 0,
    effectiveTea:
      fee > 0 && financed > 0
        ? (Math.pow(1 + irrMonthly(financed, schedule.map((r) => r.payment)), 12) - 1) * 100
        : null,
    lastDate: last.date,
    system,
  };
}

/** Cuotas del sistema alemán: capital constante + interés sobre el saldo vivo. */
function germanInstallments(financed: number, n: number, i: number): number[] {
  if (n <= 1) return [financed];
  const principal = Math.floor(financed / n);
  const out: number[] = [];
  let balance = financed;
  for (let k = 0; k < n; k++) {
    const isLast = k === n - 1;
    const cap = isLast ? balance : principal;
    out.push(Math.round(cap + balance * i));
    balance -= cap;
  }
  return out;
}

// ── Comparación de plazos ──────────────────────────────────────────────────

export interface ScenarioRow {
  installments: number;
  monthlyPayment: number;
  totalPaid: number;
  creditCost: number;
  overheadPct: number;
}

/**
 * El mismo precio a varios plazos. Es la tabla que hace cambiar de opinión:
 * a 36 cuotas la mensualidad se ve pequeña y el sobrecosto no.
 */
export function compareTerms(
  input: Omit<SimulationInput, 'installments'>,
  terms: number[] = COMPARE_TERMS,
): ScenarioRow[] {
  return terms.map((n) => {
    const r = simulate({ ...input, installments: n });
    return {
      installments: n,
      monthlyPayment: r.monthlyPayment,
      totalPaid: r.totalPaid,
      creditCost: r.creditCost,
      overheadPct: r.overheadPct,
    };
  });
}

// ── Impacto en el flujo de caja ────────────────────────────────────────────

export type ImpactLevel = 'comfortable' | 'tight' | 'risky' | 'overflow';

export interface ImpactVerdict {
  level: ImpactLevel;
  /** Carga de cuotas del mes más cargado sobre el ingreso típico, en %. */
  pct: number;
  /** Cuotas ya comprometidas + la nueva, en el mes más cargado. */
  peakLoad: number;
  /** Lo que queda del ingreso tras cuotas y gasto fijo en ese mes. */
  leftover: number;
}

/**
 * Veredicto de holgura. Umbrales de orientación (20 % / 30 % del ingreso en
 * cuotas), no una regla financiera: la UI lo rotula como estimación informativa.
 *
 * Devuelve null sin ingreso conocido. Regla del proyecto: ninguna frase con un
 * número se muestra antes de tener el número.
 */
export function impactVerdict(
  peakLoad: number,
  typicalIncome: number,
  fixedExpenses: number,
): ImpactVerdict | null {
  if (!typicalIncome || typicalIncome <= 0) return null;
  const pct = (peakLoad / typicalIncome) * 100;
  const leftover = typicalIncome - fixedExpenses - peakLoad;
  let level: ImpactLevel;
  if (leftover < 0) level = 'overflow';
  else if (pct <= 20) level = 'comfortable';
  else if (pct <= 30) level = 'tight';
  else level = 'risky';
  return { level, pct, peakLoad, leftover };
}

/**
 * Cuánto se paga en cuotas cada uno de los próximos `months` meses, sumando lo
 * ya comprometido y la simulación en curso.
 *
 * `committed` viene indexado por clave `año_mes` (0-11), la misma forma que usan
 * `fixedSkipMonths` / `fixedPaidMonths` en las transacciones.
 */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}_${date.getMonth()}`;
}

export interface LoadBucket {
  year: number;
  month: number;
  committed: number;
  simulated: number;
  total: number;
}

export function buildLoadTimeline(
  committed: Record<string, number>,
  schedule: ScheduleRow[],
  from: Date,
  months: number,
): LoadBucket[] {
  const simulated: Record<string, number> = {};
  for (const row of schedule) {
    const k = monthKey(row.date);
    simulated[k] = (simulated[k] ?? 0) + row.payment;
  }
  const out: LoadBucket[] = [];
  for (let m = 0; m < months; m++) {
    const d = new Date(from.getFullYear(), from.getMonth() + m, 1);
    const k = monthKey(d);
    const c = committed[k] ?? 0;
    const s = simulated[k] ?? 0;
    out.push({ year: d.getFullYear(), month: d.getMonth(), committed: c, simulated: s, total: c + s });
  }
  return out;
}

/** Mediana de una serie. Mediana y no media: un aguinaldo tuerce la media. */
export function median(nums: number[]): number {
  const s = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (s.length === 0) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

// ── Riel de plazos de paso desigual (C2·2) ─────────────────────────────────

/** Topes del riel. Son los plazos que la gente pide de verdad. */
export const TERM_STOPS = [1, 3, 6, 12, 18, 24, 36];

/**
 * Posición 0..1 de un plazo en un riel donde los TOPES —no las cuotas— se
 * reparten el ancho a partes iguales.
 *
 * Un riel lineal en cuotas gasta el espacio al revés: deja 17 px entre 1 y 3,
 * donde el sobrecosto cambia muchísimo, y 102 px entre 24 y 36, donde ya da
 * igual. Aquí cada tramo mide lo mismo y los valores intermedios se interpolan
 * dentro de su tramo.
 */
export function termRailPosition(n: number, stops: number[] = TERM_STOPS): number {
  const last = stops.length - 1;
  if (n <= stops[0]) return 0;
  if (n >= stops[last]) return 1;
  for (let i = 0; i < last; i++) {
    if (n <= stops[i + 1]) {
      const within = (n - stops[i]) / (stops[i + 1] - stops[i]);
      return (i + within) / last;
    }
  }
  return 1;
}

/**
 * Inversa de `termRailPosition`: de una posición 0..1 del riel al plazo.
 *
 * La necesita el arrastre. Sin ella el riel solo sabría saltar de tope en tope,
 * y los plazos intermedios (9, 15, 30) quedarían fuera del gesto.
 */
export function termFromRailPosition(pos: number, stops: number[] = TERM_STOPS): number {
  const last = stops.length - 1;
  const clamped = Math.min(Math.max(pos, 0), 1);
  const scaled = clamped * last;
  const i = Math.min(Math.floor(scaled), last - 1);
  const within = scaled - i;
  const value = stops[i] + within * (stops[i + 1] - stops[i]);
  return Math.min(stops[last], Math.max(stops[0], Math.round(value)));
}

// ── Agrupación por año del plan (F5 combinado) ─────────────────────────────

export interface YearGroup {
  year: number;
  rows: ScheduleRow[];
  /** Suma de pagos del año. */
  paid: number;
  /** Intereses pagados en el año. */
  interest: number;
  /** Saldo al cerrar el año. */
  endBalance: number;
}

/**
 * Parte el plan por año natural.
 *
 * Un plan a 36 meses son 36 filas de entrada; agrupado son 3, y la proyección
 * se puede ver entera sin scrollear, que es para lo que existe la sección.
 */
export function groupScheduleByYear(schedule: ScheduleRow[]): YearGroup[] {
  const out: YearGroup[] = [];
  for (const row of schedule) {
    const y = row.date.getFullYear();
    let g = out[out.length - 1];
    if (!g || g.year !== y) {
      g = { year: y, rows: [], paid: 0, interest: 0, endBalance: 0 };
      out.push(g);
    }
    g.rows.push(row);
    g.paid += row.payment;
    g.interest += row.interest;
    g.endBalance = row.balance;
  }
  return out;
}

// ── Tasa variable (se reliquida cada mes) ──────────────────────────────────

/**
 * Hay dos modelos vivos en el mercado colombiano y cambian la proyección:
 *
 *  · `fixed`    — la tasa se pacta al comprar y no se mueve en todo el plazo.
 *                 Es lo que hace Davivienda al rediferir: «la tasa de interés
 *                 no cambia, se mantiene la vigente al momento de la compra».
 *  · `variable` — el banco reliquida cada mes con la tasa de ese periodo.
 *                 DAVIbank: «corresponderá a la vigente para cada mes de
 *                 liquidación, esto significa que la tasa variará mensualmente».
 *
 * Con `variable` una cifra única sería mentira, así que se devuelve una BANDA.
 */
export type RateKind = 'fixed' | 'variable';

/**
 * Plan con una tasa distinta cada mes: el banco recalcula la cuota sobre el
 * saldo vivo y el plazo que queda. No usa `calculateInstallments` a propósito —
 * esa función asume una tasa única para todo el plazo.
 */
export function simulateWithRateSeries(
  input: Omit<SimulationInput, 'tea' | 'system'>,
  teaByMonth: number[],
): SimulationResult {
  const price = Math.max(0, Math.round(input.price));
  const downPayment = Math.min(price, Math.max(0, Math.round(input.downPayment ?? 0)));
  const fee = Math.max(0, Math.round(input.monthlyFee ?? 0));
  const n = clampInstallments(input.installments);
  const financed = price - downPayment;
  const dates = calculateInstallmentDates(input.startDate, n);

  const schedule: ScheduleRow[] = [];
  let balance = financed;
  for (let k = 0; k < n; k++) {
    const i = monthlyRateFromTea(teaByMonth[Math.min(k, teaByMonth.length - 1)]);
    const left = n - k;
    const isLast = k === n - 1;
    const pmt = isLast
      ? balance + Math.round(balance * i)
      : Math.round(i === 0 ? balance / left : (balance * i) / (1 - Math.pow(1 + i, -left)));
    const interest = isLast ? pmt - balance : Math.round(balance * i);
    const principal = Math.max(0, Math.min(balance, pmt - interest));
    balance = Math.max(0, balance - principal);
    schedule.push({
      number: k + 1, date: dates[k], payment: pmt + fee,
      installment: pmt, interest, principal, balance,
    });
  }

  const totalPayments = schedule.reduce((a, r) => a + r.payment, 0);
  const totalPaid = totalPayments + downPayment;
  const creditCost = totalPaid - price;
  const first = schedule[0];
  const last = schedule[schedule.length - 1];

  return {
    financed,
    monthlyPayment: first.payment,
    lastPayment: last.payment,
    levelPayments: schedule.every((r) => r.payment === first.payment),
    monthlyRate: monthlyRateFromTea(teaByMonth[0]),
    tea: teaByMonth[0],
    schedule,
    totalPaid,
    creditCost,
    overheadPct: price > 0 ? (creditCost / price) * 100 : 0,
    effectiveTea: financed > 0
      ? (Math.pow(1 + irrMonthly(financed, schedule.map((r) => r.payment)), 12) - 1) * 100
      : null,
    lastDate: last.date,
    system: 'french',
  };
}

export interface VariableBand {
  /** La tasa se queda como está hoy. */
  low: SimulationResult;
  /** La tasa sube hasta el techo legal y se queda ahí. */
  high: SimulationResult;
  /** Cuánto más se pagaría en el peor escenario. */
  extraTotal: number;
  /** La cuota más alta que llegaría a verse. */
  peakPayment: number;
}

/**
 * Los dos extremos honestos de una tasa variable: la de hoy y el techo legal.
 *
 * No se inventa una previsión de tipos —nadie la tiene— sino que se acota entre
 * lo que se paga si nada cambia y lo máximo que la ley permite cobrar. La subida
 * al techo se reparte en `rampMonths` en vez de aplicarse de golpe: un salto
 * instantáneo al máximo exagera el peor caso y deja de ser creíble.
 */
export function simulateVariableBand(
  input: Omit<SimulationInput, 'tea' | 'system'>,
  currentTea: number,
  capTea: number,
  rampMonths = 12,
): VariableBand {
  const n = clampInstallments(input.installments);
  const flat = Array(n).fill(currentTea);
  const top = Math.max(currentTea, capTea);
  const ramp = Array.from({ length: n }, (_, k) =>
    currentTea + (top - currentTea) * Math.min(k / Math.max(rampMonths, 1), 1));

  const low = simulateWithRateSeries(input, flat);
  const high = simulateWithRateSeries(input, ramp);
  return {
    low,
    high,
    extraTotal: high.totalPaid - low.totalPaid,
    peakPayment: Math.max(...high.schedule.map((r) => r.payment)),
  };
}
