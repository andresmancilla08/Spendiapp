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
const CHART_PULSE_KEY = '@spendiapp_chart_pulse';
const CHART_SPEED_KEY = '@spendiapp_chart_speed';

export type ThemeMode = 'light' | 'dark' | 'system';
export type BackgroundStyle = 'none' | 'aurora' | 'particles' | 'waves' | 'grain' | 'mesh' | 'bokeh';
export type IconStroke = 1.5 | 2 | 2.5;
export type ChartSpeed = 'slow' | 'normal' | 'fast';
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
  chartPulse: boolean;
  setChartPulse: (v: boolean) => void;
  chartSpeed: ChartSpeed;
  setChartSpeed: (v: ChartSpeed) => void;
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
  chartPulse: true,
  setChartPulse: () => {},
  chartSpeed: 'slow',
  setChartSpeed: () => {},
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
  const [chartPulse, setChartPulseState] = useState(true);
  const [chartSpeed, setChartSpeedState] = useState<ChartSpeed>('slow');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(PALETTE_KEY),
      AsyncStorage.getItem(BG_STYLE_KEY),
      AsyncStorage.getItem(BG_INTENSITY_KEY),
      AsyncStorage.getItem(CARD_SHEEN_KEY),
      AsyncStorage.getItem(ICON_STROKE_KEY),
      AsyncStorage.getItem(STREAK_CONFETTI_KEY),
      AsyncStorage.getItem(CHART_PULSE_KEY),
      AsyncStorage.getItem(CHART_SPEED_KEY),
    ]).then(([storedTheme, storedPalette, storedBgStyle, storedBgIntensity, storedSheen, storedStroke, storedConfetti, storedChartPulse, storedChartSpeed]) => {
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
      if (storedChartPulse != null) setChartPulseState(storedChartPulse === '1');
      if (storedChartSpeed === 'slow' || storedChartSpeed === 'normal' || storedChartSpeed === 'fast') setChartSpeedState(storedChartSpeed);
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

  const setChartPulse = async (v: boolean) => {
    setChartPulseState(v);
    await AsyncStorage.setItem(CHART_PULSE_KEY, v ? '1' : '0');
  };

  const setChartSpeed = async (v: ChartSpeed) => {
    setChartSpeedState(v);
    await AsyncStorage.setItem(CHART_SPEED_KEY, v);
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
      chartPulse, setChartPulse, chartSpeed, setChartSpeed,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
