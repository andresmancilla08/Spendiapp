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
import AppHeader from '../../components/AppHeader';
import AppDialog from '../../components/AppDialog';
import PinInput from '../../components/PinInput';
import { registerWithEmailAndPin } from '../../hooks/useAuth';
import { auth } from '../../config/firebase';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { Fonts } from '../../config/fonts';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { setJustRegistered, setUser } = useAuthStore();

  const isNameValid = name.trim().length >= 2;
  const isEmailValid = email.trim().length > 0 && email.includes('@');
  const isPinComplete = pin.length === 4;
  const canSubmit = isNameValid && isEmailValid && isPinComplete;

  const gradientColors: [string, string, string] = isDark
    ? ['#0D1A1C', '#062830', '#003840']
    : ['#FFFFFF', '#F5F9FA', '#E0F7FA'];

  const handleContinue = async () => {
    if (!isNameValid) { Alert.alert('Error', t('errors.fillAllFields')); return; }
    if (!isEmailValid) { Alert.alert('Error', t('errors.invalidEmail')); return; }
    setLoading(true);
    try {
      setJustRegistered(true);
      await registerWithEmailAndPin(name.trim(), email.trim().toLowerCase(), pin);
      // onAuthStateChanged fires before updateProfile, so displayName is null in the store.
      // Update it manually so the home screen shows the correct name immediately.
      const cu = auth.currentUser;
      if (cu) setUser({ uid: cu.uid, email: cu.email, displayName: name.trim(), photoURL: cu.photoURL });
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

  const nameInputStyle = {
    borderColor: nameFocused ? colors.borderFocus : (isDark ? 'rgba(0,172,193,0.22)' : colors.inputBorder),
    backgroundColor: isDark ? 'rgba(0,172,193,0.07)' : colors.inputBackground,
    color: colors.textPrimary,
  };
  const emailInputStyle = {
    borderColor: emailFocused ? colors.borderFocus : (isDark ? 'rgba(0,172,193,0.22)' : colors.inputBorder),
    backgroundColor: isDark ? 'rgba(0,172,193,0.07)' : colors.inputBackground,
    color: colors.textPrimary,
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: gradientColors[0] }]}>
      <AppDialog
        visible={showSuccess}
        type="success"
        title={t('register.successDialog.title', { name: name.trim() })}
        description={t('register.successDialog.description')}
        primaryLabel={t('register.successDialog.primaryLabel')}
        onPrimary={handleGoHome}
      />
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.gradient}
      >
        {/* Blob decorativo */}
        <View style={[styles.blobTopRight, { backgroundColor: colors.primaryLight, opacity: isDark ? 0.2 : 0.55 }]} />

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
              {/* Nombre */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('register.nameLabel')}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={nameFocused ? colors.primary : colors.textTertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.inputWithIcon, nameInputStyle]}
                    placeholder={t('register.namePlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="words"
                    returnKeyType="next"
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('register.emailLabel')}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={emailFocused ? colors.primary : colors.textTertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.inputWithIcon, emailInputStyle]}
                    placeholder={t('register.emailPlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>
              </View>

              {/* PIN */}
              <View style={styles.inputGroup}>
                <View style={styles.pinLabelRow}>
                  <Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('pinEntry.createTitle')}</Text>
                </View>
                <Text style={[styles.inputSub, { color: colors.textSecondary }]}>{t('pinEntry.createSubtitle')}</Text>
                <PinInput value={pin} onChange={setPin} />
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
                : <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>{t('register.continueButton')}</Text>
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
    gap: 12,
  },
  header: { marginTop: 24, marginBottom: 40 },
  title: { fontSize: 32, fontFamily: Fonts.bold, marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: Fonts.regular, lineHeight: 24 },
  form: { flex: 1, gap: 32 },
  inputGroup: { gap: 12 },
  inputLabel: { fontSize: 14, fontFamily: Fonts.semiBold },
  inputSub: { fontSize: 13, fontFamily: Fonts.regular, marginBottom: 16 },
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
  pinLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  primaryButton: {
    height: 56,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryButtonText: { fontSize: 17, fontFamily: Fonts.bold },
});
