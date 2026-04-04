import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { sendPinResetEmail, getEmailProvider, loginWithEmailAndPin } from '../../hooks/useAuth';
import AppDialog from '../../components/AppDialog';
import AppHeader from '../../components/AppHeader';
import PinInput from '../../components/PinInput';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';
import { Ionicons } from '@expo/vector-icons';

export default function LoginEmailScreen() {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [dialog, setDialog] = useState<'google' | 'not_found' | null>(null);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const isEmailValid = email.trim().length > 0 && email.includes('@');
  const isPinComplete = pin.length === 4;
  const canSubmit = isEmailValid && isPinComplete;

  const gradientColors: [string, string, string] = isDark
    ? ['#0D1A1C', '#062830', '#003840']
    : ['#FFFFFF', '#F5F9FA', '#E0F7FA'];

  const handleContinue = async () => {
    setPinError(false);
    setLoading(true);
    try {
      const provider = await getEmailProvider(email.trim().toLowerCase());
      if (provider === 'google') { setDialog('google'); return; }
      else if (provider === 'none') { setDialog('not_found'); return; }
      await loginWithEmailAndPin(email.trim().toLowerCase(), pin);
    } catch {
      setPinError(true);
      Alert.alert('Error', t('errors.wrongPin'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPin = () => { setForgotEmail(email); setForgotVisible(true); };

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: gradientColors[0] }]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.gradient}
      >
        {/* Blob decorativo */}
        <View style={[styles.blobTopRight, { backgroundColor: colors.primaryLight, opacity: isDark ? 0.2 : 0.55 }]} />

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
                    onChangeText={(v) => { setEmail(v); setPinError(false); }}
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
                <PinInput value={pin} onChange={(v) => { setPin(v); setPinError(false); }} error={pinError} />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.forgotPinButton} onPress={handleForgotPin} activeOpacity={0.7}>
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
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  gradient: { flex: 1 },
  blobTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 999,
  },
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
    paddingBottom: 16,
    gap: 4,
  },
  header: { marginTop: 24, marginBottom: 40 },
  title: { fontSize: 32, fontFamily: Fonts.bold, marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: Fonts.regular, lineHeight: 24 },
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
