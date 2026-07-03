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
import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import AppIcon from './AppIcon';
import { useTheme, type ChartType, type ChartAnimStyle, type ChartAccent } from '../context/ThemeContext';
import { useProMotion } from '../hooks/useProMotion';
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

/** Construye los segmentos cúbicos monótonos (mismas curvas que monotonePath). */
function buildMonotoneSegments(pts: { x: number; y: number }[]) {
  const n = pts.length;
  if (n < 2) return [];
  if (n === 2) return [{ p0: pts[0], c1: pts[0], c2: pts[1], p1: pts[1] }];

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
    if (slope[i - 1] * slope[i] <= 0) m[i] = 0;
    else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      m[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
    }
  }
  const segs = [];
  for (let i = 0; i < n - 1; i++) {
    const c1x = pts[i].x + dx[i] / 3;
    const c1y = pts[i].y + (m[i] * dx[i]) / 3;
    const c2x = pts[i + 1].x - dx[i] / 3;
    const c2y = pts[i + 1].y - (m[i + 1] * dx[i]) / 3;
    segs.push({ p0: pts[i], c1: { x: c1x, y: c1y }, c2: { x: c2x, y: c2y }, p1: pts[i + 1] });
  }
  return segs;
}

function cubicAt(seg: ReturnType<typeof buildMonotoneSegments>[number], t: number) {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * seg.p0.x + 3 * mt * mt * t * seg.c1.x + 3 * mt * t * t * seg.c2.x + t * t * t * seg.p1.x,
    y: mt * mt * mt * seg.p0.y + 3 * mt * mt * t * seg.c1.y + 3 * mt * t * t * seg.c2.y + t * t * t * seg.p1.y,
  };
}

/** Muestrea N puntos a lo largo de la misma curva que dibuja la línea — para animar un punto sobre ella. */
function sampleCurve(pts: { x: number; y: number }[], totalSamples: number) {
  const segs = buildMonotoneSegments(pts);
  if (!segs.length) return pts;
  const S = segs.length;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < totalSamples; i++) {
    const g = (i / (totalSamples - 1)) * S;
    const segIndex = Math.min(S - 1, Math.floor(g));
    out.push(cubicAt(segs[segIndex], g - segIndex));
  }
  return out;
}

const CHART_GOLD_ACCENT = '#F5C542';

/** Resuelve el color de acento del gráfico según la preferencia del usuario. */
export function resolveChartAccent(accent: ChartAccent, colors: { primary: string; success: string; expense: string }, values: number[]): string {
  if (accent === 'success') return colors.success;
  if (accent === 'gold') return CHART_GOLD_ACCENT;
  if (accent === 'signed') {
    if (values.length >= 2 && values[values.length - 1] < values[0]) return colors.expense;
    return colors.success;
  }
  return colors.primary;
}

/** Gráfico de barras (chartType='bars'): Views nativas — nunca sufre la deformación del viewBox del SVG. */
function BarsChart({ values, color, height, animate }: { values: number[]; color: string; height: number; animate: boolean }) {
  const growAnim = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const [t, setT] = useState(animate ? 0 : 1);

  const { targets } = useMemo(() => {
    const max = Math.max(...values, 1);
    const min = Math.min(0, ...values);
    const span = max - min || 1;
    return { targets: values.map((v) => 6 + ((v - min) / span) * (height - 10)) };
  }, [values, height]);

  useEffect(() => {
    if (!animate) { setT(1); return; }
    setT(0);
    growAnim.setValue(0);
    const id = growAnim.addListener(({ value: v }) => setT(v));
    Animated.timing(growAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => growAnim.removeListener(id);
  }, [animate, growAnim, values]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height, paddingHorizontal: 2 }}>
      {values.map((v, i) => {
        const isLast = i === values.length - 1;
        return (
          <View
            key={i}
            style={{
              width: `${Math.min(90 / values.length, 13)}%`,
              height: Math.max(targets[i] * t, 3),
              borderRadius: 5,
              backgroundColor: isLast ? '#FFFFFF' : color,
              opacity: isLast ? 1 : 0.82,
            }}
          />
        );
      })}
    </View>
  );
}

interface SparklineProps {
  values: number[];
  color: string;
  accent?: string;
  height?: number;
  animate?: boolean;
  duration?: number;
  chartType?: ChartType;
  animStyle?: ChartAnimStyle;
}

/**
 * Mini-tendencia estilo "Aurora Ledger": la tendencia es paisaje. Soporta 4
 * tipos (línea/barras/área/puntos) × 4 animaciones (pulso/trazo vivo/marea/
 * ninguna) — elegibles en Personalización. Respeta reduce-motion
 * (animate=false → siempre estático, cualquiera sea el estilo).
 */
export function Sparkline({ values, color, accent, height = 56, animate = true, duration = 6500, chartType = 'line', animStyle = 'pulse' }: SparklineProps) {
  const W = 100, H = 36, P = 4;
  const [boxW, setBoxW] = useState(0);
  const stroke = accent ?? color;

  const pts = useMemo(() => {
    if (!values || values.length < 2) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return values.map((v, i) => ({
      x: (i / (values.length - 1)) * W,
      y: P + (1 - (v - min) / span) * (H - 2 * P),
    }));
  }, [values]);

  const samples = useMemo(() => (pts.length >= 2 ? sampleCurve(pts, 40) : []), [pts]);
  const approxLen = useMemo(() => {
    let len = 0;
    for (let i = 1; i < samples.length; i++) len += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y);
    return len;
  }, [samples]);

  // ── Pulso: cometa nativo (View, no SVG — evita el óvalo y el warning de RN Web) ──
  const pulseActive = animate && animStyle === 'pulse' && chartType !== 'bars';
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!pulseActive || samples.length < 2) return;
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseActive, samples, progress, duration]);

  // ── Trazo vivo: revela el trazo (o el área, si no hay línea) en bucle + halo al final ──
  const drawActive = animate && animStyle === 'draw' && chartType !== 'bars';
  const drawAnim = useRef(new Animated.Value(0)).current;
  const drawHalo = useRef(new Animated.Value(0)).current;
  const [drawT, setDrawT] = useState(1);
  useEffect(() => {
    if (!drawActive) { setDrawT(1); return; }
    setDrawT(0);
    drawAnim.setValue(0);
    const id = drawAnim.addListener(({ value: v }) => setDrawT(v));
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drawAnim, { toValue: 1, duration: Math.max(1100, duration * 0.35), easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.delay(Math.max(900, duration * 0.35)),
        Animated.timing(drawAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    );
    const haloLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drawHalo, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(drawHalo, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    loop.start();
    haloLoop.start();
    return () => { loop.stop(); haloLoop.stop(); drawAnim.removeListener(id); };
  }, [drawActive, drawAnim, drawHalo, duration]);

  // ── Marea: el área y la línea respiran juntas, sin desplazamiento ──
  const tideActive = animate && animStyle === 'tide' && chartType !== 'bars';
  const tideAnim = useRef(new Animated.Value(0)).current;
  const [tideT, setTideT] = useState(0);
  useEffect(() => {
    if (!tideActive) { setTideT(0); return; }
    tideAnim.setValue(0);
    const id = tideAnim.addListener(({ value: v }) => setTideT(v));
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(tideAnim, { toValue: 1, duration: Math.max(1400, duration * 0.4), easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(tideAnim, { toValue: 0, duration: Math.max(1400, duration * 0.4), easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => { loop.stop(); tideAnim.removeListener(id); };
  }, [tideActive, tideAnim, duration]);

  if (chartType === 'bars') {
    return <BarsChart values={values} color={stroke} height={height} animate={animate && animStyle !== 'none'} />;
  }
  if (pts.length < 2) return null;

  const line = monotonePath(pts);
  const area = `${line} L${W},${H} L0,${H} Z`;
  const showLine = chartType !== 'area';
  const showDots = chartType === 'dots';
  const end = samples.length ? samples[samples.length - 1] : pts[pts.length - 1];

  const areaOpacity = tideActive ? 0.55 + tideT * 0.65 : (drawActive && chartType === 'area') ? 0.2 + drawT * 0.8 : 1;
  const glowOpacity = (tideActive ? 0.12 + tideT * 0.14 : 0.2) * (showDots ? 0.55 : 1);
  const lineOpacity = showDots ? 0.5 : 1;

  // El punto animado (pulso) y el halo de "trazo vivo" viven FUERA del SVG,
  // como Views nativas: el viewBox usa preserveAspectRatio="none" (deforma X e
  // Y por separado), así que un círculo DENTRO del SVG saldría ovalado.
  const inputRange = samples.length ? samples.map((_, i) => i / (samples.length - 1)) : [0, 1];
  const cometLeft = progress.interpolate({ inputRange, outputRange: samples.length ? samples.map((p) => (p.x / W) * boxW) : [0, 0] });
  const cometTop = progress.interpolate({ inputRange, outputRange: samples.length ? samples.map((p) => (p.y / H) * height) : [0, 0] });
  const glowShadow = Platform.OS === 'web' ? ({ boxShadow: `0 0 10px ${stroke}` } as any) : { shadowColor: stroke, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } };
  const cometCenter = (size: number) => ({ left: Animated.subtract(cometLeft, size / 2), top: Animated.subtract(cometTop, size / 2) });

  return (
    <View style={{ width: '100%', height }} onLayout={(e) => setBoxW(e.nativeEvent.layout.width)}>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <SvgGradient id="spk" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stroke} stopOpacity={chartType === 'area' ? 0.4 : 0.18} />
            <Stop offset="0.75" stopColor={stroke} stopOpacity={chartType === 'area' ? 0.1 : 0.03} />
            <Stop offset="1" stopColor={stroke} stopOpacity={0} />
          </SvgGradient>
        </Defs>
        <Path d={area} fill="url(#spk)" opacity={areaOpacity} />
        {showLine && (
          <>
            {/* Glow: underlay difuso (grueso, translúcido) → simula resplandor en web y nativo */}
            <Path d={line} fill="none" stroke={stroke} strokeWidth={6} strokeOpacity={glowOpacity} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {/* Línea nítida — strokeDasharray/offset revela el trazo en "Trazo vivo" (longitud aproximada por muestreo, sin filtros ni AnimatedComponent) */}
            <Path
              d={line} fill="none" stroke={stroke}
              strokeWidth={showDots ? 1.6 : 2.4} strokeOpacity={lineOpacity}
              strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
              strokeDasharray={drawActive ? approxLen : undefined}
              strokeDashoffset={drawActive ? approxLen * (1 - drawT) : undefined}
            />
          </>
        )}
      </Svg>

      {/* Puntos por dato (chartType='dots') — Views nativas, nunca ovaladas */}
      {showDots && boxW > 0 && pts.map((p, i) => {
        const isLast = i === pts.length - 1;
        return (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute', width: isLast ? 7 : 5.5, height: isLast ? 7 : 5.5, borderRadius: 4,
              backgroundColor: isLast ? '#FFFFFF' : stroke, opacity: isLast ? 1 : 0.85,
              left: (p.x / W) * boxW - (isLast ? 3.5 : 2.75), top: (p.y / H) * height - (isLast ? 3.5 : 2.75),
            }}
          />
        );
      })}

      {/* Pulso: cometa con estela de glow de 3 capas */}
      {pulseActive && samples.length >= 2 && boxW > 0 && (
        <>
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: stroke, opacity: 0.12 }, cometCenter(26)]} />
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 17, height: 17, borderRadius: 8.5, backgroundColor: stroke, opacity: 0.28 }, cometCenter(17)]} />
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 7.5, height: 7.5, borderRadius: 3.75, backgroundColor: '#FFFFFF' }, glowShadow, cometCenter(7.5)]} />
        </>
      )}

      {/* Trazo vivo: halo respirando en el punto de hoy */}
      {drawActive && boxW > 0 && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: stroke,
            left: (end.x / W) * boxW - 8, top: (end.y / H) * height - 8,
            opacity: drawHalo.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.4] }),
            transform: [{ scale: drawHalo.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.3] }) }],
          }}
        />
      )}
    </View>
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
  const { colors, isDark, chartType, chartAnimStyle, chartSpeed, chartAccent } = useTheme();
  const { animate: motionEnabled } = useProMotion();
  const chartDuration = chartSpeed === 'slow' ? 6500 : chartSpeed === 'normal' ? 4200 : 2600;
  const resolvedChartColor = sparkline ? resolveChartAccent(chartAccent, colors, sparkline) : colors.primary;
  // Héroe "Aurora Ledger": el balance premium SIEMPRE vive directo sobre el
  // fondo, sin chrome de tarjeta (como el mockup aprobado).
  const heroBare = pro;
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
  ) : (() => {
    const amountColor = hidden ? colors.textTertiary : isPositive ? colors.primary : colors.expense;
    // Tamaño dinámico: en web adjustsFontSizeToFit no funciona → el serif grande
    // se truncaba ("$2.650.0..."). Escalamos por longitud para que SIEMPRE quepa.
    const amtLen = (hidden ? HIDDEN_MASK : formatCurrency(displayBalance)).length;
    const proSize = amtLen <= 10 ? 44 : amtLen <= 13 ? 37 : amtLen <= 16 ? 31 : 26;
    const amountStyle = [
      styles.balanceAmount,
      proStyle && styles.balanceAmountPro,
      proStyle && { fontSize: proSize, lineHeight: Math.round(proSize * 1.08) },
      {
        color: amountColor,
        letterSpacing: hidden ? 4 : proStyle ? -1.5 : -0.5,
      },
      // Glow solo en tema oscuro: en claro genera un halo turbio ("recuadro").
      proStyle && !hidden && isDark && (Platform.OS === 'web'
        ? ({ textShadow: `0 0 38px ${amountColor}80` } as any)
        : { textShadowColor: amountColor + '80', textShadowRadius: 24, textShadowOffset: { width: 0, height: 0 } }),
    ];
    if (hidden) {
      return (
        <Text style={amountStyle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {HIDDEN_MASK}
        </Text>
      );
    }
    return (
      <Text style={amountStyle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {formatCurrency(displayBalance)}
      </Text>
    );
  })();

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

  const card = (
    <View
      style={[
        styles.card,
        heroBare && styles.heroBare,
        {
          backgroundColor: heroBare ? 'transparent' : colors.surfaceElevated,
          borderColor: heroBare ? 'transparent' : pro ? (isDark ? colors.primary + '22' : colors.border) : colors.primary + '2E',
          ...(!heroBare && Platform.OS !== 'web' && {
            shadowColor: pro ? (isDark ? '#000000' : '#10282E') : (isDark ? colors.primary : '#000000'),
            shadowOffset: { width: 0, height: pro ? 16 : 4 },
            shadowOpacity: pro ? (isDark ? 0.5 : 0.16) : (isDark ? 0.40 : 0.07),
            shadowRadius: pro ? (isDark ? 34 : 26) : (isDark ? 24 : 8),
            elevation: pro ? 14 : (isDark ? 12 : 4),
          }),
          ...(!heroBare && Platform.OS === 'web' && {
            boxShadow: pro
              ? (isDark ? '0 18px 36px -16px rgba(0,0,0,0.6)' : '0 16px 30px -14px rgba(16,40,46,0.20)')
              : (isDark ? `0 8px 32px 0 ${colors.primary}38` : '0 4px 12px 0 rgba(0,0,0,0.08)'),
          } as any),
        },
      ]}
    >
      {!heroBare && (
        <>
          <View
            style={[styles.innerHighlight, { borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.55)' }]}
            pointerEvents="none"
          />
          <View style={[styles.accentBlob, { backgroundColor: isDark ? colors.primary + '18' : colors.primaryLight }]} pointerEvents="none" />
          <View style={[styles.accentBlobSecondary, { backgroundColor: isDark ? colors.primary + '10' : colors.primaryLight }]} pointerEvents="none" />
          <View style={[styles.topAccentBar, { backgroundColor: colors.primary }]} pointerEvents="none" />
        </>
      )}

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
            <View style={[styles.sparkWrap, heroBare && styles.sparkWrapHero]}>
              <Sparkline
                values={sparkline}
                color={resolvedChartColor}
                accent={resolvedChartColor}
                height={78}
                animate={motionEnabled && chartAnimStyle !== 'none'}
                duration={chartDuration}
                chartType={chartType}
                animStyle={chartAnimStyle}
              />
            </View>
          )}

          {/* Detalle colapsable: ingresos/gastos + FX */}
          <TouchableOpacity
            onPress={() => setDetailOpen((o) => !o)}
            style={[styles.detailToggle, { borderTopColor: isDark ? colors.primary + '20' : colors.border }, heroBare && { borderTopWidth: 0 }]}
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

  return card;
}

const styles = StyleSheet.create({
  heroBare: { paddingHorizontal: 10, paddingTop: 6, borderWidth: 0, overflow: 'visible' },
  sparkWrapHero: { marginHorizontal: -30 },
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
  balanceAmountPro: { fontSize: 44, lineHeight: 48, fontFamily: Fonts.extraBold, fontVariant: ['tabular-nums'], marginBottom: 14 },
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
