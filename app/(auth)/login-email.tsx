import { useState, useRef } from 'react';
import { scrollFadeMask } from '../../components/ScrollFadeEdges';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { isPinComplete } from '../../constants/pin';
import { goBack } from '../../utils/nav';
import ScreenBackground from '../../components/ScreenBackground';
import { loginWithEmailAndPin } from '../../hooks/useAuth';
import AppHeader from '../../components/AppHeader';
import ScreenTransition, { ScreenTransitionRef } from '../../components/ScreenTransition';
import PinInput from '../../components/PinInput';
import AuthField from '../../components/auth/AuthField';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { authTokens } from '../../utils/authTheme';
import { Fonts } from '../../config/fonts';
import AppIcon from '../../components/AppIcon';

export default function LoginEmailScreen() {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const tk = authTokens(colors, isDark);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const pinComplete = isPinComplete(pin);
  const canSubmit = isEmailValid && pinComplete;

  const handleContinue = async () => {
    setLoginError(null);
    setLoading(true);
    try {
      await loginWithEmailAndPin(email.trim().toLowerCase(), pin);
      // spinner stays until onAuthStateChanged navigates away
    } catch {
      setLoginError(t('errors.invalidCredentials'));
      setLoading(false);
    }
  };

  const handleForgotPin = () => {
    router.push({
      pathname: '/(auth)/forgot-pin-otp',
      params: { email: email.trim() },
    });
  };

  const transitionRef = useRef<ScreenTransitionRef>(null);
  const handleBack = () => {
    if (transitionRef.current) {
      transitionRef.current.animateOut(() => goBack('/(auth)/login'));
    } else {
      goBack('/(auth)/login');
    }
  };

  return (
    <ScreenTransition ref={transitionRef}>
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground>
        <AppHeader onBack={handleBack} />

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* `justifyContent: center` en vez de `flex:1` en el formulario: así el
              sobrante se parte en dos márgenes iguales en lugar de acumularse entero
              entre el PIN y el botón (era el 35% de la pantalla). */}
          <ScrollView
            style={scrollFadeMask(0, 0)}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('loginEmail.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('loginEmail.subtitle')}</Text>

            <View style={styles.form}>
              <AuthField
                label={t('loginEmail.emailLabel')}
                icon="mail-outline"
                focused={emailFocused}
                error={!!loginError}
                placeholder={t('loginEmail.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                value={email}
                onChangeText={(v) => { setEmail(v); setLoginError(null); }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />

              <View>
                <View style={styles.pinLabelRow}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>{t('loginEmail.pinLabel')}</Text>
                  <TouchableOpacity
                    onPress={() => setPinVisible((v) => !v)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={t(pinVisible ? 'pinEntry.hidePin' : 'pinEntry.showPin')}
                  >
                    <AppIcon
                      name={pinVisible ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={colors.textPrimary}
                    />
                  </TouchableOpacity>
                </View>
                <PinInput
                  value={pin}
                  onChange={(v) => { setPin(v); setLoginError(null); }}
                  error={!!loginError}
                  grouped
                  stretch
                  hideEye
                  visible={pinVisible}
                />
                {loginError && (
                  <Text style={[styles.errorLabel, { color: colors.error }]}>{loginError}</Text>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: tk.ink, opacity: canSubmit ? 1 : 0.4 }]}
              onPress={handleContinue}
              activeOpacity={0.85}
              disabled={!canSubmit || loading}
            >
              {loading
                ? <ActivityIndicator color={tk.onInk} />
                : <Text style={[styles.primaryButtonText, { color: tk.onInk }]}>{t('loginEmail.continueButton')}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.forgotPinButton} onPress={handleForgotPin} activeOpacity={0.7}>
              <Text style={[styles.forgotPinText, { color: colors.textPrimary }]}>{t('loginEmail.forgotPin')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ScreenBackground>
    </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardAvoidingView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  title: { fontSize: 26, lineHeight: 32, fontFamily: Fonts.bold, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.medium, marginTop: 8 },
  form: { marginTop: 26, gap: 26 },
  label: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    lineHeight: 15,
  },
  pinLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  errorLabel: { fontSize: 13, fontFamily: Fonts.medium, marginTop: 10 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  primaryButton: {
    height: 56,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { fontSize: 16, fontFamily: Fonts.bold, letterSpacing: 0.2 },
  forgotPinButton: { alignItems: 'center', paddingVertical: 12, marginTop: 2 },
  forgotPinText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    textDecorationLine: 'underline',
  },
});
