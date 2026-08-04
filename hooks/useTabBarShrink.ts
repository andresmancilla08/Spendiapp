import { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';
import { useScrollDirection } from './useScrollDirection';

/**
 * La tab bar se encoge cuando el usuario baja y vuelve a su tamaño al subir:
 * la píldora reduce alto y escala, y las etiquetas se pliegan hasta
 * desaparecer, dejando solo los iconos. Compartido por la barra free y la
 * premium para que las dos se comporten igual.
 *
 * `height` no admite native driver, así que la animación va en JS; en web (la
 * PWA) no hay native driver de todos modos.
 */
export function useTabBarShrink(barHeight: number, compactHeight = 52) {
  const compact = useScrollDirection();
  const shrink = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(shrink, {
      toValue: compact ? 1 : 0,
      damping: 22,
      stiffness: 320,
      mass: 0.9,
      useNativeDriver: false,
    }).start();
  }, [compact, shrink]);

  const to = (from: number, target: number) =>
    shrink.interpolate({ inputRange: [0, 1], outputRange: [from, target] });

  return {
    compact,
    barHeight: to(barHeight, compactHeight),
    barScale: to(1, Platform.OS === 'web' ? 0.94 : 1),
    labelOpacity: to(1, 0),
    labelHeight: to(14, 0),
  };
}
