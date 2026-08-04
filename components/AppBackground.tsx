import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, BACKGROUND_SPEED_FACTOR, BACKGROUND_BLUR_PX, type BackgroundStyle } from '../context/ThemeContext';
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

/** Desenfoque del efecto de fondo, listo para `style`. En web es `filter` CSS;
 *  en nativo, el `filter` de RN (array de operaciones). El contenedor se
 *  sobredimensiona con `inset` negativo porque un blur deja el borde del
 *  elemento translúcido y se vería una orla clara pegada a los cuatro lados. */
export function backgroundBlurStyle(px: number) {
  if (px <= 0) return null;
  const bleed = -px * 2;
  return [
    { position: 'absolute' as const, top: bleed, right: bleed, bottom: bleed, left: bleed },
    Platform.OS === 'web'
      ? ({ filter: `blur(${px}px)` } as any)
      : ({ filter: [{ blur: px }] } as any),
  ];
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
  const blurStyle = backgroundBlurStyle(BACKGROUND_BLUR_PX[backgroundBlur]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
      }
      // El chrome del navegador (Android/Chrome) y la zona segura de la PWA en iOS
      // van SIEMPRE neutros: negro en oscuro, blanco en claro. Con el color de la
      // paleta, la franja superior cambiaba de tono con cada tema y competía con
      // el contenido; neutro funciona igual en las 32 paletas.
      const chrome = isDark ? '#000000' : '#FFFFFF';
      meta.content = chrome;
      document.documentElement.style.setProperty('--spendia-statusbar-bg', chrome);
      // Canvas del navegador (html/body): el MISMO neutro. Con el color de la
      // paleta, la franja de la barra de estado y el rubber band salían azul
      // oscuro en vez de negro — la franja del sistema tiene que ser negra en
      // oscuro y blanca en claro, sin tinte de marca.
      document.documentElement.style.setProperty('--spendia-app-bg', chrome);
    }
  }, [isDark]);

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
          {/* Radial simulado: expo-linear-gradient no lo trae, y un halo enorme y
              desenfocado da el mismo resultado sin añadir dependencias. */}
          <View
            style={[
              styles.radialCore,
              { backgroundColor: gradientColors[0] as string },
              Platform.OS === 'web'
                ? ({ filter: 'blur(120px)' } as any)
                : { shadowColor: gradientColors[0] as string, shadowOpacity: 1, shadowRadius: 120, shadowOffset: { width: 0, height: 0 } },
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
          El efecto va desenfocado (según Personalización) para que nunca compita
          con el contenido; el gradiente queda nítido, es el que da el color. */}
      {!reduceMotion && (
        blurStyle ? (
          <View style={blurStyle} pointerEvents="none">
            <BackgroundEffect styleKey={effectiveStyle} intensity={backgroundIntensity} speed={speedFactor} />
          </View>
        ) : (
          <BackgroundEffect styleKey={effectiveStyle} intensity={backgroundIntensity} speed={speedFactor} />
        )
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
