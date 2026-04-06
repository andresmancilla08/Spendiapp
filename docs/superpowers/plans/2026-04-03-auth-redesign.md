# Auth Screens Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar las 3 pantallas de auth (login, login-email, register) con el estilo "Gradient Profundo" que funciona en dark y light mode, usando `expo-linear-gradient` para los fondos.

**Architecture:** Cada pantalla envuelve su contenido en un `LinearGradient` en lugar de `SafeAreaView` directamente. Los colores del gradiente se determinan por `isDark` del ThemeContext. Se agregan blobs decorativos como `View` absolutos detrás del contenido. Los inputs reciben focus state via `useState` local.

**Tech Stack:** React Native, expo-linear-gradient (~55.0.9 ya instalado), Ionicons (ya en uso), useTheme() para colores, Fonts config existente.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `app/(auth)/login.tsx` | Modificar | Pantalla principal: gradient bg, blobs, logo container, botones con íconos |
| `app/(auth)/login-email.tsx` | Modificar | Login email+PIN: gradient bg, blob, focus states, íconos en inputs |
| `app/(auth)/register.tsx` | Modificar | Registro: gradient bg, blob, focus states en 2 inputs, íconos |

No se crea ningún archivo nuevo. No se tocan: `config/colors.ts`, `config/fonts.ts`, hooks, componentes reutilizables.

---

## Task 1: Rediseño de `login.tsx`

**Files:**
- Modify: `app/(auth)/login.tsx`

**Contexto:** Esta es la pantalla principal de bienvenida. Tiene: toggle de tema, selector de idioma, logo, nombre de app, subtítulo, botón Google, divider, botón email, link de registro. La reemplazamos completamente con el nuevo diseño.

- [ ] **Step 1: Reemplazar `login.tsx` completo**

```tsx
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useGoogleSignIn } from '../../hooks/useAuth';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../../components/LanguageSelector';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../../config/fonts';

export default function LoginScreen() {
  const { promptAsync, loading, error } = useGoogleSignIn();
  const { t } = useTranslation();
  const { colors, isDark, setThemeMode } = useTheme();

  useEffect(() => {
    if (error) Alert.alert('Error', error);
  }, [error]);

  const gradientColors: [string, string, string] = isDark
    ? ['#0D1A1C', '#062830', '#003840']
    : ['#FFFFFF', '#F5F9FA', '#E0F7FA'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.gradient}
      >
        {/* Blobs decorativos */}
        <View style={[styles.blobTopRight, { backgroundColor: colors.primaryLight, opacity: isDark ? 0.25 : 0.6 }]} />
        <View style={[styles.blobBottomLeft, { backgroundColor: colors.secondaryLight, opacity: isDark ? 0.2 : 0.45 }]} />

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
            activeOpacity={0.7}
            style={styles.themeToggle}
          >
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
          <LanguageSelector />
        </View>

        {/* Contenido central */}
        <View style={styles.container}>
          <View style={styles.headerSection}>
            <View style={[styles.logoContainer, {
              backgroundColor: colors.primaryLight,
              borderColor: isDark ? 'rgba(0,172,193,0.3)' : colors.border,
              shadowColor: colors.primary,
            }]}>
              <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={[styles.appName, { color: colors.textPrimary }]}>Spendiapp</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('login.subtitle')}</Text>
          </View>

          <View style={styles.buttonsSection}>
            <TouchableOpacity
              style={[styles.googleButton, {
                borderColor: isDark ? 'rgba(238,246,248,0.18)' : colors.border,
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface,
              }]}
              activeOpacity={0.8}
              disabled={loading}
              onPress={() => promptAsync()}
            >
              {loading ? (
                <ActivityIndicator color={colors.textSecondary} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color={colors.textSecondary} />
                  <Text style={[styles.googleButtonText, { color: colors.textSecondary }]}>
                    {t('login.googleButton')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(238,246,248,0.1)' : colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textTertiary }]}>o</Text>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(238,246,248,0.1)' : colors.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.emailButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
              activeOpacity={0.8}
              disabled={loading}
              onPress={() => router.push('/(auth)/login-email')}
            >
              <Ionicons name="mail-outline" size={18} color={colors.onPrimary} />
              <Text style={[styles.emailButtonText, { color: colors.onPrimary }]}>
                {t('login.emailButton')}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.registerLinkContainer}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.7}
          >
            <Text style={[styles.registerLinkText, { color: colors.textSecondary }]}>
              {t('login.noAccount')}{' '}
              <Text style={[styles.registerLinkHighlight, { color: colors.primary }]}>
                {t('login.registerLink')}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    position: 'relative',
  },
  blobTopRight: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 999,
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 999,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  themeToggle: {
    padding: 4,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 56,
  },
  logoContainer: {
    width: 112,
    height: 112,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  logo: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 30,
    fontFamily: Fonts.extraBold,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonsSection: {
    width: '100%',
    marginBottom: 32,
  },
  googleButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 50,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  emailButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  emailButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
  },
  registerLinkContainer: {
    alignItems: 'center',
  },
  registerLinkText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  registerLinkHighlight: {
    fontFamily: Fonts.semiBold,
  },
});
```

- [ ] **Step 2: Verificar en simulador**

```bash
cd ~/Documents/Github/Spendiapp && npx expo run:ios
```

Verificar:
- Gradiente visible en dark mode (oscuro → cyan al fondo)
- Toggle tema → gradiente cambia a claro (blanco → E0F7FA)
- Blobs visibles en ambos modos
- Logo con contenedor redondeado
- Botones Google y Email con íconos

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/Github/Spendiapp
git add app/\(auth\)/login.tsx
git commit -m "feat: rediseño login con gradient dark/light y blobs decorativos"
```

---

## Task 2: Rediseño de `login-email.tsx`

**Files:**
- Modify: `app/(auth)/login-email.tsx`

**Contexto:** Pantalla de login con email + PIN. Tiene AppHeader, scroll con formulario, footer sticky. Agregamos gradient bg, blob decorativo, focus states en el input de email, e ícono en el campo.

- [ ] **Step 1: Reemplazar `login-email.tsx` completo**

```tsx
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
    <SafeAreaView style={styles.safeArea}>
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
              {/* Email input */}
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
                      ...(emailFocused && { shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 6 }),
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

              {/* PIN input */}
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
              style={[styles.primaryButton, { backgroundColor: colors.primary, shadowColor: colors.primary, opacity: canSubmit ? 1 : 0.4 }]}
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
  gradient: { flex: 1, position: 'relative' },
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
  pinLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  primaryButton: {
    height: 56,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: { fontSize: 17, fontFamily: Fonts.bold },
  forgotPinButton: { alignItems: 'center', paddingVertical: 8 },
  forgotPinText: { fontSize: 15, fontFamily: Fonts.semiBold },
});
```

- [ ] **Step 2: Verificar en simulador**

Verificar:
- Gradiente visible en dark y light mode
- Blob top-right visible
- Input de email: borde cyan al enfocar + ícono cambia de gris a cyan
- PinInput: sin cambios visuales (componente intacto)
- Footer sticky funciona con teclado
- Flujo completo: login exitoso

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/Github/Spendiapp
git add app/\(auth\)/login-email.tsx
git commit -m "feat: rediseño login-email con gradient dark/light, focus states y blob"
```

---

## Task 3: Rediseño de `register.tsx`

**Files:**
- Modify: `app/(auth)/register.tsx`

**Contexto:** Pantalla de registro con nombre, email y PIN. Mismo patrón que login-email: gradient bg, blob, focus states en nombre y email, íconos en inputs.

- [ ] **Step 1: Reemplazar `register.tsx` completo**

```tsx
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
import PinInput from '../../components/PinInput';
import { registerWithEmailAndPin } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

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

  const inputStyle = (focused: boolean) => ({
    borderColor: focused ? colors.borderFocus : (isDark ? 'rgba(0,172,193,0.22)' : colors.inputBorder),
    backgroundColor: isDark ? 'rgba(0,172,193,0.07)' : colors.inputBackground,
    color: colors.textPrimary,
    ...(focused && { shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 6 }),
  });

  return (
    <SafeAreaView style={styles.safeArea}>
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
                    style={[styles.input, styles.inputWithIcon, inputStyle(nameFocused)]}
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
                    style={[styles.input, styles.inputWithIcon, inputStyle(emailFocused)]}
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
              style={[styles.primaryButton, { backgroundColor: colors.primary, shadowColor: colors.primary, opacity: canSubmit ? 1 : 0.4 }]}
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
  gradient: { flex: 1, position: 'relative' },
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
    paddingBottom: Platform.OS === 'ios' ? 8 : 24,
    gap: 12,
  },
  header: { marginTop: 24, marginBottom: 40 },
  title: { fontSize: 32, fontFamily: Fonts.bold, marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: Fonts.regular, lineHeight: 24 },
  form: { flex: 1, gap: 32 },
  inputGroup: { gap: 12 },
  inputLabel: { fontSize: 14, fontFamily: Fonts.semiBold },
  inputSub: { fontSize: 13, fontFamily: Fonts.regular, marginTop: -6 },
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
  pinLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  primaryButton: {
    height: 56,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: { fontSize: 17, fontFamily: Fonts.bold },
});
```

- [ ] **Step 2: Verificar en simulador**

Verificar:
- Gradiente dark y light correcto
- Íconos persona y sobre en campos correspondientes
- Foco cyan en nombre y email al tocar
- PIN sin cambios
- Botón deshabilitado hasta completar los 3 campos
- Registro exitoso funciona

- [ ] **Step 3: Commit final**

```bash
cd ~/Documents/Github/Spendiapp
git add app/\(auth\)/register.tsx
git commit -m "feat: rediseño register con gradient dark/light, focus states e íconos"
```

---

## Verificación Final

```bash
npx expo run:ios
```

Checklist completo:
- [ ] Dark mode: gradiente `#0D1A1C → #062830 → #003840` visible en las 3 pantallas
- [ ] Light mode: gradiente `#FFFFFF → #F5F9FA → #E0F7FA` visible en las 3 pantallas
- [ ] Toggle tema en login → todas las pantallas cambian correctamente
- [ ] Blobs visibles y no invasivos en ambos modos
- [ ] Inputs: borde cyan al enfocar + ícono cambia de gris a cyan
- [ ] PIN boxes: sin cambios (PinInput intacto)
- [ ] Flujo login email+PIN: funciona end-to-end
- [ ] Flujo registro: funciona end-to-end
- [ ] Flujo Google: funciona end-to-end
- [ ] Footer sticky no se superpone al teclado
