import { useState, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';
import FxLayer, { type FxFrame } from './fx/FxLayer';

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
 * llevan un halo suave. El color se toma de la paleta activa.
 *
 * El movimiento va por `FxLayer` (compositor en web, hilo de UI en nativo). El
 * halo es un `boxShadow` estático: al animarse solo `transform` y `opacity`, se
 * pinta una vez y la capa se reutiliza en cada frame.
 */
export default function ParticlesBackground({ intensity = 'default', speed = 1 }: Props) {
  const { isDark, colors } = useTheme();
  const cfg = CONFIG[intensity];
  const glow = isDark ? 1.3 : 1.35;
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
  const o = config.baseOpacity;
  const s = config.sway;

  const frames: FxFrame[] = [
    { at: 0,    opacity: 0,        x: 0,  y: 0,                 scale: 0.7 },
    { at: 0.12, opacity: o,        x: s * 0.5, y: -travel * 0.12, scale: 0.82 },
    { at: 0.25, opacity: o * 0.78, x: s,  y: -travel * 0.25,     scale: 0.88 },
    { at: 0.35, opacity: o * 0.55, x: s * 0.6, y: -travel * 0.35, scale: 0.94 },
    { at: 0.5,  opacity: o,        x: 0,  y: -travel * 0.5,      scale: 1 },
    { at: 0.75, opacity: o * 0.62, x: -s, y: -travel * 0.75,     scale: 0.88 },
    { at: 0.92, opacity: o,        x: -s * 0.4, y: -travel * 0.92, scale: 0.76 },
    { at: 1,    opacity: 0,        x: 0,  y: -travel,            scale: 0.7 },
  ];

  const halo = config.size * 2.4;
  const glowStyle = Platform.OS === 'web'
    ? ({ boxShadow: `0 0 ${halo}px ${config.color}` } as any)
    : { shadowColor: config.color, shadowOpacity: 0.9, shadowRadius: halo, shadowOffset: { width: 0, height: 0 } };

  return (
    <FxLayer
      frames={frames}
      duration={config.duration}
      delay={config.delay}
      easing="linear"
      style={[
        styles.particle,
        glowStyle,
        {
          left: config.left,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  particle: { position: 'absolute', bottom: -20 },
});
