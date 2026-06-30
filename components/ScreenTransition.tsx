import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { Animated, Easing, Platform, ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useProMotion } from '../hooks/useProMotion';

export interface ScreenTransitionRef {
  animateOut: (callback: () => void) => void;
}

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

const ScreenTransition = forwardRef<ScreenTransitionRef, Props>(
  ({ children, style }, ref) => {
    const { animate } = useProMotion();
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(18)).current;
    // Premium: además del fade+slide, un scale sutil que da sensación de "asentado".
    const scale = useRef(new Animated.Value(animate ? 0.985 : 1)).current;
    const activeAnimation = useRef<Animated.CompositeAnimation | null>(null);

    useFocusEffect(
      useCallback(() => {
        opacity.setValue(0);
        translateY.setValue(18);
        if (animate) scale.setValue(0.985);
        const animation = Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
          }),
          ...(animate ? [Animated.timing(scale, {
            toValue: 1,
            duration: 340,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
          })] : []),
        ]);
        activeAnimation.current = animation;
        animation.start(({ finished }) => {
          if (!finished) {
            opacity.setValue(1);
            translateY.setValue(0);
            scale.setValue(1);
          }
        });
        return () => {
          animation.stop();
        };
      }, [animate]),
    );

    useImperativeHandle(ref, () => ({
      animateOut: (callback: () => void) => {
        if (activeAnimation.current) activeAnimation.current.stop();
        const animation = Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 220,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(translateY, {
            toValue: -12,
            duration: 220,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]);
        activeAnimation.current = animation;
        animation.start(() => callback());
      },
    }));

    return (
      <Animated.View
        style={[{ flex: 1, opacity, transform: [{ translateY }, { scale }] }, style]}
      >
        {children}
      </Animated.View>
    );
  },
);

ScreenTransition.displayName = 'ScreenTransition';

export default ScreenTransition;
