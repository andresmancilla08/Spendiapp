import { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';
import FxLayer, { type FxFrame } from './fx/FxLayer';

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

const DRIFT: FxFrame[] = [
  { at: 0,   x: 0,  y: 0 },
  { at: 0.5, x: 14, y: -10 },
  { at: 1,   x: 0,  y: 0 },
];

/**
 * Cielo estrellado: estrellas fijas que titilan a distinto ritmo, con una
 * estrella fugaz ocasional cruzando en diagonal. Distinto de Partículas
 * (puntos que ascienden): aquí nada viaja salvo la fugaz — es un cielo quieto
 * que respira.
 *
 * Con 46 estrellas era el efecto más denso del catálogo. Todo el titileo va
 * ahora por el compositor.
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
      base: Math.min((0.35 + (i % 4) * 0.14) * cfg.opacity * 1.15, 0.95),
      // Dark: luz neutra con acento de paleta cada 5ª estrella. Light: todas
      // con el primario (el gris neutro se lee como polvo, no como cielo).
      color: isDark ? (i % 5 === 0 ? colors.primary : '#E7ECFF') : colors.primary,
    }))
  ), [cfg.count, cfg.opacity, isDark, colors.primary]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Deriva global del cielo: además del titileo por estrella, todo el campo
          se desplaza suavemente — garantiza movimiento perceptible siempre. */}
      <FxLayer frames={DRIFT} duration={14000 * speed} easing="sin" style={StyleSheet.absoluteFillObject}>
        {stars.map((s, i) => (
          <Star key={`${intensity}-${i}`} config={s} speed={speed} />
        ))}
      </FxLayer>
      {cfg.shooting && SHOOTING_PATHS.map((p, i) => (
        <ShootingStar key={i} path={p} index={i} color={isDark ? '#FFFFFF' : colors.primary} speed={speed} />
      ))}
    </View>
  );
}

function Star({ config, speed }: { config: StarConfig; speed: number }) {
  const frames: FxFrame[] = [
    { at: 0,   opacity: config.base * 0.25, scale: 0.8 },
    { at: 0.5, opacity: config.base,        scale: 1.15 },
    { at: 1,   opacity: config.base * 0.25, scale: 0.8 },
  ];

  const halo = config.size * 2.2;
  const glowStyle = Platform.OS === 'web'
    ? ({ boxShadow: `0 0 ${halo}px ${config.color}` } as any)
    : { shadowColor: config.color, shadowOpacity: 0.8, shadowRadius: halo, shadowOffset: { width: 0, height: 0 } };

  return (
    <FxLayer
      frames={frames}
      // El ciclo completo es ida y vuelta: el doble de la duración de un tramo.
      duration={config.dur * 2 * speed}
      delay={config.delay}
      easing="sin"
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
        },
      ]}
    />
  );
}

// Trayectorias deterministas — una fugaz siempre igual se percibe como GIF en
// loop; tres rutas desfasadas entre sí devuelven la magia.
const SHOOTING_PATHS = [
  { top: '14%', left: '6%',  angle: '29deg',  dx: 340,  dy: 190 },
  { top: '32%', left: '72%', angle: '152deg', dx: -300, dy: 165 },
  { top: '6%',  left: '44%', angle: '58deg',  dx: 190,  dy: 300 },
];

/** Ciclo completo por ruta. Las tres van desfasadas un tercio, así cruza una
 *  fugaz cada ~7 s sin que ninguna coincida con otra. */
const SHOOTING_CYCLE = 21000;
const SHOOTING_TRAVEL = 900;

function ShootingStar({ path, index, color, speed }: {
  path: typeof SHOOTING_PATHS[number]; index: number; color: string; speed: number;
}) {
  // El cruce ocupa una fracción mínima del ciclo; el resto la fugaz está
  // invisible y en su posición de salida. Antes esto era un `setState` por
  // ciclo que re-montaba la animación; ahora es un único bucle continuo.
  const f = SHOOTING_TRAVEL / SHOOTING_CYCLE;
  const frames: FxFrame[] = [
    { at: 0,          opacity: 0,   x: 0,           y: 0 },
    { at: f * 0.12,   opacity: 0.9, x: path.dx * 0.12, y: path.dy * 0.12 },
    { at: f * 0.75,   opacity: 0.5, x: path.dx * 0.75, y: path.dy * 0.75 },
    { at: f,          opacity: 0,   x: path.dx,     y: path.dy },
    { at: 1,          opacity: 0,   x: path.dx,     y: path.dy },
  ];

  return (
    <FxLayer
      frames={frames}
      duration={SHOOTING_CYCLE * speed}
      phase={(index / SHOOTING_PATHS.length) % 1}
      easing="linear"
      rotate={path.angle}
      style={[styles.shooting, { top: path.top as any, left: path.left as any }]}
    >
      <LinearGradient
        colors={['transparent', color]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
    </FxLayer>
  );
}

const styles = StyleSheet.create({
  star: { position: 'absolute' },
  shooting: { position: 'absolute', width: 72, height: 2, borderRadius: 1, overflow: 'hidden' },
});
