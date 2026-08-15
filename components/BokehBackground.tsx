import { useState, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';
import FxLayer, { type FxFrame } from './fx/FxLayer';
import SoftOrb from './fx/SoftOrb';

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
 * Bokeh: círculos grandes y fuera de foco que flotan hacia arriba y derivan
 * lento, con parpadeo suave. Distinto de Partículas (puntos pequeños y
 * nítidos): aquí prima la profundidad de campo.
 *
 * El «fuera de foco» lo da el degradado radial de `SoftOrb`, no un
 * `filter: blur()`. Con 18 orbes a la vez, el blur era insostenible en móvil.
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
        <OrbView key={i} orb={o} travel={travel} />
      ))}
    </View>
  );
}

function OrbView({ orb, travel }: { orb: Orb; travel: number }) {
  const b = orb.base;
  const frames: FxFrame[] = [
    { at: 0,    opacity: 0,       x: 0,          y: 40 },
    { at: 0.18, opacity: b,       x: orb.drift * 0.36, y: 40 - travel * 0.18 },
    { at: 0.5,  opacity: b * 0.7, x: orb.drift,  y: 40 - travel * 0.5 },
    { at: 0.82, opacity: b,       x: orb.drift * 0.36, y: 40 - travel * 0.82 },
    { at: 1,    opacity: 0,       x: 0,          y: -travel },
  ];

  return (
    <FxLayer
      frames={frames}
      duration={orb.dur}
      delay={orb.delay}
      easing="linear"
      style={[styles.orb, { left: orb.left, width: orb.size, height: orb.size }]}
    >
      {/* Muy suave: un orbe de bokeh es, por definición, un punto desenfocado. */}
      <SoftOrb color={orb.color} softness={0.85} />
    </FxLayer>
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute', bottom: -60 },
});
