import { useRef, useMemo } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { usePhasedLoop } from '../hooks/usePhasedLoop';
import type { AuroraIntensity } from './AuroraBackground';

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
 * Foco de teatro: uno o dos halos muy grandes y muy suaves que barren la pantalla
 * despacio. Es el efecto MÁS discreto del catálogo — para quien quiere que el fondo
 * respire sin que se note de dónde viene la luz. Nada de formas reconocibles: solo
 * un degradado radial enorme.
 */
export default function SpotlightBackground({ intensity = 'default', speed = 1 }: Props) {
  const { colors, isDark } = useTheme();
  const cfg = CONFIG[intensity];

  const lights = useMemo(() => ([
    { color: colors.primary,  size: 520, left: '-30%', top: '-18%', dx: 70, dy: 46, dur: 22000, phase: 0 },
    { color: colors.tertiary, size: 420, left: '46%',  top: '44%',  dx: -58, dy: -40, dur: 27000, phase: 0.5 },
    { color: colors.secondary, size: 360, left: '18%', top: '70%',  dx: 44, dy: -34, dur: 31000, phase: 0.25 },
  ].slice(0, cfg.count)), [colors.primary, colors.secondary, colors.tertiary, cfg.count]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {lights.map((l, i) => (
        <Light key={i} light={l} opacityMul={cfg.opacity * (isDark ? 1 : 0.7)} speed={speed} />
      ))}
    </View>
  );
}

function Light({ light, opacityMul, speed }: {
  light: { color: string; size: number; left: string; top: string; dx: number; dy: number; dur: number; phase: number };
  opacityMul: number;
  speed: number;
}) {
  const t = useRef(new Animated.Value(light.phase)).current;
  usePhasedLoop(t, light.dur * speed, light.phase);

  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, light.dx] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, light.dy] });
  const opacity = t.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.1 * opacityMul, 0.26 * opacityMul, 0.1 * opacityMul],
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: light.left as any,
          top: light.top as any,
          width: light.size,
          height: light.size,
          borderRadius: light.size / 2,
          backgroundColor: light.color,
          opacity,
          transform: [{ translateX }, { translateY }],
        },
        // El desenfoque ES el efecto: sin él sería un círculo plano.
        Platform.OS === 'web'
          ? ({ filter: 'blur(90px)' } as any)
          : { shadowColor: light.color, shadowOpacity: 0.9, shadowRadius: 90, shadowOffset: { width: 0, height: 0 } },
      ]}
    />
  );
}
