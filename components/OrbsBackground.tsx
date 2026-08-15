import { useRef, useMemo } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useFrozenPhase } from '../hooks/useFrozenPhase';
import type { AuroraIntensity } from './AuroraBackground';

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
    { color: colors.primary,   size: 240, left: '-14%', top: '6%',  dx: 44, dy: -30, dur: 17000, phase: 0 },
    { color: colors.tertiary,  size: 180, left: '62%',  top: '-6%', dx: -38, dy: 34, dur: 21000, phase: 0.33 },
    { color: colors.secondary, size: 300, left: '28%',  top: '52%', dx: 30, dy: -26, dur: 25000, phase: 0.66 },
    { color: colors.info,      size: 140, left: '78%',  top: '38%', dx: -26, dy: -22, dur: 19000, phase: 0.15 },
    { color: colors.success,   size: 200, left: '4%',   top: '68%', dx: 34, dy: 18,  dur: 23000, phase: 0.5 },
    { color: colors.primary,   size: 120, left: '46%',  top: '22%', dx: -22, dy: 28, dur: 15000, phase: 0.8 },
  ].slice(0, cfg.count)), [colors.primary, colors.secondary, colors.tertiary, colors.info, colors.success, cfg.count]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {orbs.map((o, i) => (
        <Orb key={i} orb={o} opacityMul={cfg.opacity * (isDark ? 1 : 0.85)} speed={speed} />
      ))}
    </View>
  );
}

function Orb({ orb, opacityMul, speed }: {
  orb: { color: string; size: number; left: string; top: string; dx: number; dy: number; dur: number; phase: number };
  opacityMul: number;
  speed: number;
}) {
  const t = useRef(new Animated.Value(orb.phase)).current;
  useFrozenPhase(t, orb.dur * speed, orb.phase);

  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, orb.dx] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, orb.dy] });
  const scale = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: orb.left as any,
          top: orb.top as any,
          width: orb.size,
          height: orb.size,
          borderRadius: orb.size / 2,
          borderWidth: 1.5,
          borderColor: orb.color,
          backgroundColor: `${orb.color}14`,
          opacity: Math.min(0.5, 0.26 * opacityMul),
          transform: [{ translateX }, { translateY }, { scale }],
        },
        // El halo hace que el borde no se lea como un simple círculo de CSS.
        Platform.OS === 'web'
          ? ({ boxShadow: `0 0 40px ${orb.color}30` } as any)
          : { shadowColor: orb.color, shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 0 } },
      ]}
    />
  );
}
