import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Svg, { Path, Line, Circle, Rect, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { mixHex, readableTint } from '../../utils/contrast';
import { Fonts } from '../../config/fonts';
import { formatMoney } from '../../utils/formatMoney';

/** Geometría del arco. Fijas: el medidor no debe cambiar de tamaño al recalcular. */
const W = 200, H = 112, CX = 100, CY = 100, R = 82;

function polar(pct: number): { x: number; y: number } {
  // 0 % a la izquierda, 100 % a la derecha, 180° de recorrido.
  const a = Math.PI * (1 - Math.min(Math.max(pct, 0), 100) / 100);
  return { x: CX + R * Math.cos(a), y: CY - R * Math.sin(a) };
}

function arc(from: number, to: number): string {
  const a = polar(from), b = polar(to);
  return `M${a.x.toFixed(1)},${a.y.toFixed(1)} A${R},${R} 0 0,1 ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
}

/**
 * Medidor de holgura — H2·2, con umbral movible.
 *
 * La frontera entre «cómodo» y «apretado» la fija el usuario, no la app: un
 * límite que uno mismo puso se respeta, y uno que la app inventó se ignora.
 *
 * Y el estado vacío —no tener ingreso registrado— deja de ser 180 px de cromo
 * sin dato: se convierte en la entrada del control, con un ingreso tecleable
 * solo para la simulación. Es coherente con que la pantalla ya declara que aquí
 * no se guarda nada.
 *
 * El veredicto va SIEMPRE en texto bajo el arco: con deuteranopía el verde y el
 * ámbar colapsan y el ángulo se queda como única señal.
 */
export default function HeadroomGauge({
  peakLoad, monthlyPayment, committed, typicalIncome, fixedExpenses, hasIncomeData, loading,
}: {
  peakLoad: number;
  monthlyPayment: number;
  committed: number;
  typicalIncome: number;
  fixedExpenses: number;
  hasIncomeData: boolean;
  loading: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const money = (n: number) => formatMoney(n, i18n.language);

  const [threshold, setThreshold] = useState(25);
  const [manualIncome, setManualIncome] = useState('');

  const typed = manualIncome ? parseInt(manualIncome, 10) : 0;
  const income = hasIncomeData ? typicalIncome : typed;
  const known = income > 0;

  // Acotado: sin tope la aguja se sale del arco cuando la carga supera el ingreso.
  const pctRaw = known ? (peakLoad / income) * 100 : 0;
  const pct = Math.min(pctRaw, 100);
  const before = known ? Math.min((committed / income) * 100, 100) : 0;
  const overflow = pctRaw > 100;
  const leftover = income - fixedExpenses - peakLoad;

  const ok = pctRaw <= threshold;
  const tone = leftover < 0 ? colors.error : ok ? colors.success : colors.warning;
  const toneBg = mixHex(colors.surface, tone, 0.12);
  const toneInk = readableTint(tone, toneBg, 4.5);

  const needle = polar(pct);
  const ghost = polar(before);
  const thumb = polar(threshold);

  if (loading) {
    return <Text style={[styles.hint, { color: colors.textTertiary }]}>···</Text>;
  }

  return (
    <View>
      <View style={styles.center}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <SvgGradient id="warm" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.warning} />
              <Stop offset="1" stopColor={colors.error} />
            </SvgGradient>
          </Defs>
          {/* Zona cómoda hasta el umbral, y de ahí al tope el degradado de aviso. */}
          <Path d={arc(0, Math.max(threshold - 1.5, 1))} stroke={colors.success} strokeWidth={14} fill="none" />
          <Path d={arc(Math.min(threshold + 1.5, 99), 100)} stroke="url(#warm)" strokeWidth={14} fill="none" />
          {/* Tirador del umbral. */}
          <Rect
            x={thumb.x - 3} y={thumb.y - 11} width={6} height={22} rx={3}
            fill={colors.textPrimary}
          />
          {known && (
            <>
              {/* Aguja fantasma: dónde estabas ANTES de esta compra. */}
              <Line x1={CX} y1={CY} x2={ghost.x} y2={ghost.y} stroke={colors.textTertiary} strokeWidth={3} strokeLinecap="round" opacity={0.45} />
              <Line x1={CX} y1={CY} x2={needle.x} y2={needle.y} stroke={colors.textPrimary} strokeWidth={3.5} strokeLinecap="round" />
              <Circle cx={CX} cy={CY} r={7} fill={colors.textPrimary} />
            </>
          )}
        </Svg>

        {known ? (
          <>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {`${overflow ? '+' : ''}${pctRaw.toFixed(0)} %`}
            </Text>
            <Text style={[styles.valueSub, { color: colors.textSecondary }]}>{t('simulator.gaugeOfIncome')}</Text>
          </>
        ) : (
          <Text style={[styles.valueSub, { color: colors.textSecondary, marginTop: 4 }]}>
            {t('simulator.gaugeNeedIncome')}
          </Text>
        )}
      </View>

      {/* El umbral es del usuario. Sin tirador arrastrable (no hay librería de
          gestos en el proyecto), pero sí ajustable y operable con teclado. */}
      <View style={styles.thRow}>
        <Text style={[styles.thLabel, { color: colors.textSecondary }]}>
          {t('simulator.gaugeThreshold')}
        </Text>
        <View style={styles.thCtrl}>
          <TouchableOpacity
            onPress={() => setThreshold((v) => Math.max(10, v - 5))}
            style={[styles.thBtn, { borderColor: colors.border }]}
            accessibilityRole="button" accessibilityLabel="-5%"
          >
            <Text style={[styles.thBtnText, { color: colors.textPrimary }]}>−</Text>
          </TouchableOpacity>
          <Text style={[styles.thValue, { color: colors.textPrimary }]}>{`${threshold} %`}</Text>
          <TouchableOpacity
            onPress={() => setThreshold((v) => Math.min(60, v + 5))}
            style={[styles.thBtn, { borderColor: colors.border }]}
            accessibilityRole="button" accessibilityLabel="+5%"
          >
            <Text style={[styles.thBtnText, { color: colors.textPrimary }]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!hasIncomeData && (
        <View style={styles.incRow}>
          <Text style={[styles.thLabel, { color: colors.textSecondary }]}>{t('simulator.gaugeIncome')}</Text>
          <TextInput
            style={[styles.incField, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.textPrimary }]}
            keyboardType="numeric"
            value={manualIncome ? `$${manualIncome.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}` : ''}
            onChangeText={(v) => setManualIncome(v.replace(/\D/g, '').slice(0, 10))}
            placeholder="$0"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel={t('simulator.gaugeIncome')}
          />
        </View>
      )}

      {known && (
        <View style={[styles.verdict, { backgroundColor: toneBg, borderColor: tone + '55' }]}>
          <Text style={[styles.vTitle, { color: toneInk }]}>
            {leftover < 0
              ? t('simulator.verdictOverflow')
              : ok ? t('simulator.verdictComfortable') : t('simulator.verdictTight')}
          </Text>
          <Text style={[styles.vBody, { color: colors.textSecondary }]}>
            {t('simulator.gaugeBefore', { before: before.toFixed(0), after: pctRaw.toFixed(0) })}
          </Text>
          <Text style={[styles.vBody, { color: colors.textSecondary }]}>
            {leftover >= 0
              ? t('simulator.gaugeLeftover', { amount: money(leftover) })
              : t('simulator.gaugeShort', { amount: money(Math.abs(leftover)) })}
          </Text>
          <Text style={[styles.vBody, { color: colors.textSecondary }]}>
            {t('simulator.gaugeBreakdown', { committed: money(committed), added: money(monthlyPayment) })}
          </Text>
        </View>
      )}

      <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>{t('simulator.disclaimer')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  hint: { fontSize: 12, fontFamily: Fonts.regular },
  value: { fontSize: 27, fontFamily: Fonts.extraBold, marginTop: -8 },
  valueSub: { fontSize: 11, fontFamily: Fonts.medium },
  thRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, gap: 10 },
  thLabel: { flex: 1, fontSize: 12, fontFamily: Fonts.medium },
  thCtrl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thBtn: { width: 32, height: 32, borderRadius: 50, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  thBtnText: { fontSize: 16, fontFamily: Fonts.bold },
  thValue: { minWidth: 44, textAlign: 'center', fontSize: 13, fontFamily: Fonts.monoBold },
  incRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 10 },
  incField: { width: 140, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, fontFamily: Fonts.monoBold, textAlign: 'right' },
  verdict: { borderRadius: 16, borderWidth: 1, padding: 13, marginTop: 16, gap: 3 },
  vTitle: { fontSize: 14, fontFamily: Fonts.bold, marginBottom: 2 },
  vBody: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 17 },
  disclaimer: { fontSize: 11, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 14, lineHeight: 16 },
});
