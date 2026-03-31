import { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export type DialogType = 'error' | 'warning' | 'success' | 'info';

const DIALOG_ICON: Record<DialogType, IoniconsName> = {
  error: 'close-circle',
  warning: 'alert-circle',
  success: 'checkmark-circle',
  info: 'information-circle',
};

interface AppDialogProps {
  visible: boolean;
  type?: DialogType;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}

export default function AppDialog({
  visible,
  type = 'info',
  title,
  description,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: AppDialogProps) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(300)).current;

  const iconName = DIALOG_ICON[type];
  const iconColor =
    type === 'error' ? colors.error :
    type === 'warning' ? colors.warning :
    type === 'success' ? colors.success :
    colors.primary;

  useEffect(() => {
    if (visible) {
      translateY.setValue(300);
      Animated.spring(translateY, {
        toValue: 0,
        damping: 20,
        stiffness: 200,
        useNativeDriver: true,
      }).start();

      scale.setValue(0);
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1,
          damping: 8,
          stiffness: 180,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.spring(scale, {
            toValue: 1,
            damping: 8,
            stiffness: 180,
            velocity: 4,
            useNativeDriver: true,
          })
        ),
      ]).start();
    } else {
      scale.setValue(0);
      translateY.setValue(300);
    }
  }, [visible]);

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Animated.View style={[styles.card, { backgroundColor: colors.surface, transform: [{ translateY }] }]}>
          <Animated.View style={[styles.iconWrapper, { transform: [{ scale }] }]}>
            <Ionicons name={iconName} size={56} color={iconColor} />
          </Animated.View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={onPrimary}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryLabel, { color: colors.onPrimary }]}>{primaryLabel}</Text>
          </TouchableOpacity>

          {secondaryLabel && onSecondary && (
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={onSecondary}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryLabel, { color: colors.primary }]}>{secondaryLabel}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  primaryButton: {
    height: 52,
    width: '100%',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryLabel: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  secondaryButton: {
    height: 52,
    width: '100%',
    borderRadius: 50,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
  },
});
