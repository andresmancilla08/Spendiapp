import { useRef, useState, useEffect, type ReactNode } from 'react';
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
import { BackgroundEffect } from '../components/AppBackground';
import { useTheme, BACKGROUND_STYLE_VALUES, BACKGROUND_SPEED_FACTOR, type BackgroundStyle, type BackgroundSpeed, type AuroraIntensity, type IconStroke, type ChartSpeed, type ChartType, type ChartAnimStyle, type ChartAccent } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { updateUserColorPalette, updateUserPersonalization } from '../hooks/useUserProfile';
import { Sparkline, resolveChartAccent, resolveChartAccent2 } from '../components/BalanceCard';
import { Fonts } from '../config/fonts';

// ── Acordeón — exclusivo: abrir una sección cierra la anterior; ninguna abierta al entrar ──
function AccordionSection({ id, icon, title, open, onToggle, children }: {
  id: string; icon: AppIconName; title: string; open: boolean; onToggle: (id: string) => void; children: ReactNode;
}) {
  const { colors } = useTheme();
  const [contentH, setContentH] = useState(0);
  const anim = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [open]);

  return (
    <View style={[styles.accordion, { backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={() => onToggle(id)}
        activeOpacity={0.7}
      >
        <View style={[styles.accordionIconWrap, { backgroundColor: colors.primary + '18' }]}>
          <AppIcon name={icon} size={17} color={colors.primary} />
        </View>
        <Text style={[styles.accordionTitle, { color: colors.textPrimary }]}>{title}</Text>
        <AppIcon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
      </TouchableOpacity>
      <Animated.View style={{ height: anim.interpolate({ inputRange: [0, 1], outputRange: [0, contentH] }), overflow: 'hidden' }}>
        <View
          style={styles.accordionContent}
          onLayout={(e) => { const h = e.nativeEvent.layout.height; if (h && Math.abs(h - contentH) > 1) setContentH(h); }}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

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
function BackgroundPreviewCard({ styleKey, label, selected, intensity, speed, onPress }: {
  styleKey: BackgroundStyle; label: string; selected: boolean; intensity: AuroraIntensity; speed: number; onPress: () => void;
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
      <View style={[styles.bgPreviewBox, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary }]}>
        {/* Los efectos reinician sus loops in-place al cambiar intensidad/velocidad — sin remount */}
        {styleKey === 'none' ? (
          <View style={styles.bgNoneWrap}>
            <AppIcon name="close-outline" size={18} color={colors.textTertiary} />
          </View>
        ) : (
          <BackgroundEffect styleKey={styleKey} intensity={intensity} speed={speed} />
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
function CardEffectPreview({ sheen }: { sheen: boolean }) {
  const { colors, isDark } = useTheme();
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!sheen) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
        Animated.delay(1100),
        Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sheen, sweep]);

  const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-70, 260] });
  const rows: { label: string; pct: number; color: string }[] = [
    { label: 'Alimentación', pct: 62, color: colors.primary },
    { label: 'Transporte', pct: 34, color: colors.tertiary },
  ];

  const inner = (
    <View
      style={[
        styles.previewCard,
        { backgroundColor: colors.surface, borderColor: isDark ? colors.primary + '20' : colors.border },
      ]}
    >
      <LinearGradient
        colors={[colors.primary + '16', 'transparent', colors.primary + '0A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Text style={[styles.previewLabel, { color: colors.textTertiary, marginBottom: 12 }]}>GASTOS POR CATEGORÍA</Text>
      {rows.map((r) => (
        <View key={r.label} style={styles.previewCatRow}>
          <View style={styles.previewCatTop}>
            <View style={[styles.previewDot, { backgroundColor: r.color }]} />
            <Text style={[styles.previewCatLabel, { color: colors.textPrimary }]}>{r.label}</Text>
            <Text style={[styles.previewCatPct, { color: colors.textTertiary }]}>{r.pct}%</Text>
          </View>
          <View style={[styles.previewTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.previewFill, { width: `${r.pct}%`, backgroundColor: r.color }]} />
          </View>
        </View>
      ))}
      {sheen && (
        <Animated.View pointerEvents="none" style={[styles.previewSheen, { transform: [{ translateX: sweepX }, { rotate: '18deg' }] }]}>
          <LinearGradient
            colors={['transparent', isDark ? 'rgba(255,255,255,0.20)' : colors.primary + '38', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );

  return <View style={styles.previewWrap}>{inner}</View>;
}

const INTENSITY_OPTIONS: AuroraIntensity[] = ['subtle', 'default', 'intense'];
const BG_SPEED_OPTIONS: BackgroundSpeed[] = ['slow', 'normal', 'fast'];
const CHART_SPEED_OPTIONS: ChartSpeed[] = ['slow', 'normal', 'fast'];
const CHART_PREVIEW_VALUES = [1080, 1240, 1190, 1340, 1284];
const CHART_TYPES: ChartType[] = ['line', 'bars', 'area', 'dots'];
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

function CrossfadeSparkline({ chartType, animStyle, height, duration, crossfade }: {
  chartType: ChartType; animStyle: ChartAnimStyle; height: number; duration: number; crossfade: SignedCrossfade;
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
            animate={animStyle !== 'none'}
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
          animate={animStyle !== 'none'}
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
          animate={animStyle !== 'none'}
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
function ChartTypeCard({ type, label, selected, animStyle, color, color2, crossfade, onPress }: {
  type: ChartType; label: string; selected: boolean; animStyle: ChartAnimStyle; color: string; color2?: string; crossfade?: SignedCrossfade; onPress: () => void;
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
      <View style={[styles.bgPreviewBox, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary }]}>
        {crossfade ? (
          <CrossfadeSparkline chartType={type} animStyle={animStyle} height={64} duration={4200} crossfade={crossfade} />
        ) : (
          <Sparkline
            key={`${type}-${animStyle}`}
            values={CHART_PREVIEW_VALUES}
            color={color}
            accent={color}
            accent2={color2}
            height={64}
            animate={animStyle !== 'none'}
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
function ChartAnimCard({ anim, label, selected, chartType, color, color2, crossfade, onPress }: {
  anim: ChartAnimStyle; label: string; selected: boolean; chartType: ChartType; color: string; color2?: string; crossfade?: SignedCrossfade; onPress: () => void;
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
      <View style={[styles.bgPreviewBox, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary }]}>
        {crossfade ? (
          <CrossfadeSparkline chartType={chartType} animStyle={anim} height={64} duration={4200} crossfade={crossfade} />
        ) : (
          <Sparkline
            key={`${chartType}-${anim}`}
            values={CHART_PREVIEW_VALUES}
            color={color}
            accent={color}
            accent2={color2}
            height={64}
            animate={anim !== 'none'}
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
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.accentSwatchWrap}>
      <View style={[styles.accentSwatch, { borderColor: selected ? colors.textPrimary : 'transparent' }]}>
        <Svg width={SWATCH_SIZE} height={SWATCH_SIZE} viewBox={`0 0 ${SWATCH_SIZE} ${SWATCH_SIZE}`}>
          <Defs>
            <SwatchHalf id="ringGrad" colorA={lineColor} colorB={lineColor2} />
            <SwatchHalf id="fillGrad" colorA={fillColor} colorB={fillColor2} />
          </Defs>
          <Circle cx={c} cy={c} r={c - 2.5} fill="none" stroke={lineSplit ? 'url(#ringGrad)' : lineColor} strokeWidth={4} />
          <Circle cx={c} cy={c} r={c - 8} fill={fillSplit ? 'url(#fillGrad)' : fillColor} />
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
    cardSheen, setCardSheen,
    iconStroke, setIconStroke,
    streakConfetti, setStreakConfetti,
    chartType, setChartType, chartAnimStyle, setChartAnimStyle,
    chartSpeed, setChartSpeed, chartAccent, setChartAccent,
  } = useTheme();
  const chartDuration = chartSpeed === 'slow' ? 6500 : chartSpeed === 'normal' ? 4200 : 2600;

  // "Dinámico" no es una mezcla — es un color ÚNICO que cambia según la tendencia
  // real (verde si sube, rojo si baja). Para que se note en toda vista previa (no
  // solo en el swatch), alternamos entre ambos casos cada pocos segundos mientras
  // está seleccionado. `signedFade` cruza (dissolve) suavemente entre ambos casos
  // en vez de saltar de un color al otro de golpe — compartido por el preview
  // grande y las tarjetas de tipo/animación.
  const signedFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!SIGNED_FAMILY.includes(chartAccent)) return;
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
  }, [chartAccent, signedFade]);

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

  // Ninguna sección abierta al entrar; abrir una cierra la que estuviera abierta.
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggleSection = (id: string) => setOpenSection((cur) => (cur === id ? null : id));

  const handleSetPaletteId = (id: typeof paletteId) => {
    setPaletteId(id);
    if (user?.uid) updateUserColorPalette(user.uid, id).catch(() => {});
  };

  // Sync a Firestore (debounced): toda la personalización viaja con la cuenta,
  // no solo la paleta — sobrevive reinstalaciones y cambios de dispositivo.
  const isFirstSync = useRef(true);
  useEffect(() => {
    if (isFirstSync.current) { isFirstSync.current = false; return; }
    if (!user?.uid) return;
    const timer = setTimeout(() => {
      updateUserPersonalization(user.uid, {
        backgroundStyleLight, backgroundStyleDark, backgroundIntensity, backgroundSpeed,
        cardSheen, iconStroke, streakConfetti,
        chartType, chartAnimStyle, chartSpeed, chartAccent,
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [user?.uid, backgroundStyleLight, backgroundStyleDark, backgroundIntensity, backgroundSpeed, cardSheen, iconStroke, streakConfetti, chartType, chartAnimStyle, chartSpeed, chartAccent]);

  return (
    <ScreenTransition>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader showBack />
          <PageTitle title={t('profile.palette.title')} description={t('profile.palette.subtitle')} />

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <AccordionSection id="palette" icon="color-palette-outline" title={t('personalization.sectionPalette')} open={openSection === 'palette'} onToggle={toggleSection}>
              <PaletteGrid colors={colors} paletteId={paletteId} setPaletteId={handleSetPaletteId} t={t} />
            </AccordionSection>

            <AccordionSection id="background" icon="image-outline" title={t('personalization.sectionBackground')} open={openSection === 'background'} onToggle={toggleSection}>
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
                    style={styles.bgGridSpacing}
                  />
                </>
              )}
              <View style={styles.bgGrid}>
                {BACKGROUND_STYLES.map((key) => (
                  <BackgroundPreviewCard
                    key={key}
                    styleKey={key}
                    label={t(`personalization.background.${key}`)}
                    selected={targetBgStyle === key}
                    intensity={backgroundIntensity}
                    speed={BACKGROUND_SPEED_FACTOR[backgroundSpeed]}
                    onPress={() => setBackgroundStyleFor(bgTarget, key)}
                  />
                ))}
              </View>
            </AccordionSection>

            <AccordionSection id="cards" icon="card-outline" title={t('personalization.sectionCards')} open={openSection === 'cards'} onToggle={toggleSection}>
              <CardEffectPreview sheen={cardSheen} />
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
            </AccordionSection>

            <AccordionSection id="chart" icon="trending-up-outline" title={t('personalization.sectionChart')} open={openSection === 'chart'} onToggle={toggleSection}>
              <View style={styles.chartPreviewWrap}>
                {SIGNED_FAMILY.includes(chartAccent) ? (
                  <CrossfadeSparkline
                    chartType={chartType}
                    animStyle={chartAnimStyle}
                    height={64}
                    duration={chartDuration}
                    crossfade={signedCrossfade}
                  />
                ) : (
                  <Sparkline
                    key={`${chartType}-${chartAnimStyle}-${chartSpeed}-${chartAccent}`}
                    values={CHART_PREVIEW_VALUES}
                    color={chartPreviewColor}
                    accent={chartPreviewColor}
                    accent2={chartPreviewColor2}
                    height={64}
                    animate={chartAnimStyle !== 'none'}
                    duration={chartDuration}
                    chartType={chartType}
                    animStyle={chartAnimStyle}
                  />
                )}
              </View>

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
            </AccordionSection>

            <AccordionSection id="icons" icon="options-outline" title={t('personalization.sectionIcons')} open={openSection === 'icons'} onToggle={toggleSection}>
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
            </AccordionSection>

            <AccordionSection id="celebrations" icon="gift-outline" title={t('personalization.sectionCelebrations')} open={openSection === 'celebrations'} onToggle={toggleSection}>
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
            </AccordionSection>

            <AccordionSection id="roadmap" icon="flag-outline" title={t('personalization.roadmapTitle')} open={openSection === 'roadmap'} onToggle={toggleSection}>
              <View style={styles.roadmapWrap}>
                {(t('personalization.roadmapItems', { returnObjects: true }) as string[]).map((item, i) => (
                  <View key={i} style={styles.roadmapRow}>
                    <AppIcon name="star-outline" size={13} color={colors.textTertiary} />
                    <Text style={[styles.roadmapText, { color: colors.textSecondary }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </AccordionSection>
          </ScrollView>
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingTop: 4, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },
  accordion: { borderRadius: 20, marginBottom: 10, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 15 },
  accordionIconWrap: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  accordionTitle: { flex: 1, fontSize: 14, fontFamily: Fonts.semiBold },
  accordionContent: { paddingHorizontal: 16, paddingBottom: 16 },
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
  previewWrap: { alignItems: 'center', marginBottom: 14 },
  chartPreviewWrap: { marginBottom: 14, paddingHorizontal: 4 },
  chartCrossfadeWrap: { width: '100%', height: 64 },
  chartGroupLabel: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4, marginBottom: 8 },
  chartAccentLabelSpacing: { marginTop: 22 },
  chartAccentHint: { fontSize: 11, fontFamily: Fonts.regular, marginTop: 0, marginBottom: 14, lineHeight: 16 },
  accentRow: { flexDirection: 'row', flexWrap: 'wrap' },
  accentSwatchWrap: { width: '25%', alignItems: 'center', gap: 5, paddingVertical: 6 },
  accentSwatch: { width: SWATCH_SIZE, height: SWATCH_SIZE, borderRadius: SWATCH_SIZE / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  accentSwatchCheck: { position: 'absolute', width: 17, height: 17, borderRadius: 8.5, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  accentSwatchArrowBadge: { position: 'absolute', width: 13, height: 13, borderRadius: 6.5, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  accentSwatchLabel: { fontSize: 10, fontFamily: Fonts.medium, textAlign: 'center' },
  previewCard: { width: '100%', maxWidth: 320, borderRadius: 22, borderWidth: 1, paddingVertical: 18, paddingHorizontal: 18, overflow: 'hidden', position: 'relative' },
  previewLabel: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1.4 },
  previewCatRow: { marginBottom: 12 },
  previewCatTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  previewDot: { width: 8, height: 8, borderRadius: 3 },
  previewCatLabel: { flex: 1, fontSize: 13, fontFamily: Fonts.semiBold },
  previewCatPct: { fontSize: 12, fontFamily: Fonts.semiBold },
  previewTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  previewFill: { height: '100%', borderRadius: 3 },
  previewSheen: { position: 'absolute', top: -30, bottom: -30, width: 60 },
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
