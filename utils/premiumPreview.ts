/**
 * Cifras REALES del usuario para las miniaturas de las pantallas premium.
 *
 * Vive en utils/ y NO importa hooks ni react-native a propósito: así se puede
 * ejecutar su gate en Node (`npx tsx utils/premiumPreview.test.ts`). El hook que
 * lo alimenta con datos de Firestore es `hooks/usePremiumPreview.ts`.
 */
import { categoryLabel } from '../constants/categories';

const LOCALE_MAP: Record<string, string> = { es: 'es-CO', en: 'en-US', it: 'it-IT' };

/**
 * Meses del idioma activo. Igual que en `formatMoney`, el `require` es diferido y
 * va en try/catch: `dateLocale` arrastra `config/i18n` y con él react-native, que
 * no se puede cargar en Node. Fuera de la app (gate, scripts) cae al Intl de aquí,
 * que es lo mismo que hace `getMonthNames`. Nunca un array de meses a mano.
 */
function monthLabels(lang?: string): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return (require('./dateLocale') as typeof import('./dateLocale')).getMonthNames(lang);
  } catch {
    const locale = LOCALE_MAP[(lang ?? 'es').slice(0, 2)] ?? 'es-CO';
    const fmt = new Intl.DateTimeFormat(locale, { month: 'long' });
    return Array.from({ length: 12 }, (_, m) => {
      const name = fmt.format(new Date(2020, m, 1));
      return name.charAt(0).toUpperCase() + name.slice(1);
    });
  }
}

export interface PreviewCategory { name: string; amount: number; pct: number }

export interface PremiumPreview {
  /** Serie de gasto de los últimos 6 meses + etiquetas de mes ya localizadas. */
  trend: { months: string[]; expenses: number[]; total: number; deltaPct: number | null } | null;
  analysis: {
    savingsRatePct: number;
    vsLastPct: number | null;
    topCategory: PreviewCategory | null;
  } | null;
  categories: { total: number; items: PreviewCategory[] } | null;
  projection: { projected: number; income: number; nowPct: number; endPct: number } | null;
  goals: { active: number; items: { name: string; pct: number }[] } | null;
}

export const EMPTY_PREVIEW: PremiumPreview = {
  trend: null, analysis: null, categories: null, projection: null, goals: null,
};

export interface PreviewInput {
  transactions: { type: string; category: string; amount: number }[];
  totalIncome: number;
  totalExpenses: number;
  trendData: { month: number; expenses: number }[];
  prevMonthToDateExpenses: number | null;
  goals: { name: string; status: string; savedAmount: number; targetAmount: number }[];
  customCategories: any[];
  lang?: string;
  dayOfMonth: number;
  daysInMonth: number;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

/**
 * Toda la aritmética, separada de los hooks para poder comprobarla:
 *   npx tsx hooks/usePremiumPreview.test.ts
 */
export function buildPreview(input: PreviewInput): PremiumPreview {
  const {
    transactions, totalIncome, totalExpenses, trendData, prevMonthToDateExpenses,
    goals, customCategories, lang, dayOfMonth, daysInMonth, t,
  } = input;
  {
    const monthNames = monthLabels(lang);

    // ── Tendencia: 6 meses de gasto ──
    const serie = trendData.filter((b) => b.expenses > 0);
    const trend = serie.length >= 2
      ? {
          months: trendData.map((b) => monthNames[b.month].slice(0, 3).toUpperCase()),
          expenses: trendData.map((b) => b.expenses),
          total: trendData.reduce((acc, b) => acc + b.expenses, 0),
          deltaPct: (() => {
            const [prev, last] = [trendData.at(-2)?.expenses ?? 0, trendData.at(-1)?.expenses ?? 0];
            return prev > 0 ? Math.round(((last - prev) / prev) * 100) : null;
          })(),
        }
      : null;

    // ── Gasto por categoría del mes en curso ──
    const porCategoria = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      porCategoria.set(tx.category, (porCategoria.get(tx.category) ?? 0) + tx.amount);
    }
    const items: PreviewCategory[] = [...porCategoria.entries()]
      .map(([id, amount]) => ({
        name: categoryLabel(id, customCategories, t),
        amount,
        pct: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
    const categories = items.length >= 2 ? { total: totalExpenses, items } : null;

    // ── Análisis del mes ──
    // OJO: la comparación va contra `prevMonthToDateExpenses`, no contra el bucket
    // anterior. El bucket es el mes ANTERIOR COMPLETO y compararlo con un mes a
    // medias siempre pinta una mejora que no existe.
    const analysis = totalExpenses > 0
      ? {
          savingsRatePct: totalIncome > 0
            ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)
            : 0,
          vsLastPct: prevMonthToDateExpenses && prevMonthToDateExpenses > 0
            ? Math.round(((totalExpenses - prevMonthToDateExpenses) / prevMonthToDateExpenses) * 100)
            : null,
          topCategory: items[0] ?? null,
        }
      : null;

    // ── Proyección de cierre ──
    const projected = totalExpenses > 0
      ? Math.round((totalExpenses / dayOfMonth) * daysInMonth)
      : 0;
    const projection = projected > 0 && totalIncome > 0
      ? {
          projected,
          income: totalIncome,
          nowPct: Math.min(100, Math.round((totalExpenses / totalIncome) * 100)),
          endPct: Math.min(100, Math.round((projected / totalIncome) * 100)),
        }
      : null;

    // ── Metas activas ──
    const activas = goals.filter((g) => g.status === 'active');
    const goalsPreview = activas.length
      ? {
          active: activas.length,
          items: activas.slice(0, 2).map((g) => ({
            name: g.name,
            pct: g.targetAmount > 0
              ? Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100))
              : 0,
          })),
        }
      : null;

    return { trend, analysis, categories, projection, goals: goalsPreview };
  }
}
