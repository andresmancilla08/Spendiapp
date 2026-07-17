// Detección de gastos recurrentes / suscripciones a partir del historial.
// Lógica pura (sin Firestore) para poder testearla. La usa hooks/useRecurring.

export interface RecurringTx {
  description: string;
  amount: number;
  category: string;
  dateMs: number;
}

export interface RecurringItem {
  label: string;        // descripción representativa
  amount: number;       // monto típico (mediana)
  category: string;     // categoría más frecuente
  count: number;        // nº de cargos detectados
  months: number;       // meses distintos con cargo
  lastDateMs: number;   // último cargo
  stale: boolean;       // sin cargos en >45 días (¿cancelada / olvidada?)
}

export interface RecurringResult {
  items: RecurringItem[]; // ordenados por monto desc
  monthlyTotal: number;   // suma de montos de las activas (no stale)
}

const STALE_MS = 45 * 24 * 60 * 60 * 1000;

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[0-9]+/g, ' ').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function mode<T>(items: T[]): T {
  const c = new Map<T, number>();
  let best = items[0], max = 0;
  for (const it of items) {
    const n = (c.get(it) ?? 0) + 1;
    c.set(it, n);
    if (n > max) { max = n; best = it; }
  }
  return best;
}

/**
 * Un grupo es recurrente si tiene ≥3 cargos en ≥3 meses distintos, con la misma
 * descripción normalizada y montos consistentes (mediana ± 20%).
 */
export function detectRecurring(txns: RecurringTx[], nowMs: number): RecurringResult {
  const groups = new Map<string, RecurringTx[]>();
  for (const t of txns) {
    const key = norm(t.description);
    if (key.length < 3) continue; // descripciones vacías o solo números
    const g = groups.get(key);
    if (g) g.push(t); else groups.set(key, [t]);
  }

  const items: RecurringItem[] = [];
  for (const g of groups.values()) {
    if (g.length < 3) continue;
    const monthsSet = new Set(g.map((t) => {
      const d = new Date(t.dateMs);
      return `${d.getFullYear()}-${d.getMonth()}`;
    }));
    if (monthsSet.size < 3) continue;

    const med = median(g.map((t) => t.amount));
    if (med <= 0) continue;
    const consistent = g.filter((t) => Math.abs(t.amount - med) <= med * 0.2);
    if (consistent.length < 3) continue; // montos demasiado dispares → no es suscripción

    const lastDateMs = Math.max(...g.map((t) => t.dateMs));
    items.push({
      label: mode(g.map((t) => t.description.trim())),
      amount: med,
      category: mode(g.map((t) => t.category)),
      count: g.length,
      months: monthsSet.size,
      lastDateMs,
      stale: nowMs - lastDateMs > STALE_MS,
    });
  }

  items.sort((a, b) => b.amount - a.amount);
  const monthlyTotal = items.filter((i) => !i.stale).reduce((s, i) => s + i.amount, 0);
  return { items, monthlyTotal };
}
