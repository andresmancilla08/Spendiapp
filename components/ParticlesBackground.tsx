import { useRef, useEffect, useMemo } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';

const MULTIPLIER: Record<AuroraIntensity, number> = {
  intense: 1.0,
  default: 0.7,
  subtle: 0.35,
};

const COUNT = 14;

interface ParticleConfig {
  left: `${number}%`;
  size: number;
  duration: number;
  delay: number;
  baseOpacity: number;
}

interface Props {
  intensity?: AuroraIntensity;
}

/**
 * Alternativa a AuroraBackground: partículas ascendentes (luciérnagas), no
 * morphing de blobs — para que "personalización de fondo" no sea siempre la
 * misma familia de movimiento.
 */
export default function ParticlesBackground({ intensity = 'default' }: Props) {
  const { isDark, colors } = useTheme();
  const m = MULTIPLIER[intensity] * (isDark ? 1.6 : 1.0);

  // Distribución uniforme determinística (phyllotaxis-like) — evita Math.random
  // para que no "salten" de posición en cada re-render.
  const particles = useMemo<ParticleConfig[]>(() => (
    Array.from({ length: COUNT }, (_, i) => ({
      left: `${(i * 137.5) % 100}%` as const,
      size: 3 + (i * 7) % 5,
      duration: 6000 + (i % 5) * 1400,
      delay: (i * 380) % 4000,
      baseOpacity: 0.25 + (i % 4) * 0.08,
    }))
  ), []);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map((p, i) => (
        <Particle key={i} config={p} color={colors.primary} multiplier={m} />
      ))}
    </View>
  );
}

function Particle({ config, color, multiplier }: { config: ParticleConfig; color: string; multiplier: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(config.delay),
        Animated.timing(anim, { toValue: 1, duration: config.duration, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -160] });
  const opacity = anim.interpolate({
    inputRange: [0, 0.15, 0.85, 1],
    outputRange: [0, config.baseOpacity * multiplier, config.baseOpacity * multiplier, 0],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: config.left,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: color,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  particle: { position: 'absolute', bottom: -20 },
});
