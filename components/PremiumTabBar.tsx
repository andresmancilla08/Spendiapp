import { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, Animated, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Fonts } from '../config/fonts';
import { useBreakpoint } from '../hooks/useBreakpoint';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { icon: IoniconsName; iconActive: IoniconsName }> = {
  index:   { icon: 'home-outline',   iconActive: 'home' },
  history: { icon: 'time-outline',   iconActive: 'time' },
  tools:   { icon: 'hammer-outline', iconActive: 'hammer' },
};

const BAR_HEIGHT  = 70;
const ICON_AREA_W = 52;
const ICON_AREA_H = 42;
const GLOW_SIZE   = 50;

const SPRING = { damping: 22, stiffness: 400, mass: 0.85, useNativeDriver: Platform.OS !== 'web' } as const;
const PRESS  = { damping: 15, stiffness: 500, mass: 0.8,  useNativeDriver: Platform.OS !== 'web' } as const;

export default function PremiumTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isMobile, isDesktop } = useBreakpoint();

  const allTabRoutes = state.routes.filter(r => TAB_CONFIG[r.name]);

  const activeInAll = allTabRoutes.findIndex(r => r.name === state.routes[state.index].name);
  const effectiveAllIdx = activeInAll === -1 ? 0 : activeInAll;

  // Per-tab animated values
  const glowOpacity = useRef(allTabRoutes.map((_, i) => new Animated.Value(i === effectiveAllIdx ? 1 : 0))).current;
  const iconScale   = useRef(allTabRoutes.map((_, i) => new Animated.Value(i === effectiveAllIdx ? 1 : 0.82))).current;
  const pressScale  = useRef(allTabRoutes.map(() => new Animated.Value(1))).current;

  // Single breathe loop applied to active icon via multiply
  const breatheAnim = useRef(new Animated.Value(1)).current;

  const prevActive = useRef(effectiveAllIdx);

  // Breathe loop — continuous, very subtle
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.045,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Tab transition animations
  useEffect(() => {
    const prev = prevActive.current;
    if (prev === effectiveAllIdx) return;
    prevActive.current = effectiveAllIdx;

    const out = prev >= 0 ? [
      Animated.spring(glowOpacity[prev], { toValue: 0,    ...SPRING }),
      Animated.spring(iconScale[prev],   { toValue: 0.82, ...SPRING }),
    ] : [];

    Animated.parallel([
      ...out,
      Animated.spring(glowOpacity[effectiveAllIdx], { toValue: 1, ...SPRING }),
      Animated.spring(iconScale[effectiveAllIdx],   { toValue: 1, ...SPRING }),
    ]).start();
  }, [effectiveAllIdx]);

  const tabLabels: Record<string, string> = {
    index:   t('tabBar.home'),
    history: t('tabBar.history'),
    tools:   t('tabBar.tools'),
  };

  const bottomPad = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 16 : 8);

  const glassColor   = colors.surface;
  const borderColor  = `${colors.primary}3A`;
  const iconInactive = colors.textTertiary;

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPad }]}>
      <View style={[
        styles.container,
        { backgroundColor: glassColor, borderColor },
        !isMobile && { maxWidth: isDesktop ? 640 : 560 },
      ]}>
        {allTabRoutes.map((route) => {
          const allIdx = allTabRoutes.findIndex(r => r.key === route.key);
          const config = TAB_CONFIG[route.name];
          if (!config) return null;
          const isFocused    = effectiveAllIdx === allIdx;
          const isActualTab  = state.routes[state.index].name === route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isActualTab && !event.defaultPrevented) navigation.navigate(route.name);
          };

          const onPressIn = () =>
            Animated.spring(pressScale[allIdx], { toValue: 0.88, ...PRESS }).start();

          const onPressOut = () =>
            Animated.spring(pressScale[allIdx], { toValue: 1, ...PRESS }).start();

          // Breathe only on active icon (multiply inactive scale ~0.82 by breatheAnim ≈ 1.0–1.045 = imperceptible)
          const iconTransform = [{ scale: Animated.multiply(iconScale[allIdx], breatheAnim) }];

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={onPress}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              activeOpacity={1}
              accessibilityRole="button"
            >
              <Animated.View style={[styles.tabInner, { transform: [{ scale: pressScale[allIdx] }] }]}>
                {/* Icon area with glow bloom */}
                <View style={styles.iconArea}>
                  <Animated.View
                    style={[
                      styles.glowBloom,
                      {
                        opacity: glowOpacity[allIdx],
                        shadowColor: colors.primary,
                        backgroundColor: `${colors.primary}1A`,
                      },
                    ]}
                  />
                  <Animated.View style={{ transform: iconTransform }}>
                    <Ionicons
                      name={isFocused ? config.iconActive : config.icon}
                      size={22}
                      color={isFocused ? colors.primary : iconInactive}
                    />
                  </Animated.View>
                </View>

                <Text
                  style={[
                    styles.label,
                    {
                      color: isFocused ? colors.primary : iconInactive,
                      fontFamily: isFocused ? Fonts.bold : Fonts.regular,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tabLabels[route.name]}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_HEIGHT,
    borderRadius: 36,
    paddingHorizontal: 6,
    width: '96%',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 32,
    elevation: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_HEIGHT,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconArea: {
    width: ICON_AREA_W,
    height: ICON_AREA_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBloom: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.50,
    shadowRadius: 16,
    elevation: 8,
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: Fonts.bold,
    letterSpacing: 0.4,
  },
});
