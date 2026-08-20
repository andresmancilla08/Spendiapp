import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { accentInk } from '../../utils/contrast';
import { Fonts } from '../../config/fonts';
import { formatMoney } from '../../utils/formatMoney';
import type { ScenarioRow } from '../../utils/simulator';

/**
 * El mismo precio a varios plazos.
 *
 * La fila del plazo elegido va resaltada y es tocable: comparar y cambiar de
 * opinión es el mismo gesto. La columna de sobrecosto se pinta en rojo cuando
 * hay: es la cifra que la cuota mensual esconde.
 */
export default function CompareTable({
  rows,
  current,
  onPick,
  cashPrice,
}: {
  rows: ScenarioRow[];
  current: number;
  onPick: (n: number) => void;
  cashPrice: number;
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const ink = accentInk(colors, 'primary', colors.surface);

  return (
    <View>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>{t('simulator.compareHint')}</Text>

      <View style={[styles.head, { borderColor: colors.border }]}>
        <Text style={[styles.hCell, styles.cTerm, { color: colors.textTertiary }]}>{t('simulator.colTerm')}</Text>
        <Text style={[styles.hCell, styles.cNum, { color: colors.textTertiary }]}>{t('simulator.colPayment')}</Text>
        <Text style={[styles.hCell, styles.cNum, { color: colors.textTertiary }]}>{t('simulator.colTotal')}</Text>
        <Text style={[styles.hCell, styles.cExtra, { color: colors.textTertiary }]}>{t('simulator.colExtra')}</Text>
      </View>

      {/* Línea base: pagarlo de una. Sin ella, "+12,9 %" no se compara con nada. */}
      <View style={[styles.row, { borderColor: colors.border }]}>
        <Text style={[styles.cell, styles.cTerm, { color: colors.textSecondary }]}>{t('simulator.termCash')}</Text>
        <Text style={[styles.cell, styles.cNum, { color: colors.textTertiary }]}>—</Text>
        <Text style={[styles.cell, styles.cNum, { color: colors.textSecondary }]}>{formatMoney(cashPrice, i18n.language)}</Text>
        <Text style={[styles.cell, styles.cExtra, { color: colors.textTertiary }]}>—</Text>
      </View>

      {rows.map((r) => {
        const isCurrent = r.installments === current;
        return (
          <TouchableOpacity
            key={r.installments}
            onPress={() => onPick(r.installments)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: isCurrent }}
            accessibilityLabel={`${r.installments} · ${formatMoney(r.monthlyPayment, i18n.language)}`}
            style={[
              styles.row,
              { borderColor: colors.border },
              isCurrent && { backgroundColor: colors.primary + '14', borderRadius: 12, borderBottomWidth: 0 },
            ]}
          >
            <Text style={[styles.cell, styles.cTerm, { color: isCurrent ? ink : colors.textPrimary }, isCurrent && styles.strong]}>
              {r.installments === 1 ? '1' : `${r.installments}`}
              <Text style={[styles.termUnit, { color: colors.textTertiary }]}>
                {r.installments === 1 ? ` ${t('simulator.installmentSingle')}` : ` ${t('simulator.installmentsPlural')}`}
              </Text>
            </Text>
            <Text style={[styles.cell, styles.cNum, { color: isCurrent ? ink : colors.textPrimary }, isCurrent && styles.strong]}>
              {formatMoney(r.monthlyPayment, i18n.language)}
            </Text>
            <Text style={[styles.cell, styles.cNum, { color: colors.textSecondary }]}>
              {formatMoney(r.totalPaid, i18n.language)}
            </Text>
            <Text style={[styles.cell, styles.cExtra, { color: r.creditCost > 0 ? colors.error : colors.textTertiary }]}>
              {r.creditCost > 0 ? `+${r.overheadPct.toFixed(1)} %` : '—'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 17, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  hCell: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.8, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  cell: { fontSize: 12, fontFamily: Fonts.mono },
  strong: { fontFamily: Fonts.monoBold },
  termUnit: { fontSize: 10, fontFamily: Fonts.regular },
  cTerm: { flex: 1.5 },
  cNum: { flex: 1.6, textAlign: 'right' },
  cExtra: { flex: 1.1, textAlign: 'right' },
});
