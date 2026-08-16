import { type ReactNode } from 'react';
import { scrollFadeMask } from '../components/ScrollFadeEdges';
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
import { LinearGradient } from 'expo-linear-gradient';
import AppIcon, { AppIconName } from '../components/AppIcon';
import { useState, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { accentInk } from '../utils/contrast';
import { signOut, updateDisplayName, changePin } from '../hooks/useAuth';
import { ThemeMode } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, changeLanguage } from '../config/i18n';
import AppHeader from '../components/AppHeader';
import { router } from 'expo-router';
import { goBack } from '../utils/nav';
import { isPinComplete } from '../constants/pin';
import AppDialog, { DialogType } from '../components/AppDialog';
import ScreenBackground from '../components/ScreenBackground';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import ProSheen from '../components/ProSheen';
import { Fonts } from '../config/fonts';
import { getUserProfile, updateUserDisplayName } from '../hooks/useUserProfile';
import { useFriends } from '../hooks/useFriends';
import * as Clipboard from 'expo-clipboard';
import { useToast } from '../context/ToastContext';
import { useFlags } from '../context/FeatureFlagsContext';
import appConfig from '../app.json';


// ── Icon chip con glow — firma Aurora Ledger ───────────────────────────────
function RowIconChip({ name, color }: { name: AppIconName; color: string }) {
  const { isDark } = useTheme();
  return (
    <View
      style={[
        styles.iconChip,
        { backgroundColor: color + '1E' },
        isDark && (Platform.OS === 'web'
          ? ({ boxShadow: `0 0 18px ${color}44` } as any)
          : { shadowColor: color, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }),
      ]}
    >
      <AppIcon name={name} size={18} color={color} />
    </View>
  );
}

// ── Premium badge chip — dorado ──────────────────────────────────────────────
function PremiumBadge() {
  const { colors } = useTheme();
  return (
    <View style={[styles.premBadge, { backgroundColor: colors.warning + '22', borderColor: colors.warning + '55' }]}>
      <AppIcon name="star" size={10} color={accentInk(colors, 'warning', colors.warningLight)} />
      <Text style={[styles.premBadgeText, { color: accentInk(colors, 'warning', colors.warningLight) }]}>Premium</Text>
    </View>
  );
}

// ── Kicker de sección — uppercase + línea divisora ───────────────────────────
function GroupHeader({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.grp}>
      <Text style={[styles.grpText, { color: colors.textTertiary }]}>{label.toUpperCase()}</Text>
      <View style={[styles.grpLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

// ── Fila de opción individual ────────────────────────────────────────────────
interface OptionRowProps {
  icon: AppIconName;
  label: string;
  value?: string;
  color?: string;
  badge?: number;
  isLast?: boolean;
  onPress: () => void;
}

function OptionItem({ icon, label, value, color, badge, isLast, onPress }: OptionRowProps) {
  const { colors } = useTheme();
  const iconColor = color ?? colors.primary;
  return (
    <>
      <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.7}>
        <RowIconChip name={icon} color={iconColor} />
        <View style={styles.optionMeta}>
          <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{label}</Text>
          {value ? (
            <Text style={[styles.optionValue, { color: colors.textTertiary }]} numberOfLines={1} ellipsizeMode="tail">
              {value}
            </Text>
          ) : null}
        </View>
        {badge ? (
          <View style={[styles.optionBadge, { backgroundColor: colors.error }]}>
            <Text style={styles.optionBadgeText}>{badge}</Text>
          </View>
        ) : null}
        <AppIcon name="chevron-forward" size={14} color={colors.textTertiary} />
      </TouchableOpacity>
      {!isLast && <View style={[styles.optionDivider, { backgroundColor: colors.border }]} />}
    </>
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

    if (!isPinComplete(value)) {
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
          <View style={styles.stepRow}>
            {(['current', 'new', 'confirm'] as PinStep[]).map((s) => (
              <View
                key={s}
                style={[styles.stepDot, { backgroundColor: s === step ? colors.primary : colors.border }]}
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
              <Text style={[styles.modalBtnText, { color: accentInk(colors, 'primary', colors.surface) }]}>{t('common.cancel')}</Text>
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
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(translateY, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(translateY, { toValue: 400, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
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
            <AppIcon name="language" size={28} color={colors.primary} />
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
                  {isSelected && <AppIcon name="checkmark-circle" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.langCancelBtn, { backgroundColor: colors.surface, borderColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.langCancelText, { color: accentInk(colors, 'primary', colors.surface) }]}>{t('common.cancel')}</Text>
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
  const { user, setUser, isPremium } = useAuthStore();
  const { incomingRequests } = useFriends(user?.uid ?? '');
  const { colors, themeMode, setThemeMode, isDark, paletteId } = useTheme();
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { flags } = useFlags();

  const [nameInput, setNameInput] = useState('');
  const [nameInputError, setNameInputError] = useState('');
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [editNameLoading, setEditNameLoading] = useState(false);
  const [changePinVisible, setChangePinVisible] = useState(false);
  const [langVisible, setLangVisible] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(DIALOG_CLOSED);
  const [userName, setUserName] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    getUserProfile(user.uid)
      .then((profile) => {
        if (!cancelled && profile) {
          setUserName(profile.userName);
          setFullName(profile.fullName ?? '');
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.uid]);

  const closeDialog = () => setDialog((d) => ({ ...d, visible: false }));

  const showInfo = (title: string, description: string | ReactNode) =>
    setDialog({ visible: true, type: 'info', title, description, primaryLabel: t('common.understood'), onPrimary: closeDialog });

  const showError = (title: string, description: string | ReactNode) =>
    setDialog({ visible: true, type: 'error', title, description, primaryLabel: t('common.close'), onPrimary: closeDialog });

  const showSuccess = (title: string, description: string | ReactNode) =>
    setDialog({ visible: true, type: 'success', title, description, primaryLabel: t('common.great'), onPrimary: closeDialog });

  const profileDisplayName = fullName || user?.displayName || 'Usuario';
  const photoUrl = user?.photoURL;

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
      if (user) await updateUserDisplayName(user.uid, trimmed);
      if (user) setUser({ ...user, displayName: trimmed });
      setEditNameVisible(false);
      showSuccess(t('profile.editName.success.title'), t('profile.editName.success.desc'));
    } catch {
      setNameInputError(t('profile.editName.error.generic.desc'));
    } finally {
      setEditNameLoading(false);
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

  const transitionRef = useRef<ScreenTransitionRef>(null);

  if (!user) return null;

  const handleBack = () => {
    if (transitionRef.current) {
      transitionRef.current.animateOut(() => goBack());
    } else {
      goBack();
    }
  };

  // Shadow dinámico para el hero card (no puede ir en StyleSheet por deps isDark/isPremium)
  const heroCardShadow = Platform.OS === 'web'
    ? ({
        boxShadow: isPremium
          ? (isDark
              ? `0 8px 40px -8px ${colors.warning}35, 0 2px 12px -4px ${colors.primary}20`
              : `0 6px 28px -6px ${colors.warning}28, 0 2px 10px -4px rgba(0,0,0,0.08)`)
          : (isDark
              ? `0 4px 24px -6px ${colors.primary}30`
              : `0 4px 18px -4px rgba(0,0,0,0.09)`),
      } as any)
    : {
        shadowColor: isPremium ? colors.warning : colors.primary,
        shadowOpacity: isPremium ? (isDark ? 0.22 : 0.14) : (isDark ? 0.14 : 0.07),
        shadowRadius: isPremium ? 24 : 16,
        shadowOffset: { width: 0, height: isPremium ? 8 : 4 },
        elevation: isPremium ? 6 : 3,
      };

  // Shadow para option cards
  const cardShadow = Platform.OS === 'web'
    ? ({ boxShadow: isDark ? `0 2px 14px -4px ${colors.primary}22` : `0 2px 10px -3px rgba(0,0,0,0.06)` } as any)
    : {
        shadowColor: colors.primary,
        shadowOpacity: isDark ? 0.10 : 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      };

  // Glow en nombre (solo dark, solo premium)
  const nameGlow = isPremium && isDark
    ? (Platform.OS === 'web'
        ? ({ textShadow: `0 0 34px ${colors.warning}60` } as any)
        : { textShadowColor: colors.warning + '60', textShadowRadius: 22, textShadowOffset: { width: 0, height: 0 } })
    : undefined;

  // Glow del ring del avatar (solo dark, solo premium)
  const ringGlow = isPremium && isDark
    ? (Platform.OS === 'web'
        ? ({ boxShadow: `0 0 28px ${colors.warning}50` } as any)
        : { shadowColor: colors.warning, shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } })
    : undefined;

  return (
    <ScreenTransition ref={transitionRef}>
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground>
      <AppHeader showBack onBack={handleBack} />

      <ScrollView
        style={scrollFadeMask(0, 74)} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero card de perfil ─────────────────────────────────────── */}
        <View style={[
          styles.profileCard,
          {
            backgroundColor: colors.surface,
            borderColor: isPremium ? colors.warning + '30' : colors.primary + '20',
          },
          heroCardShadow,
        ]}>
          {/* Gradiente de fondo — corner approach (seguro con overflow:hidden) */}
          <LinearGradient
            colors={isPremium
              ? [colors.warning + (isDark ? '28' : '1A'), colors.primary + (isDark ? '18' : '0E'), 'transparent']
              : [colors.primary + (isDark ? '28' : '1C'), colors.tertiary + (isDark ? '12' : '08'), 'transparent']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Fila principal: avatar a la izquierda, identidad a la derecha —
              compacto, sin el aire muerto del layout centrado anterior */}
          <View style={styles.profileTopRow}>
            <View style={styles.avatarSection}>
              {/* Halo blob — sin blur, solo tinte circular (evita bug overflow:hidden en web) */}
              <View style={[styles.avatarHalo, {
                backgroundColor: isPremium
                  ? colors.warning + (isDark ? '1E' : '10')
                  : colors.primary + (isDark ? '18' : '0C'),
              }]} />

              {/* Ring del avatar */}
              <View style={[
                styles.avatarRing,
                {
                  borderColor: isPremium ? colors.warning : colors.primary + '55',
                  backgroundColor: colors.surface,
                },
                ringGlow,
              ]}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
                    <AppIcon name="person" size={30} color={colors.primary} />
                  </View>
                )}
              </View>

              {/* Estrella premium anclada al avatar */}
              {isPremium && (
                <View style={[styles.avatarStar, { backgroundColor: colors.warning, borderColor: colors.surface }]}>
                  <AppIcon name="star" size={10} color="#FFFFFF" />
                </View>
              )}
            </View>

            <View style={styles.profileMeta}>
              <Text
                style={[
                  styles.profileName,
                  { color: colors.textPrimary, fontFamily: isPremium ? Fonts.extraBold : Fonts.bold },
                  nameGlow,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {profileDisplayName}
              </Text>
              {user?.email ? (
                <Text style={[styles.profileEmail, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                  {user.email}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Chips */}
          <View style={styles.profileChipsRow}>
            {isPremium && <PremiumBadge />}
            {userName ? (
              <TouchableOpacity
                style={[styles.userNameChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '50' }]}
                activeOpacity={0.7}
                onPress={async () => {
                  await Clipboard.setStringAsync(userName);
                  showToast(t('profile.userNameCopied'), 'success');
                }}
              >
                <Text style={[styles.userNameChipAt, { color: accentInk(colors, 'primary', colors.primaryLight) }]}>@</Text>
                <Text style={[styles.userNameChipText, { color: accentInk(colors, 'primary', colors.primaryLight) }]}>{userName}</Text>
                <AppIcon name="copy-outline" size={12} color={accentInk(colors, 'primary', colors.primaryLight)} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ) : null}
            <View style={[styles.providerBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AppIcon name="mail-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.providerText, { color: colors.textSecondary }]}>
                {t('profile.providerEmail')}
              </Text>
            </View>
          </View>

          {/* Barrido de luz premium (gated también por reduce-motion / sheen off) */}
          {isPremium && <ProSheen color={colors.warning + '30'} />}
        </View>

        {/* ── Premium Banner — solo usuarios free ────────────────────── */}
        {!isPremium && (
          <TouchableOpacity
            style={[styles.premiumBanner, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}
            onPress={() => router.push('/upgrade' as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.premiumBannerIcon, { backgroundColor: colors.warning + '25' }]}>
              <AppIcon name="star" size={22} color={colors.warning} />
            </View>
            <View style={styles.premiumBannerContent}>
              <Text style={[styles.premiumBannerTitle, { color: colors.textPrimary }]}>
                {t('upgrade.title')}
              </Text>
              <Text style={[styles.premiumBannerSub, { color: colors.textSecondary }]}>
                {t('premium.bannerSubtitle')}
              </Text>
            </View>
            <View style={[styles.premiumBannerChevron, { backgroundColor: colors.warning }]}>
              <AppIcon name="chevron-forward" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {/* ── SOCIAL ─────────────────────────────────────────────────── */}
        {flags.friendsEnabled && (
          <>
            <GroupHeader label={t('profile.friends.section')} />
            <View style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.primary + '24' }, cardShadow]}>
              <OptionItem
                icon="people-outline"
                label={t('profile.friends.label')}
                badge={incomingRequests.length || undefined}
                isLast
                onPress={() => router.push('/friends')}
              />
            </View>
          </>
        )}

        {/* ── CUENTA ─────────────────────────────────────────────────── */}
        <GroupHeader label={t('profile.sections.account')} />
        <View style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.primary + '24' }, cardShadow]}>
          <OptionItem
            icon="person-outline"
            label={t('profile.editName.label')}
            value={user?.displayName ?? ''}
            onPress={() => { setNameInput(user?.displayName ?? ''); setNameInputError(''); setEditNameVisible(true); }}
          />
          <OptionItem
            icon="lock-closed-outline"
            label={t('profile.changePin.label')}
            onPress={() => setChangePinVisible(true)}
          />
          <OptionItem
            icon="mail-outline"
            label={t('profile.email.label')}
            value={user?.email ?? ''}
            isLast
            onPress={() => showInfo(
              t('profile.email.dialog.title'),
              t('profile.email.dialog.pin'),
            )}
          />
        </View>

        {/* ── PREFERENCIAS ───────────────────────────────────────────── */}
        <GroupHeader label={t('profile.sections.preferences')} />
        <View style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.primary + '24' }, cardShadow]}>
          {isPremium && (
            <OptionItem
              icon={isDark ? 'moon-outline' : 'sunny-outline'}
              label={t('profile.theme.label')}
              value={themeLabels[themeMode]}
              onPress={cycleTheme}
            />
          )}
          {isPremium && (
            <OptionItem
              icon="color-palette-outline"
              label={t('profile.palette.label')}
              value={t(`profile.palette.${paletteId}`)}
              onPress={() => router.push('/personalization')}
            />
          )}
          <OptionItem
            icon="language-outline"
            label={t('profile.language.label')}
            value={`${currentLang.flag} ${currentLang.label}`}
            isLast
            onPress={handleLanguage}
          />
        </View>

        {/* ── MIS TARJETAS ───────────────────────────────────────────── */}
        {flags.cardsEnabled && (
          <>
            <GroupHeader label={t('profile.cards.section')} />
            <View style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.primary + '24' }, cardShadow]}>
              <OptionItem
                icon="card-outline"
                label={t('profile.cards.label')}
                isLast
                onPress={() => router.push('/cards')}
              />
            </View>
          </>
        )}


        {/* ── SOPORTE ────────────────────────────────────────────────── */}
        <GroupHeader label={t('profile.sections.support')} />
        <View style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.primary + '24' }, cardShadow]}>
          <OptionItem
            icon="help-circle-outline"
            label={t('profile.faq.label')}
            isLast
            onPress={() => router.push('/support')}
          />
        </View>

        {/* ── Cerrar sesión ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: colors.errorLight, borderColor: colors.error + '30', borderWidth: 1 }]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <AppIcon name="log-out-outline" size={18} color={colors.error} />
          <Text style={[styles.signOutText, { color: colors.error }]}>{t('profile.signOut.button')}</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textTertiary }]}>{t('profile.version', { version: appConfig.expo.version })}</Text>
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
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },

  // ── Icon chip ─────────────────────────────────────────────────────────────
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Premium badge ─────────────────────────────────────────────────────────
  premBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  premBadgeText: { fontSize: 11, fontFamily: Fonts.bold },

  // ── Group header ──────────────────────────────────────────────────────────
  grp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  grpText: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 1.6 },
  grpLine: { flex: 1, height: 1 },

  // ── Profile hero card — horizontal compacto: avatar izq + identidad der ──
  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
    padding: 16,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarSection: {
    position: 'relative',
  },
  // Halo circular detrás del avatar: sin blur, solo color translúcido (seguro en overflow:hidden)
  avatarHalo: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarStar: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMeta: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 19,
    includeFontPadding: false,
  },
  profileEmail: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  profileChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  userNameChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  userNameChipAt: { fontSize: 13, fontFamily: Fonts.bold },
  userNameChipText: { fontSize: 13, fontFamily: Fonts.semiBold },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  providerText: { fontSize: 12, fontFamily: Fonts.semiBold },

  // ── Option card (glass) ───────────────────────────────────────────────────
  optionCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  optionMeta: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 14, fontFamily: Fonts.medium },
  optionValue: { fontSize: 12, fontFamily: Fonts.regular },
  optionBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBadgeText: { color: '#fff', fontSize: 11, fontFamily: Fonts.bold },
  optionDivider: { height: StyleSheet.hairlineWidth, marginLeft: 68 },

  // ── Premium upgrade banner (free) ─────────────────────────────────────────
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  premiumBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBannerContent: { flex: 1, gap: 3 },
  premiumBannerTitle: { fontSize: 15, fontFamily: Fonts.bold },
  premiumBannerSub: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 17 },
  premiumBannerChevron: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Cerrar sesión ─────────────────────────────────────────────────────────
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 50,
    marginTop: 16,
    marginBottom: 20,
  },
  signOutText: { fontSize: 15, fontFamily: Fonts.bold },

  // ── Versión ───────────────────────────────────────────────────────────────
  version: { textAlign: 'center', fontSize: 12, fontFamily: Fonts.regular },

  // ── ChangePinModal ────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 16,
  },
  modalTitle: { fontSize: 18, fontFamily: Fonts.bold, textAlign: 'center' },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    letterSpacing: 8,
    textAlign: 'center',
    fontFamily: Fonts.regular,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: {
    flex: 1,
    height: 52,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: { fontSize: 15, fontFamily: Fonts.semiBold },

  // ── LangModal ─────────────────────────────────────────────────────────────
  langOverlay: { flex: 1, justifyContent: 'flex-end' },
  langSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 8,
  },
  langHandle: { width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
  langIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  langTitle: { fontSize: 18, fontFamily: Fonts.bold },
  langSubtitle: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center', marginBottom: 8 },
  langOptions: { width: '100%', gap: 10, marginBottom: 8 },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  langFlag: { fontSize: 24 },
  langName: { flex: 1, fontSize: 15, fontFamily: Fonts.semiBold },
  langCancelBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 50,
    borderWidth: 1.5,
    alignItems: 'center',
    marginTop: 4,
  },
  langCancelText: { fontSize: 15, fontFamily: Fonts.semiBold },

  // ── PIN steps ─────────────────────────────────────────────────────────────
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  errorText: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center', marginTop: -8 },
});
