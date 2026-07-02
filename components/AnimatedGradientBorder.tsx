import { useRef, useEffect, useState, type ReactNode } from 'react';
import { View, Animated, Easing, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  radius: number;
  borderWidth?: number;
  colors: [string, string, string, string];
  /** Glow exterior suave (solo web). */
  glow?: string;
  style?: ViewStyle;
  children: ReactNode;
}

/**
 * Borde con gradiente animado premium. En web usa un gradiente CÓNICO que
 * envuelve 360° sin costura y rota suavemente (a diferencia de un gradiente
 * lineal rotando, que deja una banda diagonal dura). En nativo cae a un
 * gradiente lineal estático limpio.
 */
export default function AnimatedGradientBorder({ radius, borderWidth = 2, colors, glow, style, children }: Props) {
  const rot = useRef(new Animated.Value(0)).current;
  const [side, setSide] = useState(0);
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (!isWeb) return;
    const loop = Animated.loop(
      Animated.timing(rot, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [rot, isWeb]);

  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const sq = side * 1.5;
  const [c0, c1, c2, c3] = colors;
  const conic = `conic-gradient(from 0deg, ${c0}, ${c1}, ${c2}, ${c3}, ${c0})`;

  const glowStyle = isWeb && glow ? ({ boxShadow: `0 0 18px ${glow}` } as any) : {};

  return (
    <View
      style={[{ borderRadius: radius, padding: borderWidth, overflow: 'hidden', position: 'relative' }, glowStyle, style]}
      onLayout={(e) => { const { width, height } = e.nativeEvent.layout; const s = Math.max(width, height); if (Math.abs(s - side) > 1) setSide(s); }}
    >
      {isWeb ? (
        side > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              { position: 'absolute', width: sq, height: sq, left: '50%', top: '50%', marginLeft: -sq / 2, marginTop: -sq / 2, transform: [{ rotate }] },
              { backgroundImage: conic } as any,
            ]}
          />
        )
      ) : (
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      )}
      {children}
    </View>
  );
}
