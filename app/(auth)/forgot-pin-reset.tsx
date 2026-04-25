import { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import ScreenTransition, { ScreenTransitionRef } from '../../components/ScreenTransition';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import PinInput from '../../components/PinInput';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';
import { Ionicons } from '@expo/vector-icons';
import { resetPinWithOtp } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';

export default function ForgotPinResetScreen() {
  const { email, otp } = useLocalSearchParams<{ email: string; otp: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const transitionRef = useRef<ScreenTransitionRef>(null);

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const matchStatus = useMemo<'idle' | 'match' | 'mismatch'>(() => {
    if (confirmPin.length < 4) return 'idle';
    return pin === confirmPin ? 'match' : 'mismatch';
  }, [pin, confirmPin]);

  const matchAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (matchStatus === 'idle') {
      Animated.timing(matchAnim, {
        toValue: 0, duration: 150, useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }).start();
    } else {
      Animated.timing(matchAnim, {
        toValue: 1, duration: 250, useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    }
  }, [matchStatus, matchAnim]);

  const canSave = pin.length === 4 && matchStatus === 'match' && !loading;

  const handleSave = async () => {
    if (!canSave) return;
    setLoading(true);
    try {
      await resetPinWithOtp(email, otp, pin);
      showToast(t('profile.changePin.success.title'), 'success');
      transitionRef.current?.animateOut(() => {
        router.replace('/(auth)/login-email');
      });
    } catch {
      showToast(t('forgotPinReset.errorGeneric'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    transitionRef.current?.animateOut(() => router.back());
  };

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader onBack={handleBack} />
          <KeyboardAvoidingView
            style={styles.kav}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Icon */}
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="lock-closed-outline" size={28} color={colors.primary} />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('forgotPinReset.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('forgotPinReset.subtitle')}
            </Text>

            {/* New PIN */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('forgotPinReset.newPinLabel')}
              </Text>
              <PinInput value={pin} onChange={(v) => { setPin(v); setConfirmPin(''); }} />
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Confirm PIN */}
            <View style={[styles.section, { opacity: pin.length < 4 ? 0.45 : 1 }]}>
              <View style={styles.confirmHeader}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  {t('forgotPinReset.confirmPinLabel')}
                </Text>

                {/* Match indicator */}
                <Animated.View style={[styles.matchBadge, { opacity: matchAnim }]}>
                  {matchStatus !== 'idle' && (
                    <View style={styles.matchInner}>
                      <Ionicons
                        name={matchStatus === 'match' ? 'checkmark-circle' : 'close-circle'}
                        size={15}
                        color={matchStatus === 'match' ? colors.success : colors.error}
                      />
                      <Text style={[styles.matchText, {
                        color: matchStatus === 'match' ? colors.success : colors.error,
                      }]}>
                        {matchStatus === 'match'
                          ? t('forgotPinReset.matchOk')
                          : t('forgotPinReset.matchFail')}
                      </Text>
                    </View>
                  )}
                </Animated.View>
              </View>

              <PinInput
                value={confirmPin}
                onChange={(v) => setConfirmPin(v)}
                error={matchStatus === 'mismatch'}
              />
            </View>
          </ScrollView>
          </KeyboardAvoidingView>

          {/* Fixed bottom button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, opacity: canSave ? 1 : 0.4 }]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={!canSave}
            >
              {loading
                ? <ActivityIndicator color={colors.onPrimary} />
                : <Text style={[styles.btnText, { color: colors.onPrimary }]}>
                    {t('forgotPinReset.saveButton')}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  section: {
    width: '100%',
    marginTop: 32,
    gap: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  divider: {
    width: '100%',
    height: 1,
    marginTop: 28,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchBadge: {
    minWidth: 90,
    alignItems: 'flex-end',
  },
  matchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  btn: {
    height: 56,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
});
