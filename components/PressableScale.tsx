import { Animated, Platform, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { useRef } from 'react';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface PressableScaleProps extends Omit<TouchableOpacityProps, 'activeOpacity'> {
  children: React.ReactNode;
  scaleValue?: number;
}

export default function PressableScale({
  style,
  children,
  onPressIn,
  onPressOut,
  scaleValue = 0.97,
  ...rest
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: any) => {
    Animated.spring(scale, {
      toValue: scaleValue,
      useNativeDriver: Platform.OS !== 'web',
      damping: 15,
      stiffness: 500,
      mass: 0.8,
    }).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      damping: 15,
      stiffness: 500,
      mass: 0.8,
    }).start();
    onPressOut?.(e);
  };

  return (
    <AnimatedTouchable
      {...rest}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.85}
    >
      {children}
    </AnimatedTouchable>
  );
}
