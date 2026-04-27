import { useEffect, useRef } from 'react';
import {
  Modal,
  Animated,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Fonts } from '../config/fonts';

interface FeaturePausedSheetProps {
  visible: boolean;
  featureName: string;
  onClose: () => void;
}

export default function FeaturePausedSheet({
  visible,
  featureName,
  onClose,
}: FeaturePausedSheetProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const translateY = useRef(new Animated.Value(320)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 220,
          mass: 0.85,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 320,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <View style={styles.sheetContainer}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: `${colors.textSecondary}30` }]} />

          <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}1A` }]}>
            <Ionicons name="pause-circle-outline" size={44} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('common.featurePaused.title')}
          </Text>

          <Text style={[styles.featureName, { color: colors.primary }]}>
            {featureName}
          </Text>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t('common.featurePaused.description')}
          </Text>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            style={[styles.button, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>
              {t('common.featurePaused.close')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 28,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 6,
  },
  featureName: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 300,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
  },
});
