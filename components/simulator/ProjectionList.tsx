import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { mixHex } from '../../utils/contrast';
import { Fonts } from '../../config/fonts';
import { formatMoney } from '../../utils/formatMoney';
import { getMonthNames } from '../../utils/dateLocale';
import AppIcon from '../AppIcon';
import { groupScheduleByYear, type ScheduleRow } from '../../utils/simulator';

/** Debajo de esto, agrupar por año sería un solo grupo desplegable: un clic inútil. */
const GROUP_FROM = 13;

/**
 * La proyección mes a mes — F5·1 + F5·2 combinados.
 *
 * Tres columnas duras (`mes · cuota · saldo`) y, bajo cada fila, una barra de
 * 2 px partida en capital/interés. Cinco columnas planas NO caben: medidas a
 * 390 px suman 327 px contra 326 disponibles, y revientan con cualquier compra
 * de nueve cifras. La barra dice lo mismo que las dos columnas que se cayeron,
 * y encima se lee de un vistazo: empieza casi toda roja y acaba casi toda azul.
 *
 * A partir de 13 cuotas la lista arranca AGRUPADA POR AÑO con una fila-resumen
 * desplegable, para que un plan a 36 meses se vea entero sin scrollear.
 */
export default function ProjectionList({ schedule }: { schedule: ScheduleRow[] }) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const months = getMonthNames(i18n.language);
  const groups = groupScheduleByYear(schedule);
  const grouped = schedule.length >= GROUP_FROM && groups.length > 1;

  // El primer año viene abierto: si todo está cerrado, la sección no dice nada.
  const [open, setOpen] = useState<number[]>([groups[0]?.year]);
  const toggle = (y: number) =>
    setOpen((v) => (v.includes(y) ? v.filter((x) => x !== y) : [...v, y]));

  // `border` mide 1,23:1 y las reglas entre filas serían invisibles.
  const ruleColor = mixHex(colors.border, colors.textPrimary, isDark ? 0.22 : 0.18);
  const capColor = colors.primary + '99';
  const intColor = colors.error + '99';

  const money = (n: number) => formatMoney(n, i18n.language);

  const Row = ({ row, indented }: { row: ScheduleRow; indented?: boolean }) => (
    <View style={[styles.row, { borderBottomColor: ruleColor }, indented && styles.rowIndent]}>
      <View style={styles.rowTop}>
        <Text style={[styles.month, { color: colors.textSecondary }]}>
          {`${months[row.date.getMonth()].slice(0, 3).toLowerCase()} ${String(row.date.getFullYear()).slice(2)}`}
        </Text>
        <Text style={[styles.pay, { color: colors.textPrimary }]}>{money(row.payment)}</Text>
        <Text style={[styles.bal, { color: colors.textTertiary }]}>{money(row.balance)}</Text>
      </View>
      {/* minWidth 2 en ambos: sin él, el último mes (interés casi cero) desaparece. */}
      <View style={styles.bar}>
        <View style={[styles.seg, { flex: Math.max(row.interest, 1), backgroundColor: intColor, minWidth: 2 }]} />
        <View style={[styles.seg, { flex: Math.max(row.principal, 1), backgroundColor: capColor, minWidth: 2 }]} />
      </View>
    </View>
  );

  return (
    <View>
      <View style={[styles.head, { borderBottomColor: ruleColor }]}>
        <Text style={[styles.hCell, styles.month, { color: colors.textTertiary }]}>{t('simulator.colMonth')}</Text>
        <Text style={[styles.hCell, styles.pay, { color: colors.textTertiary }]}>{t('simulator.colPayment')}</Text>
        <Text style={[styles.hCell, styles.bal, { color: colors.textTertiary }]}>{t('simulator.colBalance')}</Text>
      </View>

      {!grouped
        ? schedule.map((r) => <Row key={r.number} row={r} />)
        : groups.map((g) => {
          const isOpen = open.includes(g.year);
          return (
            <View key={g.year}>
              <TouchableOpacity
                onPress={() => toggle(g.year)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={`${g.year}, ${g.rows.length}, ${money(g.paid)}`}
                style={[styles.yearHead, { backgroundColor: colors.backgroundSecondary }]}
              >
                <Text style={[styles.year, { color: colors.textPrimary }]}>{g.year}</Text>
                <Text style={[styles.yearN, { color: colors.textSecondary }]}>
                  {t('simulator.yearCount', { n: g.rows.length })}
                </Text>
                <Text style={[styles.yearTotal, { color: colors.textPrimary }]}>{money(g.paid)}</Text>
                <AppIcon name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textTertiary} />
              </TouchableOpacity>

              {isOpen && (
                <>
                  {g.rows.map((r) => <Row key={r.number} row={r} indented />)}
                  <Text style={[styles.yearSub, { color: colors.textTertiary }]}>
                    {t('simulator.yearSummary', {
                      interest: money(g.interest),
                      balance: money(g.endBalance),
                    })}
                  </Text>
                </>
              )}
            </View>
          );
        })}

      <View style={styles.legend}>
        <View style={styles.lg}><View style={[styles.dot, { backgroundColor: intColor }]} /><Text style={[styles.lgText, { color: colors.textTertiary }]}>{t('simulator.legendInterest')}</Text></View>
        <View style={styles.lg}><View style={[styles.dot, { backgroundColor: capColor }]} /><Text style={[styles.lgText, { color: colors.textTertiary }]}>{t('simulator.legendPrincipal')}</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  hCell: { fontSize: 9.5, fontFamily: Fonts.bold, letterSpacing: 0.7, textTransform: 'uppercase' },
  row: { paddingTop: 8, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIndent: { paddingLeft: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline' },
  month: { width: 58, fontSize: 11.5, fontFamily: Fonts.mono },
  pay: { flex: 1, fontSize: 13, fontFamily: Fonts.monoBold, textAlign: 'right' },
  bal: { flex: 1, fontSize: 11.5, fontFamily: Fonts.mono, textAlign: 'right' },
  bar: { flexDirection: 'row', height: 2, borderRadius: 1, overflow: 'hidden', marginTop: 6 },
  seg: { height: 2 },
  yearHead: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, marginTop: 8 },
  year: { fontSize: 14, fontFamily: Fonts.bold },
  yearN: { flex: 1, fontSize: 11, fontFamily: Fonts.mono },
  yearTotal: { fontSize: 13, fontFamily: Fonts.monoBold },
  yearSub: { paddingLeft: 14, paddingTop: 8, paddingBottom: 4, fontSize: 10.5, fontFamily: Fonts.mono, lineHeight: 15 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 14 },
  lg: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 2 },
  lgText: { fontSize: 10.5, fontFamily: Fonts.medium },
});
