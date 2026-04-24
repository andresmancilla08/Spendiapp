import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import * as Haptics from 'expo-haptics';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface Segment {
  key: string;
  label: string;
  icon?: IoniconsName;
  badge?: number;
}

interface AppSegmentedControlProps {
  segments: Segment[];
  activeKey: string;
  onChange: (key: string) => void;
  style?: ViewStyle;
  activeColor?: string;
}

export default function AppSegmentedControl({
  segments,
  activeKey,
  onChange,
  style,
  activeColor,
}: AppSegmentedControlProps) {
  const { colors } = useTheme();
  const activeBg = activeColor ?? colors.primary;

  const handlePress = (key: string) => {
    if (key === activeKey) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(key);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      {segments.map((seg) => {
        const isActive = seg.key === activeKey;
        const textColor = isActive ? colors.onPrimary : colors.textSecondary;
        return (
          <TouchableOpacity
            key={seg.key}
            style={[styles.segment, isActive && { backgroundColor: activeBg }]}
            onPress={() => handlePress(seg.key)}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            {seg.icon && (
              <Ionicons name={seg.icon} size={14} color={textColor} />
            )}
            <Text
              style={[
                styles.label,
                { color: textColor },
                isActive ? styles.labelActive : styles.labelInactive,
              ]}
              numberOfLines={1}
            >
              {seg.label}
            </Text>
            {seg.badge != null && seg.badge > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={styles.badgeText}>{seg.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  label: {
    fontSize: 14,
  },
  labelActive: {
    fontFamily: Fonts.semiBold,
  },
  labelInactive: {
    fontFamily: Fonts.medium,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
});
