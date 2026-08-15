import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import FxLayer, { type FxFrame } from './fx/FxLayer';
import SoftOrb from './fx/SoftOrb';

export type AuroraIntensity = 'intense' | 'default' | 'subtle';

const MULTIPLIER: Record<AuroraIntensity, number> = {
  intense: 1.0,
  default: 0.88,
  subtle: 0.35,
};

interface Props {
  intensity?: AuroraIntensity;
  /** Multiplicador de duración (1 = normal, >1 más lento, <1 más rápido). */
  speed?: number;
  /** 0 → 1. Sustituye al antiguo desenfoque en píxeles: ahora la suavidad la
   *  da el propio degradado del blob, sin coste de GPU por frame. */
  softness?: number;
}

/** Geometría y ritmo de cada blob. `dur` en ms, `phase` desfasa el arranque. */
const BLOBS = [
  { key: 'b4', box: { width: 310, height: 310, top: '22%', left: '8%' },   dur: 14000, phase: 0.15, op: [0.14, 0.28] as const, lightOp: [0.04, 0.10] as const, x: 14,  y: 14,  ci: 3 },
  { key: 'b1', box: { width: 280, height: 280, top: -60,   left: -70 },    dur:  9000, phase: 0.00, op: [0.28, 0.55] as const, lightOp: [0.08, 0.20] as const, x: 24,  y: -20, ci: 0 },
  { key: 'b6', box: { width: 220, height: 220, top: '65%', left: -30 },    dur: 12800, phase: 0.82, op: [0.20, 0.46] as const, lightOp: [0.05, 0.12] as const, x: 18,  y: -20, ci: 5 },
  { key: 'b2', box: { width: 180, height: 180, bottom: 110, right: -50 },  dur: 11500, phase: 0.33, op: [0.24, 0.50] as const, lightOp: [0.06, 0.16] as const, x: -22, y: 18,  ci: 1 },
  { key: 'b5', box: { width: 130, height: 130, top: '12%', right: '4%' },  dur:  8500, phase: 0.50, op: [0.22, 0.50] as const, lightOp: [0.05, 0.14] as const, x: -16, y: 18,  ci: 4 },
  { key: 'b3', box: { width: 110, height: 110, top: '42%', left: '28%' },  dur: 10200, phase: 0.67, op: [0.26, 0.54] as const, lightOp: [0.07, 0.18] as const, x: 20,  y: 30,  ci: 2 },
] as const;

/**
 * Aurora: blobs de color que derivan y laten. Es el efecto de la marca y el
 * único que ven los usuarios gratuitos.
 *
 * El movimiento lo ejecuta el compositor (`FxLayer`) y el borde difuso lo da un
 * degradado radial (`SoftOrb`), no un `filter: blur()`. Antes eran seis capas
 * desenfocadas animadas desde JS; era el efecto que más calentaba el teléfono.
 */
export default function AuroraBackground({ intensity = 'default', speed = 1, softness = 0.5 }: Props) {
  const { isDark, activePalette } = useTheme();
  // En dark el scrim del fondo va DEBAJO de los efectos (AppBackground), así
  // que el multiplicador solo compensa el menor contraste, no un overlay.
  // En light las opacidades base son muy tímidas → boost mayor.
  const m = MULTIPLIER[intensity] * (isDark ? 1.35 : 1.7);
  const blobColors = isDark ? activePalette.auroraBlobs.dark : activePalette.auroraBlobs.light;

  const layers = useMemo(() => BLOBS.map((b) => {
    const [lo, hi] = isDark ? b.op : b.lightOp;
    const frames: FxFrame[] = [
      { at: 0,    opacity: lo * m, x: 0,     y: 0 },
      { at: 0.25, opacity: (lo + hi) / 2 * m, x: b.x / 2, y: b.y },
      { at: 0.5,  opacity: hi * m, x: b.x,   y: 0 },
      { at: 0.75, opacity: (lo + hi) / 2 * m, x: b.x / 2, y: -b.y },
      { at: 1,    opacity: lo * m, x: 0,     y: 0 },
    ];
    return { ...b, frames };
  }), [isDark, m]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {layers.map((b) => {
        const pair = blobColors[b.ci];
        return (
          <FxLayer
            key={b.key}
            frames={b.frames}
            duration={b.dur * speed}
            phase={b.phase}
            easing="sin"
            style={[styles.blob, b.box as any]}
          >
            <SoftOrb color={pair[0]} color2={pair[1]} softness={softness} />
          </FxLayer>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute' },
});
