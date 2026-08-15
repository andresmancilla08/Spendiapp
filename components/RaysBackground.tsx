import { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';
import FxLayer, { type FxFrame } from './fx/FxLayer';

const CONFIG: Record<AuroraIntensity, { opacity: number; count: number }> = {
  subtle:  { opacity: 0.5, count: 3 },
  default: { opacity: 1.0, count: 4 },
  intense: { opacity: 1.5, count: 5 },
};

interface Props {
  intensity?: AuroraIntensity;
  speed?: number;
}

/**
 * Haces de luz: rayos anchos que caen desde arriba en distintos ángulos y se
 * mecen lentamente mientras su brillo respira, como luz entrando por una
 * ventana.
 *
 * El haz llevaba `filter: blur(16px)` para deshacer sus bordes laterales. Ahora
 * en web es un degradado elíptico anclado arriba, que se abre y se apaga solo;
 * en nativo, el degradado vertical de siempre. Ningún desenfoque.
 */
export default function RaysBackground({ intensity = 'default', speed = 1 }: Props) {
  const { isDark, colors } = useTheme();
  const cfg = CONFIG[intensity];
  const glow = isDark ? 1.25 : 1.4;

  const rays = useMemo(() => ([
    { color: colors.primary,   left: '8%',  width: 130, rotate: -14, base: 0.20, dur: 10000, sway: 52, phase: 0 },
    { color: colors.secondary, left: '34%', width: 90,  rotate: -6,  base: 0.15, dur: 13000, sway: 38, phase: 0.42 },
    { color: colors.tertiary,  left: '58%', width: 150, rotate: 8,   base: 0.17, dur: 11500, sway: 60, phase: 0.21 },
    { color: colors.info,      left: '80%', width: 100, rotate: 15,  base: 0.13, dur: 14500, sway: 42, phase: 0.63 },
    { color: colors.success,   left: '22%', width: 70,  rotate: 3,   base: 0.11, dur: 16000, sway: 30, phase: 0.84 },
  ].slice(0, cfg.count)), [colors.primary, colors.secondary, colors.tertiary, colors.info, colors.success, cfg.count]);

  const opacityMul = cfg.opacity * glow;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {rays.map((r, i) => {
        const lo = r.base * opacityMul * 0.4;
        const hi = Math.min(r.base * opacityMul * 1.35, 0.5);
        const frames: FxFrame[] = [
          { at: 0,   opacity: lo, x: -r.sway },
          { at: 0.5, opacity: hi, x: r.sway },
          { at: 1,   opacity: lo, x: -r.sway },
        ];
        return (
          <FxLayer
            key={i}
            frames={frames}
            duration={r.dur * speed}
            phase={r.phase}
            easing="sin"
            rotate={`${r.rotate}deg`}
            style={[styles.ray, { left: r.left as any, width: r.width }]}
          >
            <Beam color={r.color} />
          </FxLayer>
        );
      })}
    </View>
  );
}

/** El haz: elíptico y anclado al borde superior, para que nazca fuera de cuadro. */
function Beam({ color }: { color: string }) {
  if (Platform.OS === 'web') {
    return (
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundImage: `radial-gradient(ellipse 72% 108% at 50% -6%, ${color} 0%, ${color}66 42%, transparent 76%)` } as any,
        ]}
      />
    );
  }
  return (
    <LinearGradient
      colors={[color, color + '66', 'transparent']}
      locations={[0, 0.45, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    />
  );
}

const styles = StyleSheet.create({
  ray: { position: 'absolute', top: '-18%', height: '95%' },
});
