/**
 * Simulador de sueldo — toda la aritmética, pura y sin React.
 *
 * El simulador LEE los movimientos del mes (fijos y variables) y no escribe
 * nunca en `transactions`: lo que el usuario apaga o añade aquí vive en el
 * escenario de su perfil (`users/{uid}.salarySim`). Por eso un «¿y si…?» no
 * puede mover el balance ni el histórico.
 *
 * Gate: `npx tsx utils/salarySim.test.ts`
 */
import { effectiveAmount } from './sharedCalc';
import { isFxCurrency, type FxCurrency } from './fxConvert';

export type PayFrequency = 'weekly' | 'biweekly' | 'monthly';
export const PAY_FREQUENCIES: PayFrequency[] = ['weekly', 'biweekly', 'monthly'];

/** Pagos al mes por defecto. Semanal es 4 y no 4,33: el fondo existe para
 *  cubrir los fijos, y con 4,33 un mes de cuatro pagos se queda corto. */
export const DEFAULT_PAYMENTS: Record<PayFrequency, number> = { weekly: 4, biweekly: 2, monthly: 1 };
export const PAYMENTS_MIN = 1;
export const PAYMENTS_MAX = 5;

export const DEFAULT_SAVE_PCT = 30;
/** Accesos rápidos del reparto (ahorro %). */
export const SAVE_PRESETS = [30, 20, 50];

export const SIMULATED_MAX = 20;
export const SIMULATED_NAME_MAX = 40;

export interface SimulatedExpense {
  id: string;
  name: string;
  /** COP. */
  amount: number;
}

export interface SalarySimScenario {
  currency: FxCurrency;
  /** En la moneda de `currency`. */
  salary: number;
  /** Tasa manual por moneda. Ausente = TRM del día. Se recuerda (decisión D7). */
  manualRates: Partial<Record<'USD' | 'EUR', number>>;
  savePct: number;
  frequency: PayFrequency;
  paymentsPerMonth: number;
  /** Id del documento real del fijo (sin el sufijo `_virtual_`): vale para todos los meses. */
  excludedFixedIds: string[];
  simulated: SimulatedExpense[];
}

export const DEFAULT_SCENARIO: SalarySimScenario = {
  currency: 'COP',
  salary: 0,
  manualRates: {},
  savePct: DEFAULT_SAVE_PCT,
  frequency: 'monthly',
  paymentsPerMonth: DEFAULT_PAYMENTS.monthly,
  excludedFixedIds: [],
  simulated: [],
};

const finitePos = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

export function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function clampPayments(n: number): number {
  if (!Number.isFinite(n)) return PAYMENTS_MIN;
  return Math.max(PAYMENTS_MIN, Math.min(PAYMENTS_MAX, Math.round(n)));
}

/** Lo que venga del perfil (otra versión, o escrito a mano) no puede tumbar la
 *  pantalla: lo que no cuadra cae al valor por defecto campo a campo. */
export function sanitizeScenario(raw: unknown): SalarySimScenario {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const frequency = PAY_FREQUENCIES.includes(r.frequency as PayFrequency)
    ? (r.frequency as PayFrequency) : DEFAULT_SCENARIO.frequency;
  const mr = (r.manualRates && typeof r.manualRates === 'object' ? r.manualRates : {}) as Record<string, unknown>;
  const manualRates: SalarySimScenario['manualRates'] = {};
  for (const c of ['USD', 'EUR'] as const) if (finitePos(mr[c]) && mr[c] > 0) manualRates[c] = mr[c] as number;
  return {
    currency: isFxCurrency(r.currency) ? r.currency : DEFAULT_SCENARIO.currency,
    salary: finitePos(r.salary) ? r.salary : 0,
    manualRates,
    savePct: typeof r.savePct === 'number' ? clampPct(r.savePct) : DEFAULT_SAVE_PCT,
    frequency,
    paymentsPerMonth: typeof r.paymentsPerMonth === 'number' ? clampPayments(r.paymentsPerMonth) : DEFAULT_PAYMENTS[frequency],
    excludedFixedIds: Array.isArray(r.excludedFixedIds)
      ? r.excludedFixedIds.filter((x): x is string => typeof x === 'string').slice(0, 200) : [],
    simulated: Array.isArray(r.simulated)
      ? r.simulated
          .filter((s): s is SimulatedExpense => !!s && typeof s.id === 'string' && typeof s.name === 'string' && finitePos(s.amount))
          .map((s) => ({ id: s.id, name: s.name.slice(0, SIMULATED_NAME_MAX), amount: s.amount }))
          .slice(0, SIMULATED_MAX)
      : [],
  };
}

/** Id del documento real: las copias virtuales de un fijo llevan `_virtual_<año>_<mes>`. */
export function baseTxId(id: string): string {
  const at = id.indexOf('_virtual_');
  return at === -1 ? id : id.slice(0, at);
}

interface TxLike {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category?: string;
  isFixed?: boolean;
  isPaid?: boolean;
  isShared?: boolean;
  isInstallment?: boolean;
  sharedAmount?: number | null;
}

export interface MonthFixed {
  id: string;
  name: string;
  category?: string;
  /** Tu parte (`effectiveAmount`), en COP. */
  amount: number;
  paid: boolean;
}

/** Gastos fijos del mes. Los ingresos fijos no entran: el ingreso es el simulado (D8). */
export function monthFixedExpenses(txs: TxLike[]): MonthFixed[] {
  return txs
    .filter((t) => t.type === 'expense' && t.isFixed === true)
    .map((t) => ({ id: baseTxId(t.id), name: t.description, category: t.category, amount: effectiveAmount(t), paid: t.isPaid === true }))
    .sort((a, b) => b.amount - a.amount);
}

/** Gasto variable del mes: todo gasto que NO es fijo. Los fijos ya se restan
 *  en el resumen; contarlos aquí también los restaría dos veces. */
export function monthVariableSpent(txs: TxLike[]): number {
  return txs
    .filter((t) => t.type === 'expense' && t.isFixed !== true)
    .reduce((s, t) => s + effectiveAmount(t), 0);
}

export interface SimInput {
  salary: number;
  /** COP por unidad de la moneda del sueldo. 1 si es COP. */
  rate: number;
  fixedTotal: number;
  savePct: number;
  paymentsPerMonth: number;
  variableSpent: number;
}

export interface SimResult {
  income: number;
  fixedTotal: number;
  /** Ingreso − fijos. Puede ser negativo. */
  available: number;
  /** Los fijos superan el ingreso: no hay nada que repartir. */
  deficit: boolean;
  save: number;
  free: number;
  /** Libre − gasto variable real. Negativo = te pasaste. */
  left: number;
  /** Fondo para fijos por pago. */
  perPaymentCop: number;
  /** El mismo fondo en la moneda del sueldo. */
  perPaymentFx: number;
}

export function simulate(i: SimInput): SimResult {
  const rate = i.rate > 0 ? i.rate : 0;
  const income = Math.max(0, i.salary) * rate;
  const available = income - i.fixedTotal;
  const deficit = available < 0;
  const pct = clampPct(i.savePct);
  const save = deficit ? 0 : available * pct / 100;
  const free = deficit ? 0 : available - save;
  const payments = clampPayments(i.paymentsPerMonth);
  const perPaymentCop = i.fixedTotal / payments;
  return {
    income,
    fixedTotal: i.fixedTotal,
    available,
    deficit,
    save,
    free,
    left: free - i.variableSpent,
    perPaymentCop,
    perPaymentFx: rate > 0 ? perPaymentCop / rate : 0,
  };
}

export type MonthKind = 'past' | 'current' | 'future';

export function monthKind(year: number, month: number, now = new Date()): MonthKind {
  const a = year * 12 + month;
  const b = now.getFullYear() * 12 + now.getMonth();
  return a < b ? 'past' : a > b ? 'future' : 'current';
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Días que quedan del mes contando hoy. Mínimo 1: nunca se divide por cero. */
export function daysLeft(year: number, month: number, now = new Date()): number {
  const kind = monthKind(year, month, now);
  if (kind === 'past') return 1;
  if (kind === 'future') return daysInMonth(year, month);
  return Math.max(1, daysInMonth(year, month) - now.getDate() + 1);
}

/** Diferencia de la tasa manual contra la TRM, en %. */
export function rateDeltaPct(manual: number, trm: number): number {
  return trm > 0 ? (manual / trm - 1) * 100 : 0;
}
