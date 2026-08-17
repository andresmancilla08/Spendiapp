import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, BACKGROUND_BLUR_PX, type BackgroundStyle } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
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

/** Color PLANO del borde superior. Va aparte de `CHROME_COLOR_KEY` (que guarda el
 *  degradado entero del canvas) porque la franja de la barra de estado se pinta
 *  con un color liso: iOS dibuja su cristal encima y desenfocar un color liso no
 *  se nota, mientras que desenfocar un degradado se ve como una mancha. */
export const CHROME_TOP_KEY = '@spendia_chrome_top';

/**
 * Arreglo de recorte para CUALQUIER contenedor con `borderRadius` +
 * `overflow: 'hidden'` que tenga dentro un efecto de fondo desenfocado.
 *
 * `filter: blur()` promueve al hijo a capa compuesta y WebKit deja de aplicarle
 * el recorte redondeado del padre: el desenfoque asoma por las cuatro esquinas
 * (se veía en el lienzo de Personalización y en sus vistas previas). Forzar al
 * padre a crear su propio contexto de composición restablece el clip.
 */
export const CLIP_BLURRED_CHILD = Platform.OS === 'web'
  ? ({
      // La máscara es la que hace el trabajo: obliga a WebKit a recortar en el
      // COMPOSITOR usando la geometría del padre (radio incluido), que es donde
      // `overflow: hidden` se rendía ante la capa del `filter`. Opaca de punta a
      // punta, así que no altera nada de lo que se ve.
      maskImage: 'linear-gradient(#000 0 0)',
      WebkitMaskImage: 'linear-gradient(#000 0 0)',
      isolation: 'isolate',
    } as any)
  : null;

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

/**
 * Deja la franja de la cabecera libre de efecto.
 *
 * Mientras los efectos se movían, un blob que tapaba el avatar o el saludo se
 * iba solo. Quietos, el que cae ahí se queda para siempre: en la PWA se veía un
 * halo permanente detrás del header que parecía un desenfoque del sistema.
 *
 * La máscara actúa sobre el EFECTO, no sobre el contenido — el degradado de
 * color sigue llegando hasta arriba, y los importes y títulos se leen nítidos.
 * Es lo contrario del `scrollFadeMask` que se retiró: aquel atenuaba lo que el
 * usuario quiere leer.
 *
 * 150 px cubren la barra de estado más la cabecera más alta (la del inicio, de
 * 70 px), y el desvanecido es largo para que no se vea dónde acaba.
 */
// Los 96 px de la primera versión se medían desde el borde de la PANTALLA, no
// desde donde empieza la interfaz. En la PWA instalada la barra de estado se come
// ~54 de esos px, así que a la altura del avatar el efecto ya iba al 35% y se veía
// un halo desenfocado detrás de la cabecera — en TODAS las pantallas, porque todas
// tienen barra superior. Ahora los tramos cuelgan de `safe-area-inset-top`: el
// efecto no asoma hasta pasada la cabecera, la mida lo que la mida el dispositivo.
// En navegador el inset vale 0 y se comporta como antes, con algo más de aire.
const CLEAR = 'env(safe-area-inset-top, 0px)';
const HEADER_MASK =
  'linear-gradient(to bottom, ' +
  `transparent 0px, transparent calc(${CLEAR} + 88px), ` +
  `rgba(0,0,0,0.35) calc(${CLEAR} + 170px), ` +
  `rgba(0,0,0,1) calc(${CLEAR} + 260px))`;

const HEADER_CLEARANCE = Platform.OS === 'web'
  ? ({
      ...StyleSheet.absoluteFillObject,
      maskImage: HEADER_MASK,
      WebkitMaskImage: HEADER_MASK,
    } as any)
  : StyleSheet.absoluteFillObject;

/** Renderiza el efecto animado correspondiente a un estilo de fondo.
 * Compartido por el fondo global (AppBackground) y las vistas previas de
 * personalización — una sola fuente de verdad para el mapa estilo→componente. */
export function BackgroundEffect({ styleKey, intensity, speed = 1 }: {
  styleKey: BackgroundStyle; intensity: AuroraIntensity; speed?: number;
}) {
  switch (styleKey) {
    case 'aurora':        return <AuroraBackground intensity={intensity} />;
    case 'particles':     return <ParticlesBackground intensity={intensity} />;
    case 'waves':         return <WavesBackground intensity={intensity} />;
    case 'grain':         return <GrainBackground intensity={intensity} />;
    case 'mesh':          return <MeshBackground intensity={intensity} />;
    case 'bokeh':         return <BokehBackground intensity={intensity} />;
    case 'flow':          return <FlowBackground intensity={intensity} />;
    case 'starfield':     return <StarfieldBackground intensity={intensity} />;
    case 'rays':          return <RaysBackground intensity={intensity} />;
    case 'constellation': return <ConstellationBackground intensity={intensity} />;
    case 'orbs':          return <OrbsBackground intensity={intensity} />;
    case 'topography':    return <TopographyBackground intensity={intensity} />;
    case 'spotlight':     return <SpotlightBackground intensity={intensity} />;
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
  const { isDark, activePalette, backgroundStyle, backgroundIntensity, backgroundBlur, gradientStyle } = useTheme();
  const { isPremium } = useAuthStore();

  // Gate premium: usuarios free siempre ven Aurora (el efecto de la marca).
  const effectiveStyle: BackgroundStyle = isPremium ? backgroundStyle : 'aurora';
  const gradientColors = isDark ? activePalette.gradientDark : activePalette.gradientLight;
  const blurStyle = backgroundBlurStyle(BACKGROUND_BLUR_PX[backgroundBlur]);

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
      document.documentElement.style.setProperty('--spendia-chrome-top', chromeColor);
      // Cache para el arranque siguiente: el script del <head> corre antes de
      // conocer la paleta y sin esto pintaría el neutro del modo.
      try {
        window.localStorage.setItem(CHROME_COLOR_KEY, canvasBackground);
        window.localStorage.setItem(CHROME_TOP_KEY, chromeColor);
      } catch {}
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
      {/* El efecto ya NO se mueve (ver `hooks/useFrozenPhase.ts`), así que se
          muestra siempre: reduce-motion pide quitar movimiento, no quitar el
          diseño, y una imagen quieta no es movimiento. Antes se ocultaba porque
          era una animación permanente.
          Va desenfocado (según Personalización) para que nunca compita con el
          contenido; el gradiente queda nítido, es el que da el color. */}
      {/* FRANJA LISA DE CABECERA. iOS dibuja un cristal translúcido sobre la parte
          superior de las apps instaladas. Desenfocar un color plano no se nota
          —por eso el modal de novedades, que lleva fondo opaco, nunca se ve
          borroso— pero desenfocar el degradado con blobs sí: era el 'blur' que se
          veía en todas las barras superiores. Aquí el fondo se aplana justo en esa
          zona, sin tapar nada: esto va DETRÁS del contenido, así que la cabecera
          se sigue viendo. El color es el primer stop del degradado activo. */}
      {Platform.OS === 'web' && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 'calc(env(safe-area-inset-top, 0px) + 76px)' as any,
            backgroundColor: chromeColor,
          }}
        />
      )}
      <View style={HEADER_CLEARANCE} pointerEvents="none">
        {blurStyle ? (
          <View style={blurStyle} pointerEvents="none">
            <BackgroundEffect styleKey={effectiveStyle} intensity={backgroundIntensity} />
          </View>
        ) : (
          <BackgroundEffect styleKey={effectiveStyle} intensity={backgroundIntensity} />
        )}
      </View>
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
