/**
 * El lienzo vivo de Personalización: una maqueta del Home con el tema aplicado,
 * siempre a la vista mientras se toca cualquier ajuste.
 *
 * Antes cada sección llevaba su propia vista previa dentro de un acordeón, así que
 * el conjunto —paleta + fondo + gráfico + tarjeta juntos, que es lo que el usuario
 * mira todos los días— no se veía en ninguna pantalla.
 *
 * `focus` decide QUÉ entra cuando el lienzo se encoge: al reducirse no recorta,
 * cambia de contenido. En el capítulo del fondo manda el fondo, en el de datos el
 * gráfico crece al doble, y en el de detalle se queda la tarjeta con su brillo.
 *
 * Reutiliza las piezas reales (`BackgroundEffect`, `Sparkline`, `ProSheen`): si el
 * Home cambia, esto no miente por su cuenta.
 */
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useProMotion } from '../hooks/useProMotion';
import { readableTint } from '../utils/contrast';
import { formatMoney } from '../utils/formatMoney';
import { Fonts } from '../config/fonts';
import { BackgroundEffect } from './AppBackground';
import { Sparkline, resolveChartAccent, resolveChartAccent2 } from './BalanceCard';
import ProSheen from './ProSheen';
import AppIcon from './AppIcon';

export type CanvasFocus = 'all' | 'bg' | 'chart' | 'card';

/** Cifras de ejemplo estables: si cambiaran en cada render, el gráfico "saltaría"
 *  al tocar cualquier ajuste y parecería un fallo. */
const PREVIEW_VALUES = [1080, 1240, 1190, 1340, 1284, 1420, 1380, 1495];
const PREVIEW_BALANCE = 4286500;

const HEIGHT: Record<CanvasFocus, number> = { all: 292, bg: 196, chart: 196, card: 196 };

export default function PersonalizationCanvas({ focus = 'all', bgTarget }: {
  focus?: CanvasFocus;
  /** Modo que se está editando en el capítulo Fondo: el lienzo enseña ESE fondo. */
  bgTarget?: 'light' | 'dark';
}) {
  const {
    colors, isDark, activePalette, gradientStyle,
    backgroundStyleLight, backgroundStyleDark, backgroundIntensity, backgroundSpeed,
    chartType, chartAnimStyle, chartSpeed, chartAccent,
  } = useTheme();
  const { animate } = useProMotion();
  const { t } = useTranslation();

  const height = HEIGHT[focus];
  const showChart = focus === 'all' || focus === 'bg' || focus === 'chart';
  const showCard = focus === 'all' || focus === 'card';
  const showGreeting = focus === 'all' || focus === 'bg';

  // El fondo que se muestra es el del modo activo, salvo en el capítulo Fondo,
  // donde manda el modo que se está editando.
  const shownDark = bgTarget ? bgTarget === 'dark' : isDark;
  const styleKey = shownDark ? backgroundStyleDark : backgroundStyleLight;
  const gradient = shownDark ? activePalette.gradientDark : activePalette.gradientLight;
  const themed = shownDark ? activePalette.colors.dark : activePalette.colors.light;

  const chartColor = resolveChartAccent(chartAccent, themed, PREVIEW_VALUES);
  const chartColor2 = resolveChartAccent2(chartAccent, themed);
  const duration = chartSpeed === 'slow' ? 6500 : chartSpeed === 'normal' ? 4200 : 2600;
  const amountInk = readableTint(themed.primary, themed.surface, 4.5);

  return (
    <View style={[styles.canvas, { height, borderColor: colors.border }]}>
      {/* Mismo orden de capas que el fondo real: degradado → scrim → efecto. */}
      {gradientStyle === 'flat' ? (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: gradient[0] }]} />
      ) : gradientStyle === 'radial' ? (
        <>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: gradient[2] }]} />
          <View style={[styles.radial, { backgroundColor: gradient[0] }]} />
        </>
      ) : (
        <LinearGradient
          colors={gradient}
          start={gradientStyle === 'linear' ? { x: 0.5, y: 0 } : { x: 0.1, y: 0 }}
          end={gradientStyle === 'linear' ? { x: 0.5, y: 1 } : { x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {shownDark && <View style={[StyleSheet.absoluteFillObject, styles.scrim]} />}
      {animate && (
        <BackgroundEffect styleKey={styleKey} intensity={backgroundIntensity} speed={
          backgroundSpeed === 'slow' ? 1.6 : backgroundSpeed === 'fast' ? 0.62 : 1
        } />
      )}

      <View style={styles.content}>
        {showGreeting && (
          <View style={styles.top}>
            <View style={[styles.avatar, { backgroundColor: themed.primary }]}>
              <Text style={[styles.avatarText, { color: themed.onPrimary }]}>A</Text>
            </View>
            <Text style={[styles.hello, { color: themed.textSecondary }]} numberOfLines={1}>
              {t('personalization.canvas.greeting')}
            </Text>
            <AppIcon name="notifications-outline" size={15} color={themed.textSecondary} />
          </View>
        )}

        <Text style={[styles.kicker, { color: themed.textSecondary }]}>
          {t('personalization.canvas.balance').toUpperCase()}
        </Text>
        <Text
          style={[styles.amount, { color: themed.textPrimary, fontSize: focus === 'all' ? 30 : 25 }]}
          numberOfLines={1}
        >
          {formatMoney(PREVIEW_BALANCE)}
        </Text>

        {showChart && (
          <View style={{ height: focus === 'chart' ? 68 : 44, marginTop: 6 }}>
            <Sparkline
              key={`${chartType}-${chartAnimStyle}-${chartSpeed}-${chartAccent}`}
              values={PREVIEW_VALUES}
              color={chartColor}
              accent={chartColor}
              accent2={chartColor2}
              height={focus === 'chart' ? 68 : 44}
              animate={animate && chartAnimStyle !== 'none'}
              duration={duration}
              chartType={chartType}
              animStyle={chartAnimStyle}
            />
          </View>
        )}

        {showCard && (
          <View style={[styles.card, { backgroundColor: themed.surface, borderColor: themed.border }]}>
            {/* ProSheen ya respeta `cardSheen` y reduce-motion por su cuenta. */}
            <ProSheen trigger={`${styleKey}-${chartAccent}`} />
            <Text style={[styles.cardTitle, { color: themed.textSecondary }]}>
              {t('personalization.canvas.byCategory').toUpperCase()}
            </Text>
            <View style={styles.catRow}>
              <View style={[styles.dot, { backgroundColor: themed.primary }]} />
              <Text style={[styles.catName, { color: themed.textPrimary }]} numberOfLines={1}>
                {t('personalization.canvas.sampleCategory')}
              </Text>
              <Text style={[styles.catPct, { color: amountInk }]}>42%</Text>
            </View>
            <View style={[styles.track, { backgroundColor: themed.border }]}>
              <View style={[styles.fill, { backgroundColor: amountInk }]} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

/** Barra compacta: al bajar, el lienzo no desaparece — se reduce a 64 px y sigue
 *  mostrando el tema. Sin esto, en el capítulo Fondo (14 efectos) se pierde de vista. */
export function PersonalizationCanvasBar({ onExpand }: { onExpand: () => void }) {
  const { colors, isDark, activePalette, backgroundStyleLight, backgroundStyleDark, backgroundIntensity } = useTheme();
  const { animate } = useProMotion();
  const { t } = useTranslation();
  const gradient = isDark ? activePalette.gradientDark : activePalette.gradientLight;
  const themed = isDark ? activePalette.colors.dark : activePalette.colors.light;

  return (
    <View style={[styles.bar, { borderColor: colors.border }]}>
      <LinearGradient colors={gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFillObject} />
      {isDark && <View style={[StyleSheet.absoluteFillObject, styles.scrim]} />}
      {animate && (
        <BackgroundEffect styleKey={isDark ? backgroundStyleDark : backgroundStyleLight} intensity={backgroundIntensity} speed={1} />
      )}
      <Text style={[styles.barAmount, { color: themed.textPrimary }]} numberOfLines={1}>
        {formatMoney(PREVIEW_BALANCE)}
      </Text>
      <View
        style={[styles.expand, { backgroundColor: themed.surface }]}
        accessibilityRole="button"
        accessibilityLabel={t('personalization.canvas.expand')}
        onTouchEnd={onExpand}
      >
        <AppIcon name="chevron-down" size={16} color={readableTint(themed.primary, themed.surface, 4.5)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { borderRadius: 24, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  scrim: { backgroundColor: 'rgba(0,0,0,0.28)' },
  radial: {
    position: 'absolute', top: '-30%', left: '-25%', width: '150%', height: '120%',
    borderRadius: 9999, opacity: 0.85,
  },
  content: { flex: 1, padding: 16 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 6 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 11, fontFamily: Fonts.extraBold },
  hello: { flex: 1, fontSize: 11, fontFamily: Fonts.regular },
  kicker: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1.4 },
  amount: { fontFamily: Fonts.extraBold, letterSpacing: -1, marginTop: 1 },
  card: { marginTop: 'auto', borderRadius: 16, borderWidth: 1, padding: 12, overflow: 'hidden' },
  cardTitle: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1.3 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  catName: { flex: 1, fontSize: 11.5, fontFamily: Fonts.semiBold },
  catPct: { fontSize: 11, fontFamily: Fonts.bold },
  track: { height: 5, borderRadius: 3, marginTop: 5, overflow: 'hidden' },
  fill: { height: '100%', width: '42%', borderRadius: 3 },

  bar: {
    height: 64, borderRadius: 16, borderWidth: 1, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10,
  },
  barAmount: { flex: 1, fontSize: 15, fontFamily: Fonts.extraBold, letterSpacing: -0.4 },
  expand: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
