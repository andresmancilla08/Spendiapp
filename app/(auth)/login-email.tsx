import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import ScreenBackground from '../../components/ScreenBackground';
import { getEmailProvider, loginWithEmailAndPin } from '../../hooks/useAuth';
import AppDialog from '../../components/AppDialog';
import AppHeader from '../../components/AppHeader';
import ScreenTransition, { ScreenTransitionRef } from '../../components/ScreenTransition';
import PinInput from '../../components/PinInput';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';
import { Ionicons } from '@expo/vector-icons';

export default function LoginEmailScreen() {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [dialog, setDialog] = useState<'google' | null>(null);
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPinComplete = pin.length === 4;
  const canSubmit = isEmailValid && isPinComplete;

  const handleContinue = async () => {
    setLoginError(null);
    setLoading(true);
    try {
      const provider = await getEmailProvider(email.trim().toLowerCase());
      if (provider === 'google') {
        setDialog('google');
        setLoading(false);
        return;
      }
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
      transitionRef.current.animateOut(() => router.back());
    } else {
      router.back();
    }
  };

  return (
    <ScreenTransition ref={transitionRef}>
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground>
        <AppDialog
          visible={dialog === 'google'}
          type="info"
          title={t('dialogs.googleAccount.title')}
          description={t('dialogs.googleAccount.description')}
          primaryLabel={t('dialogs.googleAccount.primary')}
          secondaryLabel={t('dialogs.googleAccount.secondary')}
          onPrimary={() => { setDialog(null); router.replace('/(auth)/login'); }}
          onSecondary={() => setDialog(null)}
        />
        <AppHeader />

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{t('loginEmail.title')}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('loginEmail.subtitle')}</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('loginEmail.emailLabel')}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={emailFocused ? colors.primary : colors.textTertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.inputWithIcon, {
                      borderColor: emailFocused ? colors.borderFocus : (isDark ? 'rgba(0,172,193,0.22)' : colors.inputBorder),
                      backgroundColor: isDark ? 'rgba(0,172,193,0.07)' : colors.inputBackground,
                      color: colors.textPrimary,
                    }]}
                    placeholder={t('loginEmail.emailPlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    value={email}
                    onChangeText={(v) => { setEmail(v); setLoginError(null); }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.pinLabelRow}>
                  <Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('pinEntry.enterTitle')}</Text>
                </View>
                <PinInput value={pin} onChange={(v) => { setPin(v); setLoginError(null); }} error={!!loginError} />
                {loginError && (
                  <Text style={[styles.errorLabel, { color: colors.error }]}>{loginError}</Text>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: canSubmit ? 1 : 0.4 }]}
              onPress={handleContinue}
              activeOpacity={0.85}
              disabled={!canSubmit || loading}
            >
              {loading
                ? <ActivityIndicator color={colors.onPrimary} />
                : <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>{t('loginEmail.continueButton')}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.forgotPinButton} onPress={handleForgotPin} activeOpacity={0.7}>
              <Text style={[styles.forgotPinText, { color: colors.primary }]}>{t('loginEmail.forgotPin')}</Text>
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
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 4,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  header: { marginTop: 24, marginBottom: 40, alignItems: 'center' },
  title: { fontSize: 32, fontFamily: Fonts.bold, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, fontFamily: Fonts.regular, lineHeight: 24, textAlign: 'center' },
  form: { flex: 1, gap: 32 },
  inputGroup: { gap: 12 },
  inputLabel: { fontSize: 14, fontFamily: Fonts.semiBold },
  inputWrapper: { position: 'relative', justifyContent: 'center' },
  inputIcon: { position: 'absolute', left: 14, zIndex: 1 },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
  inputWithIcon: { paddingLeft: 44 },
  pinLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  errorLabel: { fontSize: 13, fontFamily: Fonts.medium, marginTop: 8, textAlign: 'left' },
  primaryButton: {
    height: 56,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryButtonText: { fontSize: 17, fontFamily: Fonts.bold },
  forgotPinButton: { alignItems: 'center', paddingVertical: 8 },
  forgotPinText: { fontSize: 15, fontFamily: Fonts.semiBold },
});
