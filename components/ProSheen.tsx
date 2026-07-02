import { useRef, useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useProMotion } from '../hooks/useProMotion';
import { useTheme } from '../context/ThemeContext';

const STRIP_W = 90;

interface ProSheenProps {
  /** Cambia este valor para re-disparar el barrido (ej. el balance del mes). */
  trigger?: unknown;
  /** Tinte del brillo. */
  color?: string;
  duration?: number;
}

/**
 * Barrido de luz diagonal que cruza el contenedor una vez (premium-only).
 * Se monta dentro de un contenedor con overflow:hidden. No-op para usuarios
 * gratuitos o con reduce-motion. Solo anima transform → barato.
 */
export default function ProSheen({
  trigger,
  color = 'rgba(255,255,255,0.22)',
  duration = 650,
}: ProSheenProps) {
  const { animate } = useProMotion();
  const { cardSheen } = useTheme();
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);

  useEffect(() => {
    if (!animate || !cardSheen || w === 0) return;
    x.setValue(0);
    const id = Animated.timing(x, {
      toValue: 1,
      duration,
      delay: 140,
      useNativeDriver: Platform.OS !== 'web',
    });
    id.start();
    return () => id.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, cardSheen, w, trigger]);

  if (!animate || !cardSheen) return null;

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            top: -40,
            bottom: -40,
            width: STRIP_W,
            transform: [
              { translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-STRIP_W, w + STRIP_W] }) },
              { rotate: '18deg' },
            ],
          }}
        >
          <LinearGradient
            colors={['transparent', color, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}
