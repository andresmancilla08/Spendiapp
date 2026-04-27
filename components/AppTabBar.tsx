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
import { useAuthStore } from '../store/authStore';
import PremiumTabBar from './PremiumTabBar';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, {
  icon: IoniconsName;
  iconActive: IoniconsName;
  premiumOnly?: boolean;
}> = {
  index:   { icon: 'home-outline',   iconActive: 'home' },
  history: { icon: 'time-outline',   iconActive: 'time' },
  tools:   { icon: 'hammer-outline', iconActive: 'hammer' },
};

const BAR_HEIGHT = 68;
const PILL_H     = 38;
const PILL_W     = 56;

// Design system spring values for tab bar
const SPRING_IN  = { damping: 20, stiffness: 380, mass: 0.9, useNativeDriver: true } as const;
const SPRING_OUT = { damping: 20, stiffness: 380, mass: 0.9, useNativeDriver: true } as const;

export default function AppTabBar(props: BottomTabBarProps) {
  const { isPremium } = useAuthStore();
  if (isPremium) return <PremiumTabBar {...props} />;
  return <FreeTabBar {...props} />;
}

function FreeTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isMobile, isDesktop } = useBreakpoint();
  const { isPremium } = useAuthStore();

  const allTabRoutes = state.routes.filter(r => TAB_CONFIG[r.name]);
  // Budget is premium-only: hidden for free users
  const visibleRoutes = allTabRoutes.filter(r => !(TAB_CONFIG[r.name]?.premiumOnly && !isPremium));

  const activeInAll = allTabRoutes.findIndex(r => r.name === state.routes[state.index].name);
  const effectiveAllIdx = activeInAll === -1 ? 0 : activeInAll;

  const pillOpacity = useRef(allTabRoutes.map((_, i) => new Animated.Value(i === effectiveAllIdx ? 1 : 0))).current;
  const pillScale   = useRef(allTabRoutes.map((_, i) => new Animated.Value(i === effectiveAllIdx ? 1 : 0.75))).current;
  const iconScale   = useRef(allTabRoutes.map((_, i) => new Animated.Value(i === effectiveAllIdx ? 1 : 0.85))).current;

  const prevActive = useRef(effectiveAllIdx);

  useEffect(() => {
    const prev = prevActive.current;
    if (prev === effectiveAllIdx) return;
    prevActive.current = effectiveAllIdx;

    const fadeOutPrev = prev >= 0 ? [
      Animated.spring(pillOpacity[prev], { toValue: 0,    ...SPRING_OUT }),
      Animated.spring(pillScale[prev],   { toValue: 0.75, ...SPRING_OUT }),
      Animated.spring(iconScale[prev],   { toValue: 0.85, ...SPRING_OUT }),
    ] : [];

    Animated.parallel([
      ...fadeOutPrev,
      Animated.spring(pillOpacity[effectiveAllIdx], { toValue: 1, ...SPRING_IN }),
      Animated.spring(pillScale[effectiveAllIdx],   { toValue: 1, ...SPRING_IN }),
      Animated.spring(iconScale[effectiveAllIdx],   { toValue: 1, ...SPRING_IN }),
    ]).start();
  }, [effectiveAllIdx]);

  const tabLabels: Record<string, string> = {
    index:   t('tabBar.home'),
    history: t('tabBar.history'),
    tools:   t('tabBar.tools'),
  };

  const bottomPad = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 16 : 8);

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPad }]}>
      <View style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          shadowColor: '#000',
          borderColor: `${colors.primary}20`,
        },
        !isMobile && { maxWidth: isDesktop ? 640 : 560 },
      ]}>
        {visibleRoutes.map((route) => {
          const allIdx = allTabRoutes.findIndex(r => r.key === route.key);
          const config = TAB_CONFIG[route.name];
          if (!config) return null;
          const isFocused = effectiveAllIdx === allIdx;
          const isActualTab = state.routes[state.index].name === route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isActualTab && !event.defaultPrevented) navigation.navigate(route.name);
          };

          const iconColor = isFocused ? colors.onPrimary : colors.textTertiary;
          const labelColor = isFocused ? colors.primary : colors.textTertiary;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={onPress}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <View style={styles.iconArea}>
                {/* Active pill with cyan glow */}
                <Animated.View
                  style={[
                    styles.pill,
                    {
                      backgroundColor: colors.primary,
                      shadowColor: colors.primary,
                      opacity: pillOpacity[allIdx],
                      transform: [{ scale: pillScale[allIdx] }],
                    },
                  ]}
                />

                {/* Tab icon */}
                <Animated.View style={{ transform: [{ scale: iconScale[allIdx] }] }}>
                  <Ionicons
                    name={isFocused ? config.iconActive : config.icon}
                    size={22}
                    color={iconColor}
                  />
                </Animated.View>

                {/* Premium star badge (budget tab, premium users) */}
                {config.premiumOnly && isPremium && (
                  <View style={[styles.cornerBadge, styles.premiumBadge]}>
                    <Ionicons name="star" size={7} color="#F59E0B" />
                  </View>
                )}

              </View>

              <Text
                style={[
                  styles.label,
                  { color: labelColor, fontFamily: isFocused ? Fonts.bold : Fonts.regular },
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
    borderRadius: 34,
    paddingHorizontal: 8,
    width: '90%',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 7,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  cornerBadge: {
    position: 'absolute',
    top: 0,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  premiumBadge: {
    backgroundColor: 'rgba(245,158,11,0.18)',
    borderColor: 'rgba(245,158,11,0.5)',
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.3,
  },
});
