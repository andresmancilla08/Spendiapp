import { useRef, useState, useEffect, useMemo } from 'react';
import { View, Animated, Easing, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';

// La intensidad cambia densidad, brillo y velocidad de forma perceptible.
const CONFIG: Record<AuroraIntensity, { count: number; opacity: number; speed: number }> = {
  subtle:  { count: 10, opacity: 0.6, speed: 1.25 },
  default: { count: 20, opacity: 1.0, speed: 1.0 },
  intense: { count: 34, opacity: 1.5, speed: 0.72 },
};

interface ParticleConfig {
  left: `${number}%`;
  size: number;
  duration: number;
  delay: number;
  baseOpacity: number;
  sway: number;
  color: string;
}

interface Props {
  intensity?: AuroraIntensity;
  /** Multiplicador de duración (1 = normal, >1 más lento, <1 más rápido). */
  speed?: number;
}

/**
 * Luciérnagas premium: ascienden con deriva senoidal, parpadean (twinkle) y
 * llevan un halo suave. El color se toma de la paleta activa (tema de
 * partículas por paleta), no de un único acento.
 */
export default function ParticlesBackground({ intensity = 'default', speed = 1 }: Props) {
  const { isDark, colors } = useTheme();
  const cfg = CONFIG[intensity];
  const glow = isDark ? 1.3 : 1.0;
  const { height: windowHeight } = useWindowDimensions();
  // Mide su propio contenedor: las partículas ascienden hasta la MITAD de la
  // vista (no solo un tramo fijo del borde inferior), y en previews pequeños
  // el recorrido escala igual.
  const [ownHeight, setOwnHeight] = useState(0);
  const travel = (ownHeight || windowHeight) * 0.55;

  // Multicolor tomado de la paleta → cada partícula hereda un acento distinto.
  const palette = useMemo(
    () => [colors.primary, colors.secondary, colors.tertiary, colors.success, colors.info],
    [colors.primary, colors.secondary, colors.tertiary, colors.success, colors.info],
  );

  // El recorrido antes era fijo (190px); al subir hasta media pantalla la
  // duración escala con la distancia para mantener la misma velocidad percibida.
  const durScale = Math.max(1, travel / 190);

  const particles = useMemo<ParticleConfig[]>(() => (
    Array.from({ length: cfg.count }, (_, i) => ({
      left: `${(i * 137.5) % 100}%` as const,
      size: 2.5 + (i * 7) % 5,
      duration: (6000 + (i % 5) * 1400) * cfg.speed * speed * durScale,
      delay: (i * 380) % 4200,
      baseOpacity: Math.min((0.28 + (i % 4) * 0.08) * cfg.opacity * glow, 0.95),
      sway: 10 + (i % 3) * 9,
      color: palette[i % palette.length],
    }))
  ), [cfg.count, cfg.speed, cfg.opacity, glow, palette, speed, durScale]);

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
      onLayout={(e) => { const h = e.nativeEvent.layout.height; if (h && Math.abs(h - ownHeight) > 1) setOwnHeight(h); }}
    >
      {particles.map((p, i) => (
        <Particle key={i} config={p} travel={travel} />
      ))}
    </View>
  );
}

function Particle({ config, travel }: { config: ParticleConfig; travel: number }) {
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
    // Reinicia in-place al cambiar velocidad/intensidad (duración/delay nuevos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.duration, config.delay]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -travel] });
  const translateX = anim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, config.sway, 0, -config.sway, 0],
  });
  // Twinkle: la opacidad late mientras sube, en vez de un simple fade lineal.
  const opacity = anim.interpolate({
    inputRange: [0, 0.12, 0.35, 0.55, 0.78, 0.92, 1],
    outputRange: [0, config.baseOpacity, config.baseOpacity * 0.55, config.baseOpacity, config.baseOpacity * 0.6, config.baseOpacity, 0],
  });
  const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 1, 0.7] });

  const halo = config.size * 2.4;
  const glowStyle = Platform.OS === 'web'
    ? ({ boxShadow: `0 0 ${halo}px ${config.color}` } as any)
    : { shadowColor: config.color, shadowOpacity: 0.9, shadowRadius: halo, shadowOffset: { width: 0, height: 0 } };

  return (
    <Animated.View
      style={[
        styles.particle,
        glowStyle,
        {
          left: config.left,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          opacity,
          transform: [{ translateY }, { translateX }, { scale }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  particle: { position: 'absolute', bottom: -20 },
});
