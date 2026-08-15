import { useState, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';
import FxLayer, { type FxFrame } from './fx/FxLayer';
import SoftOrb from './fx/SoftOrb';

const CONFIG: Record<AuroraIntensity, { opacity: number; amp: number }> = {
  subtle:  { opacity: 0.55, amp: 0.7 },
  default: { opacity: 1.0,  amp: 1.0 },
  intense: { opacity: 1.5,  amp: 1.3 },
};

interface Props {
  intensity?: AuroraIntensity;
  /** Multiplicador de duración (1 = normal, >1 más lento, <1 más rápido). */
  speed?: number;
  softness?: number;
}

/**
 * Seda: sábanas de gradiente a pantalla completa que cruzan la vista en
 * diagonal, difuminadas, como tela fluida. A diferencia de Ondas (bandas
 * angostas que ondulan en su sitio), aquí el color VIAJA de lado a lado.
 *
 * Eran tres capas del 220 % de ancho con `filter: blur(22px)` animadas — de las
 * superficies desenfocadas más grandes de la app.
 */
export default function FlowBackground({ intensity = 'default', speed = 1, softness = 0.75 }: Props) {
  const { isDark, colors } = useTheme();
  const cfg = CONFIG[intensity];
  const glow = isDark ? 1.3 : 1.45;
  const { width: windowWidth } = useWindowDimensions();
  // Mide su propio contenedor: en previews de 64px la corriente debe viajar
  // dentro de la tarjeta, no cientos de px del ancho de la ventana.
  const [ownWidth, setOwnWidth] = useState(0);
  const width = ownWidth || windowWidth;

  const sheets = useMemo(() => ([
    { colorA: colors.primary,   colorB: colors.tertiary, rotate: -16, top: '-14%', height: '70%', base: 0.16, dur: 12000, dir: 1,  phase: 0 },
    { colorA: colors.secondary, colorB: colors.info,     rotate: 11,  top: '28%',  height: '64%', base: 0.13, dur: 16000, dir: -1, phase: 0.38 },
    { colorA: colors.success,   colorB: colors.primary,  rotate: -7,  top: '58%',  height: '60%', base: 0.11, dur: 20000, dir: 1,  phase: 0.71 },
  ]), [colors.primary, colors.secondary, colors.tertiary, colors.success, colors.info]);

  const opacityMul = cfg.opacity * glow;

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
      onLayout={(e) => { const w = e.nativeEvent.layout.width; if (w && Math.abs(w - ownWidth) > 1) setOwnWidth(w); }}
    >
      {sheets.map((s, i) => {
        const travel = width * 0.55 * cfg.amp * s.dir;
        const lo = s.base * opacityMul * 0.7;
        const hi = Math.min(s.base * opacityMul * 1.3, 0.5);
        const frames: FxFrame[] = [
          { at: 0,   opacity: lo, x: -travel },
          { at: 0.5, opacity: hi, x: travel },
          { at: 1,   opacity: lo, x: -travel },
        ];
        return (
          <FxLayer
            key={i}
            frames={frames}
            duration={s.dur * speed}
            phase={s.phase}
            easing="sin"
            rotate={`${s.rotate}deg`}
            style={[styles.sheet, { top: s.top as any, height: s.height as any }]}
          >
            <SoftOrb color={s.colorA} color2={s.colorB} softness={Math.max(0.5, softness)} shape="ellipse" />
          </FxLayer>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', width: '220%', left: '-60%' },
});
