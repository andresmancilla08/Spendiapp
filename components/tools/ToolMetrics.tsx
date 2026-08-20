import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';
import { formatMoney } from '../../utils/formatMoney';
import { useGoals } from '../../hooks/useGoals';
import { useRecurring } from '../../hooks/useRecurring';
import { useCategories } from '../../hooks/useCategories';
import { useBudgets } from '../../hooks/useBudgets';
import { useExpenseGroups } from '../../hooks/useExpenseGroups';

/**
 * El dato vivo de cada tesela de Herramientas.
 *
 * Cada métrica es su PROPIO componente a propósito. La regla de coste dice que
 * una herramienta bloqueada por premium, pausada por bandera o ausente por
 * plataforma no debe suscribirse a nada; con un solo componente y un `if`
 * dentro no se puede, porque los hooks no son condicionales. Montando o no el
 * subcomponente, sí.
 *
 * Ninguna métrica bloquea el toque: la tesela navega aunque su cifra no haya
 * llegado. Y ninguna afirma un número antes de tenerlo — mientras carga no se
 * pinta nada, que es la regla del proyecto sobre frases con cifras.
 */
function useMetricStyle() {
  const { colors } = useTheme();
  return [styles.metric, { color: colors.textSecondary }];
}

export function GoalsMetric({ uid }: { uid: string }) {
  const { t } = useTranslation();
  const style = useMetricStyle();
  const { goals, loading } = useGoals(uid);
  if (loading) return null;
  const active = goals.filter((g) => g.status === 'active');
  if (active.length === 0) return <Text style={style}>{t('tools.metricGoalsEmpty')}</Text>;
  const target = active.reduce((a, g) => a + g.targetAmount, 0);
  const saved = active.reduce((a, g) => a + g.savedAmount, 0);
  const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  return <Text style={style}>{t('tools.metricGoals', { n: active.length, pct })}</Text>;
}

export function RecurringMetric({ uid }: { uid: string }) {
  const { t, i18n } = useTranslation();
  const style = useMetricStyle();
  const { data, loading } = useRecurring(uid);
  if (loading) return null;
  if (data.monthlyTotal <= 0) return <Text style={style}>{t('tools.metricRecurringEmpty')}</Text>;
  return <Text style={style}>{t('tools.metricRecurring', { amount: formatMoney(data.monthlyTotal, i18n.language) })}</Text>;
}

export function CategoriesMetric({ uid }: { uid: string }) {
  const { t } = useTranslation();
  const style = useMetricStyle();
  const { categories, loading } = useCategories(uid);
  if (loading || categories.length === 0) return null;
  return <Text style={style}>{t('tools.metricCategories', { n: categories.length })}</Text>;
}

export function BudgetMetric({ uid }: { uid: string }) {
  const { t, i18n } = useTranslation();
  const style = useMetricStyle();
  const now = new Date();
  const { budgets, loading } = useBudgets(uid, now.getFullYear(), now.getMonth());
  if (loading) return null;
  if (budgets.length === 0) return <Text style={style}>{t('tools.metricBudgetEmpty')}</Text>;
  // Suma de límites, no «% consumido»: lo segundo exige releer todas las
  // transacciones del mes y esta pantalla no puede costar eso por tesela.
  const total = budgets.reduce((a, b) => a + b.limitAmount, 0);
  return <Text style={style}>{t('tools.metricBudget', { n: budgets.length, amount: formatMoney(total, i18n.language) })}</Text>;
}

export function GroupsMetric({ uid }: { uid: string }) {
  const { t } = useTranslation();
  const style = useMetricStyle();
  const { groups, loading } = useExpenseGroups(uid);
  if (loading) return null;
  const open = groups.filter((g) => g.status === 'active').length;
  if (open === 0) return <Text style={style}>{t('tools.metricGroupsEmpty')}</Text>;
  return <Text style={style}>{t('tools.metricGroups', { n: open })}</Text>;
}

const styles = StyleSheet.create({
  metric: { fontSize: 11, fontFamily: Fonts.mono, marginTop: 5 },
});
