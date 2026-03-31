import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
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
};

export default function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const tabLabels: Record<string, string> = {
    index: t('tabBar.home'),
    budget: t('tabBar.budget'),
    history: t('tabBar.history'),
  };

  const visibleRoutes = state.routes.filter((r) => TAB_CONFIG[r.name]);

  return (
    <View style={styles.wrapper}>
      <View style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          shadowColor: '#000',
        }
      ]}>
        {visibleRoutes.map((route) => {
          const config = TAB_CONFIG[route.name];
          if (!config) return null;

          const isFocused = state.routes[state.index].name === route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={onPress}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              {isFocused ? (
                <View style={[styles.activeWrap, { backgroundColor: colors.primary }]}>
                  <Ionicons name={config.iconActive} size={20} color={colors.onPrimary} />
                  <Text style={[styles.activeLabel, { color: colors.onPrimary }]}>{tabLabels[route.name]}</Text>
                </View>
              ) : (
                <View style={styles.inactiveWrap}>
                  <Ionicons name={config.icon} size={20} color={colors.textTertiary} />
                  <Text style={[styles.inactiveLabel, { color: colors.textTertiary }]}>{tabLabels[route.name]}</Text>
                </View>
              )}
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
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 68,
    borderRadius: 40,
    paddingHorizontal: 8,
    width: '92%',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 14,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 68,
  },
  activeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
  },
  activeLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  inactiveWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  inactiveLabel: {
    fontSize: 10,
    fontFamily: Fonts.medium,
  },
});
