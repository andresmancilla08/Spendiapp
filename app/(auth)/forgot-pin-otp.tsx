import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { sendOtpEmail, verifyOtp } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';

const RESEND_COOLDOWN = 60;

export default function ForgotPinOtpScreen() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const transitionRef = useRef<ScreenTransitionRef>(null);

  const [email, setEmail] = useState(emailParam || '');
  const [emailFocused, setEmailFocused] = useState(false);
  const [phase, setPhase] = useState<'email' | 'otp'>('email');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const resendOpacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isEmailValid = email.trim().length > 0 && email.includes('@');
  const isOtpComplete = otp.length === 4;

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startResendTimer = useCallback(() => {
    setResendTimer(RESEND_COOLDOWN);
    setCanResend(false);
    resendOpacity.setValue(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCanResend(true);
          Animated.timing(resendOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }).start();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [resendOpacity]);

  const formatTimer = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -8, duration: 57, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: 8,  duration: 57, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 57, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 57, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 57, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: 4,  duration: 57, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 57, useNativeDriver: true, easing: Easing.linear }),
    ]).start(() => setOtp(''));
  }, [shakeAnim]);

  const handleSendOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      await sendOtpEmail(email.trim().toLowerCase());
      setPhase('otp');
      startResendTimer();
    } catch {
      setError(t('forgotPinOtp.errorEmailCheck'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    try {
      await sendOtpEmail(email.trim().toLowerCase());
      setOtp('');
      startResendTimer();
      showToast(t('forgotPinOtp.resentSuccess'), 'success');
    } catch {
      setError(t('errors.genericError'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!isOtpComplete || loading) return;
    setLoading(true);
    setError(null);
    try {
      await verifyOtp(email.trim().toLowerCase(), otp);
      transitionRef.current?.animateOut(() => {
        router.replace({
          pathname: '/(auth)/forgot-pin-reset',
          params: { email: email.trim().toLowerCase(), otp },
        });
      });
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('deadline-exceeded') || msg.includes('expired')) {
        setError(t('forgotPinOtp.errorExpired'));
      } else if (msg.includes('resource-exhausted') || msg.includes('too many')) {
        setError(t('forgotPinOtp.errorTooMany'));
      } else {
        setError(t('forgotPinOtp.errorWrong'));
        triggerShake();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (phase === 'otp') {
      setPhase('email');
      setOtp('');
      setError(null);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
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
                <Ionicons
                  name={phase === 'otp' ? 'mail-open-outline' : 'lock-closed-outline'}
                  size={28}
                  color={colors.primary}
                />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {phase === 'otp' ? t('forgotPinOtp.title') : t('loginEmail.forgotDialog.title')}
              </Text>

              {phase === 'email' ? (
                <>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {t('loginEmail.forgotDialog.description')}
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                      {t('forgotPinOtp.emailLabel')}
                    </Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="mail-outline"
                        size={18}
                        color={emailFocused ? colors.primary : colors.textTertiary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, {
                          borderColor: emailFocused ? colors.borderFocus : colors.inputBorder,
                          backgroundColor: colors.inputBackground,
                          color: colors.textPrimary,
                        }]}
                        placeholder="tu@email.com"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={email}
                        onChangeText={(v) => { setEmail(v); setError(null); }}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        returnKeyType="send"
                        onSubmitEditing={isEmailValid ? handleSendOtp : undefined}
                      />
                    </View>
                    {error && (
                      <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                    )}
                  </View>
                </>
              ) : (
                <>
                  {/* Email display */}
                  <View style={styles.subtitleWrap}>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                      {t('forgotPinOtp.subtitle')}{' '}
                      <Text
                        style={{ color: colors.primary, fontFamily: Fonts.semiBold }}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        {email}
                      </Text>
                    </Text>
                  </View>

                  {/* OTP input with shake */}
                  <Animated.View
                    style={[styles.otpContainer, { transform: [{ translateX: shakeAnim }] }]}
                  >
                    <PinInput
                      value={otp}
                      onChange={(v) => { setOtp(v); setError(null); }}
                      error={!!error}
                      defaultVisible
                    />
                  </Animated.View>

                  {/* Timer / Resend */}
                  <View style={styles.timerRow}>
                    {!canResend ? (
                      <Text style={[styles.timerText, { color: colors.textTertiary }]}>
                        {t('forgotPinOtp.timerExpires', { time: formatTimer(resendTimer) })}
                      </Text>
                    ) : (
                      <Animated.View style={[styles.resendRow, { opacity: resendOpacity }]}>
                        <Text style={[styles.timerText, { color: colors.textSecondary }]}>
                          {t('forgotPinOtp.resendPrompt')}{' '}
                        </Text>
                        <TouchableOpacity onPress={handleResend} activeOpacity={0.7} disabled={loading}>
                          <Text style={[styles.timerText, {
                            color: colors.primary,
                            fontFamily: Fonts.semiBold,
                            textDecorationLine: 'underline',
                          }]}>
                            {t('forgotPinOtp.resendLink')}
                          </Text>
                        </TouchableOpacity>
                      </Animated.View>
                    )}
                  </View>

                  {error && (
                    <Text style={[styles.errorCenter, { color: colors.error }]}>{error}</Text>
                  )}
                </>
              )}
            </ScrollView>

            {/* Fixed bottom button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.btn, {
                  backgroundColor: colors.primary,
                  opacity: ((phase === 'email' ? isEmailValid : isOtpComplete) && !loading) ? 1 : 0.4,
                }]}
                onPress={phase === 'email' ? handleSendOtp : handleVerify}
                activeOpacity={0.85}
                disabled={(phase === 'email' ? !isEmailValid : !isOtpComplete) || loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.onPrimary} />
                  : <Text style={[styles.btnText, { color: colors.onPrimary }]}>
                      {phase === 'email'
                        ? t('forgotPinOtp.sendButton')
                        : t('forgotPinOtp.verifyButton')}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
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
  },
  subtitleWrap: {
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  inputGroup: {
    width: '100%',
    gap: 10,
    marginTop: 32,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingLeft: 44,
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
  otpContainer: {
    marginTop: 36,
    alignSelf: 'stretch',
  },
  timerRow: {
    marginTop: 20,
    minHeight: 24,
    alignItems: 'center',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    marginTop: 4,
  },
  errorCenter: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginTop: 12,
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
