import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, BACKGROUND_SPEED_FACTOR, BACKGROUND_SOFTNESS, type BackgroundStyle } from '../context/ThemeContext';
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
import OrbsBackground from './OrbsBackground';
import TopographyBackground from './TopographyBackground';
import SpotlightBackground from './SpotlightBackground';

/** Scrim que oscurece el gradiente base en modo oscuro. Va SIEMPRE debajo de
 * los efectos — compartido con el fondo local del login (ScreenBackground). */
export const DARK_SCRIM = 'rgba(0,0,0,0.7)';

/** Color visible en el borde superior del fondo: primer stop del gradiente
 *  activo, ya mezclado con DARK_SCRIM (que en oscuro va encima al 70% → el
 *  color de fondo queda al 30%). Es el que se da al chrome del sistema y al
 *  canvas del navegador, para que la zona segura siga el tema del usuario. */
export function topBackgroundColor(hex: string, isDark: boolean) {
  if (!isDark) return hex;
  const n = parseInt(hex.slice(1), 16);
  const scrim = (c: number) => Math.round(c * 0.3).toString(16).padStart(2, '0');
  return `#${scrim((n >> 16) & 255)}${scrim((n >> 8) & 255)}${scrim(n & 255)}`;
}

/** Clave donde se cachea ese color para el script pre-React de `+html.tsx`:
 *  sin ella la PWA arranca con el neutro del modo y la franja parpadea. */
export const CHROME_COLOR_KEY = '@spendia_chrome';

/**
 * Aislamiento del contexto de composición para contenedores con `borderRadius`
 * + `overflow: 'hidden'` que llevan dentro un efecto de fondo.
 *
 * Los efectos crean capas propias (animación CSS) y WebKit dejaba de aplicarles
 * el recorte redondeado del padre: el fondo asomaba por las cuatro esquinas (se
 * veía en el lienzo de Personalización y en sus vistas previas). La máscara
 * obliga a WebKit a recortar en el COMPOSITOR con la geometría del padre, radio
 * incluido. Es opaca de punta a punta: no altera nada de lo que se ve.
 */
export const CLIP_BLURRED_CHILD = Platform.OS === 'web'
  ? ({
      maskImage: 'linear-gradient(#000 0 0)',
      WebkitMaskImage: 'linear-gradient(#000 0 0)',
      isolation: 'isolate',
    } as any)
  : null;

/** Renderiza el efecto animado correspondiente a un estilo de fondo.
 * Compartido por el fondo global (AppBackground) y las vistas previas de
 * personalización — una sola fuente de verdad para el mapa estilo→componente.
 *
 * `softness` sustituye al antiguo desenfoque en píxeles: los efectos con forma
 * definida difuminan su propio borde con el degradado, sin `filter: blur()`. */
export function BackgroundEffect({ styleKey, intensity, speed = 1, softness = 0.65 }: {
  styleKey: BackgroundStyle; intensity: AuroraIntensity; speed?: number; softness?: number;
}) {
  switch (styleKey) {
    case 'aurora':        return <AuroraBackground intensity={intensity} speed={speed} softness={softness} />;
    case 'particles':     return <ParticlesBackground intensity={intensity} speed={speed} />;
    case 'waves':         return <WavesBackground intensity={intensity} speed={speed} softness={softness} />;
    case 'grain':         return <GrainBackground intensity={intensity} speed={speed} />;
    case 'mesh':          return <MeshBackground intensity={intensity} speed={speed} softness={softness} />;
    case 'bokeh':         return <BokehBackground intensity={intensity} speed={speed} />;
    case 'flow':          return <FlowBackground intensity={intensity} speed={speed} softness={softness} />;
    case 'starfield':     return <StarfieldBackground intensity={intensity} speed={speed} />;
    case 'rays':          return <RaysBackground intensity={intensity} speed={speed} />;
    case 'constellation': return <ConstellationBackground intensity={intensity} speed={speed} />;
    case 'orbs':          return <OrbsBackground intensity={intensity} speed={speed} />;
    case 'topography':    return <TopographyBackground intensity={intensity} speed={speed} />;
    case 'spotlight':     return <SpotlightBackground intensity={intensity} speed={speed} />;
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
  const { isDark, activePalette, backgroundStyle, backgroundIntensity, backgroundSpeed, backgroundBlur, gradientStyle } = useTheme();
  const { isPremium } = useAuthStore();
  const { reduceMotion } = useProMotion();

  // Gate premium: usuarios free siempre ven Aurora (el efecto de la marca).
  const effectiveStyle: BackgroundStyle = isPremium ? backgroundStyle : 'aurora';
  const speedFactor = BACKGROUND_SPEED_FACTOR[backgroundSpeed];
  const gradientColors = isDark ? activePalette.gradientDark : activePalette.gradientLight;
  const softness = BACKGROUND_SOFTNESS[backgroundBlur];

  // Chrome del sistema y canvas del navegador con el fondo de la app, no un
  // neutro: las zonas seguras siguen el tema/paleta del usuario igual que el
  // resto de la pantalla. `theme-color` solo acepta un color, así que lleva el
  // del borde superior; el canvas (html/body) lleva el DEGRADADO COMPLETO.
  //
  // Por qué el degradado y no un color: en la PWA de iOS `innerHeight` (820pt
  // medidos en un iPhone 17) es menor que la pantalla, así que `#root`, aun
  // siendo `fixed; inset: 0`, se queda corto y el canvas asoma en la franja del
  // home indicator (~34pt). Con un color plano esa franja no empataba con el
  // fondo justo encima; con los mismos tres stops, empata arriba y abajo.
  const chromeColor = topBackgroundColor(gradientColors[0] as string, isDark);
  const endColor = topBackgroundColor(gradientColors[2] as string, isDark);
  // `no-repeat` + color de relleno: el fondo del elemento raíz se propaga al
  // canvas pero se posiciona con la caja del root, así que un gradiente sin
  // más se REPETÍA y la franja de abajo volvía a mostrar el primer stop (blanco
  // en casi todas las paletas claras). El color pinta lo que sobre.
  const canvasBackground = gradientStyle === 'flat'
    ? chromeColor
    : gradientStyle === 'radial'
      ? endColor
      : `${endColor} linear-gradient(180deg, ${gradientColors.map((c) => topBackgroundColor(c as string, isDark)).join(', ')}) no-repeat`;

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
      }
      meta.content = chromeColor;
      document.documentElement.style.setProperty('--spendia-app-bg', canvasBackground);
      // Cache para el arranque siguiente: el script del <head> corre antes de
      // conocer la paleta y sin esto pintaría el neutro del modo.
      try { window.localStorage.setItem(CHROME_COLOR_KEY, canvasBackground); } catch {}
    }
  }, [chromeColor, canvasBackground]);

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.clip]} pointerEvents="none">
      {/* La MISMA paleta cae distinto según la dirección del degradado. 'diagonal'
          es lo que la app pintaba antes de que esto fuera configurable; 'flat' deja
          el color base sólido, para quien quiere un fondo sin transición. */}
      {gradientStyle === 'flat' ? (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: gradientColors[0] as string }]} />
      ) : gradientStyle === 'radial' ? (
        <>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: gradientColors[2] as string }]} />
          {/* Radial simulado. Antes era un halo con `blur(120px)` — el
              desenfoque más grande de toda la app. En web lo pinta ahora un
              degradado radial real (coste único, no por frame); en nativo,
              donde no hay degradado radial, se conserva la sombra difusa: es
              estática, así que no se recalcula en cada frame. */}
          <View
            style={[
              styles.radialCore,
              Platform.OS === 'web'
                ? ({ backgroundImage: `radial-gradient(ellipse at 50% 40%, ${gradientColors[0]} 0%, transparent 72%)` } as any)
                : {
                    backgroundColor: gradientColors[0] as string,
                    shadowColor: gradientColors[0] as string,
                    shadowOpacity: 1, shadowRadius: 120, shadowOffset: { width: 0, height: 0 },
                  },
            ]}
          />
        </>
      ) : (
        <LinearGradient
          colors={gradientColors}
          start={gradientStyle === 'linear' ? { x: 0.5, y: 0 } : { x: 0.1, y: 0 }}
          end={gradientStyle === 'linear' ? { x: 0.5, y: 1 } : { x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {isDark && <View style={[StyleSheet.absoluteFillObject, { backgroundColor: DARK_SCRIM }]} />}
      {/* Reduce-motion: solo el gradiente estático — sin animación permanente.
          El efecto va suavizado (según Personalización) para que nunca compita
          con el contenido; el gradiente queda nítido, es el que da el color. */}
      {!reduceMotion && (
        <BackgroundEffect
          styleKey={effectiveStyle}
          intensity={backgroundIntensity}
          speed={speedFactor}
          softness={softness}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  radialCore: {
    position: 'absolute', top: '-25%', left: '-25%', width: '150%', height: '110%',
    borderRadius: 9999, opacity: 0.9,
  },
  clip: { overflow: 'hidden' },
});
