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
import { sendPinResetEmail, getEmailProvider } from '../../hooks/useAuth';
import AppDialog from '../../components/AppDialog';
import AppHeader from '../../components/AppHeader';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';

export default function LoginEmailScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<'google' | 'not_found' | null>(null);
  const { t } = useTranslation();
  const { colors } = useTheme();

  const handleContinue = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', t('errors.invalidEmail'));
      return;
    }
    setLoading(true);
    try {
      const provider = await getEmailProvider(email.trim().toLowerCase());
      if (provider === 'google') {
        setDialog('google');
      } else if (provider === 'none') {
        setDialog('not_found');
      } else {
        router.push({ pathname: '/(auth)/pin-entry', params: { mode: 'login', email } });
      }
    } catch {
      Alert.alert('Error', t('errors.verifyEmailError'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPin = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', t('errors.invalidEmail'));
      return;
    }
    try {
      await sendPinResetEmail(email);
      Alert.alert('Listo', t('errors.resetEmailSent'));
    } catch {
      Alert.alert('Error', t('errors.resetEmailError'));
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
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleContinue}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={colors.onPrimary} />
                : <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>{t('loginEmail.continueButton')}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPinButton}
              onPress={handleForgotPin}
              activeOpacity={0.7}
            >
              <Text style={[styles.forgotPinText, { color: colors.primary }]}>{t('loginEmail.forgotPin')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    paddingBottom: 40,
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
    gap: 20,
  },
  inputGroup: {
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    marginBottom: 8,
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
