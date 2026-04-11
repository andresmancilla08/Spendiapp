import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { router } from 'expo-router';
import AppHeader from '../components/AppHeader';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import AppDialog from '../components/AppDialog';
import { Fonts } from '../config/fonts';

const WHATSAPP_NUMBER = '573207492444';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidName(v: string)    { return v.trim().length >= 2; }
function isValidEmail(v: string)   { return EMAIL_REGEX.test(v.trim()); }
function isValidMessage(v: string) { return v.trim().length >= 10; }

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address';
  multiline?: boolean;
  isValid: boolean;
  touched: boolean;
  errorMsg: string;
}

function FormField({
  label, value, onChangeText, placeholder,
  keyboardType = 'default', multiline = false,
  isValid, touched, errorMsg,
}: FieldProps) {
  const { colors } = useTheme();
  const showError = touched && !isValid;

  return (
    <View style={styles.fieldWrapper}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.fieldInput,
          multiline && styles.fieldTextarea,
          {
            color: colors.textPrimary,
            backgroundColor: colors.backgroundSecondary,
            borderColor: showError ? colors.error : isValid && touched ? colors.success : colors.border,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' || multiline ? 'none' : 'words'}
        autoCorrect={false}
        multiline={multiline}
        numberOfLines={multiline ? 5 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {showError && (
        <Text style={[styles.fieldError, { color: colors.error }]}>{errorMsg}</Text>
      )}
    </View>
  );
}

export default function SupportScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [name, setName]       = useState(user?.displayName ?? '');
  const [email, setEmail]     = useState(user?.email ?? '');
  const [message, setMessage] = useState('');

  const [touchedName, setTouchedName]       = useState(false);
  const [touchedEmail, setTouchedEmail]     = useState(false);
  const [touchedMessage, setTouchedMessage] = useState(false);

  const [successVisible, setSuccessVisible] = useState(false);

  const nameOk    = isValidName(name);
  const emailOk   = isValidEmail(email);
  const messageOk = isValidMessage(message);
  const canSubmit = nameOk && emailOk && messageOk;

  const handleSubmit = () => {
    setTouchedName(true);
    setTouchedEmail(true);
    setTouchedMessage(true);
    if (!canSubmit) return;

    const text = [
      `*${t('support.whatsapp.title')}*`,
      t('support.whatsapp.divider'),
      '',
      `${t('support.whatsapp.name')} ${name.trim()}`,
      `${t('support.whatsapp.email')} ${email.trim()}`,
      '',
      `*${t('support.whatsapp.message')}*`,
      message.trim(),
      '',
      t('support.whatsapp.footer'),
    ].join('\n');

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    Linking.openURL(url);
    setSuccessVisible(true);
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
      <AppHeader showBack onBack={handleBack} />
      <PageTitle title={t('support.title')} description={t('support.subtitle')} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Form */}
          <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
            <FormField
              label={t('support.form.nameLabel')}
              value={name}
              onChangeText={(v) => { setName(v); setTouchedName(true); }}
              placeholder={t('support.form.namePlaceholder')}
              isValid={nameOk}
              touched={touchedName}
              errorMsg={t('support.form.nameError')}
            />
            <FormField
              label={t('support.form.emailLabel')}
              value={email}
              onChangeText={(v) => { setEmail(v); setTouchedEmail(true); }}
              placeholder={t('support.form.emailPlaceholder')}
              keyboardType="email-address"
              isValid={emailOk}
              touched={touchedEmail}
              errorMsg={t('support.form.emailError')}
            />
            <FormField
              label={t('support.form.messageLabel')}
              value={message}
              onChangeText={(v) => { setMessage(v); setTouchedMessage(true); }}
              placeholder={t('support.form.messagePlaceholder')}
              multiline
              isValid={messageOk}
              touched={touchedMessage}
              errorMsg={t('support.form.messageError')}
            />
          </View>
        </ScrollView>

        {/* Actions — fuera del scroll */}
        <View style={[styles.footer, { backgroundColor: colors.backgroundSecondary }]}>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: colors.primary },
              !canSubmit && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={!canSubmit}
          >
            <Ionicons name="logo-whatsapp" size={20} color={colors.onPrimary} />
            <Text style={[styles.submitLabel, { color: colors.onPrimary }]}>
              {t('support.form.submit')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <AppDialog
        visible={successVisible}
        type="success"
        title={t('support.success.title')}
        description={t('support.success.description')}
        primaryLabel={t('common.great')}
        onPrimary={() => {
          setSuccessVisible(false);
          setMessage('');
          setTouchedName(false);
          setTouchedEmail(false);
          setTouchedMessage(false);
        }}
      />
      </ScreenBackground>
    </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },

  heroCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  heroIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
  },

  formCard: {
    borderRadius: 24,
    padding: 20,
    gap: 16,
    marginBottom: 24,
  },

  fieldWrapper: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold, marginLeft: 4 },
  fieldInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  fieldTextarea: {
    height: 120,
    paddingTop: 14,
  },
  fieldError: { fontSize: 12, fontFamily: Fonts.regular, marginLeft: 4 },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    borderRadius: 50,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitLabel: { fontSize: 16, fontFamily: Fonts.bold },
});
