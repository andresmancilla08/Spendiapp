import { useRef, useEffect } from 'react';
import { View, Animated, Easing, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import type { AuroraIntensity } from './AuroraBackground';

const MULTIPLIER: Record<AuroraIntensity, number> = {
  intense: 1.0,
  default: 0.75,
  subtle: 0.4,
};

interface Props {
  intensity?: AuroraIntensity;
}

/**
 * Alternativa a AuroraBackground: bandas de gradiente que se deslizan en
 * diagonal, sin morphing de blobs ni partículas — un tercer lenguaje visual
 * para que "personalización de fondo" no sea siempre lo mismo.
 */
export default function WavesBackground({ intensity = 'default' }: Props) {
  const { isDark, colors } = useTheme();
  const m = MULTIPLIER[intensity] * (isDark ? 1.8 : 1.0);
  const { width } = Dimensions.get('window');

  const w1 = useRef(new Animated.Value(0)).current;
  const w2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (v: Animated.Value, dur: number) => {
      v.setValue(0);
      Animated.loop(
        Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ).start();
    };
    loop(w1, 13000);
    loop(w2, 17000);
    return () => { w1.stopAnimation(); w2.stopAnimation(); };
  }, []);

  const tx1 = w1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-width * 0.3, width * 0.3, -width * 0.3] });
  const tx2 = w2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [width * 0.3, -width * 0.3, width * 0.3] });

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Animated.View style={[styles.wave, { top: '10%', opacity: 0.16 * m, transform: [{ translateX: tx1 }, { rotate: '-8deg' }] }]}>
        <LinearGradient colors={[colors.primary, 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} />
      </Animated.View>
      <Animated.View style={[styles.wave, { top: '55%', opacity: 0.12 * m, transform: [{ translateX: tx2 }, { rotate: '6deg' }] }]}>
        <LinearGradient colors={[colors.success, 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wave: { position: 'absolute', width: '160%', height: 180, left: '-30%' },
});
