import { useRef, useState, useMemo } from 'react';
import { View, Animated, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { usePhasedLoop } from '../hooks/usePhasedLoop';
import type { AuroraIntensity } from './AuroraBackground';

const CONFIG: Record<AuroraIntensity, { opacity: number; amp: number }> = {
  subtle:  { opacity: 0.5, amp: 0.6 },
  default: { opacity: 1.0, amp: 1.0 },
  intense: { opacity: 1.55, amp: 1.35 },
};

interface Props {
  intensity?: AuroraIntensity;
  /** Multiplicador de duración (1 = normal, >1 más lento, <1 más rápido). */
  speed?: number;
}

/**
 * Bandas de gradiente fluidas que se deslizan en diagonal y ondulan
 * verticalmente. Cuatro capas de distinto color de la paleta y velocidad crean
 * un lenguaje visual propio, distinto de blobs y partículas.
 */
export default function WavesBackground({ intensity = 'default', speed = 1 }: Props) {
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

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
      onLayout={(e) => { const w = e.nativeEvent.layout.width; if (w && Math.abs(w - ownWidth) > 1) setOwnWidth(w); }}
    >
      {bands.map((b, i) => (
        <Band key={i} band={b} width={width} opacityMul={cfg.opacity * glow} ampMul={cfg.amp} speed={speed} />
      ))}
    </View>
  );
}

function Band({ band, width, opacityMul, ampMul, speed }: {
  band: { top: string; color: string; rotate: number; height: number; opacity: number; dur: number; dir: number; bob: number; phase: number };
  width: number; opacityMul: number; ampMul: number; speed: number;
}) {
  const v = useRef(new Animated.Value(0)).current;
  usePhasedLoop(v, band.dur * speed, band.phase);

  const shift = width * 0.32 * ampMul * band.dir;
  const tx = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-shift, shift, -shift] });
  const ty = v.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, band.bob * ampMul, 0, -band.bob * ampMul, 0] });

  return (
    <Animated.View
      style={[
        styles.wave,
        Platform.OS === 'web' ? ({ filter: 'blur(9px)' } as any) : {},
        { top: band.top as any, height: band.height, opacity: Math.min(band.opacity * opacityMul, 0.6), transform: [{ translateX: tx }, { translateY: ty }, { rotate: `${band.rotate}deg` }] },
      ]}
    >
      <LinearGradient
        colors={['transparent', band.color, 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wave: { position: 'absolute', width: '170%', left: '-35%' },
});
