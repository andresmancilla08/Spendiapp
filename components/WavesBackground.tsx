import { useState, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';
import FxLayer, { type FxFrame } from './fx/FxLayer';
import SoftOrb from './fx/SoftOrb';

const CONFIG: Record<AuroraIntensity, { opacity: number; amp: number }> = {
  subtle:  { opacity: 0.5, amp: 0.6 },
  default: { opacity: 1.0, amp: 1.0 },
  intense: { opacity: 1.55, amp: 1.35 },
};

interface Props {
  intensity?: AuroraIntensity;
  /** Multiplicador de duración (1 = normal, >1 más lento, <1 más rápido). */
  speed?: number;
  softness?: number;
}

/**
 * Bandas de gradiente fluidas que se deslizan en diagonal y ondulan
 * verticalmente. Cuatro capas de distinto color de la paleta y velocidad crean
 * un lenguaje visual propio, distinto de blobs y partículas.
 *
 * El difuminado de los bordes lo da un degradado elíptico en lugar del antiguo
 * `filter: blur(9px)` sobre una banda del 170 % de ancho.
 */
export default function WavesBackground({ intensity = 'default', speed = 1, softness = 0.6 }: Props) {
  const { isDark, colors } = useTheme();
  const cfg = CONFIG[intensity];
  const glow = isDark ? 1.3 : 1.4;
  const { width: windowWidth } = useWindowDimensions();
  // Mide su propio contenedor: en previews la banda ondula dentro de la
  // tarjeta; en el fondo global sigue al viewport tras un resize.
  const [ownWidth, setOwnWidth] = useState(0);
  const width = ownWidth || windowWidth;

  const bands = useMemo(() => ([
    { top: '6%',  color: colors.primary,   rotate: -9, height: 200, opacity: 0.18, dur: 13000, dir: 1,  bob: 26, phase: 0 },
    { top: '34%', color: colors.tertiary,  rotate: 5,  height: 150, opacity: 0.13, dur: 17000, dir: -1, bob: 20, phase: 0.31 },
    { top: '58%', color: colors.secondary, rotate: -6, height: 180, opacity: 0.14, dur: 15000, dir: 1,  bob: 22, phase: 0.57 },
    { top: '78%', color: colors.success,   rotate: 7,  height: 160, opacity: 0.12, dur: 19000, dir: -1, bob: 18, phase: 0.83 },
  ]), [colors.primary, colors.tertiary, colors.secondary, colors.success]);

  const opacityMul = cfg.opacity * glow;

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
      onLayout={(e) => { const w = e.nativeEvent.layout.width; if (w && Math.abs(w - ownWidth) > 1) setOwnWidth(w); }}
    >
      {bands.map((b, i) => {
        const shift = width * 0.32 * cfg.amp * b.dir;
        const bob = b.bob * cfg.amp;
        const op = Math.min(b.opacity * opacityMul, 0.6);
        const frames: FxFrame[] = [
          { at: 0,    opacity: op, x: -shift, y: 0 },
          { at: 0.25, opacity: op, x: 0,      y: bob },
          { at: 0.5,  opacity: op, x: shift,  y: 0 },
          { at: 0.75, opacity: op, x: 0,      y: -bob },
          { at: 1,    opacity: op, x: -shift, y: 0 },
        ];
        return (
          <FxLayer
            key={i}
            frames={frames}
            duration={b.dur * speed}
            phase={b.phase}
            easing="sin"
            rotate={`${b.rotate}deg`}
            style={[styles.wave, { top: b.top as any, height: b.height }]}
          >
            <SoftOrb color={b.color} softness={Math.max(0.35, softness)} shape="ellipse" />
          </FxLayer>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wave: { position: 'absolute', width: '170%', left: '-35%' },
});
