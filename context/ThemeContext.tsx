import { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppColors } from '../config/colors';
import { PaletteId, PaletteDefinition, PALETTE_MAP, PALETTES } from '../config/palettes';

const THEME_KEY = '@spendiapp_theme';
const PALETTE_KEY = '@spendiapp_palette';

export type ThemeMode = 'light' | 'dark' | 'system';
export type { PaletteId };

interface ThemeContextValue {
  colors: AppColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  paletteId: PaletteId;
  setPaletteId: (id: PaletteId) => void;
  activePalette: PaletteDefinition;
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
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [paletteId, setPaletteIdState] = useState<PaletteId>('deepWater');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(PALETTE_KEY),
    ]).then(([storedTheme, storedPalette]) => {
      if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
        setThemeModeState(storedTheme);
      }
      if (storedPalette && PALETTE_MAP[storedPalette as PaletteId]) {
        setPaletteIdState(storedPalette as PaletteId);
      }
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

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  const activePalette = PALETTE_MAP[paletteId];
  const colors = isDark ? activePalette.colors.dark : activePalette.colors.light;

  return (
    <ThemeContext.Provider value={{ colors, isDark, themeMode, setThemeMode, paletteId, setPaletteId, activePalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
