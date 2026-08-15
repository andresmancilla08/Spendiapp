import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';
import FxLayer, { type FxFrame } from './fx/FxLayer';

const CONFIG: Record<AuroraIntensity, { opacity: number; count: number }> = {
  subtle:  { opacity: 0.5, count: 5 },
  default: { opacity: 1.0, count: 8 },
  intense: { opacity: 1.35, count: 11 },
};

interface Props {
  intensity?: AuroraIntensity;
  speed?: number;
}

/** Curvas de nivel de un mapa: líneas concéntricas que se desplazan muy despacio.
 *  Es el único efecto de LÍNEA fina del catálogo — los demás son manchas, puntos
 *  o bandas. Cada capa va a su ritmo, así el relieve nunca se ve rígido. */
export default function TopographyBackground({ intensity = 'default', speed = 1 }: Props) {
  const { colors, isDark } = useTheme();
  const cfg = CONFIG[intensity];

  const layers = useMemo(() => Array.from({ length: cfg.count }, (_, i) => ({
    color: [colors.primary, colors.tertiary, colors.secondary][i % 3],
    // Cada curva es la misma forma a distinta escala: eso es lo que produce el
    // efecto de cota. La amplitud crece hacia fuera.
    amp: 26 + i * 9,
    y: 120 + i * 46,
    dur: 26000 + i * 2600,
    phase: (i * 0.17) % 1,
    width: i % 3 === 0 ? 1.4 : 1,
  })), [colors.primary, colors.secondary, colors.tertiary, cfg.count]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {layers.map((l, i) => (
        <Contour key={i} layer={l} opacityMul={cfg.opacity * (isDark ? 1 : 0.8)} speed={speed} />
      ))}
    </View>
  );
}

function Contour({ layer, opacityMul, speed }: {
  layer: { color: string; amp: number; y: number; dur: number; phase: number; width: number };
  opacityMul: number;
  speed: number;
}) {
  const opacity = Math.min(0.4, 0.16 * opacityMul);
  const frames: FxFrame[] = [
    { at: 0, opacity, x: -30 },
    { at: 1, opacity, x: 30 },
  ];
  const W = 420;
  const a = layer.amp;
  const y = layer.y;
  // Dos senos superpuestos: con uno solo el patrón se lee como una onda de audio.
  const d = `M-40,${y} C${W * 0.18},${y - a} ${W * 0.34},${y + a} ${W * 0.5},${y}`
    + ` C${W * 0.66},${y - a * 0.8} ${W * 0.84},${y + a * 1.1} ${W + 40},${y - a * 0.3}`;

  return (
    <FxLayer
      frames={frames}
      duration={layer.dur * speed}
      phase={layer.phase}
      easing="sin"
      style={StyleSheet.absoluteFillObject}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} 900`} preserveAspectRatio="xMidYMid slice">
        <Path d={d} fill="none" stroke={layer.color} strokeWidth={layer.width} strokeLinecap="round" />
      </Svg>
    </FxLayer>
  );
}
