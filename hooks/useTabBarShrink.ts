import { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';
import { useScrollDirection } from './useScrollDirection';

/** Ancho de la píldora respecto al espacio disponible: en reposo y encogida. */
const WIDTH_REST = 0.9;
const WIDTH_COMPACT = 0.6;

/**
 * La tab bar se encoge cuando el usuario baja y vuelve a su tamaño al subir:
 * la píldora estrecha, baja de alto y las etiquetas se pliegan hasta
 * desaparecer, dejando solo los iconos. Compartido por la barra free y la
 * premium para que las dos se comporten igual.
 *
 * El ancho se anima en px a partir del espacio disponible (`availableWidth`,
 * que mide el wrapper): `width` en porcentaje no se puede interpolar, y hacerlo
 * con `scaleX` deformaría los iconos. Con el ancho real, los iconos se juntan
 * como en las apps de referencia.
 *
 * `width`/`height` no admiten native driver, así que la animación va en JS; en
 * web (la PWA) no hay native driver de todos modos.
 */
export function useTabBarShrink(barHeight: number, availableWidth = 0, compactHeight = 52) {
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
    // Sin medida todavía (primer render): se deja el 90% del CSS y no se anima.
    barWidth: availableWidth > 0
      ? to(availableWidth * WIDTH_REST, availableWidth * WIDTH_COMPACT)
      : null,
    barScale: to(1, Platform.OS === 'web' ? 0.98 : 1),
    labelOpacity: to(1, 0),
    labelHeight: to(14, 0),
  };
}
