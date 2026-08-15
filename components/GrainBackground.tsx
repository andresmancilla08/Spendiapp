import { StyleSheet, Platform, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';
import FxLayer, { type FxFrame } from './fx/FxLayer';
import SoftOrb from './fx/SoftOrb';

const CONFIG: Record<AuroraIntensity, { grain: number; wash: number }> = {
  subtle:  { grain: 0.5, wash: 0.5 },
  default: { grain: 1.0, wash: 1.0 },
  intense: { grain: 1.6, wash: 1.4 },
};

// Ruido fractal SVG → textura de grano de película. Solo web (RN nativo no
// aplica backgroundImage); en nativo se degrada al wash de color.
const NOISE_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>" +
  "<feColorMatrix type='saturate' values='0'/></filter>" +
  "<rect width='100%' height='100%' filter='url(#n)'/></svg>";
const NOISE_URI = `url("data:image/svg+xml,${encodeURIComponent(NOISE_SVG)}")`;

interface Props {
  intensity?: AuroraIntensity;
  /** Multiplicador de duración (1 = normal, >1 más lento, <1 más rápido). */
  speed?: number;
}

/**
 * Fondo con textura de grano sutil sobre un wash de color de la paleta que
 * deriva lento. El grano (ruido SVG) late apenas para no quedar estático.
 *
 * Los dos washes llevaban `filter: blur(26px)` sobre cajas del 90 % × 70 % de
 * la pantalla, animadas: se sustituye por degradado elíptico.
 */
export default function GrainBackground({ intensity = 'default', speed = 1 }: Props) {
  const { isDark, colors } = useTheme();
  const cfg = CONFIG[intensity];

  const grainBase = (isDark ? 0.14 : 0.13) * cfg.grain;
  const washMul = (isDark ? 1.35 : 1.4) * cfg.wash;

  const op1 = 0.22 * washMul;
  const op2 = 0.18 * washMul;

  const wash1: FxFrame[] = [
    { at: 0,   opacity: op1, x: -52, y: 0 },
    { at: 0.5, opacity: op1, x: 52,  y: 42 },
    { at: 1,   opacity: op1, x: -52, y: 0 },
  ];
  const wash2: FxFrame[] = [
    { at: 0,   opacity: op2, x: 52 },
    { at: 0.5, opacity: op2, x: -52 },
    { at: 1,   opacity: op2, x: 52 },
  ];
  const grain: FxFrame[] = [
    { at: 0,   opacity: grainBase * 0.45 },
    { at: 0.5, opacity: grainBase },
    { at: 1,   opacity: grainBase * 0.45 },
  ];

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Wash de color: dos campos suaves de la paleta que derivan lento */}
      <FxLayer frames={wash1} duration={11000 * speed} easing="sin" style={[styles.wash, { top: '-10%', left: '-15%' }]}>
        <SoftOrb color={colors.primary} softness={0.8} shape="ellipse" />
      </FxLayer>
      <FxLayer frames={wash2} duration={11000 * speed} easing="sin" style={[styles.wash, { bottom: '-10%', right: '-15%' }]}>
        <SoftOrb color={colors.tertiary} softness={0.8} shape="ellipse" />
      </FxLayer>

      {/* Grano (solo web) */}
      {Platform.OS === 'web' && (
        <FxLayer
          frames={grain}
          duration={3600 * speed}
          easing="sin"
          style={[StyleSheet.absoluteFillObject, { backgroundImage: NOISE_URI, backgroundRepeat: 'repeat', backgroundSize: '160px 160px' } as any]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wash: { position: 'absolute', width: '90%', height: '70%' },
});
