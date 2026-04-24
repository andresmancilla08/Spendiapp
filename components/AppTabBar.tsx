import { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, Animated,
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
  budget:  { icon: 'wallet-outline', iconActive: 'wallet' },
  history: { icon: 'time-outline',   iconActive: 'time' },
  tools:   { icon: 'hammer-outline', iconActive: 'hammer' },
};

const BAR_HEIGHT = 64;
const PILL_H     = 36;
const PILL_W     = 52;

export default function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isMobile, isDesktop } = useBreakpoint();

  const visibleRoutes = state.routes.filter(r => TAB_CONFIG[r.name]);
  const activeIndex = visibleRoutes.findIndex(r => r.name === state.routes[state.index].name);
  // Cuando estamos en una sub-pantalla (profile, notifications, etc.), activeIndex=-1.
  // Mostramos Home como activo por defecto.
  const effectiveIndex = activeIndex === -1 ? 0 : activeIndex;

  // Per-tab animated values (pill opacity/scale + icon scale)
  const pillOpacity = useRef(visibleRoutes.map((_, i) => new Animated.Value(i === effectiveIndex ? 1 : 0))).current;
  const pillScale   = useRef(visibleRoutes.map((_, i) => new Animated.Value(i === effectiveIndex ? 1 : 0.75))).current;
  const iconScale   = useRef(visibleRoutes.map((_, i) => new Animated.Value(i === effectiveIndex ? 1 : 0.85))).current;

  const prevActive = useRef(effectiveIndex);

  useEffect(() => {
    const prev = prevActive.current;
    if (prev === effectiveIndex) return;
    prevActive.current = effectiveIndex;

    const fadeOutPrev = prev >= 0 ? [
      Animated.spring(pillOpacity[prev], { toValue: 0, damping: 18, stiffness: 300, useNativeDriver: true }),
      Animated.spring(pillScale[prev],   { toValue: 0.75, damping: 18, stiffness: 300, useNativeDriver: true }),
      Animated.spring(iconScale[prev],   { toValue: 0.85, damping: 18, stiffness: 300, useNativeDriver: true }),
    ] : [];

    Animated.parallel([
      ...fadeOutPrev,
      Animated.spring(pillOpacity[effectiveIndex], { toValue: 1, damping: 14, stiffness: 260, useNativeDriver: true }),
      Animated.spring(pillScale[effectiveIndex],   { toValue: 1, damping: 14, stiffness: 260, useNativeDriver: true }),
      Animated.spring(iconScale[effectiveIndex],   { toValue: 1, damping: 14, stiffness: 260, useNativeDriver: true }),
    ]).start();
  }, [effectiveIndex]);

  const tabLabels: Record<string, string> = {
    index:   t('tabBar.home'),
    budget:  t('tabBar.budget'),
    history: t('tabBar.history'),
    tools:   t('tabBar.tools'),
  };

  const bottomPad = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 16 : 8);

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPad }]}>
      <View style={[
        styles.container,
        { backgroundColor: colors.surface, shadowColor: '#000' },
        !isMobile && { maxWidth: isDesktop ? 640 : 560 },
      ]}>
        {visibleRoutes.map((route, index) => {
          const config = TAB_CONFIG[route.name];
          if (!config) return null;
          const isFocused = effectiveIndex === index;
          // Navegación usa el tab real, no el efectivo — permite navegar a Home desde sub-pantallas
          const isActualTab = state.routes[state.index].name === route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isActualTab && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={onPress}
              activeOpacity={0.9}
              accessibilityRole="button"
            >
              {/* Pill detrás del ícono — mismo contenedor, alineación garantizada */}
              <View style={styles.iconArea}>
                <Animated.View
                  style={[
                    styles.pill,
                    {
                      backgroundColor: colors.primary,
                      opacity: pillOpacity[index],
                      transform: [{ scale: pillScale[index] }],
                    },
                  ]}
                />
                <Animated.View style={{ transform: [{ scale: iconScale[index] }] }}>
                  <Ionicons
                    name={isFocused ? config.iconActive : config.icon}
                    size={22}
                    color={isFocused ? colors.onPrimary : colors.textTertiary}
                  />
                </Animated.View>
              </View>

              <Text
                style={[
                  styles.label,
                  {
                    color: isFocused ? colors.primary : colors.textTertiary,
                    fontFamily: isFocused ? Fonts.bold : Fonts.regular,
                  },
                ]}
                numberOfLines={1}
              >
                {tabLabels[route.name]}
              </Text>
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
    borderRadius: 32,
    paddingHorizontal: 8,
    width: '92%',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_HEIGHT,
    gap: 2,
  },
  iconArea: {
    width: PILL_W,
    height: PILL_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.3,
  },
});
