import { useRef, useState, useEffect, useMemo, useId, type ReactNode } from 'react';
import { scrollFadeMask } from '../components/ScrollFadeEdges';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Animated, Easing, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import AppIcon, { AppIconName } from '../components/AppIcon';
import AppHeader from '../components/AppHeader';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import ScreenTransition from '../components/ScreenTransition';
import AppSegmentedControl from '../components/AppSegmentedControl';
import PaletteGrid from '../components/PaletteGrid';
import PersonalizationCanvas, { PersonalizationCanvasBar, CANVAS_HEIGHT, CANVAS_BAR_HEIGHT, type CanvasFocus } from '../components/PersonalizationCanvas';
import { PALETTE_MAP } from '../config/palettes';
import { LOOKS, matchLook, type Look } from '../config/looks';
import { accentInk } from '../utils/contrast';
import { BackgroundEffect, CLIP_BLURRED_CHILD } from '../components/AppBackground';
import { FxFrozen } from '../components/fx/FxLayer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, BACKGROUND_STYLE_VALUES, BACKGROUND_SPEED_FACTOR, BACKGROUND_BLUR_VALUES, BACKGROUND_SOFTNESS, PERSONALIZATION_SYNCED_AT_KEY, type BackgroundStyle, type BackgroundSpeed, type BackgroundBlur, type AuroraIntensity, type IconStroke, type ChartSpeed, type ChartType, type ChartAnimStyle, type ChartAccent,
  GRADIENT_STYLE_VALUES, type GradientStyle, type PaletteId,
} from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { useProMotion } from '../hooks/useProMotion';
import { updateUserColorPalette, updateUserPersonalization } from '../hooks/useUserProfile';
import { Sparkline, resolveChartAccent, resolveChartAccent2 } from '../components/BalanceCard';
import { Fonts } from '../config/fonts';

// ── Acordeón — exclusivo: abrir una sección cierra la anterior; ninguna abierta al entrar ──

function SwitchRow({ icon, label, sub, value, onValueChange, isLast }: {
  icon: AppIconName; label: string; sub: string; value: boolean; onValueChange: (v: boolean) => void; isLast?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <>
      <View style={styles.optionRow}>
        <View style={[styles.optionIconWrap, { backgroundColor: colors.primary + '18' }]}>
          <AppIcon name={icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.optionMeta}>
          <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{label}</Text>
          <Text style={[styles.optionSub, { color: colors.textSecondary }]}>{sub}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
        />
      </View>
      {!isLast && <View style={[styles.optionDivider, { backgroundColor: colors.border }]} />}
    </>
  );
}

const BACKGROUND_STYLES: BackgroundStyle[] = BACKGROUND_STYLE_VALUES;

// ── Tarjeta de fondo con vista previa EN VIVO (renderiza el efecto real a la
// intensidad y velocidad seleccionadas, no un mockup) ──
function BackgroundPreviewCard({ styleKey, label, selected, intensity, speed, softness, onPress }: {
  styleKey: BackgroundStyle; label: string; selected: boolean; intensity: AuroraIntensity; speed: number; softness: number; onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[
        styles.bgCard,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: selected ? colors.primary : 'transparent',
        },
      ]}
    >
      <View style={[styles.bgPreviewBox, CLIP_BLURRED_CHILD, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary }]}>
        {/* Los efectos reinician sus loops in-place al cambiar intensidad/velocidad — sin remount */}
        {styleKey === 'none' ? (
          <View style={styles.bgNoneWrap}>
            <AppIcon name="close-outline" size={18} color={colors.textTertiary} />
          </View>
        ) : (
          // Solo la miniatura seleccionada se anima. Antes se movían las 13 a la
          // vez (unos 144 elementos) y era el peor caso de consumo de la app.
          <FxFrozen frozen={!selected}>
            <BackgroundEffect styleKey={styleKey} intensity={intensity} speed={speed} softness={softness} />
          </FxFrozen>
        )}
      </View>
      <Text style={[styles.bgCardLabel, { color: selected ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      {selected && (
        <View style={[styles.bgCheckBadge, { backgroundColor: colors.primary }]}>
          <AppIcon name="checkmark" size={9} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const ICON_STROKE_OPTIONS: { key: IconStroke; labelKey: string }[] = [
  { key: 1.5, labelKey: 'thin' },
  { key: 2, labelKey: 'regular' },
  { key: 2.5, labelKey: 'bold' },
];

// ── Vista previa en vivo del brillo (barrido de luz) — réplica fiel de la
// tarjeta real que lo recibe hoy en Home: "Gastos por categoría" (el balance
// premium ya no tiene caja, así que ya no es el ejemplo correcto). ──

const INTENSITY_OPTIONS: AuroraIntensity[] = ['subtle', 'default', 'intense'];
const BG_SPEED_OPTIONS: BackgroundSpeed[] = ['slow', 'normal', 'fast'];
const CHART_SPEED_OPTIONS: ChartSpeed[] = ['slow', 'normal', 'fast'];
const CHART_PREVIEW_VALUES = [1080, 1240, 1190, 1340, 1284];
const CHART_TYPES: ChartType[] = ['line', 'area', 'bars', 'dots', 'stepped', 'lollipop'];

/** Los cuatro capítulos, en orden del cambio más notorio al más fino. */
const CHAPTERS = ['color', 'background', 'data', 'detail'] as const;
type Chapter = typeof CHAPTERS[number];
/** Qué enseña el lienzo en cada capítulo cuando se encoge. */
const CANVAS_FOCUS: Record<Chapter, CanvasFocus> = {
  color: 'all', background: 'bg', data: 'chart', detail: 'card',
};

/** Tira de looks: una combinación completa por tarjeta, más el estado "A medida". */
function LooksStrip({ looks, activeId, colors, t, onPick }: {
  looks: Look[]; activeId: string | null; colors: any; t: any; onPick: (l: Look) => void;
}) {
  return (
    <ScrollView
        horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lookStrip}>
      {looks.map((look) => {
        const pal = PALETTE_MAP[look.paletteId];
        const active = activeId === look.id;
        return (
          <TouchableOpacity
            key={look.id}
            onPress={() => onPick(look)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(`profile.palette.${look.paletteId}`)}
            style={[styles.lookCard, {
              backgroundColor: colors.surface,
              borderColor: active ? colors.primary : colors.border,
            }]}
          >
            <LinearGradient
              colors={pal.gradientDark}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.lookPreview}
            >
              <View style={styles.lookSwatches}>
                {pal.previewColors.map((c, i) => (
                  <View key={i} style={[styles.lookSwatch, { backgroundColor: c, marginLeft: i ? -7 : 0 }]} />
                ))}
              </View>
              {active && (
                <View style={[styles.lookCheck, { backgroundColor: colors.primary }]}>
                  <AppIcon name="checkmark" size={9} color={colors.onPrimary} />
                </View>
              )}
            </LinearGradient>
            <Text
              style={[styles.lookName, { color: active ? accentInk(colors, 'primary', colors.surface) : colors.textSecondary }]}
              numberOfLines={1}
            >
              {t(`profile.palette.${look.paletteId}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
      {!activeId && (
        <View style={[styles.lookCard, styles.lookCustom, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <AppIcon name="options-outline" size={18} color={accentInk(colors, 'primary', colors.surface)} />
          <Text style={[styles.lookName, { color: accentInk(colors, 'primary', colors.surface) }]} numberOfLines={1}>
            {t('personalization.customLook')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
const CHART_ANIM_STYLES: ChartAnimStyle[] = ['pulse', 'draw', 'tide', 'none'];
// Orden candidato — algunas paletas definen "secondary" igual a "success" (p.ej.
// deepWater), así que la lista real se deduplica por color en tiempo de render;
// "success" va antes que "secondary" para que gane el nombre más reconocible si chocan.
const CHART_ACCENT_CANDIDATES: ChartAccent[] = ['theme', 'success', 'secondary', 'gold', 'duoSuccess', 'duoTertiary', 'signed', 'signedLine', 'signedFill'];
const SIGNED_FAMILY: ChartAccent[] = ['signed', 'signedLine', 'signedFill'];

// ── Colores del swatch (anillo=línea, disco=contenido) — refleja EXACTAMENTE
// cómo se pinta el gráfico real para ese acento, no una convención aparte ──
function getSwatchColors(accent: ChartAccent, colors: { primary: string; secondary: string; success: string; expense: string; tertiary: string }) {
  if (accent === 'signed') return { lineColor: colors.success, lineColor2: colors.expense, fillColor: colors.success, fillColor2: colors.expense };
  if (accent === 'signedLine') return { lineColor: colors.success, lineColor2: colors.expense, fillColor: colors.primary };
  if (accent === 'signedFill') return { lineColor: colors.primary, fillColor: colors.success, fillColor2: colors.expense };
  const lineColor = resolveChartAccent(accent, colors, CHART_PREVIEW_VALUES);
  const fillColor = resolveChartAccent2(accent, colors) ?? lineColor;
  return { lineColor, fillColor };
}

// ── Gráfico con cruce (dissolve) de color — misma forma en ambas capas, solo la
// opacidad de cada color se cruza. Usado en toda vista previa cuando el acento
// es "Dinámico", para que el efecto suave sea consistente en toda la pantalla ──
// `mode`: 'both' = todo el gráfico cruza color (Dinámico); 'line' = solo la
// línea/barras cruza, el contenido queda fijo en `staticColor` (Línea dinámica);
// 'fill' = solo el contenido cruza, la línea queda fija (Contenido dinámico).
type SignedCrossfade = { fade: Animated.Value; upColor: string; downColor: string; mode?: 'both' | 'line' | 'fill'; staticColor?: string };

function CrossfadeSparkline({ chartType, animStyle, height, duration, crossfade, motion }: {
  chartType: ChartType; animStyle: ChartAnimStyle; height: number; duration: number; crossfade: SignedCrossfade; motion: boolean;
}) {
  // "Barras" no tiene canal de contenido separado — vive todo en el canal de
  // línea/trazo, así que un modo parcial ('line'/'fill') no tiene nada que mostrar
  // en ese canal y el gráfico se ve congelado. Forzamos cruce completo en ese caso.
  const mode = chartType === 'bars' ? 'both' : (crossfade.mode ?? 'both');
  const dynamicRenderFill = mode !== 'line';
  const dynamicRenderStroke = mode !== 'fill';
  return (
    <View style={{ width: '100%', height }}>
      {mode !== 'both' && crossfade.staticColor && (
        <View style={StyleSheet.absoluteFill}>
          <Sparkline
            values={CHART_PREVIEW_VALUES}
            color={crossfade.staticColor}
            accent={crossfade.staticColor}
            height={height}
            animate={motion && animStyle !== 'none'}
            duration={duration}
            chartType={chartType}
            animStyle={animStyle}
            renderFill={mode === 'line'}
            renderStroke={mode === 'fill'}
          />
        </View>
      )}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: crossfade.fade }]}>
        <Sparkline
          values={CHART_PREVIEW_VALUES}
          color={crossfade.upColor}
          accent={crossfade.upColor}
          height={height}
          animate={motion && animStyle !== 'none'}
          duration={duration}
          chartType={chartType}
          animStyle={animStyle}
          renderFill={dynamicRenderFill}
          renderStroke={dynamicRenderStroke}
        />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: crossfade.fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
        <Sparkline
          values={CHART_PREVIEW_VALUES}
          color={crossfade.downColor}
          accent={crossfade.downColor}
          height={height}
          animate={motion && animStyle !== 'none'}
          duration={duration}
          chartType={chartType}
          animStyle={animStyle}
          renderFill={dynamicRenderFill}
          renderStroke={dynamicRenderStroke}
        />
      </Animated.View>
    </View>
  );
}

// ── Tarjeta de tipo de gráfico — vista previa EN VIVO con la animación y color actuales ──
function ChartTypeCard({ type, label, selected, animStyle, color, color2, crossfade, motion, onPress }: {
  type: ChartType; label: string; selected: boolean; animStyle: ChartAnimStyle; color: string; color2?: string; crossfade?: SignedCrossfade; motion: boolean; onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.bgCard, { backgroundColor: colors.surfaceSecondary, borderColor: selected ? colors.primary : 'transparent' }]}
    >
      <View style={[styles.bgPreviewBox, CLIP_BLURRED_CHILD, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary }]}>
        {crossfade ? (
          <CrossfadeSparkline chartType={type} animStyle={animStyle} height={64} duration={4200} crossfade={crossfade} motion={motion} />
        ) : (
          <Sparkline
            key={`${type}-${animStyle}`}
            values={CHART_PREVIEW_VALUES}
            color={color}
            accent={color}
            accent2={color2}
            height={64}
            animate={motion && animStyle !== 'none'}
            duration={4200}
            chartType={type}
            animStyle={animStyle}
          />
        )}
      </View>
      <Text style={[styles.bgCardLabel, { color: selected ? colors.primary : colors.textSecondary }]} numberOfLines={1}>{label}</Text>
      {selected && (
        <View style={[styles.bgCheckBadge, { backgroundColor: colors.primary }]}>
          <AppIcon name="checkmark" size={9} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Tarjeta de estilo de animación — vista previa EN VIVO con el tipo de gráfico actual ──
function ChartAnimCard({ anim, label, selected, chartType, color, color2, crossfade, motion, onPress }: {
  anim: ChartAnimStyle; label: string; selected: boolean; chartType: ChartType; color: string; color2?: string; crossfade?: SignedCrossfade; motion: boolean; onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.bgCard, { backgroundColor: colors.surfaceSecondary, borderColor: selected ? colors.primary : 'transparent' }]}
    >
      <View style={[styles.bgPreviewBox, CLIP_BLURRED_CHILD, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary }]}>
        {crossfade ? (
          <CrossfadeSparkline chartType={chartType} animStyle={anim} height={64} duration={4200} crossfade={crossfade} motion={motion} />
        ) : (
          <Sparkline
            key={`${chartType}-${anim}`}
            values={CHART_PREVIEW_VALUES}
            color={color}
            accent={color}
            accent2={color2}
            height={64}
            animate={motion && anim !== 'none'}
            duration={4200}
            chartType={chartType}
            animStyle={anim}
          />
        )}
      </View>
      <Text style={[styles.bgCardLabel, { color: selected ? colors.primary : colors.textSecondary }]} numberOfLines={1}>{label}</Text>
      {selected && (
        <View style={[styles.bgCheckBadge, { backgroundColor: colors.primary }]}>
          <AppIcon name="checkmark" size={9} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Swatch de color de acento — el ANILLO representa la línea/barras y el
// DISCO interior el contenido/relleno, igual que en el gráfico real. Cada canal
// puede ser sólido (color fijo) o partido en dos mitades con flechas ▲▼ (cambia
// según la tendencia). Así "Línea dinámica" (anillo partido, disco sólido) y
// "Contenido dinámico" (disco partido, anillo sólido) se distinguen a simple
// vista entre sí y de "Dinámico" (ambos partidos) ──
const SWATCH_SIZE = 38;
function SwatchHalf({ id, colorA, colorB }: { id: string; colorA: string; colorB?: string }) {
  if (!colorB) return null;
  return (
    <SvgGradient id={id} x1="0" y1="0" x2="1" y2="0">
      <Stop offset="0" stopColor={colorA} />
      <Stop offset="0.5" stopColor={colorA} />
      <Stop offset="0.5" stopColor={colorB} />
      <Stop offset="1" stopColor={colorB} />
    </SvgGradient>
  );
}

function AccentSwatch({ label, selected, lineColor, lineColor2, fillColor, fillColor2, onPress }: {
  label: string; selected: boolean; lineColor: string; lineColor2?: string; fillColor: string; fillColor2?: string; onPress: () => void;
}) {
  const { colors } = useTheme();
  const lineSplit = !!lineColor2;
  const fillSplit = !!fillColor2;
  const isDynamic = lineSplit || fillSplit;
  const c = SWATCH_SIZE / 2;
  // IDs de gradiente únicos por instancia — en web los ids de SVG son globales
  // al documento; con 9 swatches simultáneos, ids fijos hacían que todos los
  // bicolores ("Dinámico", "Línea dinámica", "Contenido dinámico") mostraran
  // el gradiente de la PRIMERA instancia montada en vez del suyo propio.
  // Se sanea (sin ':') porque algunos motores SVG resuelven url(#id) como si
  // fuera un selector CSS, donde ':' tiene significado especial (pseudo-clases).
  const uid = useId().replace(/:/g, '');
  const ringGradId = `ringGrad-${uid}`;
  const fillGradId = `fillGrad-${uid}`;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.accentSwatchWrap}>
      <View style={[styles.accentSwatch, { borderColor: selected ? colors.textPrimary : 'transparent' }]}>
        <Svg width={SWATCH_SIZE} height={SWATCH_SIZE} viewBox={`0 0 ${SWATCH_SIZE} ${SWATCH_SIZE}`}>
          <Defs>
            <SwatchHalf id={ringGradId} colorA={lineColor} colorB={lineColor2} />
            <SwatchHalf id={fillGradId} colorA={fillColor} colorB={fillColor2} />
          </Defs>
          <Circle cx={c} cy={c} r={c - 2.5} fill="none" stroke={lineSplit ? `url(#${ringGradId})` : lineColor} strokeWidth={4} />
          <Circle cx={c} cy={c} r={c - 8} fill={fillSplit ? `url(#${fillGradId})` : fillColor} />
        </Svg>
        {isDynamic && !selected && (
          <>
            {/* Respaldo oscuro semitransparente — garantiza contraste de la flecha sin importar
                qué color de línea/relleno le toque debajo (ej. cian claro de "Del tema") */}
            <View style={[styles.accentSwatchArrowBadge, { left: 2, top: 3 }]}>
              <AppIcon name="trending-up" size={8} color="#FFFFFF" />
            </View>
            <View style={[styles.accentSwatchArrowBadge, { right: 2, bottom: 3 }]}>
              <AppIcon name="trending-down" size={8} color="#FFFFFF" />
            </View>
          </>
        )}
        {selected && (
          <View style={styles.accentSwatchCheck}>
            <AppIcon name="checkmark" size={12} color="#FFFFFF" />
          </View>
        )}
      </View>
      <Text style={[styles.accentSwatchLabel, { color: selected ? colors.textPrimary : colors.textTertiary }]} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function PersonalizationScreen() {
  const { t } = useTranslation();
  const { user, isPremium } = useAuthStore();

  // La entrada visible ya está gateada en el perfil, pero la ruta es alcanzable
  // por URL directa (PWA): un free vería opciones que nunca se aplican.
  useEffect(() => {
    if (!isPremium) router.replace('/upgrade' as Parameters<typeof router.replace>[0]);
  }, [isPremium]);
  const {
    colors, isDark, paletteId, setPaletteId,
    backgroundStyleLight, backgroundStyleDark, setBackgroundStyleFor,
    backgroundIntensity, setBackgroundIntensity,
    backgroundSpeed, setBackgroundSpeed,
    backgroundBlurLight, backgroundBlurDark, setBackgroundBlurFor,
    cardSheen, setCardSheen,
    iconStroke, setIconStroke,
    streakConfetti, setStreakConfetti,
    chartType, setChartType, chartAnimStyle, setChartAnimStyle,
    chartSpeed, setChartSpeed, chartAccent, setChartAccent,
    gradientStyle, setGradientStyle,
  } = useTheme();
  const [chapter, setChapter] = useState<Chapter>('color');
  // El lienzo VIAJA CON EL SCROLL (va dentro de la lista), así que su movimiento lo
  // hace el propio scroller y no puede trabarse. Lo único animado es la barra
  // compacta, con opacidad y translateY: dos propiedades de compositor.
  //
  // La versión anterior animaba la ALTURA del lienzo contra `scrollY`: cada
  // fotograma de scroll obligaba a recalcular el layout del lienzo entero (SVG
  // animados incluidos) y, además, los nodos de `interpolate`/`Animated.add` se
  // recreaban en cada render y se iban acumulando sobre `scrollY`. De ahí que
  // subiendo y bajando se trabara y acabara dejando de responder.
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const chartDuration = chartSpeed === 'slow' ? 6500 : chartSpeed === 'normal' ? 4200 : 2600;

  /** La paleta se guarda además en el perfil: es lo único de la personalización que
   *  otros usuarios ven (el color de tus movimientos compartidos). */
  const handleSetPaletteId = (id: PaletteId) => {
    setPaletteId(id);
    if (user?.uid) updateUserColorPalette(user.uid, id).catch(() => {});
  };

  // Un look es exactamente esta combinación: si el usuario toca cualquier control
  // suelto, deja de coincidir y la tira muestra "A medida". Sin estado paralelo.
  const activeLook = matchLook({
    paletteId, backgroundLight: backgroundStyleLight, backgroundDark: backgroundStyleDark,
    gradientStyle, chartType, chartAccent,
  });
  const applyLook = (look: Look) => {
    handleSetPaletteId(look.paletteId);
    setBackgroundStyleFor('light', look.backgroundLight);
    setBackgroundStyleFor('dark', look.backgroundDark);
    setGradientStyle(look.gradientStyle);
    setChartType(look.chartType);
    setChartAccent(look.chartAccent);
  };
  // Las vistas previas respetan reduce-motion igual que el gráfico real del Home:
  // antes animaban siempre, así que con "Reducir movimiento" activo el usuario
  // elegía una animación que en su Home nunca se movía.
  const { animate: motionEnabled, reduceMotion } = useProMotion();

  // Alto del lienzo del capítulo activo: la barra entra justo cuando el lienzo
  // termina de salir por arriba, sea 292 px (Color) o 196 (el resto).
  const fullHeight = CANVAS_HEIGHT[CANVAS_FOCUS[chapter]];

  // UN nodo por interpolación para toda la vida del componente. Dependen del alto
  // del capítulo, así que se rehacen SOLO al cambiar de capítulo, nunca por render.
  const { barOpacity, barShift, canvasShift, canvasFade, canvasScale } = useMemo(() => {
    const start = Math.max(24, fullHeight - CANVAS_BAR_HEIGHT - 24);
    const end = start + 56;
    return {
      barOpacity: scrollY.interpolate({ inputRange: [start, end], outputRange: [0, 1], extrapolate: 'clamp' }),
      // Entra deslizándose desde arriba; fuera de rango queda escondida tras el
      // recorte de su hueco, así que no tapa ni recibe toques.
      barShift: scrollY.interpolate({
        inputRange: [start, end],
        outputRange: [-(CANVAS_BAR_HEIGHT + 8), 0],
        extrapolate: 'clamp',
      }),
      // Parallax: el lienzo se queda ~35 % por detrás del contenido, se atenúa y se
      // aleja un poco al salir. Sin esto sube pegado al dedo, a la misma velocidad
      // que la lista, y la salida se lee seca. Las tres son propiedades de
      // compositor (translate/opacity/scale): no tocan el layout de nada.
      canvasShift: scrollY.interpolate({
        inputRange: [0, fullHeight],
        outputRange: [0, fullHeight * 0.35],
        extrapolate: 'clamp',
      }),
      canvasFade: scrollY.interpolate({
        inputRange: [0, fullHeight * 0.85],
        outputRange: [1, 0.12],
        extrapolate: 'clamp',
      }),
      canvasScale: scrollY.interpolate({
        inputRange: [0, fullHeight],
        outputRange: [1, 0.94],
        extrapolate: 'clamp',
      }),
    };
  }, [scrollY, fullHeight]);

  // "Dinámico" no es una mezcla — es un color ÚNICO que cambia según la tendencia
  // real (verde si sube, rojo si baja). Para que se note en toda vista previa (no
  // solo en el swatch), alternamos entre ambos casos cada pocos segundos mientras
  // está seleccionado. `signedFade` cruza (dissolve) suavemente entre ambos casos
  // en vez de saltar de un color al otro de golpe — compartido por el preview
  // grande y las tarjetas de tipo/animación.
  const signedFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!SIGNED_FAMILY.includes(chartAccent) || !motionEnabled) return;
    signedFade.setValue(1);
    let up = true;
    const id = setInterval(() => {
      up = !up;
      Animated.timing(signedFade, {
        toValue: up ? 1 : 0,
        duration: 2000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }, 6000);
    return () => clearInterval(id);
  }, [chartAccent, signedFade, motionEnabled]);

  const chartPreviewColor = resolveChartAccent(chartAccent, colors, CHART_PREVIEW_VALUES);
  const chartPreviewColor2 = resolveChartAccent2(chartAccent, colors);
  // Crossfade compartido por toda vista previa cuando el acento activo es de la
  // familia "dinámica" — el modo (qué canal cruza) depende de cuál esté elegido.
  const signedCrossfade: SignedCrossfade = {
    fade: signedFade,
    upColor: colors.success,
    downColor: colors.expense,
    mode: chartAccent === 'signedLine' ? 'line' : chartAccent === 'signedFill' ? 'fill' : 'both',
    staticColor: colors.primary,
  };

  // Oculta opciones que en la paleta activa resuelven al mismo color (par) que
  // otra ya listada (p.ej. "Secundario" == "Verde éxito" en deepWater), y los
  // bicolores sin contraste real (color1 === color2 en esa paleta).
  const seenAccentKeys = new Set<string>();
  const chartAccentOptions = CHART_ACCENT_CANDIDATES.filter((a) => {
    if (SIGNED_FAMILY.includes(a)) return true;
    // El acento ACTIVO nunca se oculta: si se eligió con otra paleta donde sí
    // tenía color propio, al cambiar de paleta desaparecía de la lista y ninguna
    // opción salía marcada — parecía que la elección se había perdido.
    if (a === chartAccent) return true;
    const hex1 = resolveChartAccent(a, colors, CHART_PREVIEW_VALUES).toLowerCase();
    const hex2 = resolveChartAccent2(a, colors)?.toLowerCase();
    if (hex2 && hex2 === hex1) return false;
    const key = `${hex1}|${hex2 ?? ''}`;
    if (seenAccentKeys.has(key)) return false;
    seenAccentKeys.add(key);
    return true;
  });

  // Modo cuyo fondo se está editando — permite un efecto distinto para claro y
  // oscuro. Por defecto, el modo activo ahora mismo.
  const [bgTarget, setBgTarget] = useState<'light' | 'dark'>(isDark ? 'dark' : 'light');
  const targetBgStyle = bgTarget === 'dark' ? backgroundStyleDark : backgroundStyleLight;
  const targetBgBlur = bgTarget === 'dark' ? backgroundBlurDark : backgroundBlurLight;

  // Ninguna sección abierta al entrar; abrir una cierra la que estuviera abierta.

  // Sync a Firestore (debounced): toda la personalización viaja con la cuenta,
  // no solo la paleta — sobrevive reinstalaciones y cambios de dispositivo.
  // Con `updatedAt`: el arranque solo aplica lo remoto si es MÁS RECIENTE que
  // lo local (antes, un doc viejo pisaba las elecciones frescas del usuario y
  // parecía que la personalización "no se aplicaba").
  const prefsRef = useRef<Parameters<typeof updateUserPersonalization>[1] | null>(null);
  prefsRef.current = {
    backgroundStyleLight, backgroundStyleDark, backgroundIntensity, backgroundSpeed,
    backgroundBlurLight, backgroundBlurDark,
    cardSheen, iconStroke, streakConfetti,
    chartType, chartAnimStyle, chartSpeed, chartAccent, gradientStyle,
  };
  const dirtyRef = useRef(false);
  const isFirstSync = useRef(true);
  const syncNow = (uid: string) => {
    dirtyRef.current = false;
    const now = Date.now();
    AsyncStorage.setItem(PERSONALIZATION_SYNCED_AT_KEY, String(now)).catch(() => {});
    updateUserPersonalization(uid, { ...prefsRef.current!, updatedAt: now }).catch(() => {});
  };
  useEffect(() => {
    if (isFirstSync.current) { isFirstSync.current = false; return; }
    if (!user?.uid) return;
    dirtyRef.current = true;
    const timer = setTimeout(() => syncNow(user.uid), 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, backgroundStyleLight, backgroundStyleDark, backgroundIntensity, backgroundSpeed, backgroundBlurLight, backgroundBlurDark, cardSheen, iconStroke, streakConfetti, chartType, chartAnimStyle, chartSpeed, chartAccent, gradientStyle]);
  // Flush al desmontar: antes el debounce pendiente se CANCELABA al salir de la
  // pantalla y los últimos cambios nunca llegaban a Firestore.
  useEffect(() => () => {
    const uid = useAuthStore.getState().user?.uid;
    if (dirtyRef.current && uid) syncNow(uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScreenTransition>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader showBack />
          <PageTitle title={t('profile.palette.title')} description={t('profile.palette.subtitle')} />

          {/* Cuatro capítulos, del cambio más notorio al más fino. Van FIJOS y
              sobre el lienzo: son navegación, tienen que estar siempre a mano.
              El margen lateral lo pone el contenedor (padding), no el control:
              con `width:'100%'` + `marginHorizontal` el control se desbordaba
              32 px y la pastilla salía por los dos lados de la pantalla. */}
          <View style={styles.chapterBarWrap}>
            <AppSegmentedControl
              segments={CHAPTERS.map((c) => ({ key: c, label: t(`personalization.chapter.${c}`) }))}
              activeKey={chapter}
              onChange={(key) => setChapter(key as Chapter)}
            />
          </View>

          <View style={styles.scrollArea}>
          <Animated.ScrollView
            ref={scrollRef}
            style={scrollFadeMask(0, 0)}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            // Solo alimenta la opacidad y el desplazamiento de la barra compacta:
            // ninguna propiedad de layout depende del scroll.
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true },
            )}
          >
            {/* Lienzo vivo: el conjunto del tema. Viaja DENTRO de la lista, así que
                el desplazamiento lo hace el propio scroller; el parallax solo lo
                frena y lo atenúa para que la salida sea suave. */}
            <Animated.View
              style={[
                styles.canvasInScroll,
                reduceMotion ? null : {
                  opacity: canvasFade,
                  transform: [{ translateY: canvasShift }, { scale: canvasScale }],
                },
              ]}
            >
              <PersonalizationCanvas focus={CANVAS_FOCUS[chapter]} bgTarget={chapter === 'background' ? bgTarget : undefined} />
            </Animated.View>

            {chapter === 'color' && (
              <>
                <Text style={[styles.chartGroupLabel, { color: colors.textTertiary }]}>
                  {t('personalization.looksLabel')}
                </Text>
                <LooksStrip
                  looks={LOOKS}
                  activeId={activeLook?.id ?? null}
                  colors={colors}
                  t={t}
                  onPick={applyLook}
                />
                <Text style={[styles.chartGroupLabel, styles.bgControlLabel, { color: colors.textTertiary }]}>
                  {t('personalization.sectionPalette')}
                </Text>
                <PaletteGrid colors={colors} paletteId={paletteId} setPaletteId={handleSetPaletteId} t={t} />
              </>
            )}

            {chapter === 'background' && (
              <>
                {/* Un fondo por modo: elige cuál estás editando */}
              <Text style={[styles.chartGroupLabel, { color: colors.textTertiary }]}>{t('personalization.bgTargetLabel')}</Text>
              <AppSegmentedControl
                segments={[
                  { key: 'light', label: t('personalization.bgTarget.light') },
                  { key: 'dark', label: t('personalization.bgTarget.dark') },
                ]}
                activeKey={bgTarget}
                onChange={(key) => setBgTarget(key as 'light' | 'dark')}
                style={styles.bgGridSpacing}
              />
              {/* Controles globales ANTES de la grilla: afectan a todos los
                  previews y así se descubren sin scrollear 6 filas de tarjetas */}
              {targetBgStyle !== 'none' && (
                <>
                  <Text style={[styles.chartGroupLabel, { color: colors.textTertiary }]}>{t('personalization.bgIntensityLabel')}</Text>
                  <AppSegmentedControl
                    segments={INTENSITY_OPTIONS.map((i) => ({ key: i, label: t(`personalization.intensity.${i}`) }))}
                    activeKey={backgroundIntensity}
                    onChange={(key) => setBackgroundIntensity(key as AuroraIntensity)}
                  />
                  <Text style={[styles.chartGroupLabel, styles.bgControlLabel, { color: colors.textTertiary }]}>{t('personalization.bgSpeedLabel')}</Text>
                  <AppSegmentedControl
                    segments={BG_SPEED_OPTIONS.map((s) => ({ key: s, label: t(`personalization.bgSpeed.${s}`) }))}
                    activeKey={backgroundSpeed}
                    onChange={(key) => setBackgroundSpeed(key as BackgroundSpeed)}
                  />
                  {/* Desenfoque: propio de CADA modo, como el efecto. Es lo que
                      mantiene el fondo detrás del contenido en vez de encima. */}
                  <Text style={[styles.chartGroupLabel, styles.bgControlLabel, { color: colors.textTertiary }]}>{t('personalization.bgBlurLabel')}</Text>
                  <AppSegmentedControl
                    segments={BACKGROUND_BLUR_VALUES.map((b) => ({ key: b, label: t(`personalization.bgBlur.${b}`) }))}
                    activeKey={targetBgBlur}
                    onChange={(key) => setBackgroundBlurFor(bgTarget, key as BackgroundBlur)}
                  />
                  <Text style={[styles.chartAccentHint, { color: colors.textTertiary }]}>{t('personalization.bgBlurHint')}</Text>
                </>
              )}
              {/* La forma del degradado va ANTES de la grilla: afecta a la pantalla
                  entera, no a un efecto concreto. */}
              <Text style={[styles.chartGroupLabel, styles.bgControlLabel, { color: colors.textTertiary }]}>
                {t('personalization.gradientStyleLabel')}
              </Text>
              <AppSegmentedControl
                segments={GRADIENT_STYLE_VALUES.map((g) => ({ key: g, label: t(`personalization.gradientStyle.${g}`) }))}
                activeKey={gradientStyle}
                onChange={(key) => setGradientStyle(key as GradientStyle)}
                style={styles.bgGridSpacing}
              />
              <View style={styles.bgGrid}>
                {BACKGROUND_STYLES.map((key) => (
                  <BackgroundPreviewCard
                    key={key}
                    styleKey={key}
                    label={t(`personalization.background.${key}`)}
                    selected={targetBgStyle === key}
                    intensity={backgroundIntensity}
                    speed={BACKGROUND_SPEED_FACTOR[backgroundSpeed]}
                    softness={BACKGROUND_SOFTNESS[targetBgBlur]}
                    onPress={() => setBackgroundStyleFor(bgTarget, key)}
                  />
                ))}
              </View>
              </>
            )}

            {chapter === 'data' && (
              <>
                <Text style={[styles.chartGroupLabel, { color: colors.textTertiary }]}>{t('personalization.chartTypeLabel')}</Text>
              <View style={styles.bgGrid}>
                {CHART_TYPES.map((type) => (
                  <ChartTypeCard
                    key={type}
                    type={type}
                    label={t(`personalization.chartType.${type}`)}
                    selected={chartType === type}
                    animStyle={chartAnimStyle}
                    color={chartPreviewColor}
                    color2={chartPreviewColor2}
                    crossfade={SIGNED_FAMILY.includes(chartAccent) ? signedCrossfade : undefined}
                    motion={motionEnabled}
                    onPress={() => setChartType(type)}
                  />
                ))}
              </View>

              <Text style={[styles.chartGroupLabel, { color: colors.textTertiary }]}>{t('personalization.chartAnimLabel')}</Text>
              <View style={styles.bgGrid}>
                {CHART_ANIM_STYLES.map((anim) => (
                  <ChartAnimCard
                    key={anim}
                    anim={anim}
                    label={t(`personalization.chartAnim.${anim}`)}
                    selected={chartAnimStyle === anim}
                    chartType={chartType}
                    color={chartPreviewColor}
                    color2={chartPreviewColor2}
                    crossfade={SIGNED_FAMILY.includes(chartAccent) ? signedCrossfade : undefined}
                    motion={motionEnabled}
                    onPress={() => setChartAnimStyle(anim)}
                  />
                ))}
              </View>
              {chartAnimStyle !== 'none' && (
                <AppSegmentedControl
                  segments={CHART_SPEED_OPTIONS.map((s) => ({ key: s, label: t(`personalization.chartSpeed.${s}`) }))}
                  activeKey={chartSpeed}
                  onChange={(key) => setChartSpeed(key as ChartSpeed)}
                  style={styles.intensitySpacing}
                />
              )}

              <Text style={[styles.chartGroupLabel, styles.chartAccentLabelSpacing, { color: colors.textTertiary }]}>{t('personalization.chartAccentLabel')}</Text>
              <Text style={[styles.chartAccentHint, { color: colors.textTertiary }]}>{t('personalization.chartAccentHint')}</Text>
              <View style={styles.accentRow}>
                {chartAccentOptions.map((a) => {
                  const sw = getSwatchColors(a, colors);
                  return (
                    <AccentSwatch
                      key={a}
                      label={t(`personalization.chartAccent.${a}`)}
                      selected={chartAccent === a}
                      lineColor={sw.lineColor}
                      lineColor2={sw.lineColor2}
                      fillColor={sw.fillColor}
                      fillColor2={sw.fillColor2}
                      onPress={() => setChartAccent(a)}
                    />
                  );
                })}
              </View>
              </>
            )}

            {chapter === 'detail' && (
              <>
                <View style={styles.iconPreviewRow}>
                  {(['home-outline', 'wallet-outline', 'card-outline', 'star-outline', 'person-outline'] as const).map((n) => (
                    <AppIcon key={n} name={n} size={24} color={colors.primary} strokeWidth={iconStroke} />
                  ))}
                </View>
                <AppSegmentedControl
                segments={ICON_STROKE_OPTIONS.map((o) => ({ key: String(o.key), label: t(`personalization.iconStroke.${o.labelKey}`) }))}
                activeKey={String(iconStroke)}
                onChange={(key) => setIconStroke(Number(key) as IconStroke)}
                style={styles.intensitySpacing}
              />
                <View style={styles.rowsWrap}>
                <SwitchRow
                  icon="sparkles-outline"
                  label={t('personalization.cardSheen.label')}
                  sub={t('personalization.cardSheen.sub')}
                  value={cardSheen}
                  onValueChange={setCardSheen}
                  isLast
                />
              </View>
                <View style={styles.rowsWrap}>
                  <SwitchRow
                    icon="gift-outline"
                    label={t('personalization.confetti.label')}
                    sub={t('personalization.confetti.sub')}
                    value={streakConfetti}
                    onValueChange={setStreakConfetti}
                    isLast
                  />
                </View>
                <Text style={[styles.chartGroupLabel, styles.bgControlLabel, { color: colors.textTertiary }]}>
                  {t('personalization.roadmapTitle')}
                </Text>
                <View style={styles.roadmapWrap}>
                {(t('personalization.roadmapItems', { returnObjects: true }) as string[]).map((item, i) => (
                  <View key={i} style={styles.roadmapRow}>
                    <AppIcon name="star-outline" size={13} color={colors.textTertiary} />
                    <Text style={[styles.roadmapText, { color: colors.textSecondary }]}>{item}</Text>
                  </View>
                ))}
              </View>
              </>
            )}
            <View style={{ height: 28 }} />
          </Animated.ScrollView>

          {/* Barra compacta: releva al lienzo cuando este ya se ha ido por arriba,
              para no perder de vista el resultado mientras se tocan los ajustes.
              Solo opacidad y translateY (compositor). Fuera de rango queda
              escondida tras el recorte del hueco: ni se ve ni recibe toques. */}
          {!reduceMotion && (
            <View style={styles.barSlot} pointerEvents="box-none">
              <Animated.View
                style={[styles.barInner, { opacity: barOpacity, transform: [{ translateY: barShift }] }]}
              >
                <PersonalizationCanvasBar onExpand={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} />
              </Animated.View>
            </View>
          )}
          </View>
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollArea: { flex: 1 },
  canvasInScroll: { paddingBottom: 14 },
  // Hueco de la barra compacta, superpuesto al scroll: no ocupa layout, así que su
  // entrada y salida no mueven ni un píxel del contenido. `overflow: hidden`
  // esconde la barra cuando está desplazada fuera.
  barSlot: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', overflow: 'hidden', paddingBottom: 10 },
  barInner: { width: '100%', maxWidth: 640, paddingHorizontal: 16 },
  chapterBarWrap: { paddingHorizontal: 16, marginTop: 12, marginBottom: 4, width: '100%', maxWidth: 640, alignSelf: 'center' },
  lookStrip: { gap: 9, paddingRight: 8, paddingBottom: 2 },
  lookCard: { width: 104, borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },
  lookCustom: { alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, width: 84 },
  lookPreview: { height: 62, padding: 8, justifyContent: 'flex-end', position: 'relative' },
  lookSwatches: { flexDirection: 'row' },
  lookSwatch: { width: 16, height: 16, borderRadius: 8 },
  lookCheck: { position: 'absolute', top: 6, right: 6, width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  lookName: { fontSize: 10, fontFamily: Fonts.bold, paddingHorizontal: 8, paddingVertical: 6 },
  scroll: { padding: 16, paddingTop: 4, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },
  intensitySpacing: { marginTop: 10 },
  bgControlLabel: { marginTop: 14 },
  bgGridSpacing: { marginBottom: 16 },
  bgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // flexGrow 0: con 11 tarjetas, la impar final NO debe estirarse a ancho completo
  bgCard: { width: '47%', flexGrow: 0, borderRadius: 16, borderWidth: 2, padding: 8, alignItems: 'center' },
  bgPreviewBox: { width: '100%', height: 64, borderRadius: 10, overflow: 'hidden', position: 'relative', marginBottom: 8 },
  bgNoneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bgCardLabel: { fontSize: 12, fontFamily: Fonts.semiBold },
  bgCheckBadge: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowsWrap: { marginHorizontal: -16 },
  // Preview en vivo de efectos de tarjeta — réplica de "Gastos por categoría"
  chartGroupLabel: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4, marginBottom: 8 },
  chartAccentLabelSpacing: { marginTop: 22 },
  chartAccentHint: { fontSize: 11, fontFamily: Fonts.regular, marginTop: 0, marginBottom: 14, lineHeight: 16 },
  accentRow: { flexDirection: 'row', flexWrap: 'wrap' },
  accentSwatchWrap: { width: '25%', alignItems: 'center', gap: 5, paddingVertical: 6 },
  accentSwatch: { width: SWATCH_SIZE, height: SWATCH_SIZE, borderRadius: SWATCH_SIZE / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  accentSwatchCheck: { position: 'absolute', width: 17, height: 17, borderRadius: 8.5, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  accentSwatchArrowBadge: { position: 'absolute', width: 13, height: 13, borderRadius: 6.5, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  accentSwatchLabel: { fontSize: 10, fontFamily: Fonts.medium, textAlign: 'center' },
  iconPreviewRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8, marginBottom: 4 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  optionIconWrap: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  optionMeta: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 14, fontFamily: Fonts.medium },
  optionSub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 1 },
  optionDivider: { height: 1, marginLeft: 64 },
  roadmapWrap: { gap: 10 },
  roadmapRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  roadmapText: { flex: 1, fontSize: 13, fontFamily: Fonts.regular, lineHeight: 18 },
});
