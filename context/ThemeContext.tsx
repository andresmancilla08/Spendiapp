import { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppColors } from '../config/colors';
import { PaletteId, PaletteDefinition, PALETTE_MAP, PALETTES } from '../config/palettes';
import type { AuroraIntensity } from '../components/AuroraBackground';

const THEME_KEY = '@spendiapp_theme';
const PALETTE_KEY = '@spendiapp_palette';
const BG_STYLE_KEY = '@spendiapp_bg_style';
const BG_INTENSITY_KEY = '@spendiapp_bg_intensity';
const CARD_SHEEN_KEY = '@spendiapp_card_sheen';
const ICON_STROKE_KEY = '@spendiapp_icon_stroke';
const STREAK_CONFETTI_KEY = '@spendiapp_streak_confetti';
const CHART_TYPE_KEY = '@spendiapp_chart_type';
const CHART_ANIM_KEY = '@spendiapp_chart_anim';
const CHART_SPEED_KEY = '@spendiapp_chart_speed';
const CHART_ACCENT_KEY = '@spendiapp_chart_accent';

export type ThemeMode = 'light' | 'dark' | 'system';
export type BackgroundStyle = 'none' | 'aurora' | 'particles' | 'waves' | 'grain' | 'mesh' | 'bokeh';
export type IconStroke = 1.5 | 2 | 2.5;
export type ChartSpeed = 'slow' | 'normal' | 'fast';
export type ChartType = 'line' | 'bars' | 'area' | 'dots';
export type ChartAnimStyle = 'pulse' | 'draw' | 'tide' | 'none';
export type ChartAccent = 'theme' | 'success' | 'gold' | 'signed';
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
  backgroundStyle: BackgroundStyle;
  setBackgroundStyle: (style: BackgroundStyle) => void;
  backgroundIntensity: AuroraIntensity;
  setBackgroundIntensity: (intensity: AuroraIntensity) => void;
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
  backgroundIntensity: 'default',
  setBackgroundIntensity: () => {},
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
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [paletteId, setPaletteIdState] = useState<PaletteId>('deepWater');
  const [backgroundStyle, setBackgroundStyleState] = useState<BackgroundStyle>('aurora');
  const [backgroundIntensity, setBackgroundIntensityState] = useState<AuroraIntensity>('default');
  const [cardSheen, setCardSheenState] = useState(true);
  const [iconStroke, setIconStrokeState] = useState<IconStroke>(2);
  const [streakConfetti, setStreakConfettiState] = useState(true);
  const [chartType, setChartTypeState] = useState<ChartType>('line');
  const [chartAnimStyle, setChartAnimStyleState] = useState<ChartAnimStyle>('pulse');
  const [chartSpeed, setChartSpeedState] = useState<ChartSpeed>('slow');
  const [chartAccent, setChartAccentState] = useState<ChartAccent>('theme');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(PALETTE_KEY),
      AsyncStorage.getItem(BG_STYLE_KEY),
      AsyncStorage.getItem(BG_INTENSITY_KEY),
      AsyncStorage.getItem(CARD_SHEEN_KEY),
      AsyncStorage.getItem(ICON_STROKE_KEY),
      AsyncStorage.getItem(STREAK_CONFETTI_KEY),
      AsyncStorage.getItem(CHART_TYPE_KEY),
      AsyncStorage.getItem(CHART_ANIM_KEY),
      AsyncStorage.getItem(CHART_SPEED_KEY),
      AsyncStorage.getItem(CHART_ACCENT_KEY),
    ]).then(([storedTheme, storedPalette, storedBgStyle, storedBgIntensity, storedSheen, storedStroke, storedConfetti, storedChartType, storedChartAnim, storedChartSpeed, storedChartAccent]) => {
      if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
        setThemeModeState(storedTheme);
      }
      if (storedPalette && PALETTE_MAP[storedPalette as PaletteId]) {
        setPaletteIdState(storedPalette as PaletteId);
      }
      if (['none', 'aurora', 'particles', 'waves', 'grain', 'mesh', 'bokeh'].includes(storedBgStyle as string)) {
        setBackgroundStyleState(storedBgStyle as BackgroundStyle);
      }
      if (storedBgIntensity === 'intense' || storedBgIntensity === 'default' || storedBgIntensity === 'subtle') {
        setBackgroundIntensityState(storedBgIntensity);
      }
      if (storedSheen != null) setCardSheenState(storedSheen === '1');
      if (storedStroke === '1.5' || storedStroke === '2' || storedStroke === '2.5') setIconStrokeState(Number(storedStroke) as IconStroke);
      if (storedConfetti != null) setStreakConfettiState(storedConfetti === '1');
      if (storedChartType === 'line' || storedChartType === 'bars' || storedChartType === 'area' || storedChartType === 'dots') setChartTypeState(storedChartType);
      if (storedChartAnim === 'pulse' || storedChartAnim === 'draw' || storedChartAnim === 'tide' || storedChartAnim === 'none') setChartAnimStyleState(storedChartAnim);
      if (storedChartSpeed === 'slow' || storedChartSpeed === 'normal' || storedChartSpeed === 'fast') setChartSpeedState(storedChartSpeed);
      if (storedChartAccent === 'theme' || storedChartAccent === 'success' || storedChartAccent === 'gold' || storedChartAccent === 'signed') setChartAccentState(storedChartAccent);
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

  const setBackgroundStyle = async (style: BackgroundStyle) => {
    setBackgroundStyleState(style);
    await AsyncStorage.setItem(BG_STYLE_KEY, style);
  };

  const setBackgroundIntensity = async (intensity: AuroraIntensity) => {
    setBackgroundIntensityState(intensity);
    await AsyncStorage.setItem(BG_INTENSITY_KEY, intensity);
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

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  const activePalette = PALETTE_MAP[paletteId];
  const colors = isDark ? activePalette.colors.dark : activePalette.colors.light;

  return (
    <ThemeContext.Provider value={{
      colors, isDark, themeMode, setThemeMode, paletteId, setPaletteId, activePalette,
      backgroundStyle, setBackgroundStyle, backgroundIntensity, setBackgroundIntensity,
      cardSheen, setCardSheen,
      iconStroke, setIconStroke,
      streakConfetti, setStreakConfetti,
      chartType, setChartType, chartAnimStyle, setChartAnimStyle,
      chartSpeed, setChartSpeed, chartAccent, setChartAccent,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
