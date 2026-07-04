import { useRef, useState, useMemo } from 'react';
import { View, Animated, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { usePhasedLoop } from '../hooks/usePhasedLoop';
import type { AuroraIntensity } from './AuroraBackground';

const CONFIG: Record<AuroraIntensity, { opacity: number; amp: number }> = {
  subtle:  { opacity: 0.55, amp: 0.7 },
  default: { opacity: 1.0,  amp: 1.0 },
  intense: { opacity: 1.5,  amp: 1.3 },
};

interface Props {
  intensity?: AuroraIntensity;
  /** Multiplicador de duración (1 = normal, >1 más lento, <1 más rápido). */
  speed?: number;
}

/**
 * Seda: sábanas de gradiente a pantalla completa que cruzan la vista en
 * diagonal, difuminadas, como tela fluida. A diferencia de Ondas (bandas
 * angostas que ondulan en su sitio), aquí el color VIAJA de lado a lado y
 * ocupa toda la altura — un lenguaje de "corriente" continua.
 */
export default function FlowBackground({ intensity = 'default', speed = 1 }: Props) {
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

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
      onLayout={(e) => { const w = e.nativeEvent.layout.width; if (w && Math.abs(w - ownWidth) > 1) setOwnWidth(w); }}
    >
      {sheets.map((s, i) => (
        <Sheet key={i} sheet={s} width={width} opacityMul={cfg.opacity * glow} ampMul={cfg.amp} speed={speed} />
      ))}
    </View>
  );
}

function Sheet({ sheet, width, opacityMul, ampMul, speed }: {
  sheet: { colorA: string; colorB: string; rotate: number; top: string; height: string; base: number; dur: number; dir: number; phase: number };
  width: number; opacityMul: number; ampMul: number; speed: number;
}) {
  const v = useRef(new Animated.Value(0)).current;
  usePhasedLoop(v, sheet.dur * speed, sheet.phase);

  const travel = width * 0.55 * ampMul * sheet.dir;
  const tx = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-travel, travel, -travel] });
  const opacity = v.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [sheet.base * opacityMul * 0.7, Math.min(sheet.base * opacityMul * 1.3, 0.5), sheet.base * opacityMul * 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.sheet,
        Platform.OS === 'web' ? ({ filter: 'blur(22px)' } as any) : {},
        { top: sheet.top as any, height: sheet.height as any, opacity, transform: [{ translateX: tx }, { rotate: `${sheet.rotate}deg` }] },
      ]}
    >
      <LinearGradient
        colors={['transparent', sheet.colorA, sheet.colorB, 'transparent']}
        locations={[0, 0.35, 0.65, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', width: '220%', left: '-60%' },
});
