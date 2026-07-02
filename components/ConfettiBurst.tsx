import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const COUNT = 22;
const COLORS = ['#22C55E', '#00ACC1', '#FBBF24', '#F472B6', '#818CF8'];
const DURATION = 1500;

interface PieceConfig {
  color: string;
  left: `${number}%`;
  size: number;
  fallDistance: number;
  drift: number;
  rotations: number;
  delay: number;
}

/**
 * Micro-celebración de una sola vez (premium, opcional vía streakConfetti):
 * ráfaga de confeti cayendo desde arriba. Se monta cuando `trigger` cambia y
 * se desmonta sola al terminar — no deja nada corriendo en segundo plano.
 */
export default function ConfettiBurst({ trigger }: { trigger: unknown }) {
  const [visible, setVisible] = useState(false);

  const pieces = useMemo<PieceConfig[]>(() => (
    Array.from({ length: COUNT }, (_, i) => ({
      color: COLORS[i % COLORS.length],
      left: `${(i * 43) % 100}%` as const,
      size: 6 + (i % 3) * 2,
      fallDistance: 160 + (i % 5) * 24,
      drift: ((i % 2 === 0 ? 1 : -1)) * (20 + (i % 4) * 10),
      rotations: 2 + (i % 3),
      delay: (i % 6) * 40,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [trigger]);

  useEffect(() => {
    setVisible(true);
    const id = setTimeout(() => setVisible(false), DURATION + 300);
    return () => clearTimeout(id);
  }, [trigger]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {pieces.map((p, i) => (
        <Piece key={i} config={p} />
      ))}
    </View>
  );
}

function Piece({ config }: { config: PieceConfig }) {
  const anim = useMemoAnimated();

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: DURATION,
      delay: config.delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-20, config.fallDistance] });
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, config.drift] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${config.rotations * 360}deg`] });
  const opacity = anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: config.left,
        width: config.size,
        height: config.size * 0.4,
        backgroundColor: config.color,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  );
}

function useMemoAnimated() {
  const [anim] = useState(() => new Animated.Value(0));
  return anim;
}
