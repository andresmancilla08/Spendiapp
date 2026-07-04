import { useRef, useEffect, useMemo } from 'react';
import { View, Animated, Easing, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';

const CONFIG: Record<AuroraIntensity, { count: number; opacity: number; shooting: boolean }> = {
  subtle:  { count: 16, opacity: 0.6, shooting: false },
  default: { count: 30, opacity: 1.0, shooting: true },
  intense: { count: 46, opacity: 1.4, shooting: true },
};

interface StarConfig {
  left: `${number}%`;
  top: `${number}%`;
  size: number;
  dur: number;
  delay: number;
  base: number;
  color: string;
}

interface Props {
  intensity?: AuroraIntensity;
  speed?: number;
}

/**
 * Cielo estrellado: estrellas fijas que titilan a distinto ritmo, con una
 * estrella fugaz ocasional cruzando en diagonal. Distinto de Partículas
 * (puntos que ascienden): aquí nada viaja salvo la fugaz — es un cielo quieto
 * que respira.
 */
export default function StarfieldBackground({ intensity = 'default', speed = 1 }: Props) {
  const { isDark, colors } = useTheme();
  const cfg = CONFIG[intensity];

  const stars = useMemo<StarConfig[]>(() => (
    Array.from({ length: cfg.count }, (_, i) => ({
      left: `${(i * 137.508) % 100}%` as const,
      top: `${(i * 73.13 + 7) % 96}%` as const,
      size: 1.4 + (i * 3) % 3 * 0.8,
      dur: 1800 + (i % 6) * 700,
      delay: (i * 260) % 3000,
      base: (0.35 + (i % 4) * 0.14) * cfg.opacity * (isDark ? 1.15 : 0.85),
      // Cada 5ª estrella toma un acento de la paleta; el resto, luz neutra.
      color: i % 5 === 0 ? colors.primary : (isDark ? '#E7ECFF' : colors.textSecondary),
    }))
  ), [cfg.count, cfg.opacity, isDark, colors.primary, colors.textSecondary]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {stars.map((s, i) => (
        <Star key={`${intensity}-${i}`} config={s} speed={speed} />
      ))}
      {cfg.shooting && <ShootingStar color={isDark ? '#FFFFFF' : colors.primary} speed={speed} />}
    </View>
  );
}

function Star({ config, speed }: { config: StarConfig; speed: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(config.delay),
        Animated.timing(anim, { toValue: 1, duration: config.dur * speed, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: config.dur * speed, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [config.base * 0.25, config.base] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] });
  const halo = config.size * 2.2;
  const glowStyle = Platform.OS === 'web'
    ? ({ boxShadow: `0 0 ${halo}px ${config.color}` } as any)
    : { shadowColor: config.color, shadowOpacity: 0.8, shadowRadius: halo, shadowOffset: { width: 0, height: 0 } };

  return (
    <Animated.View
      style={[
        styles.star,
        glowStyle,
        {
          left: config.left,
          top: config.top,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

function ShootingStar({ color, speed }: { color: string; speed: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(6500 * speed),
        Animated.timing(anim, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 340] });
  const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 190] });
  const opacity = anim.interpolate({ inputRange: [0, 0.12, 0.75, 1], outputRange: [0, 0.9, 0.5, 0] });

  return (
    <Animated.View style={[styles.shooting, { opacity, transform: [{ translateX: tx }, { translateY: ty }, { rotate: '29deg' }] }]}>
      <LinearGradient
        colors={['transparent', color]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  star: { position: 'absolute' },
  shooting: { position: 'absolute', top: '14%', left: '6%', width: 72, height: 2, borderRadius: 1, overflow: 'hidden' },
});
