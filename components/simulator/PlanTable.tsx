import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';
import { formatMoney } from '../../utils/formatMoney';
import { formatDate } from '../../utils/dateLocale';
import type { ScheduleRow } from '../../utils/simulator';
import AppIcon from '../AppIcon';

/** Cuotas visibles antes de pedir "ver todas". */
const PREVIEW_ROWS = 6;

/**
 * El plan cuota a cuota.
 *
 * Dos líneas por fila y NO seis columnas: a 390 px una tabla de #/fecha/cuota/
 * interés/capital/saldo obliga a scroll horizontal dentro de un scroll vertical,
 * que es justo el gesto que nadie encuentra. Los números van en mono para que
 * las cifras queden alineadas por dígito.
 */
export default function PlanTable({ schedule }: { schedule: ScheduleRow[] }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const rows = expanded ? schedule : schedule.slice(0, PREVIEW_ROWS);
  const hasMore = schedule.length > PREVIEW_ROWS;

  return (
    <View>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>{t('simulator.planHint')}</Text>

      {rows.map((row) => (
        <View key={row.number} style={[styles.row, { borderColor: colors.border }]}>
          <View style={styles.rowTop}>
            <View style={[styles.numChip, { backgroundColor: colors.primary + '1E' }]}>
              <Text style={[styles.num, { color: colors.primary }]}>{row.number}</Text>
            </View>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {formatDate(row.date, { day: 'numeric', month: 'short', year: 'numeric' }, i18n.language)}
            </Text>
            <Text style={[styles.payment, { color: colors.textPrimary }]}>{formatMoney(row.payment, i18n.language)}</Text>
          </View>
          <Text style={[styles.detail, { color: colors.textTertiary }]}>
            {`${t('simulator.colInterest')} ${formatMoney(row.interest, i18n.language)}`}
            {'   ·   '}
            {`${t('simulator.colPrincipal')} ${formatMoney(row.principal, i18n.language)}`}
            {'   ·   '}
            {`${t('simulator.colBalance')} ${formatMoney(row.balance, i18n.language)}`}
          </Text>
        </View>
      ))}

      {hasMore && (
        <TouchableOpacity
          onPress={() => setExpanded((v) => !v)}
          activeOpacity={0.8}
          accessibilityRole="button"
          style={styles.moreBtn}
        >
          <Text style={[styles.moreText, { color: colors.primary }]}>
            {expanded ? t('simulator.showLess') : t('simulator.showAll', { n: schedule.length })}
          </Text>
          <AppIcon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 17, marginBottom: 12 },
  row: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numChip: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  num: { fontSize: 11, fontFamily: Fonts.monoBold },
  date: { flex: 1, fontSize: 13, fontFamily: Fonts.medium },
  payment: { fontSize: 14, fontFamily: Fonts.monoBold },
  detail: { fontSize: 11, fontFamily: Fonts.mono, marginTop: 4, marginLeft: 34, lineHeight: 16 },
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 14 },
  moreText: { fontSize: 13, fontFamily: Fonts.semiBold },
});
