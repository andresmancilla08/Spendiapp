import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useState, useEffect, useRef, type ReactNode } from 'react';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import AppIcon from './AppIcon';
import ProSheen from './ProSheen';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';

const HIDDEN_MASK = '••••••';

interface MonthNav {
  year: number;
  month: number;
  months: string[];
  minYear: number;
  maxYear: number;
  onChange: (year: number, month: number) => void;
}

interface BalanceCardProps {
  displayBalance: number;
  totalIncome: number;
  totalExpenses: number;
  formatCurrency: (amount: number) => string;
  balanceLabel: string;
  incomeLabel: string;
  expensesLabel: string;
  hidden?: boolean;
  onToggleHidden?: () => void;
  footer?: ReactNode;
  monthNav?: MonthNav;
  loading?: boolean;
  /** Tratamiento premium: layout con sparkline + detalle colapsable + elevación neutra. */
  pro?: boolean;
  /** Premium: variación % vs mes anterior. null = sin dato (mes anterior vacío). */
  netFlow?: { incomePct: number | null; expensePct: number | null };
  /** Premium: serie de balance (6 meses) para la mini-tendencia del hero. */
  sparkline?: number[];
  /** Premium: etiqueta del toggle de detalle (i18n). */
  detailsToggleLabel?: string;
}

/**
 * Curva monótona (Fritsch-Carlson, la misma interpolación "monotoneX" que usan
 * D3/Victory/Recharts): pasa por todos los puntos con curvas suaves, sin el
 * efecto "rebote" de un Catmull-Rom simple cuando hay un tramo plano seguido
 * de una subida/bajada — importante en datos financieros para no insinuar
 * una variación que no ocurrió.
 */
function monotonePath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n < 2) return '';
  if (n === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    slope[i] = (pts[i + 1].y - pts[i].y) / dx[i];
  }

  const m: number[] = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) {
      m[i] = 0;
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      m[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
    }
  }

  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = pts[i].x + dx[i] / 3;
    const c1y = pts[i].y + (m[i] * dx[i]) / 3;
    const c2x = pts[i + 1].x - dx[i] / 3;
    const c2y = pts[i + 1].y - (m[i + 1] * dx[i]) / 3;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${pts[i + 1].x.toFixed(2)},${pts[i + 1].y.toFixed(2)}`;
  }
  return d;
}

/** Mini-tendencia (área + línea). Se estira al ancho del contenedor. */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length < 2) return null;
  const W = 100, H = 36, P = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: P + (1 - (v - min) / span) * (H - 2 * P),
  }));
  const line = monotonePath(pts);
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <Svg width="100%" height={56} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Defs>
        <SvgGradient id="spk" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.26} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      <Path d={area} fill="url(#spk)" />
      <Path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </Svg>
  );
}

export default function BalanceCard({
  displayBalance,
  totalIncome,
  totalExpenses,
  formatCurrency,
  balanceLabel,
  incomeLabel,
  expensesLabel,
  hidden = false,
  onToggleHidden,
  footer,
  monthNav,
  loading = false,
  pro = false,
  netFlow,
  sparkline,
  detailsToggleLabel,
}: BalanceCardProps) {
  const { colors, isDark } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Detalle colapsable (premium): contraído por defecto.
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailH, setDetailH] = useState(0);
  const collapse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(collapse, {
      toValue: detailOpen ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [detailOpen, collapse]);

  const canGoPrev = monthNav
    ? !(monthNav.year <= monthNav.minYear && monthNav.month === 0)
    : false;
  const canGoNext = monthNav
    ? !(monthNav.year >= monthNav.maxYear && monthNav.month === 11)
    : false;

  const goPrev = () => {
    if (!monthNav || !canGoPrev) return;
    if (monthNav.month === 0) monthNav.onChange(monthNav.year - 1, 11);
    else monthNav.onChange(monthNav.year, monthNav.month - 1);
  };
  const goNext = () => {
    if (!monthNav || !canGoNext) return;
    if (monthNav.month === 11) monthNav.onChange(monthNav.year + 1, 0);
    else monthNav.onChange(monthNav.year, monthNav.month + 1);
  };

  const expenseRatio = totalIncome > 0 ? Math.min(totalExpenses / totalIncome, 1) : 0;
  const incomeRatio = 1 - expenseRatio;
  const isPositive = displayBalance >= 0;

  // ===== Bloques reutilizables =====
  const renderMonthNavRow = (compact: boolean) => (
    <View style={styles.monthNavRow}>
      <TouchableOpacity onPress={goPrev} disabled={!canGoPrev} style={styles.monthNavBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
        <AppIcon name="chevron-back" size={18} color={canGoPrev ? colors.primary : colors.border} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setPickerOpen((v) => !v)} style={styles.monthNavLabelBtn} hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }} activeOpacity={0.7}>
        <Text style={[styles.monthNavLabel, { color: colors.primary }]}>
          {monthNav!.months[monthNav!.month].toUpperCase()} {monthNav!.year}
        </Text>
        <AppIcon name={pickerOpen ? 'chevron-up' : 'chevron-down'} size={13} color={colors.primary} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
      <TouchableOpacity onPress={goNext} disabled={!canGoNext} style={styles.monthNavBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
        <AppIcon name="chevron-forward" size={18} color={canGoNext ? colors.primary : colors.border} />
      </TouchableOpacity>
    </View>
  );

  const renderPicker = () => pickerOpen && monthNav && (
    <View style={[styles.pickerWrap, { borderColor: isDark ? colors.primary + '25' : colors.border }]}>
      <View style={styles.pickerYearRow}>
        <TouchableOpacity onPress={() => monthNav.onChange(Math.max(monthNav.minYear, monthNav.year - 1), monthNav.month)} disabled={monthNav.year <= monthNav.minYear} style={styles.pickerNavBtn} activeOpacity={0.7}>
          <AppIcon name="chevron-back" size={18} color={monthNav.year <= monthNav.minYear ? colors.border : colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.pickerYearLabel, { color: colors.textPrimary }]}>{monthNav.year}</Text>
        <TouchableOpacity onPress={() => monthNav.onChange(Math.min(monthNav.maxYear, monthNav.year + 1), monthNav.month)} disabled={monthNav.year >= monthNav.maxYear} style={styles.pickerNavBtn} activeOpacity={0.7}>
          <AppIcon name="chevron-forward" size={18} color={monthNav.year >= monthNav.maxYear ? colors.border : colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={styles.monthGrid}>
        {monthNav.months.map((name, idx) => {
          const isSelected = idx === monthNav.month;
          return (
            <TouchableOpacity key={idx} style={[styles.monthChip, { backgroundColor: isSelected ? colors.primary : (isDark ? colors.primary + '12' : colors.primaryLight) }]} onPress={() => { monthNav.onChange(monthNav.year, idx); setPickerOpen(false); }} activeOpacity={0.8}>
              <Text style={[styles.monthChipText, { color: isSelected ? colors.onPrimary : colors.textPrimary }]}>{name.slice(0, 3)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderAmount = (proStyle: boolean) => loading ? (
    <View style={[styles.amountLoader, proStyle && { minHeight: 56 }]}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  ) : (
    <Text
      style={[
        styles.balanceAmount,
        proStyle && styles.balanceAmountPro,
        {
          color: hidden ? colors.textTertiary : isPositive ? colors.primary : colors.expense,
          letterSpacing: hidden ? 4 : proStyle ? -1 : -0.5,
        },
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.6}
    >
      {hidden ? HIDDEN_MASK : formatCurrency(displayBalance)}
    </Text>
  );

  const renderNetFlow = () => netFlow && !loading && !hidden && (netFlow.incomePct !== null || netFlow.expensePct !== null) && (
    <View style={styles.netFlowRow}>
      {netFlow.incomePct !== null && (
        <View style={[styles.flowChip, { backgroundColor: (netFlow.incomePct >= 0 ? colors.success : colors.expense) + '20' }]}>
          <AppIcon name={netFlow.incomePct >= 0 ? 'arrow-up' : 'arrow-down'} size={11} color={netFlow.incomePct >= 0 ? colors.success : colors.expense} />
          <Text style={[styles.flowChipText, { color: netFlow.incomePct >= 0 ? colors.success : colors.expense }]}>{Math.abs(netFlow.incomePct)}% {incomeLabel.toLowerCase()}</Text>
        </View>
      )}
      {netFlow.expensePct !== null && (
        <View style={[styles.flowChip, { backgroundColor: (netFlow.expensePct <= 0 ? colors.success : colors.expense) + '20' }]}>
          <AppIcon name={netFlow.expensePct <= 0 ? 'arrow-down' : 'arrow-up'} size={11} color={netFlow.expensePct <= 0 ? colors.success : colors.expense} />
          <Text style={[styles.flowChipText, { color: netFlow.expensePct <= 0 ? colors.success : colors.expense }]}>{Math.abs(netFlow.expensePct)}% {expensesLabel.toLowerCase()}</Text>
        </View>
      )}
    </View>
  );

  const renderStats = (topBorder: boolean) => (
    <View
      style={[
        styles.statsRow,
        !topBorder && { borderTopWidth: 0 },
        { borderTopColor: isDark ? colors.primary + '20' : colors.border },
      ]}
    >
      <View style={styles.statCol}>
        <View style={styles.statLabelRow}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.success + '20' }]}>
            <AppIcon name="arrow-down" size={11} color={colors.success} />
          </View>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{incomeLabel}</Text>
        </View>
        <Text style={[styles.statValue, { color: hidden ? colors.textTertiary : colors.success, letterSpacing: hidden ? 3 : -0.4 }]}>
          {loading ? '—' : hidden ? HIDDEN_MASK : formatCurrency(totalIncome)}
        </Text>
      </View>
      <View style={[styles.vertSep, { backgroundColor: isDark ? colors.primary + '30' : colors.border }]} />
      <View style={styles.statCol}>
        <View style={styles.statLabelRow}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.expense + '20' }]}>
            <AppIcon name="arrow-up" size={11} color={colors.expense} />
          </View>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{expensesLabel}</Text>
        </View>
        <Text style={[styles.statValue, { color: hidden ? colors.textTertiary : colors.expense, letterSpacing: hidden ? 3 : -0.4 }]}>
          {loading ? '—' : hidden ? HIDDEN_MASK : formatCurrency(totalExpenses)}
        </Text>
      </View>
    </View>
  );

  const renderFooter = (topBorder: boolean) => footer && (
    <View style={[styles.footerRow, topBorder && { borderTopWidth: 1, borderTopColor: isDark ? colors.primary + '20' : colors.border }]}>
      {footer}
    </View>
  );

  const eyeBtn = onToggleHidden && (
    <TouchableOpacity onPress={onToggleHidden} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" style={styles.eyeBtnPrem}>
      <AppIcon name={hidden ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: pro ? (isDark ? colors.primary + '22' : colors.border) : colors.primary + '2E',
          ...(Platform.OS !== 'web' && {
            shadowColor: pro ? (isDark ? '#000000' : '#10282E') : (isDark ? colors.primary : '#000000'),
            shadowOffset: { width: 0, height: pro ? 16 : 4 },
            shadowOpacity: pro ? (isDark ? 0.5 : 0.16) : (isDark ? 0.40 : 0.07),
            shadowRadius: pro ? (isDark ? 34 : 26) : (isDark ? 24 : 8),
            elevation: pro ? 14 : (isDark ? 12 : 4),
          }),
          ...(Platform.OS === 'web' && {
            boxShadow: pro
              ? (isDark ? '0 18px 36px -16px rgba(0,0,0,0.6)' : '0 16px 30px -14px rgba(16,40,46,0.20)')
              : (isDark ? `0 8px 32px 0 ${colors.primary}38` : '0 4px 12px 0 rgba(0,0,0,0.08)'),
          } as any),
        },
      ]}
    >
      {pro && (
        <ProSheen trigger={`${displayBalance}-${loading}`} color={isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,160,180,0.12)'} />
      )}

      <View
        style={[styles.innerHighlight, { borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.55)' }]}
        pointerEvents="none"
      />
      <View style={[styles.accentBlob, { backgroundColor: isDark ? colors.primary + '18' : colors.primaryLight }]} pointerEvents="none" />
      <View style={[styles.accentBlobSecondary, { backgroundColor: isDark ? colors.primary + '10' : colors.primaryLight }]} pointerEvents="none" />
      <View style={[styles.topAccentBar, { backgroundColor: colors.primary }]} pointerEvents="none" />

      {pro ? (
        /* ============ PREMIUM ============ */
        <>
          {/* Top: navegación de mes + ojo */}
          {monthNav && (
            <View style={styles.premTopRow}>
              <View style={styles.premTopSide} />
              <View style={styles.premMonthNavWrap}>{renderMonthNavRow(true)}</View>
              <View style={styles.premTopSide}>{eyeBtn}</View>
            </View>
          )}
          {renderPicker()}

          <Text style={[styles.premLabel, { color: colors.textTertiary }]}>{balanceLabel}</Text>
          {renderAmount(true)}
          {renderNetFlow()}

          {/* Mini-tendencia (sparkline) */}
          {!hidden && !loading && sparkline && sparkline.length >= 2 && (
            <View style={styles.sparkWrap}>
              <Sparkline values={sparkline} color={colors.primary} />
            </View>
          )}

          {/* Detalle colapsable: ingresos/gastos + FX */}
          <TouchableOpacity
            onPress={() => setDetailOpen((o) => !o)}
            style={[styles.detailToggle, { borderTopColor: isDark ? colors.primary + '20' : colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.detailToggleText, { color: colors.textSecondary }]}>
              {detailsToggleLabel ?? `${incomeLabel} / ${expensesLabel}`}
            </Text>
            <AppIcon name={detailOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <Animated.View style={{ height: collapse.interpolate({ inputRange: [0, 1], outputRange: [0, detailH] }), overflow: 'hidden' }}>
            <View onLayout={(e) => { const h = e.nativeEvent.layout.height; if (h && Math.abs(h - detailH) > 1) setDetailH(h); }}>
              {renderStats(false)}
              {renderFooter(true)}
            </View>
          </Animated.View>
        </>
      ) : (
        /* ============ FREE (original) ============ */
        <>
          <View style={styles.labelRow}>
            <Text style={[styles.balanceLabel, { color: colors.textTertiary }]}>{balanceLabel}</Text>
            <View style={styles.labelRowRight}>
              <View style={[styles.healthRing, { borderColor: isPositive ? colors.success + '50' : colors.expense + '50' }]}>
                <View style={[styles.healthDot, { backgroundColor: isPositive ? colors.success : colors.expense }]} />
              </View>
              {onToggleHidden && (
                <TouchableOpacity onPress={onToggleHidden} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" style={styles.eyeBtn}>
                  <AppIcon name={hidden ? 'eye-off-outline' : 'eye-outline'} size={15} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {renderAmount(false)}

          {totalIncome > 0 && !hidden && !loading && (
            <View style={styles.progressWrap}>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.progressIncome, { flex: incomeRatio, backgroundColor: colors.success, opacity: 0.85 }]} />
                {expenseRatio > 0 && (
                  <View style={[styles.progressExpense, { flex: expenseRatio, backgroundColor: colors.expense, opacity: 0.85 }]} />
                )}
              </View>
              <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>{Math.round(expenseRatio * 100)}%</Text>
            </View>
          )}

          {renderStats(true)}
          {renderFooter(true)}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1.5,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 0,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  innerHighlight: { position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderRadius: 27, borderWidth: 1 },
  topAccentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, opacity: 0.85 },
  accentBlob: { position: 'absolute', width: 140, height: 140, borderRadius: 70, top: -50, right: -38, opacity: 0.45 },
  accentBlobSecondary: { position: 'absolute', width: 80, height: 80, borderRadius: 40, bottom: -28, left: -22, opacity: 0.20 },

  // Premium top row (month nav + eye)
  premTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  premTopSide: { width: 34, alignItems: 'flex-end', justifyContent: 'center' },
  premMonthNavWrap: { flex: 1 },
  eyeBtnPrem: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  premLabel: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1.6, textTransform: 'uppercase', textAlign: 'center', marginBottom: 6 },
  sparkWrap: { marginHorizontal: -24, marginTop: 2 },
  detailToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, marginHorizontal: -24, borderTopWidth: 1 },
  detailToggleText: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 0.6, textTransform: 'uppercase' },

  monthNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  monthNavBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  monthNavLabelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 150, paddingVertical: 4 },
  monthNavLabel: { fontSize: 13, fontFamily: Fonts.bold, letterSpacing: 0.6 },
  pickerWrap: { borderTopWidth: 1, paddingTop: 14, marginBottom: 14 },
  pickerYearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 12 },
  pickerNavBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pickerYearLabel: { fontSize: 15, fontFamily: Fonts.bold, minWidth: 54, textAlign: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  monthChip: { width: '23%', paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  monthChipText: { fontSize: 12, fontFamily: Fonts.semiBold },

  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8, marginTop: 4 },
  labelRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balanceLabel: { fontSize: 11, fontFamily: Fonts.semiBold, letterSpacing: 1.2, textTransform: 'uppercase' },
  eyeBtn: { padding: 2 },
  healthRing: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  healthDot: { width: 6, height: 6, borderRadius: 3 },

  balanceAmount: { fontSize: 40, fontFamily: Fonts.extraBold, marginBottom: 16, includeFontPadding: false, minHeight: 52, textAlign: 'center' },
  balanceAmountPro: { fontSize: 44, fontVariant: ['tabular-nums'] },
  amountLoader: { minHeight: 52, marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
  netFlowRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 14, marginTop: -4 },
  flowChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  flowChipText: { fontSize: 11, fontFamily: Fonts.bold },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  progressTrack: { flex: 1, height: 5, borderRadius: 3, flexDirection: 'row', overflow: 'hidden' },
  progressIncome: { height: 5, borderRadius: 3 },
  progressExpense: { height: 5, borderRadius: 3 },
  progressLabel: { fontSize: 11, fontFamily: Fonts.semiBold, minWidth: 32, textAlign: 'right' },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: -24, paddingHorizontal: 24, paddingVertical: 14, borderTopWidth: 1 },
  statCol: { flex: 1, gap: 5, alignItems: 'center' },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  statIconWrap: { width: 20, height: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 10, fontFamily: Fonts.semiBold, letterSpacing: 0.8, textTransform: 'uppercase' },
  statValue: { fontSize: 14, fontFamily: Fonts.bold, includeFontPadding: false },
  vertSep: { width: 1, height: 38, marginHorizontal: 16 },
  footerRow: { marginHorizontal: -24 },
});
