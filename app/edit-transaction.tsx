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
  Switch,
} from 'react-native';
import { useRef, useEffect, useState, type ElementRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { updateDoc, doc, Timestamp, addDoc, collection, deleteField } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Fonts } from '../config/fonts';
import type { TransactionType } from '../types/transaction';
import type { CategoryType } from '../types/category';
import { useCategories } from '../hooks/useCategories';
import { filterCategories } from '../constants/categories';
import { router } from 'expo-router';
import AppHeader from '../components/AppHeader';
import PageTitle from '../components/PageTitle';
import { useCards } from '../hooks/useCards';
import type { Card } from '../types/card';
import BankLogo from '../components/BankLogo';
import { useHistoryStore } from '../store/historyStore';
import ScreenTransition from '../components/ScreenTransition';
import { categorizeLocal, categorizeWithGemini } from '../utils/categorize';
import { suggestEmojiLocal, suggestEmojiWithGemini } from '../utils/suggestEmoji';
import { EmojiPicker } from '../components/EmojiPicker';

const QUICK_DESC_CATEGORY_IDS = ['food', 'transport', 'health', 'entertainment', 'shopping', 'home', 'salary'];
const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatDisplayDate(date: Date): string {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function getActualId(transaction: { id: string; isVirtualFixed?: boolean }): string {
  return transaction.isVirtualFixed
    ? transaction.id.split('_virtual_')[0]
    : transaction.id;
}

const MIN_YEAR = 2020;

export default function EditTransactionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const { categories: customCategories } = useCategories(user?.uid ?? '');
  const { cards, loading: cardsLoading } = useCards(user?.uid ?? '');
  const { pendingEditTx, setPendingEditTx, setLastAction } = useHistoryStore();

  const scrollRef    = useRef<ElementRef<typeof ScrollView>>(null);
  const catScrollRef = useRef<ElementRef<typeof ScrollView>>(null);
  const chipOffsets  = useRef<Record<string, number>>({});

  // Local copy so clearing pendingEditTx doesn't blank the screen mid-render
  const [transaction, setTransaction] = useState(pendingEditTx);

  const [type, setType]                     = useState<TransactionType>('expense');
  const [amount, setAmount]                 = useState('');
  const [description, setDescription]       = useState('');
  const [category, setCategory]             = useState('');
  const [isFixed, setIsFixed]               = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');

  // Category UI
  const [catExpanded, setCatExpanded]             = useState(false);
  const [showNewCatForm, setShowNewCatForm]       = useState(false);
  const [newCatName, setNewCatName]               = useState('');
  const [newCatIcon, setNewCatIcon]               = useState('📌');
  const [newCatType, setNewCatType]               = useState<CategoryType>('expense');  // eslint-disable-line @typescript-eslint/no-unused-vars
  const [newCatSaving, setNewCatSaving]           = useState(false);
  const [showEmojiPicker, setShowEmojiPicker]     = useState(false);
  const [emojiSuggesting, setEmojiSuggesting]     = useState(false);
  const [userPickedEmoji, setUserPickedEmoji]     = useState(false);
  const emojiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI categorization
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading]                 = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Date picker
  const todayDate = new Date();
  const [selectedDate, setSelectedDate]     = useState(todayDate);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerMode, setPickerMode]         = useState<'day' | 'month'>('day');
  const [pickerYear, setPickerYear]         = useState(todayDate.getFullYear());
  const [pickerMonth, setPickerMonth]       = useState(todayDate.getMonth());
  const [pickerDay, setPickerDay]           = useState(todayDate.getDate());

  const daysInMonth  = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const nowForPicker = new Date();

  useEffect(() => {
    const validDay = Math.min(pickerDay, daysInMonth);
    setSelectedDate(new Date(pickerYear, pickerMonth, validDay));
  }, [pickerYear, pickerMonth, pickerDay, daysInMonth]);

  useEffect(() => {
    if (datePickerOpen) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [datePickerOpen, pickerMode]);

  // Auto-scroll category strip to selected chip
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

  // Emoji suggestion for new category
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

  // AI auto-categorization on description change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (description.trim().length < 3) {
      setSuggestedCategories([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const local = categorizeLocal(description);
      if (local.length > 0) {
        setSuggestedCategories(local);
        if (category === '' || suggestedCategories.includes(category)) setCategory(local[0]);
        return;
      }
      if (GEMINI_KEY) {
        setIsAiLoading(true);
        const ai = await categorizeWithGemini(description, GEMINI_KEY);
        setIsAiLoading(false);
        if (ai) {
          setSuggestedCategories([ai]);
          if (category === '' || suggestedCategories.includes(category)) setCategory(ai);
          return;
        }
      }
      setSuggestedCategories([]);
      if (category === '') setCategory('other');
    }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description]);

  // Init from pendingEditTx on mount
  useEffect(() => {
    const tx = pendingEditTx;
    if (!tx) { router.back(); return; }
    setTransaction(tx);
    setType(tx.type);
    setAmount(String(Math.round(tx.amount)));
    setDescription(tx.description);
    setCategory(tx.category);
    setIsFixed(tx.isFixed ?? false);
    setSelectedCardId(tx.cardId ?? null);
    setError('');
    const d = tx.date instanceof Date
      ? tx.date
      : new Date((tx.date as any).seconds * 1000);
    setSelectedDate(d);
    setPickerYear(d.getFullYear());
    setPickerMonth(d.getMonth());
    setPickerDay(d.getDate());
    setPendingEditTx(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevMonth = () => {
    if (pickerMonth === 0) { setPickerMonth(11); setPickerYear((y) => y - 1); }
    else { setPickerMonth((m) => m - 1); }
  };

  const nextMonth = () => {
    if (pickerMonth === 11) { setPickerMonth(0); setPickerYear((y) => y + 1); }
    else { setPickerMonth((m) => m + 1); }
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategory('');
    setSuggestedCategories([]);
  };

  const resetNewCatForm = () => {
    setShowNewCatForm(false);
    setNewCatName('');
    setNewCatIcon('📌');
    setNewCatSaving(false);
    setShowEmojiPicker(false);
    setEmojiSuggesting(false);
    setUserPickedEmoji(false);
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
    } catch {
      showToast(t('editTransaction.saveCategoryError'), 'error');
      setNewCatSaving(false);
    }
  };

  const handleNavigateToCards = () => router.push('/(onboarding)/select-cards');

  const parsedAmount    = amount ? parseInt(amount, 10) : 0;
  const isAmountValid   = amount.trim() !== '' && parsedAmount > 0;
  const formattedNumber = amount ? amount.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
  const displayAmount   = formattedNumber ? `$${formattedNumber}` : '';
  const amountInputWidth = Math.max(60, displayAmount.length * 28 + 10);
  const amountSelection  = { start: displayAmount.length, end: displayAmount.length };

  const handleAmountChange = (text: string) => setAmount(text.replace(/\D/g, ''));

  const isSaveDisabled = !isAmountValid || category === '' || description.trim() === '' || loading;

  const dateDisplayText = isToday(selectedDate)
    ? `${t('addTransaction.today')}, ${formatDisplayDate(selectedDate)}`
    : formatDisplayDate(selectedDate);

  const activeCategories = filterCategories(type, customCategories)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const handleSave = async () => {
    if (isSaveDisabled || !transaction) return;
    setLoading(true);
    setError('');
    try {
      await updateDoc(doc(db, 'transactions', getActualId(transaction)), {
        type,
        description: description.trim(),
        amount: parsedAmount,
        category,
        date: Timestamp.fromDate(selectedDate),
        isFixed,
        cardId: selectedCardId ?? null,
        // Si se edita una transacción fija, limpiar la cancelación para restaurar todos los meses
        ...(isFixed ? { fixedCancelledFrom: deleteField() } : {}),
      });
      setLastAction('saved');
      showToast(t('history.toasts.saved'), 'success');
      router.back();
    } catch {
      setError(t('history.edit.saveError'));
      setLoading(false);
    }
  };

  if (!transaction) return null;

  return (
    <ScreenTransition>
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader showBack />
        <PageTitle title={t('editTransaction.title')} description={t('editTransaction.pageDesc')} />

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
            {/* Notices */}
            {transaction.isInstallment && (
              <View style={[styles.noticeBar, { backgroundColor: `${colors.primary}12` }]}>
                <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
                <Text style={[styles.noticeText, { color: colors.primary }]}>
                  {t('editTransaction.installmentNotice', {
                    current: transaction.installmentNumber,
                    total: transaction.installmentTotal,
                  })}
                </Text>
              </View>
            )}
            {transaction.isVirtualFixed && (
              <View style={[styles.noticeBar, { backgroundColor: `${colors.primary}12` }]}>
                <Ionicons name="repeat" size={15} color={colors.primary} />
                <Text style={[styles.noticeText, { color: colors.primary }]}>
                  {t('history.edit.fixedNote')}
                </Text>
              </View>
            )}

            {/* Type toggle */}
            <View style={[styles.typeToggleRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              {(['expense', 'income'] as TransactionType[]).map((tp) => (
                <TouchableOpacity
                  key={tp}
                  style={[
                    styles.typePill,
                    type === tp && { backgroundColor: colors.primary },
                    type !== tp && { borderWidth: 1, borderColor: colors.border },
                  ]}
                  onPress={() => handleTypeChange(tp)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typePillText, { color: type === tp ? '#FFFFFF' : colors.textSecondary }]}>
                    {tp === 'expense' ? t('addTransaction.typeExpense') : t('addTransaction.typeIncome')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount */}
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
              />
            </View>

            {/* Description */}
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
              />
            </View>

            {/* Quick desc chips */}
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

            {/* isFixed toggle */}
            {!transaction.isInstallment && (
              <View style={[styles.fixedRow, { borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fixedLabel, { color: colors.textPrimary }]}>
                    {type === 'income' ? t('editTransaction.fixedIncome') : t('editTransaction.fixedExpense')}
                  </Text>
                  <Text style={[styles.fixedHint, { color: colors.textTertiary }]}>
                    {t('history.edit.isFixedHint')}
                  </Text>
                </View>
                <Switch
                  value={isFixed}
                  onValueChange={setIsFixed}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            )}

            {/* Category */}
            <View style={styles.categoryHeaderRow}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('addTransaction.categoryLabel')}
              </Text>
              {isAiLoading && (
                <ActivityIndicator size="small" color={colors.primary} style={styles.aiSpinner} />
              )}
            </View>

            {catExpanded ? (
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
                  {showNewCatForm ? (
                    <View style={[styles.newCatInlineChip, { borderColor: colors.primary, backgroundColor: colors.backgroundSecondary }]}>
                      <TouchableOpacity onPress={() => setShowEmojiPicker((v) => !v)} activeOpacity={0.8} style={styles.newCatInlineEmoji}>
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
                      onPress={() => setShowNewCatForm(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={16} color={colors.textSecondary} />
                      <Text style={[styles.categoryChipLabel, { color: colors.textSecondary }]}>Nueva</Text>
                    </TouchableOpacity>
                  )}
                  {activeCategories.map((item) => {
                    const isSelected  = category === item.id;
                    const isSuggested = suggestedCategories.includes(item.id);
                    const chipStyle = isSelected
                      ? [styles.categoryChip, { backgroundColor: colors.primary }]
                      : isSuggested
                      ? [styles.categoryChip, { backgroundColor: colors.primaryLight ?? `${colors.primary}22`, borderWidth: 1, borderColor: colors.primary }]
                      : [styles.categoryChip, { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border }];
                    const labelColor = isSelected ? '#FFFFFF' : isSuggested ? colors.primary : colors.textSecondary;
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
              <ScrollView
                ref={catScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 4 }}
                style={{ marginBottom: 16 }}
                keyboardShouldPersistTaps="handled"
              >
                <View style={{ flexDirection: 'column', gap: 8 }}>
                  {/* Row 1: Nueva + even items */}
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    {showNewCatForm ? (
                      <View style={[styles.newCatInlineChip, { borderColor: colors.primary, backgroundColor: colors.backgroundSecondary }]}>
                        <TouchableOpacity onPress={() => setShowEmojiPicker((v) => !v)} activeOpacity={0.8} style={styles.newCatInlineEmoji}>
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
                        onPress={() => setShowNewCatForm(true)}
                        onLongPress={() => setCatExpanded(true)}
                        delayLongPress={2000}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add" size={16} color={colors.textSecondary} />
                        <Text style={[styles.categoryChipLabel, { color: colors.textSecondary }]}>Nueva</Text>
                      </TouchableOpacity>
                    )}
                    {activeCategories.filter((_, i) => i % 2 === 0).map((item) => {
                      const isSelected  = category === item.id;
                      const isSuggested = suggestedCategories.includes(item.id);
                      const chipStyle = isSelected
                        ? [styles.categoryChip, { backgroundColor: colors.primary }]
                        : isSuggested
                        ? [styles.categoryChip, { backgroundColor: colors.primaryLight ?? `${colors.primary}22`, borderWidth: 1, borderColor: colors.primary }]
                        : [styles.categoryChip, { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border }];
                      const labelColor = isSelected ? '#FFFFFF' : isSuggested ? colors.primary : colors.textSecondary;
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
                  {/* Row 2: odd items */}
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    {activeCategories.filter((_, i) => i % 2 === 1).map((item) => {
                      const isSelected  = category === item.id;
                      const isSuggested = suggestedCategories.includes(item.id);
                      const chipStyle = isSelected
                        ? [styles.categoryChip, { backgroundColor: colors.primary }]
                        : isSuggested
                        ? [styles.categoryChip, { backgroundColor: colors.primaryLight ?? `${colors.primary}22`, borderWidth: 1, borderColor: colors.primary }]
                        : [styles.categoryChip, { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border }];
                      const labelColor = isSelected ? '#FFFFFF' : isSuggested ? colors.primary : colors.textSecondary;
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

            {/* Emoji picker for new category */}
            {showNewCatForm && showEmojiPicker && (
              <View style={[styles.newCatEmojiPickerWrap, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 }]}>
                <EmojiPicker
                  selected={newCatIcon}
                  onSelect={(e) => { setNewCatIcon(e); setUserPickedEmoji(true); setShowEmojiPicker(false); }}
                />
              </View>
            )}

            {/* Date picker */}
            <View style={[styles.fixedRow, { borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch', gap: 0, paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' }]}>
              <TouchableOpacity
                style={styles.dateRow}
                onPress={() => setDatePickerOpen((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
                  {t('addTransaction.dateLabel')}
                </Text>
                <View style={styles.dateValueRow}>
                  <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{dateDisplayText}</Text>
                  <Ionicons
                    name={datePickerOpen ? 'chevron-up' : 'chevron-forward'}
                    size={16}
                    color={colors.textSecondary}
                    style={styles.dateChevron}
                  />
                </View>
              </TouchableOpacity>

              {datePickerOpen && (
                <View style={[styles.datePickerWrap, { backgroundColor: colors.backgroundSecondary, borderTopWidth: 1, borderTopColor: colors.border }]}>
                  {pickerMode === 'day' ? (
                    <>
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
                        <TouchableOpacity style={styles.pickerNavBtn} onPress={nextMonth} activeOpacity={0.7}>
                          <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                      <FlatList
                        horizontal
                        data={Array.from({ length: daysInMonth }, (_, i) => i + 1)}
                        keyExtractor={(item) => String(item)}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
                        renderItem={({ item: day }) => {
                          const isCurrentMonth = pickerMonth === nowForPicker.getMonth() && pickerYear === nowForPicker.getFullYear();
                          const isSelected = day === pickerDay;
                          const isTodayDay = day === nowForPicker.getDate() && isCurrentMonth;
                          return (
                            <TouchableOpacity
                              style={[
                                styles.dayCircle,
                                isSelected && { backgroundColor: colors.primary },
                                !isSelected && isTodayDay && { borderWidth: 1.5, borderColor: colors.tertiary ?? colors.primary },
                                !isSelected && !isTodayDay && { backgroundColor: colors.surface },
                              ]}
                              onPress={() => setPickerDay(day)}
                              activeOpacity={0.8}
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
                          onPress={() => setPickerYear((y) => y + 1)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.monthGrid}>
                        {MONTHS_ES.map((name, idx) => {
                          const isSelectedMonth = idx === pickerMonth;
                          return (
                            <TouchableOpacity
                              key={idx}
                              style={[
                                styles.monthChip,
                                isSelectedMonth && { backgroundColor: colors.primary },
                                !isSelectedMonth && { backgroundColor: colors.surface },
                              ]}
                              onPress={() => { setPickerMonth(idx); setPickerMode('day'); }}
                              activeOpacity={0.8}
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

            {/* Card selection */}
            {!cardsLoading && (
              <View style={[styles.fixedRow, { borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch', gap: 0, paddingVertical: 12, paddingHorizontal: 16 }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 10 }]}>
                  {t('addTransaction.paymentMethod')}
                </Text>

                {cards.length === 0 ? (
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
                      <TouchableOpacity
                        style={[
                          styles.cardChip,
                          { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                          selectedCardId === null && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => setSelectedCardId(null)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.cardChipText, { color: selectedCardId === null ? '#FFFFFF' : colors.textSecondary }]}>
                          {t('addTransaction.noCard')}
                        </Text>
                      </TouchableOpacity>

                      {cards.map((card: Card) => (
                        <TouchableOpacity
                          key={card.id}
                          style={[
                            styles.cardChip,
                            { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                            selectedCardId === card.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                          ]}
                          onPress={() => setSelectedCardId(card.id)}
                          activeOpacity={0.8}
                        >
                          <BankLogo bankId={card.bankId} size={20} radius={5} />
                          <Text style={[styles.cardChipText, { color: selectedCardId === card.id ? '#FFFFFF' : colors.textSecondary }]}>
                            {card.nickname || card.bankName}
                          </Text>
                          <View style={[
                            styles.cardTypeBadge,
                            {
                              backgroundColor: selectedCardId === card.id
                                ? 'rgba(255,255,255,0.22)'
                                : card.type === 'credit' ? `${colors.primary}28` : `${colors.tertiary}28`,
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
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            )}

          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {error !== '' && (
            <Text style={[styles.errorText, { color: colors.error ?? '#EF4444', textAlign: 'center', marginBottom: 6 }]}>
              {error}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: isSaveDisabled ? colors.border : colors.primary }]}
            onPress={handleSave}
            disabled={isSaveDisabled}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={[styles.saveBtnText, { color: '#FFFFFF' }]}>{t('history.edit.saveButton')}</Text>
            }
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  flex:   { flex: 1 },
  scroll: { padding: 20, paddingBottom: 16, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  errorText:    { fontSize: 13, fontFamily: Fonts.regular },
  saveBtn:      { height: 56, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnText:  { fontSize: 17, fontFamily: Fonts.bold },
  // Notices
  noticeBar:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  noticeText: { fontSize: 13, fontFamily: Fonts.semiBold, flex: 1 },
  // Type toggle
  typeToggleRow: { flexDirection: 'row', gap: 10, padding: 4, borderRadius: 24, borderWidth: 1 },
  typePill:      { flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  typePillText:  { fontSize: 14, fontFamily: Fonts.semiBold },
  // Amount
  amountRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  amountInput: { fontSize: 40, fontFamily: Fonts.extraBold, textAlign: 'center' },
  // Description
  descriptionWrap:  { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  descriptionInput: { fontSize: 16, fontFamily: Fonts.regular },
  // Quick desc
  quickDescChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  quickDescText: { fontSize: 12, fontFamily: Fonts.medium },
  // isFixed
  fixedRow:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  fixedLabel: { fontSize: 14, fontFamily: Fonts.semiBold, marginBottom: 2 },
  fixedHint:  { fontSize: 11, fontFamily: Fonts.regular },
  // Category
  sectionLabel:      { fontSize: 12, fontFamily: Fonts.semiBold, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  categoryHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiSpinner:         { marginBottom: 10 },
  categoryGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chipWrapper:       { alignItems: 'center' },
  categoryChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  categoryChipIcon:  { fontSize: 14 },
  categoryChipLabel: { fontSize: 13, fontFamily: Fonts.medium },
  // New category inline
  newCatInlineChip:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, gap: 6, minWidth: 180 },
  newCatInlineEmoji: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  newCatInlineInput: { flex: 1, fontSize: 16, fontFamily: Fonts.medium, minWidth: 80, maxWidth: 140, paddingVertical: 0 },
  newCatEmojiPickerWrap: { borderWidth: 1, borderRadius: 14, padding: 8, overflow: 'hidden' },
  // Date picker
  dateRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  dateValueRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateValue:        { fontSize: 13, fontFamily: Fonts.medium },
  dateChevron:      { marginTop: 1 },
  datePickerWrap:   { padding: 16 },
  pickerMonthRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  pickerNavBtn:     { padding: 8 },
  pickerLabelBtn:   { flexDirection: 'row', alignItems: 'center' },
  pickerMonthLabel: { fontSize: 15, fontFamily: Fonts.bold },
  dayCircle:        { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayText:          { fontSize: 13, fontFamily: Fonts.semiBold },
  monthGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  monthChip:        { width: '30%', paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  monthChipText:    { fontSize: 13, fontFamily: Fonts.semiBold },
  // Cards
  cardChip:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  cardChipText:      { fontSize: 13, fontFamily: Fonts.semiBold },
  cardTypeBadge:     { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  cardTypeBadgeText: { fontSize: 10, fontFamily: Fonts.bold },
  noCardsPrompt:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  noCardsPromptText: { fontSize: 13, fontFamily: Fonts.semiBold },
});
