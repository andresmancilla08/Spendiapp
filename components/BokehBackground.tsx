import { useRef, useState, useEffect, useMemo } from 'react';
import { View, Animated, Easing, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';

const CONFIG: Record<AuroraIntensity, { count: number; opacity: number }> = {
  subtle:  { count: 6,  opacity: 0.6 },
  default: { count: 11, opacity: 1.0 },
  intense: { count: 18, opacity: 1.45 },
};

interface Props {
  intensity?: AuroraIntensity;
  /** Multiplicador de duración (1 = normal, >1 más lento, <1 más rápido). */
  speed?: number;
}

interface Orb { left: `${number}%`; size: number; color: string; dur: number; delay: number; base: number; drift: number }

/**
 * Bokeh: círculos grandes y desenfocados (fuera de foco) que flotan hacia
 * arriba y derivan lento, con parpadeo suave. Distinto de Partículas (puntos
 * pequeños y nítidos): aquí prima la profundidad de campo.
 */
export default function BokehBackground({ intensity = 'default', speed = 1 }: Props) {
  const { isDark, colors } = useTheme();
  const cfg = CONFIG[intensity];
  const glow = isDark ? 1.25 : 1.35;
  const { height: windowHeight } = useWindowDimensions();
  // Igual que Partículas: los orbes flotan hasta la MITAD de la vista, no solo
  // un tramo fijo del borde inferior; en previews el recorrido escala igual.
  const [ownHeight, setOwnHeight] = useState(0);
  const travel = (ownHeight || windowHeight) * 0.55;
  // Recorrido original ~300px; la duración escala para conservar velocidad.
  const durScale = Math.max(1, travel / 300);

  const palette = useMemo(
    () => [colors.primary, colors.secondary, colors.tertiary, colors.success, colors.info],
    [colors.primary, colors.secondary, colors.tertiary, colors.success, colors.info],
  );

  const orbs = useMemo<Orb[]>(() => (
    Array.from({ length: cfg.count }, (_, i) => ({
      left: `${(i * 137.5) % 100}%` as const,
      size: 46 + (i * 23) % 90,
      color: palette[i % palette.length],
      dur: (14000 + (i % 6) * 2600) * speed * durScale,
      delay: (i * 900) % 7000,
      base: (0.10 + (i % 3) * 0.05) * cfg.opacity * glow,
      drift: (i % 2 === 0 ? 1 : -1) * (24 + (i % 3) * 16),
    }))
  ), [cfg.count, cfg.opacity, glow, palette, speed, durScale]);

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
      onLayout={(e) => { const h = e.nativeEvent.layout.height; if (h && Math.abs(h - ownHeight) > 1) setOwnHeight(h); }}
    >
      {orbs.map((o, i) => (
        <OrbView key={i} orb={o} dark={isDark} travel={travel} />
      ))}
    </View>
  );
}

function OrbView({ orb, dark, travel }: { orb: Orb; dark: boolean; travel: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(orb.delay),
        Animated.timing(anim, { toValue: 1, duration: orb.dur, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
    // Reinicia in-place al cambiar velocidad/intensidad (duración/delay nuevos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orb.dur, orb.delay]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [40, -travel] });
  const translateX = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, orb.drift, 0] });
  const opacity = anim.interpolate({
    inputRange: [0, 0.18, 0.5, 0.82, 1],
    outputRange: [0, orb.base, orb.base * 0.7, orb.base, 0],
  });

  const blur = Platform.OS === 'web'
    ? ({ filter: `blur(${Math.round(orb.size * 0.09)}px)` } as any)
    : {};

  return (
    <Animated.View
      style={[
        styles.orb,
        blur,
        {
          left: orb.left,
          width: orb.size,
          height: orb.size,
          borderRadius: orb.size / 2,
          backgroundColor: orb.color,
          opacity,
          transform: [{ translateY }, { translateX }],
          ...(Platform.OS !== 'web' && { shadowColor: orb.color, shadowOpacity: dark ? 0.7 : 0.4, shadowRadius: orb.size * 0.5, shadowOffset: { width: 0, height: 0 } }),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute', bottom: -60 },
});
