import { useEffect, useRef, type ReactNode } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Animated, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export type DialogType = 'error' | 'warning' | 'success' | 'info';
export type InputType = 'text' | 'email' | 'pin' | 'name';

const DIALOG_ICON: Record<DialogType, IoniconsName> = {
  error: 'close-circle',
  warning: 'alert-circle',
  success: 'checkmark-circle',
  info: 'information-circle',
};

const VALIDATORS: Record<InputType, (v: string) => boolean> = {
  text:  (v) => v.trim().length > 0,
  name:  (v) => v.trim().length >= 2,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  pin:   (v) => /^\d{4,8}$/.test(v.trim()),
};

const KEYBOARD_TYPE: Record<InputType, 'default' | 'email-address' | 'numeric'> = {
  text:  'default',
  name:  'default',
  email: 'email-address',
  pin:   'numeric',
};

interface AppDialogProps {
  visible: boolean;
  type?: DialogType;
  title: string;
  description?: string | ReactNode;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
  loading?: boolean;
  primaryDisabled?: boolean;
  primaryDanger?: boolean;
  // Input
  inputValue?: string;
  onInputChange?: (value: string) => void;
  inputPlaceholder?: string;
  inputSecure?: boolean;
  inputError?: string;
  inputType?: InputType;
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
  loading = false,
  primaryDisabled,
  primaryDanger = false,
  inputValue,
  onInputChange,
  inputPlaceholder,
  inputSecure = false,
  inputError,
  inputType = 'text',
}: AppDialogProps) {
  const { colors } = useTheme();

  // Card: slide up from bottom
  const cardTranslateY = useRef(new Animated.Value(300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Icon: bounce on entry
  const iconScale = useRef(new Animated.Value(0)).current;

  const hasInput = onInputChange !== undefined;
  const isInputValid = hasInput ? VALIDATORS[inputType](inputValue ?? '') : true;
  const isPrimaryDisabled = loading || !isInputValid || (primaryDisabled ?? false);

  const iconName  = DIALOG_ICON[type];
  const iconColor =
    type === 'error'   ? colors.error   :
    type === 'warning' ? colors.warning :
    type === 'success' ? colors.success :
    colors.primary;

  useEffect(() => {
    if (visible) {
      cardTranslateY.setValue(300);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(cardTranslateY, { toValue: 0, damping: 20, stiffness: 260, useNativeDriver: true }),
      ]).start();

      iconScale.setValue(0);
      Animated.spring(iconScale, {
        toValue: 1,
        damping: 8,
        stiffness: 180,
        useNativeDriver: true,
      }).start();
    } else {
      cardTranslateY.setValue(300);
      overlayOpacity.setValue(0);
      iconScale.setValue(0);
    }
  }, [visible]);

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.backdrop, { backgroundColor: colors.overlay, opacity: overlayOpacity }]} />
        <Animated.View style={[
          styles.card,
          { backgroundColor: colors.surface, transform: [{ translateY: cardTranslateY }] },
          !secondaryLabel && styles.cardNoSecondary,
        ]}>
          <Animated.View style={[styles.iconWrapper, { transform: [{ scale: iconScale }] }]}>
            <Ionicons name={iconName} size={56} color={iconColor} />
          </Animated.View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

          {!!description && (
            typeof description === 'string'
              ? <Text style={[styles.description, { color: colors.textPrimary }]}>{description}</Text>
              : <View style={styles.descriptionWrap}>{description}</View>
          )}

          {hasInput && (
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.textPrimary,
                    borderColor: inputError ? colors.error : colors.border,
                    backgroundColor: colors.backgroundSecondary,
                  },
                ]}
                value={inputValue}
                onChangeText={onInputChange}
                placeholder={inputPlaceholder}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={inputSecure}
                keyboardType={KEYBOARD_TYPE[inputType]}
                autoCapitalize={inputType === 'email' ? 'none' : 'words'}
                autoCorrect={false}
                autoFocus
              />
              {!!inputError && (
                <Text style={[styles.inputError, { color: colors.error }]}>{inputError}</Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: primaryDanger ? colors.error : colors.primary },
              isPrimaryDisabled && styles.primaryButtonDisabled,
              !secondaryLabel && styles.primaryButtonLast,
            ]}
            onPress={onPrimary}
            activeOpacity={0.85}
            disabled={isPrimaryDisabled}
          >
            {loading
              ? <ActivityIndicator color={colors.onPrimary} />
              : <Text style={[styles.primaryLabel, { color: colors.onPrimary }]}>{primaryLabel}</Text>
            }
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  descriptionWrap: {
    marginBottom: 24,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Fonts.regular,
    width: '100%',
  },
  inputError: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 6,
    marginLeft: 4,
  },
  primaryButton: {
    height: 52,
    width: '100%',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonLast: {
    marginBottom: 0,
  },
  cardNoSecondary: {
    paddingBottom: 32,
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
