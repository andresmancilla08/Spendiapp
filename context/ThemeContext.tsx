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
const CARD_GLASS_KEY = '@spendiapp_card_glass';
const TICKER_FONT_KEY = '@spendiapp_ticker_font';
const COUNT_UP_KEY = '@spendiapp_count_up';
const STREAK_CONFETTI_KEY = '@spendiapp_streak_confetti';

export type ThemeMode = 'light' | 'dark' | 'system';
export type BackgroundStyle = 'none' | 'aurora' | 'particles' | 'waves';
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
  cardGlass: boolean;
  setCardGlass: (v: boolean) => void;
  tickerFont: boolean;
  setTickerFont: (v: boolean) => void;
  countUpAnim: boolean;
  setCountUpAnim: (v: boolean) => void;
  streakConfetti: boolean;
  setStreakConfetti: (v: boolean) => void;
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
  cardGlass: false,
  setCardGlass: () => {},
  tickerFont: false,
  setTickerFont: () => {},
  countUpAnim: false,
  setCountUpAnim: () => {},
  streakConfetti: true,
  setStreakConfetti: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [paletteId, setPaletteIdState] = useState<PaletteId>('deepWater');
  const [backgroundStyle, setBackgroundStyleState] = useState<BackgroundStyle>('aurora');
  const [backgroundIntensity, setBackgroundIntensityState] = useState<AuroraIntensity>('default');
  const [cardSheen, setCardSheenState] = useState(true);
  const [cardGlass, setCardGlassState] = useState(false);
  const [tickerFont, setTickerFontState] = useState(false);
  const [countUpAnim, setCountUpAnimState] = useState(false);
  const [streakConfetti, setStreakConfettiState] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(PALETTE_KEY),
      AsyncStorage.getItem(BG_STYLE_KEY),
      AsyncStorage.getItem(BG_INTENSITY_KEY),
      AsyncStorage.getItem(CARD_SHEEN_KEY),
      AsyncStorage.getItem(CARD_GLASS_KEY),
      AsyncStorage.getItem(TICKER_FONT_KEY),
      AsyncStorage.getItem(COUNT_UP_KEY),
      AsyncStorage.getItem(STREAK_CONFETTI_KEY),
    ]).then(([storedTheme, storedPalette, storedBgStyle, storedBgIntensity, storedSheen, storedGlass, storedTicker, storedCountUp, storedConfetti]) => {
      if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
        setThemeModeState(storedTheme);
      }
      if (storedPalette && PALETTE_MAP[storedPalette as PaletteId]) {
        setPaletteIdState(storedPalette as PaletteId);
      }
      if (storedBgStyle === 'none' || storedBgStyle === 'aurora' || storedBgStyle === 'particles' || storedBgStyle === 'waves') {
        setBackgroundStyleState(storedBgStyle);
      }
      if (storedBgIntensity === 'intense' || storedBgIntensity === 'default' || storedBgIntensity === 'subtle') {
        setBackgroundIntensityState(storedBgIntensity);
      }
      if (storedSheen != null) setCardSheenState(storedSheen === '1');
      if (storedGlass != null) setCardGlassState(storedGlass === '1');
      if (storedTicker != null) setTickerFontState(storedTicker === '1');
      if (storedCountUp != null) setCountUpAnimState(storedCountUp === '1');
      if (storedConfetti != null) setStreakConfettiState(storedConfetti === '1');
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

  const setCardGlass = async (v: boolean) => {
    setCardGlassState(v);
    await AsyncStorage.setItem(CARD_GLASS_KEY, v ? '1' : '0');
  };

  const setTickerFont = async (v: boolean) => {
    setTickerFontState(v);
    await AsyncStorage.setItem(TICKER_FONT_KEY, v ? '1' : '0');
  };

  const setCountUpAnim = async (v: boolean) => {
    setCountUpAnimState(v);
    await AsyncStorage.setItem(COUNT_UP_KEY, v ? '1' : '0');
  };

  const setStreakConfetti = async (v: boolean) => {
    setStreakConfettiState(v);
    await AsyncStorage.setItem(STREAK_CONFETTI_KEY, v ? '1' : '0');
  };

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  const activePalette = PALETTE_MAP[paletteId];
  const colors = isDark ? activePalette.colors.dark : activePalette.colors.light;

  return (
    <ThemeContext.Provider value={{
      colors, isDark, themeMode, setThemeMode, paletteId, setPaletteId, activePalette,
      backgroundStyle, setBackgroundStyle, backgroundIntensity, setBackgroundIntensity,
      cardSheen, setCardSheen, cardGlass, setCardGlass,
      tickerFont, setTickerFont, countUpAnim, setCountUpAnim,
      streakConfetti, setStreakConfetti,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
