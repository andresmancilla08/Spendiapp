import { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, Animated, LayoutChangeEvent,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Fonts } from '../config/fonts';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { icon: IoniconsName; iconActive: IoniconsName }> = {
  index:   { icon: 'home-outline',   iconActive: 'home' },
  budget:  { icon: 'wallet-outline', iconActive: 'wallet' },
  history: { icon: 'time-outline',   iconActive: 'time' },
  tools:   { icon: 'hammer-outline', iconActive: 'hammer' },
};

const BAR_HEIGHT    = 64;
const BLOB_H        = 42;
const BLOB_W        = 68;   // ratio 1.62 → siempre pill, nunca círculo
const BLOB_W_STRETCH = 84;
const PAD_H         = 8;   // paddingHorizontal del container

export default function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const visibleRoutes = state.routes.filter(r => TAB_CONFIG[r.name]);
  const numTabs = visibleRoutes.length;
  const activeIndex = visibleRoutes.findIndex(r => r.name === state.routes[state.index].name);

  const [containerWidth, setContainerWidth] = useState(0);

  // Blob animations (width needs useNativeDriver:false)
  const blobX = useRef(new Animated.Value(-200)).current;
  const blobW = useRef(new Animated.Value(BLOB_W)).current;

  // Icon scale per tab (useNativeDriver:true — only transforms)
  const s0 = useRef(new Animated.Value(activeIndex === 0 ? 1 : 0.82)).current;
  const s1 = useRef(new Animated.Value(activeIndex === 1 ? 1 : 0.82)).current;
  const s2 = useRef(new Animated.Value(activeIndex === 2 ? 1 : 0.82)).current;
  const s3 = useRef(new Animated.Value(activeIndex === 3 ? 1 : 0.82)).current;
  const scales = [s0, s1, s2, s3];

  const initialized = useRef(false);

  const getTargetX = (idx: number, cw: number) => {
    const innerW = cw - PAD_H * 2;
    const tabW = innerW / numTabs;
    return PAD_H + tabW * idx + (tabW - BLOB_W) / 2;
  };

  useEffect(() => {
    if (containerWidth === 0) return;
    const targetX = getTargetX(activeIndex, containerWidth);

    if (!initialized.current) {
      blobX.setValue(targetX);
      initialized.current = true;
      return;
    }

    // Blob: deslizar + estirar → contraer (efecto gota)
    Animated.parallel([
      Animated.spring(blobX, {
        toValue: targetX,
        damping: 22,
        stiffness: 200,
        mass: 0.85,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.spring(blobW, {
          toValue: BLOB_W_STRETCH,
          damping: 8,
          stiffness: 350,
          useNativeDriver: false,
        }),
        Animated.spring(blobW, {
          toValue: BLOB_W,
          damping: 14,
          stiffness: 260,
          useNativeDriver: false,
        }),
      ]),
    ]).start();

    // Escala de íconos (native driver OK)
    scales.forEach((s, i) => {
      Animated.spring(s, {
        toValue: i === activeIndex ? 1 : 0.82,
        damping: 14,
        stiffness: 280,
        useNativeDriver: true,
      }).start();
    });
  }, [activeIndex, containerWidth]);

  const tabLabels: Record<string, string> = {
    index:   t('tabBar.home'),
    budget:  t('tabBar.budget'),
    history: t('tabBar.history'),
    tools:   t('tabBar.tools'),
  };

  const handleLayout = (e: LayoutChangeEvent) =>
    setContainerWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.wrapper}>
      <View
        style={[styles.container, { backgroundColor: colors.surface, shadowColor: '#000' }]}
        onLayout={handleLayout}
      >
        {/* Gota animada */}
        <Animated.View
          style={[
            styles.blob,
            {
              backgroundColor: colors.primary,
              transform: [{ translateX: blobX }],
              width: blobW,
              opacity: containerWidth === 0 ? 0 : 1,
            },
          ]}
        />

        {/* Tabs */}
        {visibleRoutes.map((route, index) => {
          const config = TAB_CONFIG[route.name];
          if (!config) return null;
          const isFocused = activeIndex === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={onPress}
              activeOpacity={0.9}
              accessibilityRole="button"
            >
              <Animated.View
                style={[styles.tabContent, { transform: [{ scale: scales[index] }] }]}
              >
                <Ionicons
                  name={isFocused ? config.iconActive : config.icon}
                  size={22}
                  color={isFocused ? colors.onPrimary : colors.textTertiary}
                />
                {isFocused && (
                  <Text style={[styles.label, { color: colors.onPrimary }]}>
                    {tabLabels[route.name]}
                  </Text>
                )}
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
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingTop: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_HEIGHT,
    borderRadius: 32,
    paddingHorizontal: PAD_H,
    width: '92%',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    height: BLOB_H,
    top: (BAR_HEIGHT - BLOB_H) / 2,
    borderRadius: 30,
    zIndex: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_HEIGHT,
    zIndex: 1,
    paddingBottom: 2,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
});
