import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, BACKGROUND_SPEED_FACTOR, type BackgroundStyle } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { useProMotion } from '../hooks/useProMotion';
import AuroraBackground, { AuroraIntensity } from './AuroraBackground';
import ParticlesBackground from './ParticlesBackground';
import WavesBackground from './WavesBackground';
import GrainBackground from './GrainBackground';
import MeshBackground from './MeshBackground';
import BokehBackground from './BokehBackground';
import FlowBackground from './FlowBackground';
import StarfieldBackground from './StarfieldBackground';
import RaysBackground from './RaysBackground';
import ConstellationBackground from './ConstellationBackground';

/** Scrim que oscurece el gradiente base en modo oscuro. Va SIEMPRE debajo de
 * los efectos — compartido con el fondo local del login (ScreenBackground). */
export const DARK_SCRIM = 'rgba(0,0,0,0.7)';
const DARK_SCRIM_FACTOR = 0.3; // luz restante bajo el scrim (1 - 0.7)

/** Oscurece un color #RRGGBB multiplicando sus canales — para que el
 * theme-color del navegador coincida con el fondo real bajo el scrim. */
function darkenHex(hex: string, factor: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const ch = (c: number) => Math.round(c * factor).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

/** Renderiza el efecto animado correspondiente a un estilo de fondo.
 * Compartido por el fondo global (AppBackground) y las vistas previas de
 * personalización — una sola fuente de verdad para el mapa estilo→componente. */
export function BackgroundEffect({ styleKey, intensity, speed = 1 }: {
  styleKey: BackgroundStyle; intensity: AuroraIntensity; speed?: number;
}) {
  switch (styleKey) {
    case 'aurora':        return <AuroraBackground intensity={intensity} speed={speed} />;
    case 'particles':     return <ParticlesBackground intensity={intensity} speed={speed} />;
    case 'waves':         return <WavesBackground intensity={intensity} speed={speed} />;
    case 'grain':         return <GrainBackground intensity={intensity} speed={speed} />;
    case 'mesh':          return <MeshBackground intensity={intensity} speed={speed} />;
    case 'bokeh':         return <BokehBackground intensity={intensity} speed={speed} />;
    case 'flow':          return <FlowBackground intensity={intensity} speed={speed} />;
    case 'starfield':     return <StarfieldBackground intensity={intensity} speed={speed} />;
    case 'rays':          return <RaysBackground intensity={intensity} speed={speed} />;
    case 'constellation': return <ConstellationBackground intensity={intensity} speed={speed} />;
    default:              return null;
  }
}

/**
 * Fondo animado GLOBAL y persistente. Vive una sola vez en el layout raíz,
 * detrás del Stack (cuyas pantallas son transparentes), así las animaciones
 * NO se reinician al navegar — antes cada pantalla montaba su propio fondo y
 * los efectos parpadeaban en cada transición.
 *
 * Orden de capas (clave para dark mode): gradiente → scrim oscuro → efecto.
 * El scrim va DEBAJO del efecto: oscurece la base pero ya no aplasta la
 * animación (antes iba encima al 70% y los efectos casi no se veían en dark).
 */
export default function AppBackground() {
  const { colors, isDark, activePalette, backgroundStyle, backgroundIntensity, backgroundSpeed } = useTheme();
  const { isPremium } = useAuthStore();
  const { reduceMotion } = useProMotion();

  // Gate premium: usuarios free siempre ven Aurora (el efecto de la marca).
  const effectiveStyle: BackgroundStyle = isPremium ? backgroundStyle : 'aurora';
  const speedFactor = BACKGROUND_SPEED_FACTOR[backgroundSpeed];
  const gradientColors = isDark ? activePalette.gradientDark : activePalette.gradientLight;
  // En dark, el chrome del navegador debe coincidir con el fondo YA oscurecido
  // por el scrim, no con el gradiente crudo.
  const statusBarColor = isDark
    ? darkenHex(gradientColors[0] as string, DARK_SCRIM_FACTOR)
    : (gradientColors[0] as string);

  // PWA iOS: con `black-translucent` la app se dibuja bajo la barra de estado y la
  // hora va SIEMPRE en blanco. En oscuro dejamos ver el fondo real (transparent);
  // en claro el gradiente arranca en #FFFFFF y la hora desaparecería, así que la
  // banda se tiñe con el color de marca. No depende de `prefers-color-scheme`: el
  // usuario puede forzar el modo dentro de la app.
  const statusBarBandColor = isDark ? 'transparent' : colors.primaryDark;

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
      }
      meta.content = statusBarColor;
      document.documentElement.style.setProperty('--spendia-statusbar-bg', statusBarBandColor);
    }
  }, [statusBarColor, statusBarBandColor]);

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.clip]} pointerEvents="none">
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {isDark && <View style={[StyleSheet.absoluteFillObject, { backgroundColor: DARK_SCRIM }]} />}
      {/* Reduce-motion: solo el gradiente estático — sin animación permanente */}
      {!reduceMotion && (
        <BackgroundEffect styleKey={effectiveStyle} intensity={backgroundIntensity} speed={speedFactor} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
