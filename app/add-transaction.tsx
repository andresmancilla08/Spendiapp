import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
  FlatList,
  InputAccessoryView,
  Switch,
} from 'react-native';
import { useRef, useEffect, useState, type ElementRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { addDoc, collection, Timestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Fonts } from '../config/fonts';
import type { TransactionType } from '../types/transaction';
import { categorizeLocal, categorizeWithGemini } from '../utils/categorize';
import { useCategories } from '../hooks/useCategories';
import { filterCategories } from '../constants/categories';
import { router } from 'expo-router';
import AppHeader from '../components/AppHeader';
import PageTitle from '../components/PageTitle';
import { useCards } from '../hooks/useCards';
import { useTEARate } from '../hooks/useTEARate';
import { calculateInstallments, calculateInstallmentDates } from '../utils/installmentCalc';
import type { Card } from '../types/card';
import BankLogo from '../components/BankLogo';
import { suggestEmojiLocal, suggestEmojiWithGemini } from '../utils/suggestEmoji';
import { EmojiPicker } from '../components/EmojiPicker';
import type { CategoryType } from '../types/category';
import * as Crypto from 'expo-crypto';
import { useSharedTransactions } from '../hooks/useSharedTransactions';
import { getUserProfile } from '../hooks/useUserProfile';
import SharedExpenseSection from '../components/SharedExpenseSection';
import type { SharedParticipant } from '../types/sharedTransaction';

const QUICK_DESC_CATEGORY_IDS = ['food', 'transport', 'health', 'entertainment', 'shopping', 'home', 'salary'];

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const AMOUNT_INPUT_ID = 'spendiapp-amount-input';

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatDisplayDate(date: Date): string {
  const months = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

export default function AddTransactionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const { categories: customCategories } = useCategories(user?.uid ?? '');

  const scrollRef = useRef<ElementRef<typeof ScrollView>>(null);
  const catScrollRef = useRef<ElementRef<typeof ScrollView>>(null);
  const chipOffsets = useRef<Record<string, number>>({});

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isFixed, setIsFixed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Tarjeta y cuotas
  const { cards, loading: cardsLoading } = useCards(user?.uid ?? '');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [installmentCount, setInstallmentCount] = useState(1);
  const [withInterest, setWithInterest] = useState(false);
  const [teaInput, setTeaInput] = useState('');
  const { tea: referenceTEA } = useTEARate();

  // Inline new-category form state
  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📌');
  const [newCatType, setNewCatType] = useState<CategoryType>('expense');
  const [newCatSaving, setNewCatSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [catExpanded, setCatExpanded] = useState(false);
  const [emojiSuggesting, setEmojiSuggesting] = useState(false);
  const [userPickedEmoji, setUserPickedEmoji] = useState(false);
  const emojiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-categorization state
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Date picker state
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'day' | 'month'>('day');
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(today.getMonth());
  const [pickerDay, setPickerDay] = useState(today.getDate());
  const MIN_YEAR = 2020;

  // Shared expense state
  const [isShared, setIsShared] = useState(false);
  const [sharedParticipants, setSharedParticipants] = useState<SharedParticipant[]>([]);
  const [ownerPercentage, setOwnerPercentage] = useState(100);
  const [ownerUserName, setOwnerUserName] = useState('');
  const { createSharedTransaction } = useSharedTransactions();

  // Load owner's userName from Firestore
  useEffect(() => {
    if (user?.uid) {
      getUserProfile(user.uid).then((p) => { if (p) setOwnerUserName(p.userName); });
    }
  }, [user?.uid]);

  // Derived value: days in the currently viewed month
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();

  // Sync selectedDate whenever picker values change
  useEffect(() => {
    const validDay = Math.min(pickerDay, daysInMonth);
    setSelectedDate(new Date(pickerYear, pickerMonth, validDay));
  }, [pickerYear, pickerMonth, pickerDay, daysInMonth]);

  // Auto-suggest emoji for new category name
  useEffect(() => {
    if (userPickedEmoji) return;
    if (emojiDebounceRef.current) clearTimeout(emojiDebounceRef.current);
    if (newCatName.trim().length < 2) { setNewCatIcon('📌'); return; }
    emojiDebounceRef.current = setTimeout(async () => {
      const local = suggestEmojiLocal(newCatName);
      if (local) { setNewCatIcon(local); return; }
      if (GEMINI_KEY) {
        setEmojiSuggesting(true);
        const ai = await suggestEmojiWithGemini(newCatName, GEMINI_KEY);
        setEmojiSuggesting(false);
        if (ai) setNewCatIcon(ai);
      }
    }, 500);
  }, [newCatName, userPickedEmoji]);

  // Scroll to bottom when date picker opens or switches mode
  useEffect(() => {
    if (datePickerOpen) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [datePickerOpen, pickerMode]);

  // Auto-scroll category strip to the AI-selected chip
  useEffect(() => {
    if (!category || catExpanded) return;
    setTimeout(() => {
      const x = chipOffsets.current[category];
      if (x !== undefined) {
        catScrollRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
      }
    }, 120);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Auto-categorization effect
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (description.trim().length < 3) {
      setSuggestedCategories([]);
      setCategory('');
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const local = categorizeLocal(description);
      if (local.length > 0) {
        setSuggestedCategories(local);
        if (category === '' || suggestedCategories.includes(category)) {
          setCategory(local[0]);
        }
        return;
      }
      if (GEMINI_KEY) {
        setIsAiLoading(true);
        const ai = await categorizeWithGemini(description, GEMINI_KEY);
        setIsAiLoading(false);
        if (ai) {
          setSuggestedCategories([ai]);
          if (category === '' || suggestedCategories.includes(category)) {
            setCategory(ai);
          }
          return;
        }
      }
      // Nada reconocido → preseleccionar "Otro"
      setSuggestedCategories([]);
      if (category === '' || suggestedCategories.includes(category)) {
        setCategory('other');
      }
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description]);

  const resetNewCatForm = () => {
    setShowNewCatForm(false);
    setNewCatName('');
    setNewCatIcon('📌');
    setNewCatType('expense');
    setNewCatSaving(false);
    setShowEmojiPicker(false);
    setEmojiSuggesting(false);
    setUserPickedEmoji(false);
  };

  const resetForm = () => {
    setType('expense');
    setAmount('');
    setCategory('');
    setDescription('');
    setError('');
    setIsFixed(false);
    setLoading(false);
    setSuggestedCategories([]);
    setIsAiLoading(false);
    const now = new Date();
    setSelectedDate(now);
    setPickerYear(now.getFullYear());
    setPickerMonth(now.getMonth());
    setPickerDay(now.getDate());
    setDatePickerOpen(false);
    setPickerMode('day');
    resetNewCatForm();
    setSelectedCardId(null);
    setInstallmentCount(1);
    setWithInterest(false);
    setTeaInput('');
    setIsShared(false);
    setSharedParticipants([]);
    setOwnerPercentage(100);
  };

  const handleSaveNewCategory = async () => {
    if (!user || newCatName.trim().length < 2 || newCatSaving) return;
    setNewCatSaving(true);
    try {
      const ref = await addDoc(collection(db, 'categories'), {
        userId: user.uid,
        name: newCatName.trim(),
        icon: newCatIcon,
        type,
        createdAt: Timestamp.fromDate(new Date()),
      });
      setCategory(ref.id);
      resetNewCatForm();
      showToast(`Categoría "${newCatName.trim()}" creada`, 'success');
    } catch (err) {
      console.error('Error guardando categoría:', err);
      showToast('No se pudo guardar la categoría', 'error');
      setNewCatSaving(false);
    }
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategory('');
  };

  const handleNavigateToCards = () => {
    router.push('/(onboarding)/select-cards');
  };

  const prevMonth = () => {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear((y) => y - 1);
    } else {
      setPickerMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    const now = new Date();
    if (pickerYear === now.getFullYear() && pickerMonth === now.getMonth()) return;
    const newMonth = pickerMonth === 11 ? 0 : pickerMonth + 1;
    const newYear = pickerMonth === 11 ? pickerYear + 1 : pickerYear;
    // If landing on current month, clamp day to today
    if (newYear === now.getFullYear() && newMonth === now.getMonth()) {
      setPickerDay((d) => Math.min(d, now.getDate()));
    }
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear((y) => y + 1);
    } else {
      setPickerMonth((m) => m + 1);
    }
  };

  // amount is raw digits only — parse directly
  const parsedAmount = amount ? parseInt(amount, 10) : 0;
  const isAmountValid = amount.trim() !== '' && parsedAmount > 0;

  // Format con puntos como separadores de miles, $ incluido en el valor
  const formattedNumber = amount ? amount.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
  const displayAmount = formattedNumber ? `$${formattedNumber}` : '';

  const handleAmountChange = (text: string) => {
    setAmount(text.replace(/\D/g, ''));
  };

  // Cursor siempre al final
  const amountSelection = { start: displayAmount.length, end: displayAmount.length };
  // Ancho dinámico basado en los chars totales incluyendo el $
  const amountInputWidth = Math.max(60, displayAmount.length * 28 + 10);
  const isSaveDisabled = !isAmountValid || category === '' || description.trim() === '' || loading;

  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;
  const isCredit = selectedCard?.type === 'credit';
  const showInstallments = isCredit && installmentCount > 1;
  const teaValue = teaInput !== '' ? parseFloat(teaInput) : null;
  const teaValid = !showInstallments || !withInterest || (teaValue !== null && teaValue > 0 && teaValue <= 200);

  const sharedPercentageValid = !isShared
    || sharedParticipants.length === 0
    || Math.round(ownerPercentage + sharedParticipants.reduce((s, p) => s + p.percentage, 0)) === 100;

  const isSaveDisabledFull = isSaveDisabled || !teaValid || !sharedPercentageValid;

  const handleSave = async () => {
    if (isSaveDisabledFull || !user) return;
    setLoading(true);
    setError('');
    try {
      const teaValueNum = teaInput !== '' ? parseFloat(teaInput) : null;
      const isInstallment = isCredit && type === 'expense' && installmentCount > 1;

      if (isShared && sharedParticipants.length > 0) {
        const allParticipants: SharedParticipant[] = [
          { uid: user.uid, userName: ownerUserName, displayName: user.displayName ?? '', percentage: ownerPercentage },
          ...sharedParticipants,
        ];
        await createSharedTransaction({
          participants: allParticipants,
          ownerUid: user.uid,
          ownerUserName,
          baseDoc: {
            type,
            category,
            description: description.trim(),
            cardId: selectedCardId ?? undefined,
            isFixed: false,
          },
          amount: parsedAmount,
          installmentCount: isInstallment ? installmentCount : 1,
          withInterest: isInstallment ? withInterest : false,
          teaValue: isInstallment ? teaValueNum : null,
          selectedDate,
        });
      } else {
        const now = new Date();
        const baseDoc = {
          userId: user.uid,
          type,
          category,
          description: description.trim(),
          createdAt: Timestamp.fromDate(now),
          isFixed,
          ...(selectedCardId ? { cardId: selectedCardId } : {}),
        };
        if (isInstallment) {
          const amounts = calculateInstallments(parsedAmount, installmentCount, withInterest ? teaValueNum : null);
          const dates = calculateInstallmentDates(selectedDate, installmentCount);
          const groupId = Crypto.randomUUID();
          const batch = writeBatch(db);
          amounts.forEach((amt, i) => {
            const ref = doc(collection(db, 'transactions'));
            batch.set(ref, {
              ...baseDoc,
              amount: amt,
              date: Timestamp.fromDate(dates[i]),
              isFixed: false,
              installmentGroupId: groupId,
              installmentNumber: i + 1,
              installmentTotal: installmentCount,
              isInstallment: true,
            });
          });
          await batch.commit();
        } else {
          await addDoc(collection(db, 'transactions'), {
            ...baseDoc,
            amount: parsedAmount,
            date: Timestamp.fromDate(selectedDate),
          });
        }
      }
      showToast(t('home.transactionSaved'), 'success');
      resetForm();
      router.back();
    } catch (err) {
      setError(t('addTransaction.errors.saveFailed'));
      setLoading(false);
    }
  };

  const activeCategories = filterCategories(type, customCategories)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const dateDisplayText = isToday(selectedDate)
    ? `${t('addTransaction.today')}, ${formatDisplayDate(selectedDate)}`
    : formatDisplayDate(selectedDate);

  const nowForPicker = new Date();
  const isNextMonthDisabled =
    pickerYear === nowForPicker.getFullYear() && pickerMonth === nowForPicker.getMonth();

  return (
    <>
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={AMOUNT_INPUT_ID}><View /></InputAccessoryView>
      )}
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader showBack />
        <PageTitle title={t('addTransaction.title')} description={t('addTransaction.pageDesc')} />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            focusable={false}
            style={Platform.OS === 'web' ? { outline: 'none' } as any : undefined}
          >
            {/* Type toggle */}
            <View style={[styles.typeToggleRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.typePill,
                  type === 'expense' && { backgroundColor: colors.primary },
                  type !== 'expense' && { borderWidth: 1, borderColor: colors.border },
                ]}
                onPress={() => handleTypeChange('expense')}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.typePillText,
                  { color: type === 'expense' ? '#FFFFFF' : colors.textSecondary },
                ]}>
                  {t('addTransaction.typeExpense')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typePill,
                  type === 'income' && { backgroundColor: colors.primary },
                  type !== 'income' && { borderWidth: 1, borderColor: colors.border },
                ]}
                onPress={() => handleTypeChange('income')}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.typePillText,
                  { color: type === 'income' ? '#FFFFFF' : colors.textSecondary },
                ]}>
                  {t('addTransaction.typeIncome')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount input */}
            <View style={styles.amountRow}>
              <TextInput
                style={[styles.amountInput, { color: colors.primary, width: amountInputWidth }]}
                keyboardType="numeric"
                value={displayAmount}
                onChangeText={handleAmountChange}
                selection={amountSelection}
                placeholder="$0"
                placeholderTextColor={colors.textTertiary ?? colors.textSecondary}
                returnKeyType="done"
                inputAccessoryViewID={Platform.OS === 'ios' ? AMOUNT_INPUT_ID : undefined}
              />
            </View>

            {/* Description input */}
            <View style={[styles.descriptionWrap, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
              <TextInput
                style={[styles.descriptionInput, { color: colors.textPrimary }]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('addTransaction.descriptionPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                returnKeyType="done"
                autoCorrect={false}
                spellCheck={false}
                inputAccessoryViewID={Platform.OS === 'ios' ? AMOUNT_INPUT_ID : undefined}
              />
            </View>

            {/* Sugerencias rápidas según categoría */}
            {category !== '' && QUICK_DESC_CATEGORY_IDS.includes(category) && description.trim() === '' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 2 }}>
                  {(t(`addTransaction.quickDesc.${category}`, { returnObjects: true }) as string[]).map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setDescription(s)}
                      style={[styles.quickDescChip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.quickDescText, { color: colors.textSecondary }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* Toggle gasto fijo */}
            <View style={[styles.fixedRow, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fixedLabel, { color: colors.textPrimary }]}>
                  {type === 'income' ? 'Ingreso fijo' : 'Gasto fijo'}
                </Text>
                <Text style={[styles.fixedHint, { color: colors.textTertiary }]}>
                  Se repetirá automáticamente cada mes
                </Text>
              </View>
              <Switch
                value={isFixed}
                onValueChange={setIsFixed}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {/* Category section */}
            <View style={styles.categoryHeaderRow}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('addTransaction.categoryLabel')}
              </Text>
              {isAiLoading && (
                <ActivityIndicator size="small" color={colors.primary} style={styles.aiSpinner} />
              )}
            </View>

            {catExpanded ? (
              /* ── Expanded grid ── */
              <View style={{ marginBottom: 16 }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginBottom: 8 }}
                  onPress={() => setCatExpanded(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-up" size={13} color={colors.textSecondary} />
                  <Text style={{ fontSize: 11, fontFamily: Fonts.medium, color: colors.textSecondary }}>Colapsar</Text>
                </TouchableOpacity>
                <View style={styles.categoryGrid}>
                  {/* "+ Nueva" siempre primero */}
                  {showNewCatForm ? (
                    <View style={[styles.newCatInlineChip, { borderColor: colors.primary, backgroundColor: colors.backgroundSecondary }]}>
                      <TouchableOpacity onPress={() => setShowEmojiPicker(v => !v)} activeOpacity={0.8} style={styles.newCatInlineEmoji}>
                        {emojiSuggesting
                          ? <ActivityIndicator size="small" color={colors.primary} />
                          : <Text style={{ fontSize: 18 }}>{newCatIcon}</Text>
                        }
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.newCatInlineInput, { color: colors.textPrimary }]}
                        value={newCatName}
                        onChangeText={setNewCatName}
                        placeholder={t('addTransaction.categoryNamePlaceholder')}
                        placeholderTextColor={colors.textSecondary}
                        autoCorrect={false}
                        autoCapitalize="words"
                        returnKeyType="done"
                        onSubmitEditing={handleSaveNewCategory}
                        inputAccessoryViewID={Platform.OS === 'ios' ? AMOUNT_INPUT_ID : undefined}
                      />
                      <TouchableOpacity onPress={handleSaveNewCategory} disabled={newCatName.trim().length < 2 || newCatSaving} activeOpacity={0.8}>
                        {newCatSaving
                          ? <ActivityIndicator size="small" color={colors.primary} />
                          : <Ionicons name="checkmark-circle" size={22} color={newCatName.trim().length >= 2 ? colors.primary : colors.border} />
                        }
                      </TouchableOpacity>
                      <TouchableOpacity onPress={resetNewCatForm} activeOpacity={0.8}>
                        <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.categoryChip, { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }]}
                      onPress={() => { setShowNewCatForm(true); setNewCatType(type); }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={16} color={colors.textSecondary} />
                      <Text style={[styles.categoryChipLabel, { color: colors.textSecondary }]}>Nueva</Text>
                    </TouchableOpacity>
                  )}
                  {activeCategories.map((item) => {
                    const isSelected = category === item.id;
                    const isSuggested = suggestedCategories.includes(item.id);
                    let chipStyle: object[];
                    let labelColor: string;
                    if (isSelected) {
                      chipStyle = [styles.categoryChip, { backgroundColor: colors.primary }];
                      labelColor = '#FFFFFF';
                    } else if (isSuggested) {
                      chipStyle = [styles.categoryChip, { backgroundColor: colors.primaryLight ?? `${colors.primary}22`, borderWidth: 1, borderColor: colors.primary }];
                      labelColor = colors.primary;
                    } else {
                      chipStyle = [styles.categoryChip, { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border }];
                      labelColor = colors.textSecondary;
                    }
                    return (
                      <View key={item.id} style={styles.chipWrapper}>
                        <TouchableOpacity style={chipStyle} onPress={() => setCategory(item.id)} activeOpacity={0.8}>
                          <Text style={styles.categoryChipIcon}>{item.icon}</Text>
                          <Text style={[styles.categoryChipLabel, { color: labelColor }]}>{item.name}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              /* ── Horizontal scroll 2 filas (collapsed) ── */
              <ScrollView
                ref={catScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 4 }}
                style={{ marginBottom: 16 }}
                keyboardShouldPersistTaps="handled"
              >
                <View style={{ flexDirection: 'column', gap: 8 }}>
                  {/* Fila 1: Nueva + índices pares */}
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    {showNewCatForm ? (
                      <View style={[styles.newCatInlineChip, { borderColor: colors.primary, backgroundColor: colors.backgroundSecondary }]}>
                        <TouchableOpacity onPress={() => setShowEmojiPicker(v => !v)} activeOpacity={0.8} style={styles.newCatInlineEmoji}>
                          {emojiSuggesting
                            ? <ActivityIndicator size="small" color={colors.primary} />
                            : <Text style={{ fontSize: 18 }}>{newCatIcon}</Text>
                          }
                        </TouchableOpacity>
                        <TextInput
                          style={[styles.newCatInlineInput, { color: colors.textPrimary }]}
                          value={newCatName}
                          onChangeText={setNewCatName}
                          placeholder={t('addTransaction.categoryNamePlaceholder')}
                          placeholderTextColor={colors.textSecondary}
                          autoCorrect={false}
                          autoCapitalize="words"
                          returnKeyType="done"
                          onSubmitEditing={handleSaveNewCategory}
                        />
                        <TouchableOpacity onPress={handleSaveNewCategory} disabled={newCatName.trim().length < 2 || newCatSaving} activeOpacity={0.8}>
                          {newCatSaving
                            ? <ActivityIndicator size="small" color={colors.primary} />
                            : <Ionicons name="checkmark-circle" size={22} color={newCatName.trim().length >= 2 ? colors.primary : colors.border} />
                          }
                        </TouchableOpacity>
                        <TouchableOpacity onPress={resetNewCatForm} activeOpacity={0.8}>
                          <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.categoryChip, { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }]}
                        onPress={() => { setShowNewCatForm(true); setNewCatType(type); }}
                        onLongPress={() => setCatExpanded(true)}
                        delayLongPress={2000}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add" size={16} color={colors.textSecondary} />
                        <Text style={[styles.categoryChipLabel, { color: colors.textSecondary }]}>Nueva</Text>
                      </TouchableOpacity>
                    )}
                    {activeCategories.filter((_, i) => i % 2 === 0).map((item) => {
                      const isSelected = category === item.id;
                      const isSuggested = suggestedCategories.includes(item.id);
                      let chipStyle: object[];
                      let labelColor: string;
                      if (isSelected) {
                        chipStyle = [styles.categoryChip, { backgroundColor: colors.primary }];
                        labelColor = '#FFFFFF';
                      } else if (isSuggested) {
                        chipStyle = [styles.categoryChip, { backgroundColor: colors.primaryLight ?? `${colors.primary}22`, borderWidth: 1, borderColor: colors.primary }];
                        labelColor = colors.primary;
                      } else {
                        chipStyle = [styles.categoryChip, { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border }];
                        labelColor = colors.textSecondary;
                      }
                      return (
                        <View key={item.id} style={styles.chipWrapper} onLayout={(e) => { chipOffsets.current[item.id] = e.nativeEvent.layout.x; }}>
                          <TouchableOpacity style={chipStyle} onPress={() => setCategory(item.id)} onLongPress={() => setCatExpanded(true)} delayLongPress={2000} activeOpacity={0.8}>
                            <Text style={styles.categoryChipIcon}>{item.icon}</Text>
                            <Text style={[styles.categoryChipLabel, { color: labelColor }]}>{item.name}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                  {/* Fila 2: índices impares */}
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    {activeCategories.filter((_, i) => i % 2 === 1).map((item) => {
                      const isSelected = category === item.id;
                      const isSuggested = suggestedCategories.includes(item.id);
                      let chipStyle: object[];
                      let labelColor: string;
                      if (isSelected) {
                        chipStyle = [styles.categoryChip, { backgroundColor: colors.primary }];
                        labelColor = '#FFFFFF';
                      } else if (isSuggested) {
                        chipStyle = [styles.categoryChip, { backgroundColor: colors.primaryLight ?? `${colors.primary}22`, borderWidth: 1, borderColor: colors.primary }];
                        labelColor = colors.primary;
                      } else {
                        chipStyle = [styles.categoryChip, { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border }];
                        labelColor = colors.textSecondary;
                      }
                      return (
                        <View key={item.id} style={styles.chipWrapper} onLayout={(e) => { chipOffsets.current[item.id] = e.nativeEvent.layout.x; }}>
                          <TouchableOpacity style={chipStyle} onPress={() => setCategory(item.id)} onLongPress={() => setCatExpanded(true)} delayLongPress={2000} activeOpacity={0.8}>
                            <Text style={styles.categoryChipIcon}>{item.icon}</Text>
                            <Text style={[styles.categoryChipLabel, { color: labelColor }]}>{item.name}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>
            )}

            {/* Emoji picker */}
            {showNewCatForm && showEmojiPicker && (
              <View style={[styles.newCatEmojiPickerWrap, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 }]}>
                <EmojiPicker
                  selected={newCatIcon}
                  onSelect={(e) => { setNewCatIcon(e); setUserPickedEmoji(true); setShowEmojiPicker(false); }}
                />
              </View>
            )}

            {/* Date card */}
            <View style={[styles.fixedRow, { borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch', gap: 0, paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' }]}>
              {/* Date row — tappable */}
              <TouchableOpacity
                style={[styles.dateRow, { marginBottom: 0 }]}
                onPress={() => setDatePickerOpen((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
                  {t('addTransaction.dateLabel')}
                </Text>
                <View style={styles.dateValueRow}>
                  <Text style={[styles.dateValue, { color: colors.textPrimary }]}>
                    {dateDisplayText}
                  </Text>
                  <Ionicons
                    name={datePickerOpen ? 'chevron-up' : 'chevron-forward'}
                    size={16}
                    color={colors.textSecondary}
                    style={styles.dateChevron}
                  />
                </View>
              </TouchableOpacity>

              {/* Inline date picker */}
              {datePickerOpen && (
                <View style={[styles.datePickerWrap, { backgroundColor: colors.backgroundSecondary, borderRadius: 0, padding: 16, marginBottom: 0, borderTopWidth: 1, borderTopColor: colors.border }]}>
                  {pickerMode === 'day' ? (
                    <>
                      {/* Day mode header: < ABRIL 2025 > — tap label → month mode */}
                      <View style={styles.pickerMonthRow}>
                        <TouchableOpacity style={styles.pickerNavBtn} onPress={prevMonth} activeOpacity={0.7}>
                          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setPickerMode('month')} activeOpacity={0.7} style={styles.pickerLabelBtn}>
                          <Text style={[styles.pickerMonthLabel, { color: colors.primary }]}>
                            {MONTHS_ES[pickerMonth].toUpperCase()} {pickerYear}
                          </Text>
                          <Ionicons name="chevron-down" size={14} color={colors.primary} style={{ marginLeft: 4, marginTop: 1 }} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.pickerNavBtn}
                          onPress={nextMonth}
                          activeOpacity={isNextMonthDisabled ? 1 : 0.7}
                        >
                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={isNextMonthDisabled ? colors.textSecondary : colors.textPrimary}
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Day selector */}
                      <FlatList
                        horizontal
                        data={Array.from({ length: daysInMonth }, (_, i) => i + 1)}
                        keyExtractor={(item) => String(item)}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
                        renderItem={({ item: day }) => {
                          const isCurrentMonth =
                            pickerMonth === nowForPicker.getMonth() &&
                            pickerYear === nowForPicker.getFullYear();
                          const isFuture = isCurrentMonth && day > nowForPicker.getDate();
                          const isSelected = day === pickerDay;
                          const isTodayDay = day === nowForPicker.getDate() && isCurrentMonth;
                          return (
                            <TouchableOpacity
                              style={[
                                styles.dayCircle,
                                isSelected && !isFuture && { backgroundColor: colors.primary },
                                !isSelected && isTodayDay && { borderWidth: 1.5, borderColor: colors.tertiary ?? colors.primary },
                                !isSelected && !isTodayDay && { backgroundColor: colors.surface },
                                isFuture && { opacity: 0.3 },
                              ]}
                              onPress={() => { if (!isFuture) setPickerDay(day); }}
                              activeOpacity={isFuture ? 1 : 0.8}
                              disabled={isFuture}
                            >
                              <Text style={[styles.dayText, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                                {day}
                              </Text>
                            </TouchableOpacity>
                          );
                        }}
                      />
                    </>
                  ) : (
                    <>
                      {/* Month mode: year navigation + 3×4 month grid */}
                      <View style={styles.pickerMonthRow}>
                        <TouchableOpacity
                          style={styles.pickerNavBtn}
                          onPress={() => setPickerYear((y) => Math.max(MIN_YEAR, y - 1))}
                          activeOpacity={pickerYear <= MIN_YEAR ? 1 : 0.7}
                        >
                          <Ionicons name="chevron-back" size={20} color={pickerYear <= MIN_YEAR ? colors.textSecondary : colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.pickerMonthLabel, { color: colors.textPrimary }]}>{pickerYear}</Text>
                        <TouchableOpacity
                          style={styles.pickerNavBtn}
                          onPress={() => setPickerYear((y) => Math.min(nowForPicker.getFullYear(), y + 1))}
                          activeOpacity={pickerYear >= nowForPicker.getFullYear() ? 1 : 0.7}
                        >
                          <Ionicons name="chevron-forward" size={20} color={pickerYear >= nowForPicker.getFullYear() ? colors.textSecondary : colors.textPrimary} />
                        </TouchableOpacity>
                      </View>

                      {/* 3×4 month grid */}
                      <View style={styles.monthGrid}>
                        {MONTHS_ES.map((name, idx) => {
                          const isFutureMonth =
                            pickerYear === nowForPicker.getFullYear() && idx > nowForPicker.getMonth();
                          const isSelectedMonth = idx === pickerMonth;
                          return (
                            <TouchableOpacity
                              key={idx}
                              style={[
                                styles.monthChip,
                                isSelectedMonth && { backgroundColor: colors.primary },
                                !isSelectedMonth && { backgroundColor: colors.surface },
                                isFutureMonth && { opacity: 0.3 },
                              ]}
                              onPress={() => {
                                if (isFutureMonth) return;
                                setPickerMonth(idx);
                                // Clamp day if landing on current month
                                if (pickerYear === nowForPicker.getFullYear() && idx === nowForPicker.getMonth()) {
                                  setPickerDay((d) => Math.min(d, nowForPicker.getDate()));
                                }
                                setPickerMode('day');
                              }}
                              disabled={isFutureMonth}
                              activeOpacity={isFutureMonth ? 1 : 0.8}
                            >
                              <Text style={[styles.monthChipText, { color: isSelectedMonth ? '#FFFFFF' : colors.textPrimary }]}>
                                {name.slice(0, 3)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>

            {/* Método de pago */}
            {!cardsLoading && (
              <View style={[styles.fixedRow, { borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch', gap: 0, paddingVertical: 12, paddingHorizontal: 16 }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 10 }]}>{t('addTransaction.paymentMethod')}</Text>

                {cards.length === 0 ? (
                  /* Sin tarjetas registradas → CTA */
                  <TouchableOpacity
                    style={[styles.noCardsPrompt, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                    onPress={handleNavigateToCards}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="card-outline" size={18} color={colors.primary} />
                    <Text style={[styles.noCardsPromptText, { color: colors.primary }]}>
                      {t('addTransaction.noCards')}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.primary} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {/* Opción "Sin tarjeta" */}
                      <TouchableOpacity
                        style={[
                          styles.cardChip,
                          { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                          selectedCardId === null && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => { setSelectedCardId(null); setInstallmentCount(1); setWithInterest(false); setTeaInput(''); }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.cardChipText, { color: selectedCardId === null ? '#FFFFFF' : colors.textSecondary }]}>
                          {t('addTransaction.noCard')}
                        </Text>
                      </TouchableOpacity>

                      {cards.map((card: Card) => {
                        const isLocked = installmentCount > 1 && selectedCardId !== null && selectedCardId !== card.id;
                        return (
                          <TouchableOpacity
                            key={card.id}
                            style={[
                              styles.cardChip,
                              { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                              selectedCardId === card.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                              isLocked && { opacity: 0.35 },
                            ]}
                            onPress={() => { if (isLocked) return; setSelectedCardId(card.id); setInstallmentCount(1); setWithInterest(false); setTeaInput(''); }}
                            activeOpacity={isLocked ? 1 : 0.8}
                          >
                            <BankLogo bankId={card.bankId} size={20} radius={5} />
                            <Text style={[styles.cardChipText, { color: selectedCardId === card.id ? '#FFFFFF' : colors.textSecondary }]}>
                              {`${card.nickname || card.bankName}${selectedCardId === card.id && installmentCount > 1 ? ` · ${installmentCount}×` : ''}`}
                            </Text>
                            <View style={[
                              styles.cardTypeBadge,
                              {
                                backgroundColor: selectedCardId === card.id
                                  ? 'rgba(255,255,255,0.22)'
                                  : card.type === 'credit'
                                    ? `${colors.primary}28`
                                    : `${colors.tertiary}28`,
                              },
                            ]}>
                              <Text style={[styles.cardTypeBadgeText, {
                                color: selectedCardId === card.id
                                  ? '#FFFFFF'
                                  : card.type === 'credit' ? colors.primary : colors.tertiary,
                              }]}>
                                {card.type === 'credit' ? 'C' : 'D'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}
              </View>
            )}

            {/* Cuotas — solo si tarjeta crédito seleccionada */}
            {isCredit && type === 'expense' && (
              <View style={[styles.fixedRow, { borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch', gap: 0, paddingVertical: 12, paddingHorizontal: 16 }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 10 }]}>{t('addTransaction.installments')}</Text>

                {/* Picker numérico de cuotas */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <TouchableOpacity
                    onPress={() => setInstallmentCount((v) => Math.max(1, v - 1))}
                    style={[styles.qtyBtn, { borderColor: colors.border }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="remove" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.qtyValue, { color: colors.textPrimary }]}>{installmentCount}</Text>
                  <TouchableOpacity
                    onPress={() => setInstallmentCount((v) => Math.min(36, v + 1))}
                    style={[styles.qtyBtn, { borderColor: colors.border }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.fixedHint, { color: colors.textTertiary, flex: 1 }]}>
                    {installmentCount === 1 ? t('addTransaction.installmentSingle') : t('addTransaction.installmentsPlural')}
                  </Text>
                </View>

                {/* Toggle con interés — solo si > 1 cuota */}
                {installmentCount > 1 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: withInterest ? 12 : 0 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fixedLabel, { color: colors.textPrimary }]}>{t('addTransaction.withInterest')}</Text>
                      <Text style={[styles.fixedHint, { color: colors.textTertiary }]}>{t('addTransaction.withInterestHint')}</Text>
                    </View>
                    <Switch
                      value={withInterest}
                      onValueChange={(v) => {
                        setWithInterest(v);
                        setTeaInput(v ? String(referenceTEA) : '');
                      }}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                )}

                {/* Campo TEA — solo si toggle ON */}
                {installmentCount > 1 && withInterest && (
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TextInput
                        style={[styles.teaInput, { borderColor: teaValid ? colors.border : colors.error, color: colors.textPrimary, backgroundColor: colors.backgroundSecondary }]}
                        placeholder="0.0"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="decimal-pad"
                        value={teaInput}
                        onChangeText={setTeaInput}
                        returnKeyType="done"
                      />
                      <Text style={[styles.fixedLabel, { color: colors.textSecondary }]}>{t('addTransaction.teaLabel')}</Text>
                    </View>
                    <Text style={[styles.fixedHint, { color: colors.textTertiary }]}>
                      {t('addTransaction.teaReference')}
                    </Text>
                  </View>
                )}

                {/* Preview de cuotas */}
                {installmentCount > 1 && isAmountValid && teaValid && (
                  <View style={{ marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: colors.primaryLight, gap: 4 }}>
                    {(() => {
                      const amounts = calculateInstallments(parsedAmount, installmentCount, withInterest ? teaValue : null);
                      const first = amounts[0];
                      const last = amounts[amounts.length - 1];
                      const total = amounts.reduce((a, b) => a + b, 0);
                      const interest = total - parsedAmount;
                      const same = first === last;
                      return (
                        <>
                          <Text style={[styles.fixedHint, { color: colors.primary }]}>
                            {same
                              ? t('addTransaction.installmentPreviewEqual', { count: installmentCount, amount: first.toLocaleString('es-CO') })
                              : t('addTransaction.installmentPreviewUnequal', { count: installmentCount - 1, first: first.toLocaleString('es-CO'), last: last.toLocaleString('es-CO') })}
                          </Text>
                          {withInterest && interest > 0 && (
                            <>
                              <Text style={[styles.fixedHint, { color: colors.primary }]}>
                                {t('addTransaction.installmentTotal', { amount: Math.round(total).toLocaleString('es-CO') })}
                              </Text>
                              <Text style={[styles.fixedHint, { color: colors.error ?? '#EF4444' }]}>
                                {t('addTransaction.installmentCost', { amount: Math.round(interest).toLocaleString('es-CO') })}
                              </Text>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </View>
                )}
              </View>
            )}

            {/* Shared expense section — only for expenses */}
            {type === 'expense' && (
              <SharedExpenseSection
                userId={user?.uid ?? ''}
                userName={ownerUserName}
                displayName={user?.displayName ?? ''}
                isShared={isShared}
                onIsSharedChange={setIsShared}
                participants={sharedParticipants}
                onParticipantsChange={setSharedParticipants}
                amount={parsedAmount}
                interestRate={withInterest && teaInput ? parseFloat(teaInput) : 0}
                installmentCount={installmentCount}
                ownerPercentage={ownerPercentage}
                onOwnerPercentageChange={setOwnerPercentage}
              />
            )}

          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer fijo */}
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {isSaveDisabledFull && !loading && (
            <Text style={[styles.fixedHint, { color: colors.textTertiary, textAlign: 'center', marginBottom: 6 }]}>
              {!isAmountValid
                ? t('addTransaction.validation.invalidAmount')
                : category === ''
                ? t('addTransaction.validation.noCategory')
                : description.trim() === ''
                ? t('addTransaction.validation.noDescription')
                : !teaValid
                ? t('addTransaction.validation.noTea')
                : ''}
            </Text>
          )}
          {error !== '' && (
            <Text style={[styles.errorText, { color: colors.error ?? '#EF4444', textAlign: 'center', marginBottom: 6 }]}>{error}</Text>
          )}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: isSaveDisabledFull ? colors.border : colors.primary },
            ]}
            onPress={handleSave}
            disabled={isSaveDisabledFull}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={[styles.saveBtnText, { color: '#FFFFFF' }]}>{t('addTransaction.saveButton')}</Text>
            }
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 16, gap: 16 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginTop: 4,
  },
  saveBtn: {
    height: 56,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnText: { fontSize: 17, fontFamily: Fonts.bold },
  typeToggleRow: {
    flexDirection: 'row',
    gap: 10,
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
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInput: {
    fontSize: 40,
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
  },
  descriptionWrap: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  descriptionInput: {
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiSpinner: {
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chipWrapper: {
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryChipIcon: {
    fontSize: 14,
  },
  categoryChipLabel: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 0,
  },
  dateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateValue: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  dateChevron: {
    marginTop: 1,
  },
  datePickerWrap: {
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  pickerMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  pickerMonthLabel: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  pickerLabelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  monthChip: {
    width: '30%',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthChipText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
  pickerNavBtn: {
    padding: 8,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
  fixedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  fixedLabel: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    marginBottom: 2,
  },
  fixedHint: {
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  cardChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  cardChipText: { fontSize: 13, fontFamily: Fonts.semiBold },
  cardTypeBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  cardTypeBadgeText: { fontSize: 10, fontFamily: Fonts.bold },
  quickDescChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  quickDescText: { fontSize: 12, fontFamily: Fonts.medium },
  noCardsPrompt: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  noCardsPromptText: { fontSize: 13, fontFamily: Fonts.semiBold },
  qtyBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  qtyValue: { fontSize: 18, fontFamily: Fonts.bold, minWidth: 32, textAlign: 'center' },
  teaInput: { height: 46, width: 100, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, fontFamily: Fonts.semiBold },
  newCatEmojiPickerWrap: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
    overflow: 'hidden',
  },
  newCatInlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    minWidth: 180,
  },
  newCatInlineEmoji: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCatInlineInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.medium,
    minWidth: 80,
    maxWidth: 140,
    paddingVertical: 0,
  },
  suggestDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 3,
  },
});
