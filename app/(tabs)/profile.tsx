import { type ReactNode, memo } from 'react';
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
  Dimensions,

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
import AppSegmentedControl from '../../components/AppSegmentedControl';
import { router } from 'expo-router';
import AppDialog, { DialogType } from '../../components/AppDialog';
import ScreenBackground from '../../components/ScreenBackground';
import ScreenTransition, { ScreenTransitionRef } from '../../components/ScreenTransition';
import { Fonts } from '../../config/fonts';
import { getUserProfile, updateUserColorPalette } from '../../hooks/useUserProfile';
import { useFriends } from '../../hooks/useFriends';
import { PALETTES, PaletteId } from '../../config/palettes';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useToast } from '../../context/ToastContext';
import { useFlags } from '../../context/FeatureFlagsContext';
import appConfig from '../../app.json';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface OptionRow {
  icon: IoniconsName;
  label: string;
  value?: string;
  color?: string;
  badge?: number;
  isLast?: boolean;
  onPress: () => void;
}

function OptionItem({ icon, label, value, color, badge, isLast, onPress }: OptionRow) {
  const { colors } = useTheme();
  const iconColor = color ?? colors.primary;
  return (
    <>
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
        {badge ? (
          <View style={[styles.optionBadge, { backgroundColor: colors.error }]}>
            <Text style={styles.optionBadgeText}>{badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </TouchableOpacity>
      {!isLast && <View style={[styles.optionDivider, { backgroundColor: colors.border }]} />}
    </>
  );
}

function SectionTitle({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionTitleAccent, { backgroundColor: colors.primary }]} />
      <Text style={[styles.sectionTitleText, { color: colors.textSecondary }]}>{label}</Text>
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

// ── Palette groups ──────────────────────────────────────────────────────────
interface PaletteGroup {
  key: string;
  labelKey: string;
  ids: PaletteId[];
}

const PALETTE_GROUPS: PaletteGroup[] = [
  {
    key: 'classic',
    labelKey: 'profile.palette.group.classic',
    ids: ['deepWater', 'sunset', 'forest', 'midnight', 'rose', 'ocean', 'ember', 'lavender', 'slate', 'sakura', 'nordic', 'cottonCandy', 'peach', 'mint', 'aurora', 'mocha'],
  },
  {
    key: 'pastel',
    labelKey: 'profile.palette.group.pastel',
    ids: ['deepWaterPastel', 'sunsetPastel', 'forestPastel', 'midnightPastel', 'rosePastel', 'oceanPastel', 'emberPastel', 'lavenderPastel', 'slatePastel', 'sakuraPastel', 'nordicPastel', 'cottonCandyPastel', 'peachPastel', 'mintPastel', 'auroraPastel', 'mochaPastel'],
  },
];

// ── PaletteCard — 3 columnas, swatches solapados, glow, haptics ─────────────
const CARD_W = Math.floor((Math.min(Dimensions.get('window').width, 560) - 24 - 16) / 3);

const PaletteCard = memo(function PaletteCard({
  palette, isSelected, onPress, colors, label,
}: {
  palette: typeof PALETTES[0];
  isSelected: boolean;
  onPress: () => void;
  colors: any;
  label: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const badgeScale = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const badgeOpacity = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(badgeScale, { toValue: isSelected ? 1 : 0, damping: 10, stiffness: 400, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(badgeOpacity, { toValue: isSelected ? 1 : 0, duration: isSelected ? 120 : 80, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [isSelected]);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, { toValue: 0.93, damping: 18, stiffness: 400, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 280, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  const handlePress = () => {
    if (!isSelected) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const [p1, p2, p3] = palette.previewColors;
  const cardBg = palette.gradientLight[2];

  return (
    <Animated.View style={{ transform: [{ scale }], width: CARD_W }}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: isSelected }}
        style={[
          palCardStyles.card,
          {
            backgroundColor: cardBg,
            borderColor: isSelected ? p1 : 'transparent',
            shadowColor: isSelected ? p1 : '#000',
            shadowOpacity: isSelected ? 0.32 : 0.08,
            shadowRadius: isSelected ? 10 : 4,
            shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
            elevation: isSelected ? 8 : 2,
          },
        ]}
      >
        {/* Swatches solapados */}
        <View style={palCardStyles.swatchRow}>
          <View style={[palCardStyles.swatch, { backgroundColor: p1, borderColor: cardBg, zIndex: 3 }]} />
          <View style={[palCardStyles.swatch, palCardStyles.swatchOverlap, { backgroundColor: p2, borderColor: cardBg, zIndex: 2 }]} />
          <View style={[palCardStyles.swatch, palCardStyles.swatchOverlap, { backgroundColor: p3, borderColor: cardBg, zIndex: 1 }]} />
        </View>

        {/* Nombre */}
        <Text
          style={[
            palCardStyles.name,
            {
              color: isSelected ? p1 : colors.textPrimary,
              fontFamily: isSelected ? Fonts.semiBold : Fonts.medium,
              letterSpacing: isSelected ? 0.4 : 0.1,
            },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>

        {/* Badge animado — siempre montado */}
        <Animated.View
          style={[
            palCardStyles.checkBadge,
            { backgroundColor: p1, transform: [{ scale: badgeScale }], opacity: badgeOpacity },
          ]}
        >
          <Ionicons name="checkmark" size={9} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const palCardStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
    borderWidth: 2.5,
    minHeight: 90,
    justifyContent: 'center',
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  swatchOverlap: {
    marginLeft: -8,
  },
  name: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ── Modal selector de paleta — tabs horizontales + grid 3 columnas ──────────
function PaletteModal({ visible, onClose, colors, paletteId, setPaletteId, t }: {
  visible: boolean; onClose: () => void;
  colors: any; paletteId: PaletteId; setPaletteId: (id: PaletteId) => void; t: any;
}) {
  const translateY = useRef(new Animated.Value(500)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const [activeIdx, setActiveIdx] = useState(0);
  const [displayIdx, setDisplayIdx] = useState(0);

  useEffect(() => {
    if (visible) {
      translateY.setValue(500);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(translateY, { toValue: 0, damping: 22, stiffness: 210, mass: 0.9, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(translateY, { toValue: 500, duration: 220, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    }
  }, [visible]);

  const switchGroup = (idx: number) => {
    if (idx === activeIdx) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveIdx(idx);
    Animated.timing(contentOpacity, { toValue: 0, duration: 90, useNativeDriver: Platform.OS !== 'web' }).start(() => {
      setDisplayIdx(idx);
      Animated.timing(contentOpacity, { toValue: 1, duration: 160, useNativeDriver: Platform.OS !== 'web' }).start();
    });
  };

  const handleSelect = (id: PaletteId) => {
    setPaletteId(id);
    onClose();
  };

  const currentGroup = PALETTE_GROUPS[displayIdx];

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.langOverlay, { opacity: overlayOpacity, backgroundColor: colors.overlay }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[palStyles.sheet, { backgroundColor: colors.surface, transform: [{ translateY }] }]}>
          {/* Handle */}
          <View style={[palStyles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={palStyles.header}>
            <View style={[palStyles.headerIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="color-palette" size={22} color={colors.primary} />
            </View>
            <View style={palStyles.headerText}>
              <Text style={[palStyles.headerTitle, { color: colors.textPrimary }]}>
                {t('profile.palette.title')}
              </Text>
              <Text style={[palStyles.headerSubtitle, { color: colors.textSecondary }]}>
                {t('profile.palette.subtitle')}
              </Text>
            </View>
          </View>

          {/* Tab bar */}
          <AppSegmentedControl
            segments={PALETTE_GROUPS.map((g) => ({ key: g.key, label: t(g.labelKey) }))}
            activeKey={PALETTE_GROUPS[activeIdx].key}
            onChange={(key) => {
              const idx = PALETTE_GROUPS.findIndex((g) => g.key === key);
              if (idx !== -1) switchGroup(idx);
            }}
            style={palStyles.tabBarSpacing}
          />

          {/* Grid con fade al cambiar tab */}
          <Animated.ScrollView
            style={[palStyles.scroll, { opacity: contentOpacity }]}
            contentContainerStyle={palStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={palStyles.grid}>
              {currentGroup.ids.map((id) => {
                const palette = PALETTES.find(p => p.id === id)!;
                return (
                  <PaletteCard
                    key={id}
                    palette={palette}
                    isSelected={paletteId === id}
                    onPress={() => handleSelect(id)}
                    colors={colors}
                    label={t(`profile.palette.${id}`)}
                  />
                );
              })}
            </View>
          </Animated.ScrollView>

          {/* Cancel */}
          <TouchableOpacity
            style={[palStyles.cancelBtn, { borderColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={[palStyles.cancelText, { color: colors.primary }]}>{t('common.cancel')}</Text>
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
  const { colors, themeMode, setThemeMode, isDark, paletteId, setPaletteId } = useTheme();
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { flags } = useFlags();

  const [nameInput, setNameInput] = useState('');
  const [nameInputError, setNameInputError] = useState('');
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [editNameLoading, setEditNameLoading] = useState(false);
  const [changePinVisible, setChangePinVisible] = useState(false);
  const [langVisible, setLangVisible] = useState(false);
  const [paletteVisible, setPaletteVisible] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(DIALOG_CLOSED);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
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

  const profileDisplayName = fullName || user?.displayName || 'Usuario';
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

  const transitionRef = useRef<ScreenTransitionRef>(null);

  if (!user) return null;

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

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile Hero Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
          {/* Tinted band at top */}
          <View style={[styles.profileBand, { backgroundColor: colors.primaryLight }]} />

          {/* Avatar with surface ring */}
          <View style={[styles.avatarRingOuter, { borderColor: isPremium ? colors.warning : colors.surface, backgroundColor: colors.surface }]}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="person" size={42} color={colors.primary} />
              </View>
            )}
          </View>

          {/* Name & email */}
          <Text style={[styles.profileName, { color: colors.textPrimary }]}>{profileDisplayName}</Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email}</Text>

          {/* Chips row */}
          <View style={styles.profileChipsRow}>
            {userName ? (
              <TouchableOpacity
                style={[styles.userNameChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                activeOpacity={0.7}
                onPress={async () => {
                  await Clipboard.setStringAsync(userName);
                  showToast(t('profile.userNameCopied'), 'success');
                }}
              >
                <Text style={[styles.userNameChipAt, { color: colors.primary }]}>@</Text>
                <Text style={[styles.userNameChipText, { color: colors.primary }]}>{userName}</Text>
                <Ionicons name="copy-outline" size={12} color={colors.primary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ) : null}
            <View style={[styles.providerBadge, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderWidth: 1 }]}>
              <Ionicons name={isGoogleUser ? 'logo-google' : 'mail-outline'} size={12} color={colors.textSecondary} />
              <Text style={[styles.providerText, { color: colors.textSecondary }]}>
                {isGoogleUser ? t('profile.providerGoogle') : t('profile.providerEmail')}
              </Text>
            </View>
            {isPremium && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: colors.warning + '20',
                borderWidth: 1, borderColor: colors.warning + '66',
                borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
                shadowColor: colors.warning, shadowOpacity: 0.2, shadowRadius: 6, elevation: 2,
              }}>
                <Ionicons name="star" size={12} color={colors.warning} />
                <Text style={{ fontFamily: Fonts.semiBold, fontSize: 12, color: colors.warning, letterSpacing: 0.8 }}>
                  PRO
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Premium Banner — solo para usuarios free */}
        {!isPremium && (
          <TouchableOpacity
            style={[styles.premiumBanner, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}
            onPress={() => router.push('/upgrade' as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.premiumBannerIcon, { backgroundColor: colors.warning + '25' }]}>
              <Ionicons name="star" size={22} color={colors.warning} />
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
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {/* SOCIAL */}
        {flags.friendsEnabled && (
          <>
            <SectionTitle label={t('profile.friends.section')} />
            <View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
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

        {/* CUENTA */}
        <SectionTitle label={t('profile.sections.account')} />
        <View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
          <OptionItem
            icon="person-outline"
            label={t('profile.editName.label')}
            value={user?.displayName ?? ''}
            onPress={() => { setNameInput(user?.displayName ?? ''); setNameInputError(''); setEditNameVisible(true); }}
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
            isLast
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
              onPress={() => setPaletteVisible(true)}
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

        {/* MIS TARJETAS */}
        {flags.cardsEnabled && (
          <>
            <SectionTitle label={t('profile.cards.section')} />
            <View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
              <OptionItem
                icon="card-outline"
                label={t('profile.cards.label')}
                isLast
                onPress={() => router.push('/cards')}
              />
            </View>
          </>
        )}

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
            isLast
            onPress={() => router.push('/support')}
          />
        </View>

        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: colors.errorLight, borderColor: colors.error + '30', borderWidth: 1 }]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
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

      {/* Modal: Selector de paleta */}
      <PaletteModal
        visible={paletteVisible}
        onClose={() => setPaletteVisible(false)}
        colors={colors}
        paletteId={paletteId}
        setPaletteId={(id) => {
          setPaletteId(id);
          if (user?.uid) {
            updateUserColorPalette(user.uid, id).catch(() => {});
          }
        }}
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
    </ScreenTransition>
  );
}

// ── Estilos del PaletteModal ─────────────────────────────────────────────────
const palStyles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '78%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    lineHeight: 16,
  },
  tabBarSpacing: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  scroll: {
    maxHeight: 360,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  cancelBtn: {
    marginHorizontal: 20,
    marginTop: 14,
    paddingVertical: 15,
    borderRadius: 50,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
  },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: Platform.OS === 'web' ? 120 : 40, width: '100%', maxWidth: 640, alignSelf: 'center' },

  // ChangePinModal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40, gap: 16 },
  modalTitle: { fontSize: 18, fontFamily: Fonts.bold, textAlign: 'center' },
  modalInput: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 20, letterSpacing: 8, textAlign: 'center', fontFamily: Fonts.regular },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, height: 52, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 15, fontFamily: Fonts.semiBold },

  // Profile hero card
  profileCard: {
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    paddingBottom: 24,
  },
  profileBand: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 90,
  },
  avatarRingOuter: {
    width: 104, height: 104, borderRadius: 52,
    borderWidth: 4,
    marginTop: 38,
    marginBottom: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 22, fontFamily: Fonts.bold, textAlign: 'center', paddingHorizontal: 16 },
  profileEmail: { fontSize: 13, fontFamily: Fonts.regular, marginTop: 2 },
  profileChipsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, flexWrap: 'wrap', justifyContent: 'center',
    paddingHorizontal: 16,
  },
  userNameChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  userNameChipAt: { fontSize: 13, fontFamily: Fonts.bold },
  userNameChipText: { fontSize: 13, fontFamily: Fonts.semiBold },
  providerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  providerText: { fontSize: 12, fontFamily: Fonts.semiBold },

  // Section titles
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginLeft: 2, marginTop: 4 },
  sectionTitleAccent: { width: 3, height: 14, borderRadius: 2 },
  sectionTitleText: { fontSize: 12, fontFamily: Fonts.bold, letterSpacing: 0.4 },

  // Option cards & rows
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
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  optionIconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionMeta: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 14, fontFamily: Fonts.medium },
  optionValue: { fontSize: 12, fontFamily: Fonts.regular },
  optionBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  optionBadgeText: { color: '#fff', fontSize: 11, fontFamily: Fonts.bold },
  optionSub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 1 },
  optionDivider: { height: StyleSheet.hairlineWidth, marginLeft: 68 },

  premiumBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 24 },
  premiumBannerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  premiumBannerContent: { flex: 1, gap: 3 },
  premiumBannerTitle: { fontSize: 15, fontFamily: Fonts.bold },
  premiumBannerSub: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 17 },
  premiumBannerChevron: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
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


  // Palette modal (estilos legacy eliminados — ver palStyles y palCardStyles)

  cardTypeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  cardTypeBadgeText: { fontSize: 11, fontFamily: Fonts.semiBold },

  // PIN steps
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  errorText: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center', marginTop: -8 },
});
