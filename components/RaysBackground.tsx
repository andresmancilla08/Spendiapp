import { useRef, useMemo } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { usePhasedLoop } from '../hooks/usePhasedLoop';
import type { AuroraIntensity } from './AuroraBackground';

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
 * ventana. Lenguaje vertical y direccional, distinto de blobs y bandas.
 */
export default function RaysBackground({ intensity = 'default', speed = 1 }: Props) {
  const { isDark, colors } = useTheme();
  const cfg = CONFIG[intensity];
  const glow = isDark ? 1.25 : 1.0;

  const rays = useMemo(() => ([
    { color: colors.primary,   left: '8%',  width: 130, rotate: -14, base: 0.20, dur: 17000, sway: 26, phase: 0 },
    { color: colors.secondary, left: '34%', width: 90,  rotate: -6,  base: 0.15, dur: 21000, sway: 18, phase: 0.42 },
    { color: colors.tertiary,  left: '58%', width: 150, rotate: 8,   base: 0.17, dur: 19000, sway: 30, phase: 0.21 },
    { color: colors.info,      left: '80%', width: 100, rotate: 15,  base: 0.13, dur: 23000, sway: 20, phase: 0.63 },
    { color: colors.success,   left: '22%', width: 70,  rotate: 3,   base: 0.11, dur: 25000, sway: 14, phase: 0.84 },
  ].slice(0, cfg.count)), [colors.primary, colors.secondary, colors.tertiary, colors.info, colors.success, cfg.count]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {rays.map((r, i) => (
        <Ray key={i} ray={r} opacityMul={cfg.opacity * glow} speed={speed} />
      ))}
    </View>
  );
}

function Ray({ ray, opacityMul, speed }: {
  ray: { color: string; left: string; width: number; rotate: number; base: number; dur: number; sway: number; phase: number };
  opacityMul: number; speed: number;
}) {
  const v = useRef(new Animated.Value(0)).current;
  usePhasedLoop(v, ray.dur * speed, ray.phase);

  const tx = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-ray.sway, ray.sway, -ray.sway] });
  const opacity = v.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [ray.base * opacityMul * 0.6, Math.min(ray.base * opacityMul * 1.25, 0.5), ray.base * opacityMul * 0.6],
  });

  return (
    <Animated.View
      style={[
        styles.ray,
        Platform.OS === 'web' ? ({ filter: 'blur(16px)' } as any) : {},
        { left: ray.left as any, width: ray.width, opacity, transform: [{ translateX: tx }, { rotate: `${ray.rotate}deg` }] },
      ]}
    >
      <LinearGradient
        colors={[ray.color, ray.color + '66', 'transparent']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ray: { position: 'absolute', top: '-18%', height: '95%' },
});
