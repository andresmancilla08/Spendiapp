import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { readableTint, mixHex } from '../../utils/contrast';
import { Fonts } from '../../config/fonts';
import { formatMoney } from '../../utils/formatMoney';
import { getMonthNames } from '../../utils/dateLocale';
import AppIcon from '../AppIcon';
import { buildLoadTimeline, impactVerdict, type ImpactLevel, type ScheduleRow } from '../../utils/simulator';

/** Alto del área de barras. Fijo: el gráfico no debe empujar el layout al recalcularse. */
const CHART_H = 96;

interface Props {
  schedule: ScheduleRow[];
  price: number;
  creditCost: number;
  monthlyPayment: number;
  committedByMonth: Record<string, number>;
  typicalIncome: number;
  fixedExpenses: number;
  hasIncomeData: boolean;
  loading: boolean;
  /** Presupuesto del mes para la categoría elegida, si hay. */
  categoryBudget: { name: string; limit: number } | null;
  onCreateGoal: () => void;
}

/** Literales explícitos y no `t(\`...${level}\`)`: así el chequeo de claves i18n los ve. */
function verdictLabel(level: ImpactLevel, t: (k: string, o?: any) => string): string {
  if (level === 'comfortable') return t('simulator.verdictComfortable');
  if (level === 'tight') return t('simulator.verdictTight');
  if (level === 'risky') return t('simulator.verdictRisky');
  return t('simulator.verdictOverflow');
}

function verdictHint(level: ImpactLevel, over: string, t: (k: string, o?: any) => string): string {
  if (level === 'comfortable') return t('simulator.verdictHintComfortable');
  if (level === 'tight') return t('simulator.verdictHintTight');
  if (level === 'risky') return t('simulator.verdictHintRisky');
  return t('simulator.verdictHintOverflow', { amount: over });
}

export default function ImpactPanel({
  schedule, price, creditCost, monthlyPayment,
  committedByMonth, typicalIncome, fixedExpenses, hasIncomeData, loading,
  categoryBudget, onCreateGoal,
}: Props) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const months = getMonthNames(i18n.language);

  const now = new Date();
  const span = Math.min(12, Math.max(6, schedule.length + 1));
  const timeline = buildLoadTimeline(committedByMonth, schedule, new Date(now.getFullYear(), now.getMonth(), 1), span);

  const peak = timeline.reduce((best, b) => (b.total > best.total ? b : best), timeline[0]);
  const verdict = hasIncomeData ? impactVerdict(peak.total, typicalIncome, fixedExpenses) : null;

  const maxVal = Math.max(...timeline.map((b) => b.total), typicalIncome, 1);
  const committedInk = isDark ? mixHex(colors.surface, colors.textPrimary, 0.28) : colors.border;

  const toneColor =
    verdict?.level === 'comfortable' ? colors.success
      : verdict?.level === 'tight' ? colors.warning
        : colors.error;
  const toneBg = mixHex(colors.surface, toneColor, 0.12);
  const toneInk = readableTint(toneColor, toneBg, 4.5);

  // Alternativa de ahorro: cuántos meses guardando la misma cuota.
  const saveMonths = monthlyPayment > 0 ? Math.ceil(price / monthlyPayment) : 0;

  return (
    <View>
      {/* ── Veredicto ── */}
      {loading ? (
        <Text style={[styles.hint, { color: colors.textTertiary }]}>···</Text>
      ) : !hasIncomeData ? (
        <View style={[styles.noteCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <AppIcon name="information-circle-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>{t('simulator.impactNoIncome')}</Text>
        </View>
      ) : verdict && (
        <View style={[styles.verdict, { backgroundColor: toneBg, borderColor: toneColor + '40' }]}>
          <View style={styles.verdictHead}>
            <AppIcon
              name={verdict.level === 'comfortable' ? 'checkmark-circle-outline' : 'warning-outline'}
              size={18}
              color={toneInk}
            />
            <Text style={[styles.verdictTitle, { color: toneInk }]}>{verdictLabel(verdict.level, t)}</Text>
          </View>
          <Text style={[styles.verdictBody, { color: colors.textSecondary }]}>
            {verdictHint(verdict.level, formatMoney(Math.abs(verdict.leftover), i18n.language), t)}
          </Text>
          <Text style={[styles.verdictBody, { color: colors.textSecondary }]}>
            {t('simulator.impactShare', { pct: ((monthlyPayment / typicalIncome) * 100).toFixed(0) })}
          </Text>
          {peak.total > 0 && (
            <Text style={[styles.verdictBody, { color: colors.textSecondary }]}>
              {t('simulator.impactPeak', {
                month: months[peak.month],
                amount: formatMoney(peak.total, i18n.language),
              })}
            </Text>
          )}
        </View>
      )}

      {/* ── Barras mes a mes ── */}
      <Text style={[styles.blockTitle, { color: colors.textSecondary }]}>{t('simulator.impactChartTitle')}</Text>
      <View style={[styles.chartWrap, { borderColor: colors.border }]}>
        <View style={styles.chart}>
          {/* Línea del ingreso típico. Estática: nada aquí se anima. */}
          {hasIncomeData && typicalIncome <= maxVal && (
            <View
              pointerEvents="none"
              style={[
                styles.incomeLine,
                { bottom: (typicalIncome / maxVal) * CHART_H, backgroundColor: colors.primary + '66' },
              ]}
            />
          )}
          {timeline.map((b, idx) => {
            const committedH = (b.committed / maxVal) * CHART_H;
            const simulatedH = (b.simulated / maxVal) * CHART_H;
            return (
              <View key={`${b.year}_${b.month}`} style={styles.barCol}>
                <View style={styles.barStack}>
                  {simulatedH > 0 && (
                    <View style={[styles.barSeg, { height: Math.max(2, simulatedH), backgroundColor: colors.primary, borderTopLeftRadius: 3, borderTopRightRadius: 3 }]} />
                  )}
                  {committedH > 0 && (
                    <View style={[
                      styles.barSeg,
                      { height: Math.max(2, committedH), backgroundColor: committedInk },
                      simulatedH === 0 && { borderTopLeftRadius: 3, borderTopRightRadius: 3 },
                    ]} />
                  )}
                </View>
                <Text style={[styles.barLabel, { color: idx === 0 ? colors.textSecondary : colors.textTertiary }]} numberOfLines={1}>
                  {months[b.month].slice(0, 3)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendText, { color: colors.textTertiary }]}>{t('simulator.legendNew')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: committedInk }]} />
            <Text style={[styles.legendText, { color: colors.textTertiary }]}>{t('simulator.legendCommitted')}</Text>
          </View>
          {hasIncomeData && (
            <View style={styles.legendItem}>
              <View style={[styles.legendBar, { backgroundColor: colors.primary + '66' }]} />
              <Text style={[styles.legendText, { color: colors.textTertiary }]}>{t('simulator.legendIncome')}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Presupuesto de la categoría ── */}
      {categoryBudget && categoryBudget.limit > 0 && (
        <View style={[styles.noteCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <AppIcon name="stats-chart-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            {t('simulator.budgetImpact', {
              pct: Math.round((monthlyPayment / categoryBudget.limit) * 100),
              category: categoryBudget.name,
            })}
          </Text>
        </View>
      )}

      {/* ── La otra cara: ahorrar en vez de financiar ── */}
      {creditCost > 0 && saveMonths > 0 && (
        <LinearGradient
          colors={[colors.success + '1E', colors.success + '08']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.saveCard, { borderColor: colors.success + '33' }]}
        >
          <Text style={[styles.saveTitle, { color: readableTint(colors.success, colors.surface, 4.5) }]}>
            {t('simulator.saveTitle')}
          </Text>
          <Text style={[styles.saveBody, { color: colors.textSecondary }]}>
            {t('simulator.saveBody', {
              amount: formatMoney(monthlyPayment, i18n.language),
              months: saveMonths,
              saved: formatMoney(creditCost, i18n.language),
            })}
          </Text>
          <TouchableOpacity
            onPress={onCreateGoal}
            activeOpacity={0.85}
            accessibilityRole="button"
            style={[styles.saveBtn, { backgroundColor: colors.success }]}
          >
            <AppIcon name="flag-outline" size={15} color={colors.onPrimary} />
            <Text style={[styles.saveBtnText, { color: colors.onPrimary }]}>{t('simulator.saveCta')}</Text>
          </TouchableOpacity>
        </LinearGradient>
      )}

      <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>{t('simulator.disclaimer')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 12, fontFamily: Fonts.regular, marginBottom: 12 },
  blockTitle: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 20, marginBottom: 10 },

  verdict: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 4 },
  verdictHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
  verdictTitle: { fontSize: 15, fontFamily: Fonts.bold },
  verdictBody: { fontSize: 12.5, fontFamily: Fonts.regular, lineHeight: 18 },

  chartWrap: { borderRadius: 16, borderWidth: 1, padding: 14 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: CHART_H + 20, position: 'relative' },
  incomeLine: { position: 'absolute', left: 0, right: 0, height: 1, marginBottom: 20 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barStack: { width: '100%', maxWidth: 22, justifyContent: 'flex-end' },
  barSeg: { width: '100%' },
  barLabel: { fontSize: 9, fontFamily: Fonts.medium, marginTop: 6, height: 14 },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendBar: { width: 12, height: 2, borderRadius: 1 },
  legendText: { fontSize: 10.5, fontFamily: Fonts.medium },

  noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 14, borderWidth: 1, padding: 12, marginTop: 14 },
  noteText: { flex: 1, fontSize: 12.5, fontFamily: Fonts.regular, lineHeight: 18 },

  saveCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 16 },
  saveTitle: { fontSize: 14, fontFamily: Fonts.bold, marginBottom: 4 },
  saveBody: { fontSize: 12.5, fontFamily: Fonts.regular, lineHeight: 18 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42, borderRadius: 50, marginTop: 12 },
  saveBtnText: { fontSize: 13.5, fontFamily: Fonts.bold },

  disclaimer: { fontSize: 11, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
