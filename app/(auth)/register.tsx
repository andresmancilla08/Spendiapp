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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { isPinComplete } from '../../constants/pin';
import { goBack } from '../../utils/nav';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import ScreenTransition, { ScreenTransitionRef } from '../../components/ScreenTransition';
import AppDialog from '../../components/AppDialog';
import PinInput from '../../components/PinInput';
import AuthField from '../../components/auth/AuthField';
import { registerWithEmailAndPin } from '../../hooks/useAuth';
import { createUserProfile } from '../../hooks/useUserProfile';
import { auth } from '../../config/firebase';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { accentInk } from '../../utils/contrast';
import { authTokens } from '../../utils/authTheme';
import { useAuthStore } from '../../store/authStore';
import { Fonts } from '../../config/fonts';
import AppIcon from '../../components/AppIcon';
import { useFlags } from '../../context/FeatureFlagsContext';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const tk = authTokens(colors, isDark);
  const { setJustRegistered, setUser } = useAuthStore();
  const { flags } = useFlags();

  const isNameValid = name.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const showEmailError = emailTouched && email.trim().length > 0 && !isEmailValid;
  const pinComplete = isPinComplete(pin);
  const canSubmit = isNameValid && isEmailValid && pinComplete && termsAccepted;

  const handleContinue = async () => {
    if (!isNameValid) { Alert.alert('Error', t('errors.fillAllFields')); return; }
    if (!isEmailValid) { Alert.alert('Error', t('errors.invalidEmail')); return; }
    setLoading(true);
    try {
      setJustRegistered(true);
      await registerWithEmailAndPin(name.trim(), email.trim().toLowerCase(), pin);
      // onAuthStateChanged fires before updateProfile completes, so displayName may be null/email
      // when _layout.tsx creates the Firestore profile. Force-correct it with the real name.
      const cu = auth.currentUser;
      if (cu) {
        setUser({ uid: cu.uid, email: cu.email, displayName: name.trim(), photoURL: cu.photoURL });
        createUserProfile(cu.uid, name.trim(), null, email.trim().toLowerCase(), true).catch(() => {});
      }
      setShowSuccess(true);
    } catch (e: any) {
      setJustRegistered(false);
      if (e?.code === 'auth/email-already-in-use') {
        Alert.alert(t('dialogs.emailTaken.title'), t('dialogs.emailTaken.description'));
      } else {
        Alert.alert('Error', t('errors.genericError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    // NO llamar setJustRegistered(false) aquí.
    // select-cards.tsx lo llamará al terminar, evitando
    // que _layout.tsx redirija mientras dure el onboarding.
    router.replace('/(onboarding)/select-cards');
  };

  const transitionRef = useRef<ScreenTransitionRef>(null);
  const handleBack = () => {
    if (transitionRef.current) {
      transitionRef.current.animateOut(() => goBack('/(auth)/login'));
    } else {
      goBack('/(auth)/login');
    }
  };

  if (!flags.registrationOpen) {
    return (
      <ScreenTransition>
        <SafeAreaView style={styles.safeArea}>
          <ScreenBackground>
            <AppHeader />
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
              <AppIcon name="lock-closed-outline" size={64} color={colors.textTertiary} />
              <Text style={{ fontFamily: Fonts.bold, fontSize: 22, color: colors.textPrimary, textAlign: 'center', marginTop: 24, marginBottom: 12 }}>
                {t('register.closedTitle')}
              </Text>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 15, color: colors.textSecondary, textAlign: 'center' }}>
                {t('register.closedSubtitle')}
              </Text>
            </View>
          </ScreenBackground>
        </SafeAreaView>
      </ScreenTransition>
    );
  }

  return (
    <ScreenTransition ref={transitionRef}>
    <SafeAreaView style={styles.safeArea}>
      <AppDialog
        visible={showSuccess}
        type="success"
        title={t('register.successDialog.title', { name: name.trim() })}
        description={t('register.successDialog.description')}
        primaryLabel={t('register.successDialog.primaryLabel')}
        onPrimary={handleGoHome}
      />
      <ScreenBackground>
        <AppHeader />

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
        style={scrollFadeMask(0, 0)}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('register.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('register.subtitle')}</Text>

            <View style={styles.form}>
              {/* Dos grupos en vez de un muro de tres campos: quién eres, cómo entras. */}
              <Text style={[styles.grp, { color: colors.textTertiary }]}>{t('register.groupWhoTitle')}</Text>

              <AuthField
                label={t('register.nameLabel')}
                icon="person-outline"
                focused={nameFocused}
                placeholder={t('register.namePlaceholder')}
                autoCapitalize="words"
                returnKeyType="next"
                value={name}
                onChangeText={setName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />

              <AuthField
                label={t('register.emailLabel')}
                icon="mail-outline"
                focused={emailFocused}
                error={showEmailError}
                errorText={showEmailError ? t('errors.invalidEmail') : undefined}
                placeholder={t('register.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => { setEmailFocused(false); setEmailTouched(true); }}
              />

              <Text style={[styles.grp, { color: colors.textTertiary }]}>{t('register.groupHowTitle')}</Text>

              <View>
                <View style={styles.pinLabelRow}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>{t('register.pinLabel')}</Text>
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
                <PinInput value={pin} onChange={setPin} grouped stretch hideEye visible={pinVisible} />
                <Text style={[styles.pinHint, { color: colors.textSecondary }]}>
                  {t('pinEntry.createSubtitle')}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setTermsAccepted(v => !v)}
              style={styles.consentRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsAccepted }}
            >
              <View style={[
                styles.checkbox,
                {
                  backgroundColor: termsAccepted ? tk.ink : tk.fieldBg,
                  borderColor: termsAccepted ? tk.ink : tk.fieldLine,
                },
              ]}>
                {termsAccepted && <AppIcon name="checkmark" size={13} color={tk.onInk} />}
              </View>
              <Text style={[styles.consentText, { color: colors.textSecondary }]}>
                {t('register.acceptPrefix')}{' '}
                <Text
                  style={[styles.consentLink, { color: colors.textPrimary }]}
                  onPress={(e) => { e.stopPropagation?.(); router.push('/terms' as any); }}
                >
                  {t('register.termsLabel')}
                </Text>
                {' '}{t('register.acceptAnd')}{' '}
                <Text
                  style={[styles.consentLink, { color: colors.textPrimary }]}
                  onPress={(e) => { e.stopPropagation?.(); router.push('/privacy' as any); }}
                >
                  {t('register.privacyLabel')}
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: tk.ink, opacity: canSubmit ? 1 : 0.4 }]}
              onPress={handleContinue}
              activeOpacity={0.85}
              disabled={!canSubmit || loading}
            >
              {loading
                ? <ActivityIndicator color={tk.onInk} />
                : <Text style={[styles.primaryButtonText, { color: tk.onInk }]}>{t('register.createButton')}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.haveAccountBtn} onPress={handleBack} activeOpacity={0.7}>
              <Text style={[styles.haveAccountText, { color: colors.textPrimary }]}>
                {t('register.haveAccount')}
              </Text>
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
    gap: 16,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  title: { fontSize: 26, lineHeight: 32, fontFamily: Fonts.bold, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.medium, marginTop: 8 },
  form: { gap: 18, marginTop: 18 },
  grp: {
    fontSize: 11.5,
    fontFamily: Fonts.bold,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginTop: 8,
  },
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
  pinHint: { fontSize: 13.5, lineHeight: 19, fontFamily: Fonts.regular, marginTop: 10, marginHorizontal: 2 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 22, height: 22,
    borderRadius: 6, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  consentText: { flex: 1, fontSize: 13, fontFamily: Fonts.regular, lineHeight: 19 },
  consentLink: { fontFamily: Fonts.bold, textDecorationLine: 'underline' },
  haveAccountBtn: { alignItems: 'center', paddingVertical: 10 },
  haveAccountText: { fontSize: 14, fontFamily: Fonts.semiBold, textDecorationLine: 'underline' },
  primaryButton: {
    height: 56,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { fontSize: 16, fontFamily: Fonts.bold, letterSpacing: 0.2 },
});
