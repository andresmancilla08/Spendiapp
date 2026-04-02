import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { sendPinResetEmail, getEmailProvider, loginWithEmailAndPin } from '../../hooks/useAuth';
import AppDialog from '../../components/AppDialog';
import AppHeader from '../../components/AppHeader';
import PinInput from '../../components/PinInput';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';

export default function LoginEmailScreen() {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [dialog, setDialog] = useState<'google' | 'not_found' | null>(null);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { t } = useTranslation();
  const { colors } = useTheme();

  const isEmailValid = email.trim().length > 0 && email.includes('@');
  const isPinComplete = pin.length === 4;
  const canSubmit = isEmailValid && isPinComplete;

  const handleContinue = async () => {
    setPinError(false);
    setLoading(true);
    try {
      const provider = await getEmailProvider(email.trim().toLowerCase());
      if (provider === 'google') {
        setDialog('google');
        return;
      } else if (provider === 'none') {
        setDialog('not_found');
        return;
      }
      await loginWithEmailAndPin(email.trim().toLowerCase(), pin);
    } catch {
      setPinError(true);
      Alert.alert('Error', t('errors.wrongPin'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPin = () => {
    setForgotEmail(email);
    setForgotVisible(true);
  };

  const handleSendReset = async () => {
    setForgotLoading(true);
    try {
      await sendPinResetEmail(forgotEmail.trim());
      setForgotVisible(false);
      setForgotEmail('');
      Alert.alert('', t('errors.resetEmailSent'));
    } catch {
      Alert.alert('Error', t('errors.resetEmailError'));
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
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
      <AppDialog
        visible={dialog === 'not_found'}
        type="warning"
        title={t('dialogs.emailNotFound.title')}
        description={t('dialogs.emailNotFound.description')}
        primaryLabel={t('dialogs.emailNotFound.primary')}
        secondaryLabel={t('dialogs.emailNotFound.secondary')}
        onPrimary={() => { setDialog(null); router.replace({ pathname: '/(auth)/register', params: { email } }); }}
        onSecondary={() => setDialog(null)}
      />
      <AppDialog
        visible={forgotVisible}
        type="info"
        title={t('loginEmail.forgotDialog.title')}
        description={t('loginEmail.forgotDialog.description')}
        primaryLabel={t('loginEmail.forgotDialog.send')}
        secondaryLabel={t('common.cancel')}
        onPrimary={handleSendReset}
        onSecondary={() => { setForgotVisible(false); setForgotEmail(''); }}
        loading={forgotLoading}
        inputValue={forgotEmail}
        onInputChange={setForgotEmail}
        inputPlaceholder={t('loginEmail.emailPlaceholder')}
        inputType="email"
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
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: colors.textPrimary }]}
                placeholder={t('loginEmail.emailPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                value={email}
                onChangeText={(v) => { setEmail(v); setPinError(false); }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('pinEntry.enterTitle')}</Text>
              <PinInput value={pin} onChange={(v) => { setPin(v); setPinError(false); }} error={pinError} />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={styles.forgotPinButton}
            onPress={handleForgotPin}
            activeOpacity={0.7}
          >
            <Text style={[styles.forgotPinText, { color: colors.primary }]}>{t('loginEmail.forgotPin')}</Text>
          </TouchableOpacity>

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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 24,
    gap: 4,
  },
  header: {
    marginTop: 24,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    lineHeight: 24,
  },
  form: {
    flex: 1,
    gap: 32,
  },
  inputGroup: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  primaryButton: {
    height: 56,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
  forgotPinButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  forgotPinText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
  },
});
