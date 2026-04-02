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
import AppHeader from '../../components/AppHeader';
import PinInput from '../../components/PinInput';
import { registerWithEmailAndPin } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { colors } = useTheme();

  const isNameValid = name.trim().length >= 2;
  const isEmailValid = email.trim().length > 0 && email.includes('@');
  const isPinComplete = pin.length === 4;
  const canSubmit = isNameValid && isEmailValid && isPinComplete;

  const handleContinue = async () => {
    if (!isNameValid) {
      Alert.alert('Error', t('errors.fillAllFields'));
      return;
    }
    if (!isEmailValid) {
      Alert.alert('Error', t('errors.invalidEmail'));
      return;
    }
    setLoading(true);
    try {
      await registerWithEmailAndPin(name.trim(), email.trim().toLowerCase(), pin);
    } catch (e: any) {
      if (e?.code === 'auth/email-already-in-use') {
        Alert.alert(t('dialogs.emailTaken.title'), t('dialogs.emailTaken.description'));
      } else {
        Alert.alert('Error', t('errors.genericError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
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
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('register.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('register.subtitle')}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('register.nameLabel')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: colors.textPrimary }]}
                placeholder={t('register.namePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
                returnKeyType="next"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('register.emailLabel')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: colors.textPrimary }]}
                placeholder={t('register.emailPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('pinEntry.createTitle')}</Text>
              <Text style={[styles.inputSub, { color: colors.textSecondary }]}>{t('pinEntry.createSubtitle')}</Text>
              <PinInput value={pin} onChange={setPin} />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: canSubmit ? 1 : 0.4 }]}
            onPress={handleContinue}
            activeOpacity={0.85}
            disabled={!canSubmit || loading}
          >
            {loading
              ? <ActivityIndicator color={colors.onPrimary} />
              : <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>{t('register.continueButton')}</Text>
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
    gap: 12,
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
  inputSub: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginTop: -6,
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
});
