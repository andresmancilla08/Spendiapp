import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppColors } from '../config/colors';
import { PaletteId, PaletteDefinition, PALETTE_MAP, PALETTES, resolvePaletteId } from '../config/palettes';
import { derivePalette, type CustomPalette } from '../utils/derivePalette';
import type { AuroraIntensity } from '../components/AuroraBackground';

const THEME_KEY = '@spendiapp_theme';
const PALETTE_KEY = '@spendiapp_palette';
/** Paletas creadas por el usuario. Se guardan como sus TRES parámetros, no como
 *  los sesenta colores: así una mejora del generador alcanza también a las
 *  paletas ya creadas, en vez de dejarlas congeladas con la versión vieja. */
const CUSTOM_PALETTES_KEY = '@spendiapp_custom_palettes';
/** Epoch ms de la última escritura LOCAL de personalización — el arranque solo
 * aplica lo de Firestore si es más reciente (evita pisar elecciones frescas). */
export const PERSONALIZATION_SYNCED_AT_KEY = '@spendiapp_personalization_synced_at';
const BG_STYLE_KEY = '@spendiapp_bg_style'; // legado — migra a light/dark
const BG_STYLE_LIGHT_KEY = '@spendiapp_bg_style_light';
const BG_STYLE_DARK_KEY = '@spendiapp_bg_style_dark';
const BG_INTENSITY_KEY = '@spendiapp_bg_intensity';
const BG_BLUR_LIGHT_KEY = '@spendiapp_bg_blur_light';
const BG_BLUR_DARK_KEY = '@spendiapp_bg_blur_dark';
const CHART_TYPE_KEY = '@spendiapp_chart_type';
const CHART_ANIM_KEY = '@spendiapp_chart_anim';
const CHART_SPEED_KEY = '@spendiapp_chart_speed';
const CHART_ACCENT_KEY = '@spendiapp_chart_accent';
const GRADIENT_STYLE_KEY = '@spendiapp_gradient_style';

export type ThemeMode = 'light' | 'dark' | 'system';
export type BackgroundStyle = 'none' | 'aurora' | 'particles' | 'waves' | 'grain' | 'mesh' | 'bokeh' | 'flow' | 'starfield' | 'rays' | 'constellation' | 'orbs' | 'topography' | 'spotlight';
export const BACKGROUND_STYLE_VALUES: BackgroundStyle[] = ['none', 'aurora', 'particles', 'waves', 'grain', 'mesh', 'bokeh', 'flow', 'starfield', 'rays', 'constellation', 'orbs', 'topography', 'spotlight'];
/** Desenfoque del efecto de fondo. Existe para que el fondo NUNCA compita con el
 *  contenido: los efectos de trazo fino (orbs, constellation, topography) cruzaban
 *  las tarjetas y el texto quedaba sucio. Se elige por modo — el mismo efecto pide
 *  más desenfoque sobre un fondo claro que sobre uno oscuro. */
export type BackgroundBlur = 'none' | 'soft' | 'medium' | 'strong';
export const BACKGROUND_BLUR_VALUES: BackgroundBlur[] = ['none', 'soft', 'medium', 'strong'];
/** El desenfoque vuelve a ser real: con los efectos QUIETOS, el `filter: blur()`
 *  se pinta una vez y el compositor reutiliza la capa. Lo insostenible era
 *  rehacerlo en cada frame porque debajo algo se movía. */
export const BACKGROUND_BLUR_PX: Record<BackgroundBlur, number> = { none: 0, soft: 6, medium: 14, strong: 26 };
export type ChartSpeed = 'slow' | 'normal' | 'fast';
export type ChartType = 'line' | 'bars' | 'area' | 'dots' | 'stepped' | 'lollipop';
export const CHART_TYPE_VALUES: ChartType[] = ['line', 'area', 'bars', 'dots', 'stepped', 'lollipop'];
/** Cómo entra el gráfico al abrir la pantalla. Todas se ejecutan UNA vez y se
 *  detienen: un bucle perpetuo no añade información una vez leída la tendencia,
 *  y era lo que calentaba el teléfono.
 *
 *  - `draw`  trazo vivo: la línea se dibuja de izquierda a derecha
 *  - `rise`  ascenso: el gráfico crece desde la base
 *  - `tide`  marea: el gráfico entra respirando
 *  - `fade`  aparición: entra fundiéndose
 *  - `none`  sin animación
 *
 *  El "pulso" (un punto recorriendo la línea en bucle) se retiró en la v2.58.0;
 *  los ajustes guardados con ese valor migran a `draw`. */
export type ChartAnimStyle = 'draw' | 'rise' | 'tide' | 'fade' | 'none';
export const CHART_ANIM_VALUES: ChartAnimStyle[] = ['draw', 'rise', 'tide', 'fade', 'none'];
/** Normaliza un valor guardado (local o de Firestore), migrando el legado. */
export function normalizeChartAnim(v: unknown): ChartAnimStyle | null {
  // `pulse` (v2.58) y `sweep` (v2.59) se retiraron: el punto en bucle no añadía
  // información y el destello se leía como un bloque parado sobre el gráfico.
  if (v === 'pulse' || v === 'sweep') return 'draw';
  return CHART_ANIM_VALUES.includes(v as ChartAnimStyle) ? (v as ChartAnimStyle) : null;
}
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
  /** Puede ser una del sistema o el id de una paleta propia (`custom_…`). */
  paletteId: string;
  setPaletteId: (id: string) => void;
  activePalette: PaletteDefinition;
  /** Paletas del usuario, de la más reciente a la más antigua. */
  customPalettes: CustomPalette[];
  saveCustomPalette: (p: CustomPalette) => Promise<void>;
  removeCustomPalette: (id: string) => Promise<void>;
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
  /** Desenfoque del modo ACTIVO (derivado de light/dark). */
  backgroundBlur: BackgroundBlur;
  backgroundBlurLight: BackgroundBlur;
  backgroundBlurDark: BackgroundBlur;
  setBackgroundBlurFor: (mode: 'light' | 'dark', blur: BackgroundBlur) => void;
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
  customPalettes: [],
  saveCustomPalette: async () => {},
  removeCustomPalette: async () => {},
  setPaletteId: () => {},
  activePalette: defaultPalette,
  backgroundStyle: 'aurora',
  setBackgroundStyle: () => {},
  backgroundStyleLight: 'aurora',
  backgroundStyleDark: 'aurora',
  setBackgroundStyleFor: () => {},
  backgroundIntensity: 'default',
  setBackgroundIntensity: () => {},
  backgroundBlur: 'medium',
  backgroundBlurLight: 'medium',
  backgroundBlurDark: 'medium',
  setBackgroundBlurFor: () => {},
  chartType: 'line',
  setChartType: () => {},
  chartAnimStyle: 'draw',
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
  const [paletteId, setPaletteIdState] = useState<string>('deepWater');
  const [customPalettes, setCustomPalettes] = useState<CustomPalette[]>([]);
  const [backgroundStyleLight, setBackgroundStyleLightState] = useState<BackgroundStyle>('aurora');
  const [backgroundStyleDark, setBackgroundStyleDarkState] = useState<BackgroundStyle>('aurora');
  const [backgroundIntensity, setBackgroundIntensityState] = useState<AuroraIntensity>('default');
  // 'medium' por defecto: un fondo animado sin desenfocar competía con el contenido.
  const [backgroundBlurLight, setBackgroundBlurLightState] = useState<BackgroundBlur>('medium');
  const [backgroundBlurDark, setBackgroundBlurDarkState] = useState<BackgroundBlur>('medium');
  const [chartType, setChartTypeState] = useState<ChartType>('line');
  const [chartAnimStyle, setChartAnimStyleState] = useState<ChartAnimStyle>('draw');
  const [chartSpeed, setChartSpeedState] = useState<ChartSpeed>('slow');
  const [chartAccent, setChartAccentState] = useState<ChartAccent>('theme');
  // 'diagonal' es lo que la app pintaba antes de que esto fuera configurable.
  const [gradientStyle, setGradientStyleState] = useState<GradientStyle>('diagonal');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(PALETTE_KEY),
      AsyncStorage.getItem(CUSTOM_PALETTES_KEY),
      AsyncStorage.getItem(BG_STYLE_KEY),
      AsyncStorage.getItem(BG_STYLE_LIGHT_KEY),
      AsyncStorage.getItem(BG_STYLE_DARK_KEY),
      AsyncStorage.getItem(BG_INTENSITY_KEY),
      AsyncStorage.getItem(BG_BLUR_LIGHT_KEY),
      AsyncStorage.getItem(BG_BLUR_DARK_KEY),
      AsyncStorage.getItem(CHART_TYPE_KEY),
      AsyncStorage.getItem(CHART_ANIM_KEY),
      AsyncStorage.getItem(CHART_SPEED_KEY),
      AsyncStorage.getItem(CHART_ACCENT_KEY),
      AsyncStorage.getItem(GRADIENT_STYLE_KEY),
    ]).then(([storedTheme, storedPalette, storedCustom, storedBgStyle, storedBgLight, storedBgDark, storedBgIntensity, storedBlurLight, storedBlurDark, storedChartType, storedChartAnim, storedChartSpeed, storedChartAccent, storedGradientStyle]) => {
      if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
        setThemeModeState(storedTheme);
      }
      // Las propias se leen ANTES de resolver la activa: si no, una paleta
      // propia guardada como activa no existiría todavía y caería al default.
      let custom: CustomPalette[] = [];
      if (storedCustom) {
        try { custom = JSON.parse(storedCustom) as CustomPalette[]; } catch {}
        if (Array.isArray(custom)) setCustomPalettes(custom);
      }
      // `resolvePaletteId` migra las retiradas en la v2.60 a su gemela: quien
      // tuviera una pastel puesta no se queda sin colores.
      const resolved = resolvePaletteId(storedPalette);
      if (resolved) setPaletteIdState(resolved);
      else if (storedPalette && custom.some((c) => c.id === storedPalette)) setPaletteIdState(storedPalette);
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
      if (BACKGROUND_BLUR_VALUES.includes(storedBlurLight as BackgroundBlur)) setBackgroundBlurLightState(storedBlurLight as BackgroundBlur);
      if (BACKGROUND_BLUR_VALUES.includes(storedBlurDark as BackgroundBlur)) setBackgroundBlurDarkState(storedBlurDark as BackgroundBlur);
      if (CHART_TYPE_VALUES.includes(storedChartType as ChartType)) setChartTypeState(storedChartType as ChartType);
      const migratedAnim = normalizeChartAnim(storedChartAnim);
      if (migratedAnim) setChartAnimStyleState(migratedAnim);
      if (storedChartSpeed === 'slow' || storedChartSpeed === 'normal' || storedChartSpeed === 'fast') setChartSpeedState(storedChartSpeed);
      if (CHART_ACCENT_VALUES.includes(storedChartAccent as ChartAccent)) setChartAccentState(storedChartAccent as ChartAccent);
      if (GRADIENT_STYLE_VALUES.includes(storedGradientStyle as GradientStyle)) setGradientStyleState(storedGradientStyle as GradientStyle);
    }).catch(() => {});
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_KEY, mode);
  };

  const setPaletteId = async (id: string) => {
    setPaletteIdState(id);
    await AsyncStorage.setItem(PALETTE_KEY, id);
  };

  const persistCustom = async (list: CustomPalette[]) => {
    setCustomPalettes(list);
    await AsyncStorage.setItem(CUSTOM_PALETTES_KEY, JSON.stringify(list));
  };

  /** Crea o actualiza: mismo id sobrescribe, id nuevo va al principio. */
  const saveCustomPalette = async (p: CustomPalette) => {
    const rest = customPalettes.filter((c) => c.id !== p.id);
    await persistCustom([p, ...rest]);
  };

  const removeCustomPalette = async (id: string) => {
    await persistCustom(customPalettes.filter((c) => c.id !== id));
    // Si se borró la que estaba puesta, hay que salir de ella o la app se queda
    // con una paleta que ya no existe.
    if (paletteId === id) await setPaletteId('deepWater');
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

  const setBackgroundBlurFor = async (mode: 'light' | 'dark', blur: BackgroundBlur) => {
    if (mode === 'dark') {
      setBackgroundBlurDarkState(blur);
      await AsyncStorage.setItem(BG_BLUR_DARK_KEY, blur);
    } else {
      setBackgroundBlurLightState(blur);
      await AsyncStorage.setItem(BG_BLUR_LIGHT_KEY, blur);
    }
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
  const backgroundBlur = isDark ? backgroundBlurDark : backgroundBlurLight;
  const setBackgroundStyle = (style: BackgroundStyle) =>
    setBackgroundStyleFor(isDark ? 'dark' : 'light', style);

  // Una paleta propia se RECALCULA en cada arranque a partir de sus tres
  // parámetros. Si la activa se borró desde otro dispositivo, se cae al default
  // en vez de dejar la app sin colores.
  const activePalette = useMemo<PaletteDefinition>(() => {
    const system = PALETTE_MAP[paletteId as PaletteId];
    if (system) return system;
    const own = customPalettes.find((c) => c.id === paletteId);
    return own ? derivePalette(own, own.id) : PALETTE_MAP['deepWater'];
  }, [paletteId, customPalettes]);
  const colors = isDark ? activePalette.colors.dark : activePalette.colors.light;

  return (
    <ThemeContext.Provider value={{
      colors, isDark, themeMode, setThemeMode, paletteId, setPaletteId, activePalette,
      customPalettes, saveCustomPalette, removeCustomPalette,
      backgroundStyle, setBackgroundStyle, backgroundIntensity, setBackgroundIntensity,
      backgroundStyleLight, backgroundStyleDark, setBackgroundStyleFor,
      backgroundBlur, backgroundBlurLight, backgroundBlurDark, setBackgroundBlurFor,
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
