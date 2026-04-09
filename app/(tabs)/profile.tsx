import { type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../context/ThemeContext';
import { signOut, updateDisplayName, changePin } from '../../hooks/useAuth';
import {
  isBiometricsAvailable,
  isBiometricsAppEnrolled,
  setBiometricsAppEnrolled,
} from '../../hooks/useBiometrics';
import { ThemeMode } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, changeLanguage } from '../../config/i18n';
import AppHeader from '../../components/AppHeader';
import { router } from 'expo-router';
import AppDialog, { DialogType } from '../../components/AppDialog';
import ScreenBackground from '../../components/ScreenBackground';
import { Fonts } from '../../config/fonts';
import { getUserProfile } from '../../hooks/useUserProfile';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface OptionRow {
  icon: IoniconsName;
  label: string;
  value?: string;
  color?: string;
  onPress: () => void;
}

function OptionItem({ icon, label, value, color, onPress }: OptionRow) {
  const { colors } = useTheme();
  const iconColor = color ?? colors.primary;
  return (
    <TouchableOpacity
      style={styles.optionRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.optionIconWrap, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.optionMeta}>
        <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{label}</Text>
        {value ? (
          <Text style={[styles.optionValue, { color: colors.textTertiary }]} numberOfLines={1} ellipsizeMode="tail">
            {value}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

function SectionTitle({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionTitleDot, { backgroundColor: colors.tertiary }]} />
      <Text style={[styles.sectionTitleText, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
}


// ── Modal cambiar PIN (3 pasos) ─────────────────────────────────────────────
type PinStep = 'current' | 'new' | 'confirm';

interface ChangePinModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function ChangePinModal({ visible, onClose, onSuccess }: ChangePinModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [step, setStep] = useState<PinStep>('current');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const stepTitles: Record<PinStep, string> = {
    current: t('profile.changePin.current'),
    new: t('profile.changePin.new'),
    confirm: t('profile.changePin.confirm'),
  };

  const stepValues: Record<PinStep, string> = {
    current: currentPin,
    new: newPin,
    confirm: confirmPin,
  };

  const handleReset = () => {
    setStep('current');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
    setLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleNext = async (value: string) => {
    setError('');

    if (value.length < 4) {
      setError(t('profile.changePin.minLength'));
      return;
    }

    if (step === 'current') {
      setCurrentPin(value);
      setStep('new');
      return;
    }

    if (step === 'new') {
      setNewPin(value);
      setStep('confirm');
      return;
    }

    // step === 'confirm'
    if (value !== newPin) {
      setError(t('profile.changePin.mismatch'));
      setConfirmPin('');
      return;
    }

    setLoading(true);
    try {
      await changePin(currentPin, newPin);
      handleReset();
      onClose();
      onSuccess();
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError(t('profile.changePin.wrongCurrent'));
        setStep('current');
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        setError(t('profile.changePin.genericError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const activeValue = step === 'current' ? currentPin : step === 'new' ? newPin : confirmPin;
  const setActiveValue = step === 'current' ? setCurrentPin : step === 'new' ? setNewPin : setConfirmPin;

  return (
    <Modal visible={visible} transparent animationType="slide" onShow={handleReset}>
      <KeyboardAvoidingView
        style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          {/* Step indicator */}
          <View style={styles.stepRow}>
            {(['current', 'new', 'confirm'] as PinStep[]).map((s, i) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  { backgroundColor: s === step ? colors.primary : colors.border },
                ]}
              />
            ))}
          </View>

          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{stepTitles[step]}</Text>

          <TextInput
            key={step}
            style={[styles.modalInput, { color: colors.textPrimary, borderColor: error ? colors.error : colors.border, backgroundColor: colors.backgroundSecondary }]}
            placeholder="••••"
            placeholderTextColor={colors.textTertiary}
            value={activeValue}
            onChangeText={setActiveValue}
            secureTextEntry
            keyboardType="numeric"
            maxLength={8}
            autoFocus
          />

          {error ? (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          ) : null}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1.5 }]}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalBtnText, { color: colors.primary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleNext(activeValue)}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color={colors.onPrimary} />
                : <Text style={[styles.modalBtnText, { color: colors.onPrimary }]}>
                    {step === 'confirm' ? t('common.save') : t('common.next')}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Modal selector de idioma (overlay fade + sheet spring) ─────────────────
function LangModal({ visible, onClose, colors, i18n, t }: {
  visible: boolean; onClose: () => void;
  colors: any; i18n: any; t: any;
}) {
  const translateY = useRef(new Animated.Value(400)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(400);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.langOverlay, { opacity, backgroundColor: colors.overlay }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.langSheet, { backgroundColor: colors.surface, transform: [{ translateY }] }]}>
          <View style={[styles.langHandle, { backgroundColor: colors.border }]} />
          <View style={[styles.langIconWrap, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="language" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.langTitle, { color: colors.textPrimary }]}>{t('profile.language.title')}</Text>
          <Text style={[styles.langSubtitle, { color: colors.textSecondary }]}>{t('profile.language.subtitle')}</Text>
          <View style={styles.langOptions}>
            {LANGUAGES.map((lang) => {
              const isSelected = i18n.language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langOption, { borderColor: isSelected ? colors.primary : colors.border }, isSelected && { backgroundColor: colors.primaryLight }]}
                  onPress={() => { changeLanguage(lang.code); onClose(); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <Text style={[styles.langName, { color: isSelected ? colors.primary : colors.textPrimary }]}>{lang.label}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.langCancelBtn, { backgroundColor: colors.surface, borderColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.langCancelText, { color: colors.primary }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Estado de dialogs ───────────────────────────────────────────────────────
interface DialogState {
  visible: boolean;
  type: DialogType;
  title: string;
  description: string | ReactNode;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}

const DIALOG_CLOSED: DialogState = {
  visible: false, type: 'info', title: '', description: '',
  primaryLabel: 'OK', onPrimary: () => {},
};

// ── Pantalla principal ──────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, setUser } = useAuthStore();
  const { colors, themeMode, setThemeMode, isDark } = useTheme();
  const { t, i18n } = useTranslation();

  const [nameInput, setNameInput] = useState('');
  const [nameInputError, setNameInputError] = useState('');
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [editNameLoading, setEditNameLoading] = useState(false);
  const [changePinVisible, setChangePinVisible] = useState(false);
  const [langVisible, setLangVisible] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(DIALOG_CLOSED);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    getUserProfile(user.uid)
      .then((profile) => { if (!cancelled && profile) setUserName(profile.userName); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.uid]);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricToggleDialog, setBiometricToggleDialog] = useState(false);

  useEffect(() => {
    async function loadBiometricsState() {
      try {
        const available = await isBiometricsAvailable();
        setBiometricsAvailable(available);
        if (available) {
          const enrolled = await isBiometricsAppEnrolled();
          setBiometricsEnabled(enrolled);
        }
      } catch {
        // Si SecureStore falla, mantener biometría deshabilitada
      }
    }
    loadBiometricsState();
  }, []);

  const closeDialog = () => setDialog((d) => ({ ...d, visible: false }));

  const showInfo = (title: string, description: string | ReactNode) =>
    setDialog({ visible: true, type: 'info', title, description, primaryLabel: t('common.understood'), onPrimary: closeDialog });

  const showError = (title: string, description: string | ReactNode) =>
    setDialog({ visible: true, type: 'error', title, description, primaryLabel: t('common.close'), onPrimary: closeDialog });

  const showSuccess = (title: string, description: string | ReactNode) =>
    setDialog({ visible: true, type: 'success', title, description, primaryLabel: t('common.great'), onPrimary: closeDialog });

  const nameParts = user?.displayName?.split(' ') ?? ['Usuario'];
  const firstName = nameParts[0];
  const lastInitial = nameParts[1] ? ` ${nameParts[1].charAt(0)}.` : '';
  const displayName = `${firstName}${lastInitial}`;
  const photoUrl = user?.photoURL;
  const isGoogleUser = !!photoUrl;

  const themeLabels: Record<ThemeMode, string> = {
    system: t('profile.theme.system'),
    light: t('profile.theme.light'),
    dark: t('profile.theme.dark'),
  };

  const cycleTheme = () => {
    const next: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' };
    setThemeMode(next[themeMode]);
  };

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  const handleLanguage = () => setLangVisible(true);

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameInputError(t('profile.editName.error.empty.title'));
      return;
    }
    setNameInputError('');
    setEditNameLoading(true);
    try {
      await updateDisplayName(trimmed);
      if (user) setUser({ ...user, displayName: trimmed });
      setEditNameVisible(false);
      showSuccess(t('profile.editName.success.title'), t('profile.editName.success.desc'));
    } catch {
      setNameInputError(t('profile.editName.error.generic.desc'));
    } finally {
      setEditNameLoading(false);
    }
  };


  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      try {
        await setBiometricsAppEnrolled(true);
        setBiometricsEnabled(true);
      } catch {
        showError(t('common.error'), t('profile.biometric.enableError'));
      }
    } else {
      setBiometricToggleDialog(true);
    }
  };

  const confirmDisableBiometrics = async () => {
    setBiometricToggleDialog(false);
    try {
      await setBiometricsAppEnrolled(false);
      setBiometricsEnabled(false);
    } catch {
      showError(t('common.error'), t('profile.biometric.disableError'));
    }
  };

  const handleSignOut = () => {
    setDialog({
      visible: true,
      type: 'warning',
      title: t('profile.signOut.title'),
      description: (
        <Text style={{ fontSize: 15, lineHeight: 22, textAlign: 'center', color: colors.textSecondary }}>
          {t('profile.signOut.descPart1')}
          <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{t('profile.signOut.descBold')}</Text>
          {t('profile.signOut.descPart2')}
        </Text>
      ),
      primaryLabel: t('profile.signOut.confirm'),
      secondaryLabel: t('common.cancel'),
      onPrimary: () => { closeDialog(); signOut(); },
      onSecondary: closeDialog,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground>
      <AppHeader showBack />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="person" size={36} color={colors.primary} />
            </View>
          )}
          <Text style={[styles.profileName, { color: colors.textPrimary }]}>{displayName}</Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
          {userName ? (
            <Text style={[styles.profileUserName, { color: colors.textTertiary }]}>
              {t('profile.userName', { userName })}
            </Text>
          ) : null}
          <View style={[styles.providerBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name={isGoogleUser ? 'logo-google' : 'mail-outline'} size={12} color={colors.primary} />
            <Text style={[styles.providerText, { color: colors.primary }]}>{isGoogleUser ? t('profile.providerGoogle') : t('profile.providerEmail')}</Text>
          </View>
        </View>

        {/* SOCIAL */}
        <SectionTitle label={t('profile.friends.section')} />
        <View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
          <OptionItem
            icon="people-outline"
            label={t('profile.friends.label')}
            onPress={() => router.push('/friends')}
          />
        </View>

        {/* CUENTA */}
        <SectionTitle label={t('profile.sections.account')} />
        <View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
          <OptionItem
            icon="person-outline"
            label={t('profile.editName.label')}
            value={user?.displayName ?? ''}
            onPress={() => { setNameInput(user?.displayName ?? ''); setNameInputError(''); setEditNameVisible(true); }}
          />
          <OptionItem
            icon="grid-outline"
            label={t('categories.manageCategoriesLabel')}
            onPress={() => router.push('/categories')}
          />
          {!isGoogleUser && (
            <OptionItem
              icon="lock-closed-outline"
              label={t('profile.changePin.label')}
              onPress={() => setChangePinVisible(true)}
            />
          )}
          <OptionItem
            icon="mail-outline"
            label={t('profile.email.label')}
            value={user?.email ?? ''}
            onPress={() => showInfo(
              t('profile.email.dialog.title'),
              isGoogleUser
                ? t('profile.email.dialog.google')
                : t('profile.email.dialog.pin'),
            )}
          />
        </View>

        {/* PREFERENCIAS */}
        <SectionTitle label={t('profile.sections.preferences')} />
        <View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
          <OptionItem
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            label={t('profile.theme.label')}
            value={themeLabels[themeMode]}
            onPress={cycleTheme}
          />
          <OptionItem
            icon="language-outline"
            label={t('profile.language.label')}
            value={`${currentLang.flag} ${currentLang.label}`}
            onPress={handleLanguage}
          />
          <OptionItem
            icon="notifications-outline"
            label={t('profile.notifications.label')}
            onPress={() => showInfo(t('common.comingSoon'), t('profile.notifications.soon'))}
          />
        </View>

        {/* MIS TARJETAS */}
        <SectionTitle label={t('profile.cards.section')} />
        <View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
          <OptionItem
            icon="card-outline"
            label={t('profile.cards.label')}
            onPress={() => router.push('/cards')}
          />
        </View>

        {/* SEGURIDAD — Biometría (solo nativo) */}
        {Platform.OS !== 'web' && (
          <>
            <SectionTitle label={t('profile.security')} />
            <View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.optionRow, { opacity: biometricsAvailable ? 1 : 0.4 }]}>
                <View style={[styles.optionIconWrap, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="finger-print" size={18} color={colors.primary} />
                </View>
                <View style={styles.optionMeta}>
                  <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
                    {t('profile.biometric.label')}
                  </Text>
                  <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
                    {biometricsAvailable
                      ? t('profile.biometric.subtitle')
                      : t('profile.biometric.unavailable')}
                  </Text>
                </View>
                <Switch
                  value={biometricsEnabled}
                  onValueChange={biometricsAvailable ? handleBiometricToggle : undefined}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                  disabled={!biometricsAvailable}
                />
              </View>
            </View>
          </>
        )}

        {/* SOPORTE */}
        <SectionTitle label={t('profile.sections.support')} />
        <View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
          <OptionItem
            icon="help-circle-outline"
            label={t('profile.faq.label')}
            onPress={() => router.push('/support')}
          />
          <OptionItem
            icon="shield-checkmark-outline"
            label={t('profile.privacy.label')}
            onPress={() => showInfo(t('common.comingSoon'), t('profile.privacy.soon'))}
          />
        </View>

        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: colors.errorLight }]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={[styles.signOutText, { color: colors.error }]}>{t('profile.signOut.button')}</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textTertiary }]}>{t('profile.version')}</Text>
      </ScrollView>

      {/* Dialog: Editar nombre */}
      <AppDialog
        visible={editNameVisible}
        type="info"
        title={t('profile.editName.title')}
        primaryLabel={t('common.save')}
        secondaryLabel={t('common.cancel')}
        onPrimary={handleSaveName}
        onSecondary={() => setEditNameVisible(false)}
        loading={editNameLoading}
        inputValue={nameInput}
        onInputChange={setNameInput}
        inputPlaceholder={t('profile.editName.placeholder')}
        inputType="name"
        inputError={nameInputError}
      />

      {/* Modal: Cambiar PIN */}
      <ChangePinModal
        visible={changePinVisible}
        onClose={() => setChangePinVisible(false)}
        onSuccess={() => showSuccess(t('profile.changePin.success.title'), t('profile.changePin.success.desc'))}
      />

      {/* Modal: Selector de idioma */}
      <LangModal
        visible={langVisible}
        onClose={() => setLangVisible(false)}
        colors={colors}
        i18n={i18n}
        t={t}
      />

      {/* Dialog: Desactivar biometría (solo nativo) */}
      {Platform.OS !== 'web' && (
        <AppDialog
          visible={biometricToggleDialog}
          type="warning"
          title={t('profile.biometric.disableDialog.title')}
          description={
            <Text style={{ fontSize: 15, lineHeight: 22, textAlign: 'center', color: colors.textSecondary }}>
              {t('profile.biometric.disableDialog.descPart1')}
              <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{t('profile.biometric.disableDialog.descBold')}</Text>
              {t('profile.biometric.disableDialog.descPart2')}
            </Text>
          }
          primaryLabel={t('profile.biometric.disableDialog.confirm')}
          secondaryLabel={t('common.cancel')}
          onPrimary={confirmDisableBiometrics}
          onSecondary={() => setBiometricToggleDialog(false)}
        />
      )}

      {/* Dialog global */}
      <AppDialog
        visible={dialog.visible}
        type={dialog.type}
        title={dialog.title}
        description={dialog.description}
        primaryLabel={dialog.primaryLabel}
        secondaryLabel={dialog.secondaryLabel}
        onPrimary={dialog.onPrimary}
        onSecondary={dialog.onSecondary}
      />
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: Platform.OS === 'web' ? 120 : 40 },

  // ChangePinModal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40, gap: 16 },
  modalTitle: { fontSize: 18, fontFamily: Fonts.bold, textAlign: 'center' },
  modalInput: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 20, letterSpacing: 8, textAlign: 'center', fontFamily: Fonts.regular },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, height: 52, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 15, fontFamily: Fonts.semiBold },

  profileCard: { borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 28, gap: 6 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 8 },
  avatarFallback: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  profileName: { fontSize: 20, fontFamily: Fonts.bold },
  profileEmail: { fontSize: 13, fontFamily: Fonts.regular },
  profileUserName: { fontSize: 12, fontFamily: Fonts.medium, marginTop: 2 },
  providerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  providerText: { fontSize: 11, fontFamily: Fonts.semiBold },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginLeft: 2 },
  sectionTitleDot: { width: 6, height: 6, borderRadius: 3 },
  sectionTitleText: { fontSize: 11, fontFamily: Fonts.bold },
  optionCard: {
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, gap: 12 },
  optionIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionMeta: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 14, fontFamily: Fonts.medium },
  optionValue: { fontSize: 12, fontFamily: Fonts.regular },
  optionSub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 1 },

  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 50, marginBottom: 20 },
  signOutText: { fontSize: 15, fontFamily: Fonts.bold },
  version: { textAlign: 'center', fontSize: 12, fontFamily: Fonts.regular },

  // Language modal
  langOverlay: { flex: 1, justifyContent: 'flex-end' },
  langSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, alignItems: 'center', gap: 8 },
  langHandle: { width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
  langIconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  langTitle: { fontSize: 18, fontFamily: Fonts.bold },
  langSubtitle: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center', marginBottom: 8 },
  langOptions: { width: '100%', gap: 10, marginBottom: 8 },
  langOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1.5 },
  langFlag: { fontSize: 24 },
  langName: { flex: 1, fontSize: 15, fontFamily: Fonts.semiBold },
  langCancelBtn: { width: '100%', paddingVertical: 16, borderRadius: 50, borderWidth: 1.5, alignItems: 'center', marginTop: 4 },
  langCancelText: { fontSize: 15, fontFamily: Fonts.semiBold },


  cardTypeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  cardTypeBadgeText: { fontSize: 11, fontFamily: Fonts.semiBold },

  // PIN steps
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  errorText: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center', marginTop: -8 },
});
