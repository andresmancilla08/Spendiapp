import { useRef, useEffect } from 'react';
import { Animated, Easing, Platform, ViewStyle, StyleProp } from 'react-native';
import { useProMotion } from '../hooks/useProMotion';

interface ProRevealProps {
  children: React.ReactNode;
  /** Posición en la secuencia, para el stagger. */
  index?: number;
  /** Delay base extra (ms). */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Entrada premium: fade + slide-up escalonado. Para usuarios gratuitos (o con
 * reduce-motion) renderiza el contenido al instante, sin animación.
 * Timing corto (150ms) y stagger 20ms por la regla de animaciones del proyecto.
 */
export default function ProReveal({ children, index = 0, delay = 0, style }: ProRevealProps) {
  const { animate } = useProMotion();
  const progress = useRef(new Animated.Value(animate ? 0 : 1)).current;

  useEffect(() => {
    if (!animate) { progress.setValue(1); return; }
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 150,
      delay: delay + index * 20,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate]);

  if (!animate) return <Animated.View style={style}>{children}</Animated.View>;

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
