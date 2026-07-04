import { useEffect } from 'react';
import { Animated, Easing, EasingFunction } from 'react-native';

/**
 * Arranca un loop 0→1 desde una fase inicial distinta por elemento, para que
 * los elementos de un mismo efecto de fondo NO arranquen sincronizados (con el
 * fondo global persistente, el primer ciclo se ve una vez por sesión — si todo
 * parte de 0 a la vez, los primeros segundos se ven mecánicos).
 *
 * Primer tramo: fase→1 con duración proporcional; después, loop completo 0→1.
 */
export function usePhasedLoop(
  v: Animated.Value,
  duration: number,
  phase = 0,
  easing: EasingFunction = Easing.inOut(Easing.sin),
) {
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    v.setValue(phase);
    const head = Animated.timing(v, {
      toValue: 1,
      duration: Math.max(1, duration * (1 - phase)),
      easing,
      useNativeDriver: false,
    });
    head.start(({ finished }) => {
      if (!finished) return;
      v.setValue(0);
      loop = Animated.loop(
        Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: false }),
      );
      loop.start();
    });
    return () => { head.stop(); loop?.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);
}
