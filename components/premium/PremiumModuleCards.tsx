/**
 * Las diez tarjetas de módulo premium, cada una con su MINIATURA — un fragmento
 * del módulo real dibujado con SVG, no un icono.
 *
 * Las usan las dos pantallas premium: la de compra (`app/upgrade.tsx`) y la de
 * bienvenida (`app/premium-welcome.tsx`). Una sola fuente para las dos: eran el
 * mismo contenido descrito de dos formas distintas, y se desincronizaba.
 *
 * Cada tarjeta acepta `data` (de `usePremiumPreview`) y pinta las cifras REALES
 * del usuario cuando las hay. El ejemplo es solo el respaldo para quien todavía
 * no tiene datos: mes recién estrenado, sin metas, sin categorías. Cuatro módulos
 * siguen siendo ilustrativos siempre —la frase con IA (llamaría a Gemini antes de
 * pagar), el informe con amigo, los grupos y la personalización—, y el aviso de la
 * pantalla lo dice.
 */
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop, Line } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';
import { formatMoney } from '../../utils/formatMoney';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import type { PremiumPreview } from '../../hooks/usePremiumPreview';
import type { AppColors } from '../../config/colors';

/** Cifra corta para las miniaturas: $8,9M / $184K. El espacio manda. */
function compact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (abs >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return formatMoney(amount);
}

const pctText = (n: number) => `${n > 0 ? '+' : ''}${n}%`;

/* ── Piezas compartidas ─────────────────────────────────────────────────── */

function Caption({ text, dot, colors }: { text: string; dot: string; colors: AppColors }) {
  return (
    <View style={s.capRow}>
      <View style={[s.capDot, { backgroundColor: dot }]} />
      <Text style={[s.cap, { color: colors.textTertiary }]} numberOfLines={2}>{text}</Text>
    </View>
  );
}

function Card({ children, colors, style }: { children: React.ReactNode; colors: AppColors; style?: any }) {
  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

/** Barra de progreso con marca opcional de proyección. */
function Bar({ pct, mark, from, to, colors }: {
  pct: number; mark?: number; from: string; to: string; colors: AppColors;
}) {
  return (
    <View style={[s.track, { backgroundColor: colors.border }]}>
      <View style={[s.fill, { width: `${pct}%`, backgroundColor: from }]} />
      <View style={[s.fillTop, { width: `${pct * 0.55}%`, backgroundColor: to }]} />
      {mark != null && <View style={[s.mark, { left: `${mark}%`, backgroundColor: to }]} />}
    </View>
  );
}

/* ── Los diez módulos ───────────────────────────────────────────────────── */

export function ModIA({ colors }: { colors: AppColors }) {
  const { t } = useTranslation();
  return (
    <Card colors={colors}>
      <Caption text={t('upgrade.mod.ia')} dot={colors.primary} colors={colors} />
      <Text style={[s.iaText, { color: colors.textPrimary }]}>{t('upgrade.mod.iaText')}</Text>
      <View style={s.iaFoot}>
        <View style={[s.chip, { borderColor: colors.warning + '55', backgroundColor: colors.warning + '18' }]}>
          <Text style={[s.chipText, { color: colors.warning }]}>{t('upgrade.mod.iaChip')}</Text>
        </View>
        <Text style={[s.iaTag, { color: colors.primary }]}>IA</Text>
      </View>
    </Card>
  );
}

const TREND_H = 66;
const TREND_PAD = 8; // margen vertical: sin él la serie se pega al borde de la tarjeta

/**
 * Curva suave (Catmull-Rom convertido a Bézier) en lugar de una polilínea.
 * Con seis puntos, los quiebres rectos son justo lo que hace que un gráfico
 * pequeño parezca un garabato.
 */
function smoothPath(pts: number[][]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    // 1/6 es la tensión estándar de Catmull-Rom: más alta se pasa de frenada y
    // dibuja jorobas donde los datos no las tienen.
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    // Los tiradores se recortan al rango del tramo: sin esto la curva se pasa de
    // frenada y dibuja valles por debajo del mínimo real. Un gráfico de gasto no
    // puede inventar un mes mejor que el que hubo.
    const lo = Math.min(p1[1], p2[1]);
    const hi = Math.max(p1[1], p2[1]);
    const clamp = (y: number) => Math.max(lo, Math.min(hi, y));
    const c1y = clamp(p1[1] + (p2[1] - p0[1]) / 6);
    const c2y = clamp(p2[1] - (p3[1] - p1[1]) / 6);
    d += ` C${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export function ModTrend({ colors, data }: { colors: AppColors; data?: PremiumPreview['trend'] }) {
  const { t } = useTranslation();
  // El SVG se dibuja en píxeles REALES medidos con onLayout. Antes tenía un
  // viewBox fijo con preserveAspectRatio="none": el lienzo se estiraba al ancho
  // de la tarjeta y con él los trazos y los puntos, que salían ovalados.
  const [width, setWidth] = useState(0);

  const serie = data?.expenses ?? [1_840_000, 2_010_000, 1_720_000, 2_260_000, 2_050_000, 2_184_500];
  const meses = data?.months ?? ['MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO'];
  const delta = data?.deltaPct ?? 8.4;

  // Escala por RANGO, no de cero al máximo: con un mes fuerte y cinco flojos, la
  // escala desde cero aplastaba cinco meses contra el suelo en una raya plana.
  // Pero el rango a secas miente al revés: doce millones contra doce millones y
  // pico salían como una montaña rusa. Por eso el rango nunca baja del 35% del
  // máximo — un mes plano se DIBUJA plano — y la serie se centra en su hueco.
  const max = Math.max(...serie);
  const min = Math.min(...serie);
  const real = max - min;
  const span = Math.max(real, max * 0.35) || 1;
  const base = min - (span - real) / 2;
  const usable = TREND_H - TREND_PAD * 2;
  const pts = serie.map((v, i) => [
    serie.length > 1 ? (i * (width - TREND_PAD * 2)) / (serie.length - 1) + TREND_PAD : width / 2,
    TREND_H - TREND_PAD - ((v - base) / span) * usable,
  ]);
  const line = smoothPath(pts);
  const area = pts.length > 1
    ? `${line} L${pts.at(-1)![0]} ${TREND_H} L${pts[0][0]} ${TREND_H} Z`
    : '';
  const [lastX, lastY] = pts.at(-1) ?? [0, 0];

  return (
    <Card colors={colors}>
      <Caption text={t('upgrade.mod.trend')} dot={colors.primary} colors={colors} />
      <View style={s.trendHead}>
        <Text style={[s.bigNum, { color: colors.textPrimary }]}>
          {formatMoney(data ? data.total : 2_184_500)}
        </Text>
        <Text style={[s.delta, { color: delta > 0 ? colors.error : colors.success }]}>
          {pctText(Math.round(delta))}
        </Text>
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: TREND_H }}>
        {width > 0 && (
          <Svg width={width} height={TREND_H}>
            <Defs>
              <SvgGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primary} stopOpacity="0.28" />
                <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
              </SvgGradient>
            </Defs>
            {[0.34, 0.67].map((p) => (
              <Line key={p} x1="0" y1={TREND_PAD + usable * p} x2={width} y2={TREND_PAD + usable * p}
                stroke={colors.border} strokeWidth="1" strokeDasharray="2,5" opacity={0.55} />
            ))}
            <Path d={area} fill="url(#trendArea)" />
            <Path d={line} fill="none" stroke={colors.primary} strokeWidth="2.4"
              strokeLinecap="round" strokeLinejoin="round" />
            {/* Solo el último mes lleva punto: seis círculos en 66px de alto eran ruido. */}
            <Circle cx={lastX} cy={lastY} r="5" fill={colors.primary} opacity={0.18} />
            <Circle cx={lastX} cy={lastY} r="3" fill={colors.primary}
              stroke={colors.surface} strokeWidth="1.5" />
          </Svg>
        )}
      </View>
      <View style={s.months}>
        {meses.map((m, i) => (
          <Text key={`${m}-${i}`} style={[s.month, { color: colors.textTertiary }]}>{m}</Text>
        ))}
      </View>
    </Card>
  );
}

export function ModAnalysis({ colors, data }: { colors: AppColors; data?: PremiumPreview['analysis'] }) {
  const { t } = useTranslation();
  const tiles: Array<[string, string, string, string]> = [
    [
      t('upgrade.mod.savings'),
      data ? `${data.savingsRatePct}%` : '13%',
      t('upgrade.mod.savingsDelta'),
      data && data.savingsRatePct < 0 ? colors.error : colors.success,
    ],
    [
      t('upgrade.mod.vsLast'),
      data?.vsLastPct != null ? pctText(data.vsLastPct) : '+84%',
      t('upgrade.mod.vsLastDelta'),
      data?.vsLastPct != null && data.vsLastPct <= 0 ? colors.success : colors.error,
    ],
    [
      t('upgrade.mod.topCat'),
      data?.topCategory ? data.topCategory.name : t('upgrade.mod.topCatValue'),
      data?.topCategory ? `${data.topCategory.pct}%` : t('upgrade.mod.topCatDelta'),
      colors.textPrimary,
    ],
    [t('upgrade.mod.streak'), t('upgrade.mod.streakValue'), t('upgrade.mod.streakDelta'), colors.warning],
  ];
  return (
    <Card colors={colors}>
      <Caption text={t('upgrade.mod.analysis')} dot={colors.success} colors={colors} />
      <View style={s.tiles}>
        {tiles.map(([k, v, d, c]) => (
          <View key={k} style={[s.tile, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[s.tileKey, { color: colors.textTertiary }]} numberOfLines={1}>{k}</Text>
            <Text style={[s.tileVal, { color: c }]} numberOfLines={1}>{v}</Text>
            <Text style={[s.tileDelta, { color: colors.textTertiary }]} numberOfLines={1}>{d}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

export function ModCategories({ colors, data }: { colors: AppColors; data?: PremiumPreview['categories'] }) {
  const { t } = useTranslation();
  const paleta = [colors.primary, colors.warning, colors.success, colors.textTertiary];
  const legend: Array<[string, string, string]> = data
    ? data.items.map((c, i) => [c.name, `${c.pct}%`, paleta[i] ?? colors.textTertiary])
    : [
        [t('upgrade.mod.cat1'), '48%', colors.primary],
        [t('upgrade.mod.cat2'), '24%', colors.warning],
        [t('upgrade.mod.cat3'), '14%', colors.success],
        [t('upgrade.mod.cat4'), '14%', colors.textTertiary],
      ];
  // El donut es una circunferencia de 100: cada arco avanza el ángulo acumulado.
  const arcos = legend.map(([, pct], i) => {
    const valor = parseInt(pct, 10) || 0;
    const antes = legend.slice(0, i).reduce((acc, [, p]) => acc + (parseInt(p, 10) || 0), 0);
    return { valor, rota: -90 + antes * 3.6, color: paleta[i] ?? colors.textTertiary };
  });
  return (
    <Card colors={colors}>
      <Caption text={t('upgrade.mod.cats')} dot={colors.primary} colors={colors} />
      <View style={s.catRow}>
        <View style={s.donutWrap}>
          <Svg width={74} height={74} viewBox="0 0 42 42">
            <Circle cx="21" cy="21" r="16" fill="none" stroke={colors.border} strokeWidth="6" />
            {arcos.map((a, i) => (
              <Circle key={i} cx="21" cy="21" r="16" fill="none" stroke={a.color} strokeWidth="6"
                strokeDasharray={`${a.valor},${101 - a.valor}`} strokeLinecap="round"
                transform={`rotate(${a.rota} 21 21)`} />
            ))}
          </Svg>
          <View style={s.donutCenter} pointerEvents="none">
            <Text style={[s.donutNum, { color: colors.textPrimary }]}>
              {data ? compact(data.total).replace('$', '') : '8,9M'}
            </Text>
            <Text style={[s.donutCap, { color: colors.textTertiary }]}>{t('upgrade.mod.catsTotal')}</Text>
          </View>
        </View>
        <View style={s.legend}>
          {legend.map(([n, p, c]) => (
            <View key={n} style={s.legendRow}>
              <View style={[s.legendDot, { backgroundColor: c }]} />
              <Text style={[s.legendName, { color: colors.textSecondary }]} numberOfLines={1}>{n}</Text>
              <Text style={[s.legendPct, { color: colors.textPrimary }]}>{p}</Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}

export function ModProjection({ colors, data }: { colors: AppColors; data?: PremiumPreview['projection'] }) {
  const { t } = useTranslation();
  const nowPct = data?.nowPct ?? 68;
  const endPct = data?.endPct ?? 91;
  return (
    <Card colors={colors}>
      <Caption text={t('upgrade.mod.proj')} dot={colors.warning} colors={colors} />
      <Text style={[s.bigNum, { color: colors.textPrimary, marginTop: 6 }]}>
        {data ? formatMoney(data.projected) : '$2.730.000'}
      </Text>
      <Text style={[s.sub, { color: colors.textTertiary }]}>
        {t('upgrade.mod.projOf', { amount: data ? formatMoney(data.income) : '$3.000.000' })}
      </Text>
      <Bar pct={nowPct} mark={endPct} from={colors.primary} to={colors.warning} colors={colors} />
      <View style={s.betweenRow}>
        <Text style={[s.miniMono, { color: colors.textTertiary }]}>{t('upgrade.mod.projNow', { pct: nowPct })}</Text>
        <Text style={[s.miniMono, { color: colors.warning }]}>{t('upgrade.mod.projEnd', { pct: endPct })}</Text>
      </View>
    </Card>
  );
}

export function ModGoals({ colors, data }: { colors: AppColors; data?: PremiumPreview['goals'] }) {
  const { t } = useTranslation();
  const goals: Array<[string, number]> = data
    ? data.items.map((g) => [g.name, g.pct])
    : [[t('upgrade.mod.goal1'), 72], [t('upgrade.mod.goal2'), 45]];
  return (
    <Card colors={colors}>
      <Caption text={t('upgrade.mod.goals', { count: data?.active ?? 3 })} dot={colors.success} colors={colors} />
      <View style={{ marginTop: 8 }}>
        {goals.map(([n, p], i) => (
          <View key={n} style={i ? { marginTop: 10 } : undefined}>
            <View style={s.betweenRow}>
              <Text style={[s.goalName, { color: colors.textSecondary }]} numberOfLines={1}>{n}</Text>
              <Text style={[s.goalPct, { color: colors.textPrimary }]}>{p}%</Text>
            </View>
            <Bar pct={p} from={colors.success} to={colors.primary} colors={colors} />
          </View>
        ))}
      </View>
    </Card>
  );
}

export function ModFx({ colors }: { colors: AppColors }) {
  const { t } = useTranslation();
  // Solo USD y EUR: es lo que muestra ExchangeRateChips de verdad. Y son las tasas
  // de VERDAD: el endpoint es gratis y no depende de tener datos propios.
  const { usd, eur, prevUsd, prevEur, loading } = useExchangeRates();
  const fila = (flag: string, code: string, val: number, prev: number):
    [string, string, string, string, string] => {
    const delta = prev > 0 ? ((val - prev) / prev) * 100 : 0;
    return [
      flag, code,
      val > 0 ? Math.round(val).toLocaleString('es-CO') : '—',
      `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1).replace('.', ',')}%`,
      delta >= 0 ? colors.success : colors.error,
    ];
  };
  const rates: Array<[string, string, string, string, string]> = !loading && usd > 0
    ? [fila('🇺🇸', 'USD', usd, prevUsd), fila('🇪🇺', 'EUR', eur, prevEur)]
    : [
        ['🇺🇸', 'USD', '4.058', '▲ 0,4%', colors.success],
        ['🇪🇺', 'EUR', '4.412', '▼ 0,2%', colors.error],
      ];
  return (
    <Card colors={colors}>
      <Caption text={t('upgrade.mod.fx')} dot={colors.success} colors={colors} />
      <View style={s.fxRow}>
        {rates.map(([flag, code, val, d, c]) => (
          <View key={code} style={[s.fxBox, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={s.fxHead}>
              <Text style={s.fxFlag}>{flag}</Text>
              <Text style={[s.fxCode, { color: colors.textTertiary }]}>{code}</Text>
            </View>
            <Text style={[s.fxVal, { color: colors.textPrimary }]}>{val}</Text>
            <Text style={[s.fxDelta, { color: c }]}>{d}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

export function ModReport({ colors }: { colors: AppColors }) {
  const { t } = useTranslation();
  return (
    <Card colors={colors}>
      <Caption text={t('upgrade.mod.report')} dot={colors.error} colors={colors} />
      <View style={[s.betweenRow, { marginTop: 11, alignItems: 'center' }]}>
        <View style={s.avatars}>
          {[['MV', colors.error], ['LU', colors.primary]].map(([n, c], i) => (
            <View key={n as string} style={[
              s.avatar,
              { backgroundColor: (c as string) + '2E', borderColor: colors.surface, marginLeft: i ? -9 : 0 },
            ]}>
              <Text style={[s.avatarText, { color: c as string }]}>{n as string}</Text>
            </View>
          ))}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.oweCap, { color: colors.textTertiary }]}>{t('upgrade.mod.reportOwe')}</Text>
          <Text style={[s.oweVal, { color: colors.primary }]}>$184.000</Text>
        </View>
      </View>
      <Text style={[s.sub, { color: colors.textTertiary, marginTop: 8 }]}>{t('upgrade.mod.reportNote')}</Text>
    </Card>
  );
}

export function ModGroups({ colors }: { colors: AppColors }) {
  const { t } = useTranslation();
  const parts = [[38, colors.primary], [27, colors.warning], [20, colors.success], [15, colors.error]] as const;
  return (
    <Card colors={colors}>
      <Caption text={t('upgrade.mod.groups')} dot={colors.warning} colors={colors} />
      <Text style={[s.groupName, { color: colors.textPrimary }]}>{t('upgrade.mod.groupName')}</Text>
      <Text style={[s.sub, { color: colors.textTertiary }]}>{t('upgrade.mod.groupNote')}</Text>
      <View style={[s.betweenRow, { marginTop: 10, alignItems: 'center', gap: 8 }]}>
        <View style={[s.stack, { backgroundColor: colors.border }]}>
          {parts.map(([w, c], i) => (
            <View key={i} style={{ width: `${w}%`, backgroundColor: c }} />
          ))}
        </View>
        <Text style={[s.groupTotal, { color: colors.textPrimary }]}>$3,6M</Text>
      </View>
    </Card>
  );
}

export function ModPerso({ colors }: { colors: AppColors }) {
  const { t } = useTranslation();
  const sw = [colors.primary, colors.warning, colors.success, colors.error,
    colors.primaryDark ?? colors.primary, colors.textTertiary, colors.borderFocus ?? colors.primary,
    colors.warning, colors.success];
  return (
    <Card colors={colors}>
      <Caption text={t('upgrade.mod.perso')} dot={colors.warning} colors={colors} />
      <View style={s.swatches}>
        {sw.map((c, i) => (
          <View key={i} style={[
            s.swatch,
            { backgroundColor: c },
            i === 0 && { borderWidth: 1.5, borderColor: colors.textPrimary },
          ]} />
        ))}
      </View>
      <Svg width="100%" height={26} viewBox="0 0 150 26">
        <Path d="M0 17 Q24 5 48 13 T98 10 T150 4" fill="none" stroke={colors.success} strokeWidth="1.6" opacity="0.8" />
        <Path d="M0 21 Q28 11 56 18 T112 14 T150 10" fill="none" stroke={colors.primary} strokeWidth="1.6" opacity="0.55" />
        <Path d="M0 24 Q20 17 44 22 T96 19 T150 15" fill="none" stroke={colors.warning} strokeWidth="1.6" opacity="0.4" />
      </Svg>
      <Text style={[s.sub, { color: colors.textTertiary, marginTop: 6 }]}>{t('upgrade.mod.persoNote')}</Text>
    </Card>
  );
}

/** Todos los módulos en el orden acordado, listos para apilar. */
export function PremiumModules({ colors, data }: { colors: AppColors; data?: PremiumPreview }) {
  return (
    <>
      <ModIA colors={colors} />
      <ModTrend colors={colors} data={data?.trend} />
      <ModAnalysis colors={colors} data={data?.analysis} />
      <ModCategories colors={colors} data={data?.categories} />
      <View style={s.pair}>
        <View style={s.half}><ModProjection colors={colors} data={data?.projection} /></View>
        <View style={s.half}><ModGoals colors={colors} data={data?.goals} /></View>
      </View>
      <View style={s.pair}>
        <View style={s.half}><ModFx colors={colors} /></View>
        <View style={s.half}><ModReport colors={colors} /></View>
      </View>
      <View style={s.pair}>
        <View style={s.half}><ModGroups colors={colors} /></View>
        <View style={s.half}><ModPerso colors={colors} /></View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
  pair: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },

  capRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  capDot: { width: 4, height: 4, borderRadius: 2 },
  cap: { fontFamily: Fonts.medium, fontSize: 8.5, letterSpacing: 1.3, flex: 1 },

  iaText: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 19, marginTop: 9 },
  iaFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  chip: { borderWidth: 1, borderRadius: 50, paddingHorizontal: 9, paddingVertical: 4 },
  chipText: { fontFamily: Fonts.bold, fontSize: 11 },
  iaTag: { fontFamily: Fonts.bold, fontSize: 8, letterSpacing: 1.1 },

  trendHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6, marginBottom: 2 },
  bigNum: { fontFamily: Fonts.extraBold, fontSize: 20, letterSpacing: -0.7 },
  delta: { fontFamily: Fonts.medium, fontSize: 11 },
  months: { flexDirection: 'row', justifyContent: 'space-between' },
  month: { fontFamily: Fonts.regular, fontSize: 7.5, letterSpacing: 0.7 },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tile: { width: '47.5%', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9 },
  tileKey: { fontFamily: Fonts.regular, fontSize: 9.5 },
  tileVal: { fontFamily: Fonts.extraBold, fontSize: 17, letterSpacing: -0.5, marginTop: 3 },
  tileDelta: { fontFamily: Fonts.regular, fontSize: 7.5, marginTop: 3 },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  donutWrap: { width: 74, height: 74 },
  donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  donutNum: { fontFamily: Fonts.extraBold, fontSize: 10.5 },
  donutCap: { fontFamily: Fonts.regular, fontSize: 6.5, letterSpacing: 0.6 },
  legend: { flex: 1, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendName: { fontFamily: Fonts.regular, fontSize: 11, flex: 1 },
  legendPct: { fontFamily: Fonts.bold, fontSize: 11 },

  sub: { fontFamily: Fonts.regular, fontSize: 10, marginTop: 2 },
  track: { height: 7, borderRadius: 4, marginTop: 10, flexDirection: 'row', overflow: 'visible' },
  fill: { height: 7, borderRadius: 4, position: 'absolute', left: 0, top: 0 },
  fillTop: { height: 7, borderTopLeftRadius: 4, borderBottomLeftRadius: 4, position: 'absolute', left: 0, top: 0, opacity: 0.55 },
  mark: { position: 'absolute', top: -5, width: 2, height: 17, borderRadius: 1 },
  betweenRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  miniMono: { fontFamily: Fonts.medium, fontSize: 8, letterSpacing: 0.4 },

  goalName: { fontFamily: Fonts.regular, fontSize: 10.5, flex: 1 },
  goalPct: { fontFamily: Fonts.bold, fontSize: 10.5 },

  fxRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  fxBox: { flex: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9 },
  fxHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fxFlag: { fontSize: 11 },
  fxCode: { fontFamily: Fonts.medium, fontSize: 9, letterSpacing: 1 },
  fxVal: { fontFamily: Fonts.extraBold, fontSize: 15, letterSpacing: -0.4, marginTop: 5 },
  fxDelta: { fontFamily: Fonts.medium, fontSize: 8, marginTop: 2 },

  avatars: { flexDirection: 'row' },
  avatar: { width: 27, height: 27, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.extraBold, fontSize: 9.5 },
  oweCap: { fontFamily: Fonts.medium, fontSize: 7.5, letterSpacing: 1.1 },
  oweVal: { fontFamily: Fonts.extraBold, fontSize: 15, letterSpacing: -0.4 },

  groupName: { fontFamily: Fonts.medium, fontSize: 12.5, marginTop: 9 },
  stack: { flex: 1, height: 5, borderRadius: 3, flexDirection: 'row', overflow: 'hidden' },
  groupTotal: { fontFamily: Fonts.bold, fontSize: 10 },

  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 11, marginBottom: 10 },
  swatch: { width: 17, height: 17, borderRadius: 9 },
});
