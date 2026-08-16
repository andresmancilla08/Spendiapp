import { useRef, useState, useEffect, useMemo } from 'react';
import { View, Animated, Easing, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';
import { frozenPhaseFor } from '../hooks/useFrozenPhase';

// La estrella fugaz se retira con el resto del movimiento: era una animación en
// bucle cuyo único contenido era el desplazamiento.
const CONFIG: Record<AuroraIntensity, { count: number; opacity: number }> = {
  subtle:  { count: 16, opacity: 0.6 },
  default: { count: 30, opacity: 1.0 },
  intense: { count: 46, opacity: 1.4 },
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
}

/**
 * Cielo estrellado: estrellas fijas que titilan a distinto ritmo, con una
 * estrella fugaz ocasional cruzando en diagonal. Distinto de Partículas
 * (puntos que ascienden): aquí nada viaja salvo la fugaz — es un cielo quieto
 * que respira.
 */
export default function StarfieldBackground({ intensity = 'default' }: Props) {
  const { isDark, colors } = useTheme();
  const cfg = CONFIG[intensity];

  // El cielo queda quieto: sin deriva global ni titileo.
  const drift = useRef(new Animated.Value(0)).current;
  const driftX = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 14, 0] });
  const driftY = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -10, 0] });

  const stars = useMemo<StarConfig[]>(() => (
    Array.from({ length: cfg.count }, (_, i) => ({
      left: `${(i * 137.508) % 100}%` as const,
      top: `${(i * 73.13 + 7) % 96}%` as const,
      size: 1.4 + (i * 3) % 3 * 0.8,
      dur: 1800 + (i % 6) * 700,
      delay: (i * 260) % 3000,
      base: Math.min((0.35 + (i % 4) * 0.14) * cfg.opacity * 1.15, 0.95),
      // Dark: luz neutra con acento de paleta cada 5ª estrella. Light: todas
      // con el primario (el gris neutro se lee como polvo, no como cielo).
      color: isDark ? (i % 5 === 0 ? colors.primary : '#E7ECFF') : colors.primary,
    }))
  ), [cfg.count, cfg.opacity, isDark, colors.primary]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX: driftX }, { translateY: driftY }] }]}>
        {stars.map((s, i) => (
          <Star key={`${intensity}-${i}`} config={s} at={frozenPhaseFor(i, stars.length)} />
        ))}
      </Animated.View>
    </View>
  );
}

function Star({ config, at }: { config: StarConfig; at: number }) {
  // Cada estrella se congela en un punto distinto de su titileo: unas brillan
  // más que otras, que es justo lo que hace que un cielo no parezca una rejilla.
  const anim = useRef(new Animated.Value(at)).current;
  useEffect(() => { anim.setValue(at); }, [anim, at]);

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

const styles = StyleSheet.create({
  star: { position: 'absolute' },
});
