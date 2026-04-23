import { useRef, useEffect } from 'react';
import { View, Animated, Easing, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

export type AuroraIntensity = 'intense' | 'default' | 'subtle';

const MULTIPLIER: Record<AuroraIntensity, number> = {
  intense: 1.0,
  default: 0.88,
  subtle: 0.35,
};

interface Props {
  intensity?: AuroraIntensity;
}

export default function AuroraBackground({ intensity = 'default' }: Props) {
  const { isDark, activePalette } = useTheme();
  const m = MULTIPLIER[intensity] * (isDark ? 1.4 : 1.0);

  const b1 = useRef(new Animated.Value(0.00)).current;
  const b2 = useRef(new Animated.Value(0.33)).current;
  const b3 = useRef(new Animated.Value(0.67)).current;
  const b4 = useRef(new Animated.Value(0.15)).current;
  const b5 = useRef(new Animated.Value(0.50)).current;
  const b6 = useRef(new Animated.Value(0.82)).current;

  useEffect(() => {
    const loop = (v: Animated.Value, dur: number, offset: number) => {
      v.setValue(offset);
      Animated.loop(
        Animated.timing(v, { toValue: offset + 1, duration: dur, useNativeDriver: false, easing: Easing.linear }),
      ).start();
    };
    loop(b1,  9000, 0.00);
    loop(b2, 11500, 0.33);
    loop(b3, 10200, 0.67);
    loop(b4, 14000, 0.15);
    loop(b5,  8500, 0.50);
    loop(b6, 12800, 0.82);
    return () => {
      b1.stopAnimation(); b2.stopAnimation(); b3.stopAnimation();
      b4.stopAnimation(); b5.stopAnimation(); b6.stopAnimation();
    };
  }, []);

  // Blob 1 — grande, top-left
  const op1      = b1.interpolate({ inputRange: [0, 0.5, 1],              outputRange: [0.28 * m, 0.55 * m, 0.28 * m], extrapolate: 'clamp' });
  const tx1      = b1.interpolate({ inputRange: [0, 0.5, 1],              outputRange: [0, 24, 0],                      extrapolate: 'clamp' });
  const ty1      = b1.interpolate({ inputRange: [0, 0.25, 0.75, 1],       outputRange: [0, -20, 20, 0],                 extrapolate: 'clamp' });
  const lightOp1 = b1.interpolate({ inputRange: [0, 0.5, 1],              outputRange: [0.08 * m, 0.20 * m, 0.08 * m], extrapolate: 'clamp' });

  // Blob 2 — mediano, bottom-right
  const op2      = b2.interpolate({ inputRange: [0.33, 0.83, 1.33],       outputRange: [0.24 * m, 0.50 * m, 0.24 * m], extrapolate: 'clamp' });
  const tx2      = b2.interpolate({ inputRange: [0.33, 0.83, 1.33],       outputRange: [0, -22, 0],                     extrapolate: 'clamp' });
  const ty2      = b2.interpolate({ inputRange: [0.33, 0.58, 1.08, 1.33], outputRange: [0, 18, -16, 0],                 extrapolate: 'clamp' });
  const lightOp2 = b2.interpolate({ inputRange: [0.33, 0.83, 1.33],       outputRange: [0.06 * m, 0.16 * m, 0.06 * m], extrapolate: 'clamp' });

  // Blob 3 — pequeño, centro
  const op3      = b3.interpolate({ inputRange: [0.67, 1.17, 1.67],       outputRange: [0.26 * m, 0.54 * m, 0.26 * m], extrapolate: 'clamp' });
  const tx3      = b3.interpolate({ inputRange: [0.67, 1.17, 1.67],       outputRange: [0, 20, 0],                      extrapolate: 'clamp' });
  const ty3      = b3.interpolate({ inputRange: [0.67, 0.92, 1.42, 1.67], outputRange: [0, 30, -30, 0],                 extrapolate: 'clamp' });
  const lightOp3 = b3.interpolate({ inputRange: [0.67, 1.17, 1.67],       outputRange: [0.07 * m, 0.18 * m, 0.07 * m], extrapolate: 'clamp' });

  // Blob 4 — grande, centro-izquierda (ambient visible, no imperceptible)
  const op4      = b4.interpolate({ inputRange: [0.15, 0.65, 1.15],       outputRange: [0.14 * m, 0.28 * m, 0.14 * m], extrapolate: 'clamp' });
  const tx4      = b4.interpolate({ inputRange: [0.15, 0.65, 1.15],       outputRange: [0, 14, 0],                      extrapolate: 'clamp' });
  const ty4      = b4.interpolate({ inputRange: [0.15, 0.65, 1.15],       outputRange: [0, 14, 0],                      extrapolate: 'clamp' });
  const lightOp4 = b4.interpolate({ inputRange: [0.15, 0.65, 1.15],       outputRange: [0.04 * m, 0.10 * m, 0.04 * m], extrapolate: 'clamp' });

  // Blob 5 — pequeño, top-right
  const op5      = b5.interpolate({ inputRange: [0.50, 1.00, 1.50],       outputRange: [0.22 * m, 0.50 * m, 0.22 * m], extrapolate: 'clamp' });
  const tx5      = b5.interpolate({ inputRange: [0.50, 1.00, 1.50],       outputRange: [0, -16, 0],                     extrapolate: 'clamp' });
  const ty5      = b5.interpolate({ inputRange: [0.50, 0.75, 1.25, 1.50], outputRange: [0, 18, -14, 0],                 extrapolate: 'clamp' });
  const lightOp5 = b5.interpolate({ inputRange: [0.50, 1.00, 1.50],       outputRange: [0.05 * m, 0.14 * m, 0.05 * m], extrapolate: 'clamp' });

  // Blob 6 — mediano-grande, lower-left
  const op6      = b6.interpolate({ inputRange: [0.82, 1.32, 1.82],       outputRange: [0.20 * m, 0.46 * m, 0.20 * m], extrapolate: 'clamp' });
  const tx6      = b6.interpolate({ inputRange: [0.82, 1.32, 1.82],       outputRange: [0, 18, 0],                      extrapolate: 'clamp' });
  const ty6      = b6.interpolate({ inputRange: [0.82, 1.07, 1.57, 1.82], outputRange: [0, -20, 18, 0],                 extrapolate: 'clamp' });
  const lightOp6 = b6.interpolate({ inputRange: [0.82, 1.32, 1.82],       outputRange: [0.05 * m, 0.12 * m, 0.05 * m], extrapolate: 'clamp' });

  const blobColors = isDark ? activePalette.auroraBlobs.dark : activePalette.auroraBlobs.light;

  const webBlur = Platform.OS === 'web' ? ({ filter: `blur(${isDark ? 10 : 4}px)` } as any) : {};

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Blob 4 — grande ambient, centro-izquierda */}
      <Animated.View style={[styles.blob4, webBlur, { opacity: isDark ? op4 : lightOp4, transform: [{ translateX: tx4 }, { translateY: ty4 }] }]}>
        <LinearGradient colors={blobColors[3]} style={StyleSheet.absoluteFillObject} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
      </Animated.View>
      {/* Blob 1 — grande, top-left */}
      <Animated.View style={[styles.blob1, webBlur, { opacity: isDark ? op1 : lightOp1, transform: [{ translateX: tx1 }, { translateY: ty1 }] }]}>
        <LinearGradient colors={blobColors[0]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      </Animated.View>
      {/* Blob 6 — mediano-grande, lower-left */}
      <Animated.View style={[styles.blob6, webBlur, { opacity: isDark ? op6 : lightOp6, transform: [{ translateX: tx6 }, { translateY: ty6 }] }]}>
        <LinearGradient colors={blobColors[5]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} />
      </Animated.View>
      {/* Blob 2 — mediano, bottom-right */}
      <Animated.View style={[styles.blob2, webBlur, { opacity: isDark ? op2 : lightOp2, transform: [{ translateX: tx2 }, { translateY: ty2 }] }]}>
        <LinearGradient colors={blobColors[1]} style={StyleSheet.absoluteFillObject} start={{ x: 0.5, y: 0 }} end={{ x: 0, y: 1 }} />
      </Animated.View>
      {/* Blob 5 — pequeño, top-right */}
      <Animated.View style={[styles.blob5, webBlur, { opacity: isDark ? op5 : lightOp5, transform: [{ translateX: tx5 }, { translateY: ty5 }] }]}>
        <LinearGradient colors={blobColors[4]} style={StyleSheet.absoluteFillObject} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} />
      </Animated.View>
      {/* Blob 3 — pequeño, centro */}
      <Animated.View style={[styles.blob3, webBlur, { opacity: isDark ? op3 : lightOp3, transform: [{ translateX: tx3 }, { translateY: ty3 }] }]}>
        <LinearGradient colors={blobColors[2]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  blob1: { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -60,    left: -70,   overflow: 'hidden' },
  blob2: { position: 'absolute', width: 180, height: 180, borderRadius: 90,  bottom: 110, right: -50,  overflow: 'hidden' },
  blob3: { position: 'absolute', width: 110, height: 110, borderRadius: 55,  top: '42%',  left: '28%', overflow: 'hidden' },
  blob4: { position: 'absolute', width: 310, height: 310, borderRadius: 155, top: '22%',  left: '8%',  overflow: 'hidden' },
  blob5: { position: 'absolute', width: 130, height: 130, borderRadius: 65,  top: '12%',  right: '4%', overflow: 'hidden' },
  blob6: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: '65%',  left: -30,   overflow: 'hidden' },
});
