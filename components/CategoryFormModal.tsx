import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRef, useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { addDoc, updateDoc, doc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import type { Category, CategoryType } from '../types/category';
import { EmojiPicker } from './EmojiPicker';
import { suggestEmojiLocal, suggestEmojiWithGemini } from '../utils/suggestEmoji';

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

const DEFAULT_ICON = '📌';

type IconSource = 'auto' | 'manual';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingCategory?: Category | null;
}

const TYPE_OPTIONS: { value: CategoryType; labelKey: string }[] = [
  { value: 'expense', labelKey: 'categories.typeExpense' },
  { value: 'income', labelKey: 'categories.typeIncome' },
  { value: 'both', labelKey: 'categories.typeBoth' },
];

export function CategoryFormModal({
  visible,
  onClose,
  onSaved,
  editingCategory,
}: Props): JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { height: screenHeight } = useWindowDimensions();

  const SHEET_HEIGHT = Math.round(screenHeight * 0.78);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const isEditMode = editingCategory != null;

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [iconSource, setIconSource] = useState<IconSource>('auto');
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEmojiLoading, setIsEmojiLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ----- Animation -----

  const animateIn = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [slideAnim]);

  const animateOut = useCallback(
    (callback: () => void) => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => callback());
    },
    [slideAnim],
  );

  useEffect(() => {
    if (visible) {
      animateIn();
    }
  }, [visible, animateIn]);

  // ----- Pre-fill / reset -----

  const resetForm = useCallback(() => {
    setName('');
    setType('expense');
    setIcon(DEFAULT_ICON);
    setIconSource('auto');
    setShowPicker(false);
    setLoading(false);
    setIsEmojiLoading(false);
    slideAnim.setValue(0);
  }, [slideAnim]);

  useEffect(() => {
    if (editingCategory != null) {
      setName(editingCategory.name);
      setType(editingCategory.type);
      setIcon(editingCategory.icon);
      setIconSource('manual');
      setShowPicker(false);
    }
  }, [editingCategory]);

  // ----- Auto emoji suggestion (debounced) -----

  useEffect(() => {
    // Skip auto-suggestion when user has manually chosen an emoji
    if (iconSource === 'manual') return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (name.trim().length < 2) return;

    debounceRef.current = setTimeout(async () => {
      const local = suggestEmojiLocal(name);
      if (local !== null) {
        setIcon(local);
        setIconSource('auto');
        return;
      }

      if (GEMINI_KEY) {
        setIsEmojiLoading(true);
        const geminiEmoji = await suggestEmojiWithGemini(name, GEMINI_KEY);
        setIsEmojiLoading(false);
        if (geminiEmoji !== null) {
          setIcon(geminiEmoji);
          setIconSource('auto');
        }
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // iconSource is intentionally excluded — we only want to re-run when name changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // ----- Handlers -----

  const handleClose = useCallback(() => {
    animateOut(() => {
      resetForm();
      onClose();
    });
  }, [animateOut, resetForm, onClose]);

  const handleEmojiSelect = (emoji: string) => {
    setIcon(emoji);
    setIconSource('manual');
    setShowPicker(false);
  };

  const handleNameChange = (text: string) => {
    setName(text);
    // Reset icon source so auto-suggestion runs again on the new name
    if (iconSource === 'manual') {
      setIconSource('auto');
    }
  };

  const handleSave = async () => {
    if (isSaveDisabled || !user) return;
    setLoading(true);
    try {
      if (isEditMode && editingCategory != null) {
        await updateDoc(doc(db, 'categories', editingCategory.id), {
          name: name.trim(),
          icon,
          type,
        });
      } else {
        await addDoc(collection(db, 'categories'), {
          userId: user.uid,
          name: name.trim(),
          icon,
          type,
          createdAt: Timestamp.fromDate(new Date()),
        });
      }
      onSaved();
      animateOut(() => {
        resetForm();
      });
    } catch {
      setLoading(false);
    }
  };

  const isSaveDisabled = name.trim().length < 2 || loading;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_HEIGHT, 0],
  });

  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.55],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[styles.sheetWrapper, { transform: [{ translateY }] }]}
        pointerEvents="box-none"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, maxHeight: SHEET_HEIGHT },
            ]}
          >
            {/* Drag handle */}
            <View style={styles.dragHandleRow}>
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
            </View>

            {/* Title row */}
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {isEditMode
                  ? t('categories.editTitle')
                  : t('categories.createTitle')}
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Name input */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                {t('categories.nameLabel')}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.backgroundSecondary,
                  },
                ]}
              >
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  value={name}
                  onChangeText={handleNameChange}
                  placeholder={t('categories.namePlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                  autoCorrect={false}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>

              {/* Type toggle */}
              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textSecondary, marginTop: 20 },
                ]}
              >
                {t('categories.typeLabel')}
              </Text>
              <View
                style={[
                  styles.typeToggleRow,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                {TYPE_OPTIONS.map((option) => {
                  const isActive = type === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.typePill,
                        isActive
                          ? { backgroundColor: colors.primary }
                          : {
                              backgroundColor: colors.backgroundSecondary,
                              borderWidth: 1,
                              borderColor: colors.border,
                            },
                      ]}
                      onPress={() => setType(option.value)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.typePillText,
                          { color: isActive ? '#FFFFFF' : colors.textSecondary },
                        ]}
                      >
                        {t(option.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Icon section */}
              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textSecondary, marginTop: 20 },
                ]}
              >
                {t('categories.iconLabel')}
              </Text>
              <View style={styles.iconSection}>
                {/* Icon circle + spinner */}
                <View style={styles.iconCircleRow}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <Text style={styles.iconEmoji}>{icon}</Text>
                  </View>
                  {isEmojiLoading && (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                      style={styles.emojiSpinner}
                    />
                  )}
                </View>

                {/* Source label */}
                <Text style={[styles.iconSourceLabel, { color: colors.textTertiary }]}>
                  {iconSource === 'auto'
                    ? t('categories.iconSourceAuto')
                    : t('categories.iconSourceManual')}
                </Text>

                {/* Toggle picker button */}
                <TouchableOpacity
                  style={[
                    styles.changeIconBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.backgroundSecondary,
                    },
                  ]}
                  onPress={() => setShowPicker((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={showPicker ? 'chevron-up' : 'happy-outline'}
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={[styles.changeIconBtnText, { color: colors.primary }]}>
                    {t('categories.changeIcon')}
                  </Text>
                </TouchableOpacity>

                {/* Inline emoji picker */}
                {showPicker && (
                  <View
                    style={[
                      styles.pickerWrap,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <EmojiPicker selected={icon} onSelect={handleEmojiSelect} />
                  </View>
                )}
              </View>

              {/* Save button */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                  isSaveDisabled && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={isSaveDisabled}
                activeOpacity={0.85}
              >
                {loading ? (
                  <View style={styles.savingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>
                      {t('categories.saving')}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.saveButtonText}>
                    {t('categories.saveButton')}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  dragHandleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textInput: {
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
  typeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: 24,
    borderWidth: 1,
  },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typePillText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
  iconSection: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  iconCircleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 30,
  },
  emojiSpinner: {
    marginLeft: 4,
  },
  iconSourceLabel: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  changeIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  changeIconBtnText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
  pickerWrap: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 8,
    marginTop: 4,
  },
  saveButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
