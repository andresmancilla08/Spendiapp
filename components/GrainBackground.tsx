import { useRef, useEffect } from 'react';
import { View, Animated, Easing, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';

const CONFIG: Record<AuroraIntensity, { grain: number; wash: number }> = {
  subtle:  { grain: 0.5, wash: 0.5 },
  default: { grain: 1.0, wash: 1.0 },
  intense: { grain: 1.6, wash: 1.4 },
};

// Ruido fractal SVG → textura de grano de película. Solo web (RN nativo no
// aplica backgroundImage); en nativo se degrada al wash de color.
const NOISE_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>" +
  "<feColorMatrix type='saturate' values='0'/></filter>" +
  "<rect width='100%' height='100%' filter='url(#n)'/></svg>";
const NOISE_URI = `url("data:image/svg+xml,${encodeURIComponent(NOISE_SVG)}")`;

interface Props {
  intensity?: AuroraIntensity;
  /** Multiplicador de duración (1 = normal, >1 más lento, <1 más rápido). */
  speed?: number;
}

/**
 * Fondo con textura de grano sutil sobre un wash de color de la paleta que
 * deriva lento. El grano (ruido SVG) late apenas para no quedar estático.
 */
export default function GrainBackground({ intensity = 'default', speed = 1 }: Props) {
  const { isDark, colors } = useTheme();
  const cfg = CONFIG[intensity];

  const grainAnim = useRef(new Animated.Value(0)).current;
  const washAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const g = Animated.loop(
      Animated.sequence([
        Animated.timing(grainAnim, { toValue: 1, duration: 1800 * speed, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(grainAnim, { toValue: 0, duration: 1800 * speed, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    const w = Animated.loop(
      Animated.timing(washAnim, { toValue: 1, duration: 11000 * speed, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    );
    g.start();
    w.start();
    return () => { g.stop(); w.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  const grainBase = (isDark ? 0.14 : 0.13) * cfg.grain;
  const grainOpacity = grainAnim.interpolate({ inputRange: [0, 1], outputRange: [grainBase * 0.45, grainBase] });
  const washMul = (isDark ? 1.35 : 1.4) * cfg.wash;

  const tx1 = washAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-52, 52, -52] });
  const ty1 = washAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 42, 0] });
  const tx2 = washAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [52, -52, 52] });

  const softBlur = Platform.OS === 'web' ? ({ filter: 'blur(26px)' } as any) : {};

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Wash de color: dos campos suaves de la paleta que derivan lento */}
      <Animated.View style={[styles.wash, softBlur, { top: '-10%', left: '-15%', opacity: 0.22 * washMul, transform: [{ translateX: tx1 }, { translateY: ty1 }] }]}>
        <LinearGradient colors={[colors.primary, 'transparent']} start={{ x: 0.4, y: 0.3 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      </Animated.View>
      <Animated.View style={[styles.wash, softBlur, { bottom: '-10%', right: '-15%', opacity: 0.18 * washMul, transform: [{ translateX: tx2 }] }]}>
        <LinearGradient colors={[colors.tertiary, 'transparent']} start={{ x: 0.6, y: 0.7 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFillObject} />
      </Animated.View>

      {/* Grano (solo web) */}
      {Platform.OS === 'web' && (
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { opacity: grainOpacity, backgroundImage: NOISE_URI, backgroundRepeat: 'repeat', backgroundSize: '160px 160px' } as any]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wash: { position: 'absolute', width: '90%', height: '70%', borderRadius: 400, overflow: 'hidden' },
});
