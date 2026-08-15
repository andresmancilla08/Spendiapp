import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';
import FxLayer, { type FxFrame } from './fx/FxLayer';
import SoftOrb from './fx/SoftOrb';

const CONFIG: Record<AuroraIntensity, { opacity: number; count: number }> = {
  subtle:  { opacity: 0.5, count: 1 },
  default: { opacity: 1.0, count: 2 },
  intense: { opacity: 1.4, count: 3 },
};

interface Props {
  intensity?: AuroraIntensity;
  speed?: number;
}

/**
 * Foco de teatro: uno o dos halos muy grandes y muy suaves que barren la
 * pantalla despacio. El efecto MÁS discreto del catálogo.
 *
 * Era el peor caso individual de desenfoque: `blur(90px)` sobre un círculo de
 * 520 px que además se movía. Como aquí el degradado ES el efecto, el cambio a
 * `radial-gradient` no solo es más barato: es más fiel.
 */
export default function SpotlightBackground({ intensity = 'default', speed = 1 }: Props) {
  const { colors, isDark } = useTheme();
  const cfg = CONFIG[intensity];

  const lights = useMemo(() => ([
    { color: colors.primary,   size: 520, left: '-30%', top: '-18%', dx: 70,  dy: 46,  dur: 22000, phase: 0 },
    { color: colors.tertiary,  size: 420, left: '46%',  top: '44%',  dx: -58, dy: -40, dur: 27000, phase: 0.5 },
    { color: colors.secondary, size: 360, left: '18%',  top: '70%',  dx: 44,  dy: -34, dur: 31000, phase: 0.25 },
  ].slice(0, cfg.count)), [colors.primary, colors.secondary, colors.tertiary, cfg.count]);

  const opacityMul = cfg.opacity * (isDark ? 1 : 0.7);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {lights.map((l, i) => {
        const frames: FxFrame[] = [
          { at: 0,   opacity: 0.1 * opacityMul,  x: 0,          y: 0 },
          { at: 0.5, opacity: 0.26 * opacityMul, x: l.dx * 0.5, y: l.dy * 0.5 },
          { at: 1,   opacity: 0.1 * opacityMul,  x: l.dx,       y: l.dy },
        ];
        return (
          <FxLayer
            key={i}
            frames={frames}
            duration={l.dur * speed}
            phase={l.phase}
            easing="sin"
            style={{ position: 'absolute', left: l.left as any, top: l.top as any, width: l.size, height: l.size }}
          >
            {/* Un foco es luz difusa pura: la suavidad va al máximo. */}
            <SoftOrb color={l.color} softness={0.95} />
          </FxLayer>
        );
      })}
    </View>
  );
}
