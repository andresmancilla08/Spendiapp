import { useRef, useMemo } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { usePhasedLoop } from '../hooks/usePhasedLoop';
import type { AuroraIntensity } from './AuroraBackground';

const CONFIG: Record<AuroraIntensity, number> = { subtle: 0.45, default: 1.0, intense: 1.5 };

interface Props {
  intensity?: AuroraIntensity;
  /** Multiplicador de duración (1 = normal, >1 más lento, <1 más rápido). */
  speed?: number;
}

/**
 * Malla de gradiente (mesh gradient): grandes campos de color muy difuminados
 * que se solapan, respiran (escala) y derivan lento. A diferencia de Aurora
 * (blobs pequeños que viajan), aquí el color llena la pantalla como una tela.
 */
export default function MeshBackground({ intensity = 'default', speed = 1 }: Props) {
  const { isDark, colors } = useTheme();
  const m = CONFIG[intensity] * (isDark ? 1.3 : 1.0);

  const fields = useMemo(() => ([
    { color: colors.primary,   top: '-15%', left: '-20%', size: 460, base: 0.34, dur: 15000 },
    { color: colors.secondary, top: '35%',  left: '45%',  size: 420, base: 0.28, dur: 18500 },
    { color: colors.tertiary,  top: '5%',   left: '55%',  size: 360, base: 0.24, dur: 21000 },
    { color: colors.success,   top: '55%',  left: '-10%', size: 400, base: 0.22, dur: 17000 },
    { color: colors.info,      top: '68%',  left: '40%',  size: 380, base: 0.20, dur: 23000 },
  ]), [colors.primary, colors.secondary, colors.tertiary, colors.success, colors.info]);

  const blur = Platform.OS === 'web' ? ({ filter: `blur(${isDark ? 28 : 22}px)` } as any) : {};

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {fields.map((f, i) => (
        <Field key={i} field={f} opacityMul={m} blurStyle={blur} phase={i} speed={speed} />
      ))}
    </View>
  );
}

function Field({ field, opacityMul, blurStyle, phase, speed }: {
  field: { color: string; top: string; left: string; size: number; base: number; dur: number };
  opacityMul: number; blurStyle: object; phase: number; speed: number;
}) {
  const v = useRef(new Animated.Value(0)).current;
  // Cada campo arranca en una fase distinta — sin esto los 5 respiran al unísono.
  usePhasedLoop(v, field.dur * speed, (phase * 0.21) % 1);

  const dir = phase % 2 === 0 ? 1 : -1;
  const tx = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 40 * dir, 0] });
  const ty = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -34 * dir, 0] });
  const scale = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.18, 1] });
  const opacity = v.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [field.base * opacityMul, field.base * opacityMul * 1.4, field.base * opacityMul],
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: field.top as any,
          left: field.left as any,
          width: field.size,
          height: field.size,
          borderRadius: field.size / 2,
          opacity,
          overflow: 'hidden',
          transform: [{ translateX: tx }, { translateY: ty }, { scale }],
        },
        blurStyle,
      ]}
    >
      <LinearGradient colors={[field.color, 'transparent']} start={{ x: 0.5, y: 0.5 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
    </Animated.View>
  );
}
