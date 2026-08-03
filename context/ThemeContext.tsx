import { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppColors } from '../config/colors';
import { PaletteId, PaletteDefinition, PALETTE_MAP, PALETTES } from '../config/palettes';
import type { AuroraIntensity } from '../components/AuroraBackground';

const THEME_KEY = '@spendiapp_theme';
const PALETTE_KEY = '@spendiapp_palette';
/** Epoch ms de la última escritura LOCAL de personalización — el arranque solo
 * aplica lo de Firestore si es más reciente (evita pisar elecciones frescas). */
export const PERSONALIZATION_SYNCED_AT_KEY = '@spendiapp_personalization_synced_at';
const BG_STYLE_KEY = '@spendiapp_bg_style'; // legado — migra a light/dark
const BG_STYLE_LIGHT_KEY = '@spendiapp_bg_style_light';
const BG_STYLE_DARK_KEY = '@spendiapp_bg_style_dark';
const BG_INTENSITY_KEY = '@spendiapp_bg_intensity';
const BG_SPEED_KEY = '@spendiapp_bg_speed';
const CARD_SHEEN_KEY = '@spendiapp_card_sheen';
const ICON_STROKE_KEY = '@spendiapp_icon_stroke';
const STREAK_CONFETTI_KEY = '@spendiapp_streak_confetti';
const CHART_TYPE_KEY = '@spendiapp_chart_type';
const CHART_ANIM_KEY = '@spendiapp_chart_anim';
const CHART_SPEED_KEY = '@spendiapp_chart_speed';
const CHART_ACCENT_KEY = '@spendiapp_chart_accent';
const GRADIENT_STYLE_KEY = '@spendiapp_gradient_style';

export type ThemeMode = 'light' | 'dark' | 'system';
export type BackgroundStyle = 'none' | 'aurora' | 'particles' | 'waves' | 'grain' | 'mesh' | 'bokeh' | 'flow' | 'starfield' | 'rays' | 'constellation' | 'orbs' | 'topography' | 'spotlight';
export const BACKGROUND_STYLE_VALUES: BackgroundStyle[] = ['none', 'aurora', 'particles', 'waves', 'grain', 'mesh', 'bokeh', 'flow', 'starfield', 'rays', 'constellation', 'orbs', 'topography', 'spotlight'];
export type BackgroundSpeed = 'slow' | 'normal' | 'fast';
/** Multiplicador de duración de las animaciones de fondo por velocidad. */
export const BACKGROUND_SPEED_FACTOR: Record<BackgroundSpeed, number> = { slow: 1.6, normal: 1, fast: 0.62 };
export type IconStroke = 1.5 | 2 | 2.5;
export type ChartSpeed = 'slow' | 'normal' | 'fast';
export type ChartType = 'line' | 'bars' | 'area' | 'dots' | 'stepped' | 'lollipop';
export const CHART_TYPE_VALUES: ChartType[] = ['line', 'area', 'bars', 'dots', 'stepped', 'lollipop'];
export type ChartAnimStyle = 'pulse' | 'draw' | 'tide' | 'none';
/** Forma del degradado del fondo: la misma paleta cae distinto según la dirección. */
export type GradientStyle = 'linear' | 'diagonal' | 'radial' | 'flat';
export const GRADIENT_STYLE_VALUES: GradientStyle[] = ['linear', 'diagonal', 'radial', 'flat'];

export type ChartAccent = 'theme' | 'secondary' | 'success' | 'gold' | 'signed' | 'signedLine' | 'signedFill' | 'duoSuccess' | 'duoTertiary';
export const CHART_ACCENT_VALUES: ChartAccent[] = ['theme', 'secondary', 'success', 'gold', 'signed', 'signedLine', 'signedFill', 'duoSuccess', 'duoTertiary'];
export type { PaletteId, AuroraIntensity };

interface ThemeContextValue {
  colors: AppColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  paletteId: PaletteId;
  setPaletteId: (id: PaletteId) => void;
  activePalette: PaletteDefinition;
  // Efectos visuales premium — personalización más allá del color.
  /** Fondo del modo ACTIVO (derivado de light/dark según el tema actual). */
  backgroundStyle: BackgroundStyle;
  /** Asigna el fondo del modo activo (compat). */
  setBackgroundStyle: (style: BackgroundStyle) => void;
  backgroundStyleLight: BackgroundStyle;
  backgroundStyleDark: BackgroundStyle;
  /** Asigna el fondo de un modo concreto — permite un efecto distinto en claro y oscuro. */
  setBackgroundStyleFor: (mode: 'light' | 'dark', style: BackgroundStyle) => void;
  backgroundIntensity: AuroraIntensity;
  setBackgroundIntensity: (intensity: AuroraIntensity) => void;
  backgroundSpeed: BackgroundSpeed;
  setBackgroundSpeed: (speed: BackgroundSpeed) => void;
  cardSheen: boolean;
  setCardSheen: (v: boolean) => void;
  iconStroke: IconStroke;
  setIconStroke: (v: IconStroke) => void;
  streakConfetti: boolean;
  setStreakConfetti: (v: boolean) => void;
  chartType: ChartType;
  setChartType: (v: ChartType) => void;
  chartAnimStyle: ChartAnimStyle;
  setChartAnimStyle: (v: ChartAnimStyle) => void;
  chartSpeed: ChartSpeed;
  setChartSpeed: (v: ChartSpeed) => void;
  chartAccent: ChartAccent;
  setChartAccent: (v: ChartAccent) => void;
  gradientStyle: GradientStyle;
  setGradientStyle: (v: GradientStyle) => void;
}

const defaultPalette = PALETTE_MAP['deepWater'];

const ThemeContext = createContext<ThemeContextValue>({
  colors: defaultPalette.colors.light,
  isDark: false,
  themeMode: 'system',
  setThemeMode: () => {},
  paletteId: 'deepWater',
  setPaletteId: () => {},
  activePalette: defaultPalette,
  backgroundStyle: 'aurora',
  setBackgroundStyle: () => {},
  backgroundStyleLight: 'aurora',
  backgroundStyleDark: 'aurora',
  setBackgroundStyleFor: () => {},
  backgroundIntensity: 'default',
  setBackgroundIntensity: () => {},
  backgroundSpeed: 'normal',
  setBackgroundSpeed: () => {},
  cardSheen: true,
  setCardSheen: () => {},
  iconStroke: 2,
  setIconStroke: () => {},
  streakConfetti: true,
  setStreakConfetti: () => {},
  chartType: 'line',
  setChartType: () => {},
  chartAnimStyle: 'pulse',
  setChartAnimStyle: () => {},
  chartSpeed: 'slow',
  setChartSpeed: () => {},
  chartAccent: 'theme',
  setChartAccent: () => {},
  gradientStyle: 'diagonal',
  setGradientStyle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [paletteId, setPaletteIdState] = useState<PaletteId>('deepWater');
  const [backgroundStyleLight, setBackgroundStyleLightState] = useState<BackgroundStyle>('aurora');
  const [backgroundStyleDark, setBackgroundStyleDarkState] = useState<BackgroundStyle>('aurora');
  const [backgroundIntensity, setBackgroundIntensityState] = useState<AuroraIntensity>('default');
  const [backgroundSpeed, setBackgroundSpeedState] = useState<BackgroundSpeed>('normal');
  const [cardSheen, setCardSheenState] = useState(true);
  const [iconStroke, setIconStrokeState] = useState<IconStroke>(2);
  const [streakConfetti, setStreakConfettiState] = useState(true);
  const [chartType, setChartTypeState] = useState<ChartType>('line');
  const [chartAnimStyle, setChartAnimStyleState] = useState<ChartAnimStyle>('pulse');
  const [chartSpeed, setChartSpeedState] = useState<ChartSpeed>('slow');
  const [chartAccent, setChartAccentState] = useState<ChartAccent>('theme');
  // 'diagonal' es lo que la app pintaba antes de que esto fuera configurable.
  const [gradientStyle, setGradientStyleState] = useState<GradientStyle>('diagonal');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(PALETTE_KEY),
      AsyncStorage.getItem(BG_STYLE_KEY),
      AsyncStorage.getItem(BG_STYLE_LIGHT_KEY),
      AsyncStorage.getItem(BG_STYLE_DARK_KEY),
      AsyncStorage.getItem(BG_INTENSITY_KEY),
      AsyncStorage.getItem(BG_SPEED_KEY),
      AsyncStorage.getItem(CARD_SHEEN_KEY),
      AsyncStorage.getItem(ICON_STROKE_KEY),
      AsyncStorage.getItem(STREAK_CONFETTI_KEY),
      AsyncStorage.getItem(CHART_TYPE_KEY),
      AsyncStorage.getItem(CHART_ANIM_KEY),
      AsyncStorage.getItem(CHART_SPEED_KEY),
      AsyncStorage.getItem(CHART_ACCENT_KEY),
      AsyncStorage.getItem(GRADIENT_STYLE_KEY),
    ]).then(([storedTheme, storedPalette, storedBgStyle, storedBgLight, storedBgDark, storedBgIntensity, storedBgSpeed, storedSheen, storedStroke, storedConfetti, storedChartType, storedChartAnim, storedChartSpeed, storedChartAccent, storedGradientStyle]) => {
      if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
        setThemeModeState(storedTheme);
      }
      if (storedPalette && PALETTE_MAP[storedPalette as PaletteId]) {
        setPaletteIdState(storedPalette as PaletteId);
      }
      // Migración: la preferencia única legada siembra ambos modos si aún no
      // tienen valor propio.
      const legacy = BACKGROUND_STYLE_VALUES.includes(storedBgStyle as BackgroundStyle)
        ? (storedBgStyle as BackgroundStyle) : null;
      if (BACKGROUND_STYLE_VALUES.includes(storedBgLight as BackgroundStyle)) {
        setBackgroundStyleLightState(storedBgLight as BackgroundStyle);
      } else if (legacy) {
        setBackgroundStyleLightState(legacy);
      }
      if (BACKGROUND_STYLE_VALUES.includes(storedBgDark as BackgroundStyle)) {
        setBackgroundStyleDarkState(storedBgDark as BackgroundStyle);
      } else if (legacy) {
        setBackgroundStyleDarkState(legacy);
      }
      if (storedBgIntensity === 'intense' || storedBgIntensity === 'default' || storedBgIntensity === 'subtle') {
        setBackgroundIntensityState(storedBgIntensity);
      }
      if (storedBgSpeed === 'slow' || storedBgSpeed === 'normal' || storedBgSpeed === 'fast') {
        setBackgroundSpeedState(storedBgSpeed);
      }
      if (storedSheen != null) setCardSheenState(storedSheen === '1');
      if (storedStroke === '1.5' || storedStroke === '2' || storedStroke === '2.5') setIconStrokeState(Number(storedStroke) as IconStroke);
      if (storedConfetti != null) setStreakConfettiState(storedConfetti === '1');
      if (CHART_TYPE_VALUES.includes(storedChartType as ChartType)) setChartTypeState(storedChartType as ChartType);
      if (storedChartAnim === 'pulse' || storedChartAnim === 'draw' || storedChartAnim === 'tide' || storedChartAnim === 'none') setChartAnimStyleState(storedChartAnim);
      if (storedChartSpeed === 'slow' || storedChartSpeed === 'normal' || storedChartSpeed === 'fast') setChartSpeedState(storedChartSpeed);
      if (CHART_ACCENT_VALUES.includes(storedChartAccent as ChartAccent)) setChartAccentState(storedChartAccent as ChartAccent);
      if (GRADIENT_STYLE_VALUES.includes(storedGradientStyle as GradientStyle)) setGradientStyleState(storedGradientStyle as GradientStyle);
    }).catch(() => {});
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_KEY, mode);
  };

  const setPaletteId = async (id: PaletteId) => {
    setPaletteIdState(id);
    await AsyncStorage.setItem(PALETTE_KEY, id);
  };

  const setBackgroundStyleFor = async (mode: 'light' | 'dark', style: BackgroundStyle) => {
    if (mode === 'dark') {
      setBackgroundStyleDarkState(style);
      await AsyncStorage.setItem(BG_STYLE_DARK_KEY, style);
    } else {
      setBackgroundStyleLightState(style);
      await AsyncStorage.setItem(BG_STYLE_LIGHT_KEY, style);
    }
  };

  const setBackgroundIntensity = async (intensity: AuroraIntensity) => {
    setBackgroundIntensityState(intensity);
    await AsyncStorage.setItem(BG_INTENSITY_KEY, intensity);
  };

  const setBackgroundSpeed = async (speed: BackgroundSpeed) => {
    setBackgroundSpeedState(speed);
    await AsyncStorage.setItem(BG_SPEED_KEY, speed);
  };

  const setCardSheen = async (v: boolean) => {
    setCardSheenState(v);
    await AsyncStorage.setItem(CARD_SHEEN_KEY, v ? '1' : '0');
  };

  const setIconStroke = async (v: IconStroke) => {
    setIconStrokeState(v);
    await AsyncStorage.setItem(ICON_STROKE_KEY, String(v));
  };

  const setStreakConfetti = async (v: boolean) => {
    setStreakConfettiState(v);
    await AsyncStorage.setItem(STREAK_CONFETTI_KEY, v ? '1' : '0');
  };

  const setChartType = async (v: ChartType) => {
    setChartTypeState(v);
    await AsyncStorage.setItem(CHART_TYPE_KEY, v);
  };

  const setChartAnimStyle = async (v: ChartAnimStyle) => {
    setChartAnimStyleState(v);
    await AsyncStorage.setItem(CHART_ANIM_KEY, v);
  };

  const setChartSpeed = async (v: ChartSpeed) => {
    setChartSpeedState(v);
    await AsyncStorage.setItem(CHART_SPEED_KEY, v);
  };

  const setChartAccent = async (v: ChartAccent) => {
    setChartAccentState(v);
    await AsyncStorage.setItem(CHART_ACCENT_KEY, v);
  };

  const setGradientStyle = async (v: GradientStyle) => {
    setGradientStyleState(v);
    await AsyncStorage.setItem(GRADIENT_STYLE_KEY, v);
  };

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  // Fondo del modo activo + setter compat que escribe sobre el modo actual.
  const backgroundStyle = isDark ? backgroundStyleDark : backgroundStyleLight;
  const setBackgroundStyle = (style: BackgroundStyle) =>
    setBackgroundStyleFor(isDark ? 'dark' : 'light', style);

  const activePalette = PALETTE_MAP[paletteId];
  const colors = isDark ? activePalette.colors.dark : activePalette.colors.light;

  return (
    <ThemeContext.Provider value={{
      colors, isDark, themeMode, setThemeMode, paletteId, setPaletteId, activePalette,
      backgroundStyle, setBackgroundStyle, backgroundIntensity, setBackgroundIntensity,
      backgroundStyleLight, backgroundStyleDark, setBackgroundStyleFor,
      backgroundSpeed, setBackgroundSpeed,
      cardSheen, setCardSheen,
      iconStroke, setIconStroke,
      streakConfetti, setStreakConfetti,
      chartType, setChartType, chartAnimStyle, setChartAnimStyle,
      chartSpeed, setChartSpeed, chartAccent, setChartAccent,
      gradientStyle, setGradientStyle,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
