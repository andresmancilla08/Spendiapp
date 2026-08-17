/**
 * Las diez tarjetas de módulo premium, cada una con su MINIATURA — un fragmento
 * del módulo real dibujado con SVG, no un icono.
 *
 * Las usan las dos pantallas premium: la de compra (`app/upgrade.tsx`) y la de
 * bienvenida (`app/premium-welcome.tsx`). Una sola fuente para las dos: eran el
 * mismo contenido descrito de dos formas distintas, y se desincronizaba.
 *
 * Las cifras son de EJEMPLO a propósito. Traer los datos reales exigiría montar
 * media docena de hooks premium (uno de ellos llama a Gemini) en una pantalla que
 * se ve una vez; el texto lo dice claramente en lugar de fingir.
 */
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Polyline, Path, Defs, LinearGradient as SvgGradient, Stop, Line } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';
import type { AppColors } from '../../config/colors';

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

export function ModTrend({ colors }: { colors: AppColors }) {
  const { t } = useTranslation();
  const pts = [[6, 40], [36, 33], [66, 36], [96, 21], [126, 25], [152, 11]];
  return (
    <Card colors={colors}>
      <Caption text={t('upgrade.mod.trend')} dot={colors.primary} colors={colors} />
      <View style={s.trendHead}>
        <Text style={[s.bigNum, { color: colors.textPrimary }]}>$2.184.500</Text>
        <Text style={[s.delta, { color: colors.success }]}>+8,4%</Text>
      </View>
      <Svg width="100%" height={52} viewBox="0 0 158 52" preserveAspectRatio="none">
        <Defs>
          <SvgGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.34" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Line x1="0" y1="13" x2="158" y2="13" stroke={colors.border} strokeWidth="0.7" strokeDasharray="2,4" />
        <Line x1="0" y1="30" x2="158" y2="30" stroke={colors.border} strokeWidth="0.7" strokeDasharray="2,4" />
        <Path d="M6 40 L36 33 L66 36 L96 21 L126 25 L152 11 L152 52 L6 52 Z" fill="url(#trendArea)" />
        <Polyline
          points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none" stroke={colors.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        />
        {pts.slice(0, -1).map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r="2.3" fill={colors.background} stroke={colors.primary} strokeWidth="1.5" />
        ))}
        <Circle cx="152" cy="11" r="3.6" fill={colors.primary} />
      </Svg>
      <View style={s.months}>
        {['MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO'].map((m) => (
          <Text key={m} style={[s.month, { color: colors.textTertiary }]}>{m}</Text>
        ))}
      </View>
    </Card>
  );
}

export function ModAnalysis({ colors }: { colors: AppColors }) {
  const { t } = useTranslation();
  const tiles: Array<[string, string, string, string]> = [
    [t('upgrade.mod.savings'), '13%', t('upgrade.mod.savingsDelta'), colors.success],
    [t('upgrade.mod.vsLast'), '+84%', t('upgrade.mod.vsLastDelta'), colors.error],
    [t('upgrade.mod.topCat'), t('upgrade.mod.topCatValue'), t('upgrade.mod.topCatDelta'), colors.textPrimary],
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

export function ModCategories({ colors }: { colors: AppColors }) {
  const { t } = useTranslation();
  const legend: Array<[string, string, string]> = [
    [t('upgrade.mod.cat1'), '48%', colors.primary],
    [t('upgrade.mod.cat2'), '24%', colors.warning],
    [t('upgrade.mod.cat3'), '14%', colors.success],
    [t('upgrade.mod.cat4'), '14%', colors.textTertiary],
  ];
  return (
    <Card colors={colors}>
      <Caption text={t('upgrade.mod.cats')} dot={colors.primary} colors={colors} />
      <View style={s.catRow}>
        <View style={s.donutWrap}>
          <Svg width={74} height={74} viewBox="0 0 42 42">
            <Circle cx="21" cy="21" r="16" fill="none" stroke={colors.border} strokeWidth="6" />
            <Circle cx="21" cy="21" r="16" fill="none" stroke={colors.primary} strokeWidth="6"
              strokeDasharray="48,53" strokeLinecap="round" transform="rotate(-90 21 21)" />
            <Circle cx="21" cy="21" r="16" fill="none" stroke={colors.warning} strokeWidth="6"
              strokeDasharray="24,77" strokeLinecap="round" transform="rotate(80 21 21)" />
            <Circle cx="21" cy="21" r="16" fill="none" stroke={colors.success} strokeWidth="6"
              strokeDasharray="14,87" strokeLinecap="round" transform="rotate(170 21 21)" />
          </Svg>
          <View style={s.donutCenter} pointerEvents="none">
            <Text style={[s.donutNum, { color: colors.textPrimary }]}>8,9M</Text>
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

export function ModProjection({ colors }: { colors: AppColors }) {
  const { t } = useTranslation();
  return (
    <Card colors={colors}>
      <Caption text={t('upgrade.mod.proj')} dot={colors.warning} colors={colors} />
      <Text style={[s.bigNum, { color: colors.textPrimary, marginTop: 6 }]}>$2.730.000</Text>
      <Text style={[s.sub, { color: colors.textTertiary }]}>
        {t('upgrade.mod.projOf', { amount: '$3.000.000' })}
      </Text>
      <Bar pct={68} mark={91} from={colors.primary} to={colors.warning} colors={colors} />
      <View style={s.betweenRow}>
        <Text style={[s.miniMono, { color: colors.textTertiary }]}>{t('upgrade.mod.projNow', { pct: 68 })}</Text>
        <Text style={[s.miniMono, { color: colors.warning }]}>{t('upgrade.mod.projEnd', { pct: 91 })}</Text>
      </View>
    </Card>
  );
}

export function ModGoals({ colors }: { colors: AppColors }) {
  const { t } = useTranslation();
  const goals: Array<[string, number]> = [[t('upgrade.mod.goal1'), 72], [t('upgrade.mod.goal2'), 45]];
  return (
    <Card colors={colors}>
      <Caption text={t('upgrade.mod.goals', { count: 3 })} dot={colors.success} colors={colors} />
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
  // Solo USD y EUR: es lo que muestra ExchangeRateChips de verdad.
  const rates: Array<[string, string, string, string, string]> = [
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
export function PremiumModules({ colors }: { colors: AppColors }) {
  return (
    <>
      <ModIA colors={colors} />
      <ModTrend colors={colors} />
      <ModAnalysis colors={colors} />
      <ModCategories colors={colors} />
      <View style={s.pair}>
        <View style={s.half}><ModProjection colors={colors} /></View>
        <View style={s.half}><ModGoals colors={colors} /></View>
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
