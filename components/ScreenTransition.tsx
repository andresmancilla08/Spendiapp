import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';

export interface ScreenTransitionRef {
  animateOut: (callback: () => void) => void;
}

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

const ScreenTransition = forwardRef<ScreenTransitionRef, Props>(
  ({ children, style }, ref) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(18)).current;
    const activeAnimation = useRef<Animated.CompositeAnimation | null>(null);

    useFocusEffect(
      useCallback(() => {
        opacity.setValue(0);
        translateY.setValue(18);
        const animation = Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]);
        activeAnimation.current = animation;
        animation.start(({ finished }) => {
          if (!finished) {
            opacity.setValue(1);
            translateY.setValue(0);
          }
        });
        return () => {
          animation.stop();
        };
      }, []),
    );

    useImperativeHandle(ref, () => ({
      animateOut: (callback: () => void) => {
        if (activeAnimation.current) activeAnimation.current.stop();
        const animation = Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 220,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -12,
            duration: 220,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]);
        activeAnimation.current = animation;
        animation.start(() => callback());
      },
    }));

    return (
      <Animated.View
        style={[{ flex: 1, opacity, transform: [{ translateY }] }, style]}
      >
        {children}
      </Animated.View>
    );
  },
);

ScreenTransition.displayName = 'ScreenTransition';

export default ScreenTransition;
