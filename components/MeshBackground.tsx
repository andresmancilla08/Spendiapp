import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';
import FxLayer, { type FxFrame } from './fx/FxLayer';
import SoftOrb from './fx/SoftOrb';

const CONFIG: Record<AuroraIntensity, number> = { subtle: 0.45, default: 1.0, intense: 1.5 };

interface Props {
  intensity?: AuroraIntensity;
  /** Multiplicador de duración (1 = normal, >1 más lento, <1 más rápido). */
  speed?: number;
  softness?: number;
}

/**
 * Malla de gradiente: grandes campos de color muy difuminados que se solapan,
 * respiran (escala) y derivan lento. A diferencia de Aurora (blobs pequeños que
 * viajan), aquí el color llena la pantalla como una tela.
 *
 * Los campos eran los más caros de todos: 5 capas de 400 px con `blur(28px)`
 * animadas. Ahora la difusión la da el degradado radial.
 */
export default function MeshBackground({ intensity = 'default', speed = 1, softness = 0.5 }: Props) {
  const { isDark, colors } = useTheme();
  const m = CONFIG[intensity] * (isDark ? 1.3 : 1.45);

  const fields = useMemo(() => ([
    { color: colors.primary,   top: '-15%', left: '-20%', size: 460, base: 0.34, dur: 9000 },
    { color: colors.secondary, top: '35%',  left: '45%',  size: 420, base: 0.28, dur: 11500 },
    { color: colors.tertiary,  top: '5%',   left: '55%',  size: 360, base: 0.24, dur: 13000 },
    { color: colors.success,   top: '55%',  left: '-10%', size: 400, base: 0.22, dur: 10000 },
    { color: colors.info,      top: '68%',  left: '40%',  size: 380, base: 0.20, dur: 14000 },
  ]), [colors.primary, colors.secondary, colors.tertiary, colors.success, colors.info]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {fields.map((f, i) => {
        const dir = i % 2 === 0 ? 1 : -1;
        const o = f.base * m;
        const frames: FxFrame[] = [
          { at: 0,   opacity: o,       x: 0,         y: 0,          scale: 1 },
          { at: 0.5, opacity: o * 1.4, x: 64 * dir,  y: -52 * dir,  scale: 1.28 },
          { at: 1,   opacity: o,       x: 0,         y: 0,          scale: 1 },
        ];
        return (
          <FxLayer
            key={i}
            frames={frames}
            duration={f.dur * speed}
            // Cada campo arranca en una fase distinta — sin esto los 5 respiran al unísono.
            phase={(i * 0.21) % 1}
            easing="sin"
            style={{
              position: 'absolute',
              top: f.top as any,
              left: f.left as any,
              width: f.size,
              height: f.size,
              borderRadius: f.size / 2,
            }}
          >
            {/* Un mesh gradient es color muy difuso: la suavidad va alta siempre. */}
            <SoftOrb color={f.color} softness={Math.max(0.7, softness)} />
          </FxLayer>
        );
      })}
    </View>
  );
}
