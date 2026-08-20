import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';
import { formatMoney } from '../../utils/formatMoney';
import type { ScenarioRow } from '../../utils/simulator';

/**
 * Comparación de plazos — G2·1, barras horizontales con delta.
 *
 * Escala común a los seis plazos y línea base vertical en el precio de contado:
 * sin esa referencia, «12 contra 24» es decoración. Al final de cada fila, el
 * doble delta contra el plazo elegido — cuánto se ahorra AL MES contra cuánto se
 * paga de más AL FINAL, que es la única pregunta que se hace quien compara.
 *
 * Vertical no cabe: seis columnas de 46 px no admiten una etiqueta monetaria de
 * 86 px debajo.
 */
export default function TermCompare({
  rows, current, onPick, cashPrice, hasInterest,
}: {
  rows: ScenarioRow[];
  current: number;
  onPick: (n: number) => void;
  cashPrice: number;
  hasInterest: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const money = (n: number) => formatMoney(n, i18n.language);

  const mine = rows.find((r) => r.installments === current);

  // Seis barras idénticas se leen como app rota. Si no hay interés, no hay
  // gráfico que pintar: hay una frase.
  if (!hasInterest) {
    return (
      <View>
        <Text style={[styles.hint, { color: colors.textTertiary }]}>{t('simulator.compareHint')}</Text>
        <View style={[styles.flat, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <Text style={[styles.flatTitle, { color: colors.textPrimary }]}>{t('simulator.compareNoInterest')}</Text>
          {rows.map((r) => (
            <View key={r.installments} style={styles.flatRow}>
              <Text style={[styles.flatN, { color: colors.textSecondary }]}>
                {t('simulator.termValue', { n: r.installments })}
              </Text>
              <Text style={[styles.flatV, { color: colors.textPrimary }]}>{money(r.monthlyPayment)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const maxTotal = Math.max(...rows.map((r) => r.totalPaid), cashPrice);

  return (
    <View>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>{t('simulator.compareHint')}</Text>

      <View style={styles.chart}>
        {rows.map((r) => {
          const isCurrent = r.installments === current;
          const dMonthly = mine ? r.monthlyPayment - mine.monthlyPayment : 0;
          const dTotal = mine ? r.totalPaid - mine.totalPaid : 0;
          return (
            <TouchableOpacity
              key={r.installments}
              onPress={() => onPick(r.installments)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: isCurrent }}
              accessibilityLabel={`${r.installments} · ${money(r.monthlyPayment)} · ${money(r.totalPaid)}`}
              style={styles.row}
            >
              <View style={styles.termCol}>
                <Text style={[styles.termN, { color: isCurrent ? colors.primary : colors.textPrimary }]}>
                  {r.installments}
                </Text>
                <Text style={[styles.termU, { color: colors.textTertiary }]}>
                  {r.installments === 1 ? t('simulator.installmentSingle') : t('simulator.installmentsPlural')}
                </Text>
              </View>

              <View style={[styles.track, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={[styles.fillCap, { backgroundColor: colors.primary, width: `${(cashPrice / maxTotal) * 100}%` as any }]} />
                {r.creditCost > 0 && (
                  <View style={[styles.fillInt, { backgroundColor: colors.error, width: `${Math.max((r.creditCost / maxTotal) * 100, 1.2)}%` as any }]} />
                )}
              </View>

              <View style={styles.deltaCol}>
                {isCurrent ? (
                  <Text style={[styles.deltaMine, { color: colors.primary }]}>{t('simulator.compareCurrent')}</Text>
                ) : (
                  <>
                    <Text style={[styles.deltaM, { color: colors.textPrimary }]}>
                      {`${dMonthly > 0 ? '+' : ''}${money(dMonthly)}`}
                    </Text>
                    <Text style={[styles.deltaT, { color: dTotal > 0 ? colors.error : colors.success }]}>
                      {`${dTotal > 0 ? '+' : ''}${money(dTotal)} ${t('simulator.deltaFinal')}`}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        {/* Línea base del contado, encima de las barras.
            Va en una capa que calca EXACTAMENTE la geometría del carril
            (50 de plazo + 9 de hueco a la izquierda; 108 + 9 a la derecha).
            Un `left: %` sobre el contenedor entero caería desplazado, porque el
            porcentaje se mediría contra la fila completa y no contra la barra. */}
        <View pointerEvents="none" style={styles.baselineLayer}>
          <View style={[styles.baseline, { left: `${(cashPrice / maxTotal) * 100}%` as any, backgroundColor: colors.textTertiary }]} />
        </View>
      </View>

      <Text style={[styles.hint, { color: colors.textTertiary }]}>
        {t('simulator.compareBaseline', { amount: money(cashPrice) })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 11.5, fontFamily: Fonts.regular, lineHeight: 16, marginBottom: 12 },
  // La línea base se ancla al carril, no a la fila: por eso el carril vive en
  // una capa con posición propia.
  chart: { position: 'relative' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 6 },
  termCol: { width: 50 },
  termN: { fontSize: 14, fontFamily: Fonts.monoBold },
  termU: { fontSize: 8.5, fontFamily: Fonts.medium },
  track: { flex: 1, minWidth: 60, height: 14, borderRadius: 7, flexDirection: 'row', overflow: 'hidden' },
  fillCap: { height: 14 },
  fillInt: { height: 14, minWidth: 3 },
  deltaCol: { width: 108, alignItems: 'flex-end' },
  deltaMine: { fontSize: 11, fontFamily: Fonts.bold },
  deltaM: { fontSize: 11, fontFamily: Fonts.monoBold },
  deltaT: { fontSize: 9.5, fontFamily: Fonts.mono, marginTop: 1 },
  baselineLayer: { position: 'absolute', left: 59, right: 117, top: 4, bottom: 4 },
  baseline: { position: 'absolute', top: 0, bottom: 0, width: 1, opacity: 0.55 },
  flat: { borderRadius: 14, borderWidth: 1, padding: 14 },
  flatTitle: { fontSize: 13, fontFamily: Fonts.bold, marginBottom: 10 },
  flatRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  flatN: { fontSize: 12, fontFamily: Fonts.medium },
  flatV: { fontSize: 12.5, fontFamily: Fonts.monoBold },
});
