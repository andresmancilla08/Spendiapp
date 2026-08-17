/**
 * Alimenta las miniaturas de las pantallas premium con los datos REALES del
 * usuario. La aritmética vive aparte, en `utils/premiumPreview.ts`, para poder
 * comprobarla en Node; aquí solo se juntan los hooks de Firestore.
 *
 * Las tarjetas de `PremiumModuleCards` enseñaban cifras inventadas con un aviso
 * de "cifras de ejemplo": vender un módulo de finanzas con números que no son
 * los tuyos es la peor demo posible.
 *
 * Lo que NO se trae, y por qué:
 * - La frase con IA: llamaría a Gemini para alguien que aún no ha pagado.
 * - Informe con amigo y gastos grupales: dependen de tener amigos y grupos; en
 *   una cuenta nueva no habría nada que enseñar.
 *
 * Cada bloque puede venir a `null`: la tarjeta cae a su ejemplo cuando todavía
 * no hay datos suficientes (mes recién empezado, cero metas…).
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTransactions } from './useTransactions';
import { useMonthlyTrend } from './useMonthlyTrend';
import { useGoals } from './useGoals';
import { useCategories } from './useCategories';
import { buildPreview, EMPTY_PREVIEW, type PremiumPreview } from '../utils/premiumPreview';

export type { PremiumPreview, PreviewCategory } from '../utils/premiumPreview';

export function usePremiumPreview(userId: string | undefined): PremiumPreview {
  const { t, i18n } = useTranslation();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const enabled = !!userId;

  const { transactions, totalIncome, totalExpenses } = useTransactions(userId ?? '', year, month);
  const { data: trendData, prevMonthToDateExpenses } = useMonthlyTrend(
    userId ?? '', year, month, 6, enabled, now.getDate(),
  );
  const { goals } = useGoals(userId ?? '');
  const { categories: customCategories } = useCategories(userId ?? '');

  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return useMemo(() => {
    if (!enabled) return EMPTY_PREVIEW;
    return buildPreview({
      transactions, totalIncome, totalExpenses, trendData, prevMonthToDateExpenses,
      goals, customCategories, lang: i18n.language, dayOfMonth, daysInMonth, t,
    });
  }, [enabled, transactions, totalIncome, totalExpenses, trendData, prevMonthToDateExpenses,
    goals, customCategories, i18n.language, dayOfMonth, daysInMonth, t]);
}
