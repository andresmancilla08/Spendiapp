import { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';
import FxLayer, { type FxFrame } from './fx/FxLayer';

const CONFIG: Record<AuroraIntensity, { opacity: number; count: number }> = {
  subtle:  { opacity: 0.55, count: 3 },
  default: { opacity: 1.0, count: 4 },
  intense: { opacity: 1.4, count: 6 },
};

interface Props {
  intensity?: AuroraIntensity;
  speed?: number;
}

/**
 * Orbes: círculos GRANDES de borde nítido que orbitan despacio y se cruzan por
 * delante y por detrás. A diferencia de aurora (manchas difusas) y de bokeh
 * (puntos pequeños desenfocados), aquí la forma se reconoce: son planetas, no
 * niebla. El contorno es lo que lo distingue, así que el relleno es tenue y el
 * borde lleva el color.
 */
export default function OrbsBackground({ intensity = 'default', speed = 1 }: Props) {
  const { isDark, colors } = useTheme();
  const cfg = CONFIG[intensity];

  const orbs = useMemo(() => ([
    { color: colors.primary,   size: 240, left: '-14%', top: '6%',  dx: 44,  dy: -30, dur: 17000, phase: 0 },
    { color: colors.tertiary,  size: 180, left: '62%',  top: '-6%', dx: -38, dy: 34,  dur: 21000, phase: 0.33 },
    { color: colors.secondary, size: 300, left: '28%',  top: '52%', dx: 30,  dy: -26, dur: 25000, phase: 0.66 },
    { color: colors.info,      size: 140, left: '78%',  top: '38%', dx: -26, dy: -22, dur: 19000, phase: 0.15 },
    { color: colors.success,   size: 200, left: '4%',   top: '68%', dx: 34,  dy: 18,  dur: 23000, phase: 0.5 },
    { color: colors.primary,   size: 120, left: '46%',  top: '22%', dx: -22, dy: 28,  dur: 15000, phase: 0.8 },
  ].slice(0, cfg.count)), [colors.primary, colors.secondary, colors.tertiary, colors.info, colors.success, cfg.count]);

  const opacityMul = cfg.opacity * (isDark ? 1 : 0.85);
  const opacity = Math.min(0.5, 0.26 * opacityMul);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {orbs.map((o, i) => {
        const frames: FxFrame[] = [
          { at: 0,   opacity, x: 0,          y: 0,          scale: 1 },
          { at: 0.5, opacity, x: o.dx * 0.5, y: o.dy * 0.5, scale: 1.08 },
          { at: 1,   opacity, x: o.dx,       y: o.dy,       scale: 1 },
        ];
        return (
          <FxLayer
            key={i}
            frames={frames}
            duration={o.dur * speed}
            phase={o.phase}
            easing="sin"
            style={[
              {
                position: 'absolute',
                left: o.left as any,
                top: o.top as any,
                width: o.size,
                height: o.size,
                borderRadius: o.size / 2,
                borderWidth: 1.5,
                borderColor: o.color,
                backgroundColor: `${o.color}14`,
              },
              // El halo hace que el borde no se lea como un simple círculo de CSS.
              // Es estático: al animarse solo transform y opacity, se pinta una vez.
              Platform.OS === 'web'
                ? ({ boxShadow: `0 0 40px ${o.color}30` } as any)
                : { shadowColor: o.color, shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 0 } },
            ]}
          />
        );
      })}
    </View>
  );
}
