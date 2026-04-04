import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  addDoc,
  collection,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../context/ToastContext';
import { useTransactions } from '../../hooks/useTransactions';
import { useCards } from '../../hooks/useCards';
import { Fonts } from '../../config/fonts';
import type { Transaction } from '../../types/transaction';

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  food:          { icon: '🍽️', color: '#EF4444' },
  transport:     { icon: '🚗', color: '#F59E0B' },
  health:        { icon: '💊', color: '#10B981' },
  entertainment: { icon: '🎉', color: '#8B5CF6' },
  shopping:      { icon: '🛍️', color: '#EC4899' },
  home:          { icon: '🏡', color: '#00897B' },
  salary:        { icon: '💰', color: '#00ACC1' },
  other:         { icon: '📌', color: '#737879' },
};

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Comida',
  transport: 'Transporte',
  health: 'Salud',
  entertainment: 'Ocio',
  shopping: 'Compras',
  home: 'Hogar',
  salary: 'Salario',
  other: 'Otro',
};

const EXPENSE_CATEGORIES = ['food', 'transport', 'health', 'entertainment', 'shopping', 'home', 'other'];
const INCOME_CATEGORIES = ['salary', 'other'];

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

interface DayGroup {
  dateKey: string;
  label: string;
  items: Transaction[];
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function groupByDay(transactions: Transaction[]): DayGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = localDateKey(tx.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return Array.from(map.entries()).map(([key, items]) => {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const weekday = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()];
    return { dateKey: key, label: `${weekday} ${d}`, items };
  });
}

// ── Edit Bottom Sheet ─────────────────────────────────────────────────────────

type EditAction = 'saved' | 'deleted' | 'duplicated';

interface EditSheetProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onActionDone: (action: EditAction) => void;
}

function EditTransactionSheet({ visible, transaction, onClose, onActionDone }: EditSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const SHEET_HEIGHT = Math.round(screenHeight * 0.82);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Pre-fill when transaction changes
  useEffect(() => {
    if (transaction) {
      setEditDesc(transaction.description);
      setEditAmount(String(transaction.amount));
      setEditCategory(transaction.category);
      setEditError('');
      setConfirmingDelete(false);
    }
  }, [transaction]);

  const animateIn = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const animateOut = useCallback((callback: () => void) => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 280,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => callback());
  }, [slideAnim]);

  useEffect(() => {
    if (visible) {
      animateIn();
    }
  }, [visible, animateIn]);

  const handleClose = useCallback(() => {
    animateOut(() => {
      slideAnim.setValue(0);
      onClose();
    });
  }, [animateOut, onClose, slideAnim]);

  const handleSave = async () => {
    if (!transaction) return;
    const parsed = parseFloat(editAmount.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) return;

    setEditLoading(true);
    setEditError('');
    try {
      await updateDoc(doc(db, 'transactions', transaction.id), {
        description: editDesc,
        amount: parsed,
        category: editCategory,
      });
      handleClose();
      onActionDone('saved');
    } catch {
      setEditError(t('history.edit.saveError'));
      setEditLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!transaction) return;
    const parsed = parseFloat(editAmount.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) return;

    setEditLoading(true);
    setEditError('');
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: transaction.userId,
        type: transaction.type,
        amount: parsed,
        category: editCategory,
        description: editDesc.trim(),
        date: Timestamp.fromDate(transaction.date),
        createdAt: Timestamp.fromDate(new Date()),
      });
      handleClose();
      onActionDone('duplicated');
    } catch {
      setEditError(t('history.edit.saveError'));
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    setEditLoading(true);
    setEditError('');
    try {
      await deleteDoc(doc(db, 'transactions', transaction.id));
      handleClose();
      onActionDone('deleted');
    } catch {
      setEditError(t('history.edit.deleteError'));
      setEditLoading(false);
    }
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_HEIGHT, 0],
  });

  const activeCategories = transaction?.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const parsedAmount = parseFloat(editAmount.replace(',', '.'));
  const isSaveDisabled = editLoading || isNaN(parsedAmount) || parsedAmount <= 0 || editCategory === '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.55],
              }),
            },
          ]}
        />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheetWrapper,
          { height: SHEET_HEIGHT, transform: [{ translateY }] },
        ]}
        pointerEvents="box-none"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={[styles.sheet, { backgroundColor: colors.surface, height: SHEET_HEIGHT }]}>
            {/* Drag handle */}
            <View style={styles.dragHandleRow}>
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
            </View>

            {/* Title row */}
            <View style={styles.titleRow}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                {t('history.edit.title')}
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
              contentContainerStyle={styles.sheetScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Description */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                {t('history.edit.descriptionLabel').toUpperCase()}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  value={editDesc}
                  onChangeText={setEditDesc}
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                />
              </View>

              {/* Amount */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                {t('history.edit.amountLabel').toUpperCase()}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  value={editAmount}
                  onChangeText={setEditAmount}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
              </View>

              {/* Category */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                {t('history.edit.categoryLabel').toUpperCase()}
              </Text>
              <View style={styles.categoryGrid}>
                {activeCategories.map((key) => {
                  const meta = CATEGORY_META[key] ?? CATEGORY_META.other;
                  const isSelected = editCategory === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.categoryChip,
                        isSelected
                          ? { backgroundColor: colors.primary }
                          : {
                              backgroundColor: colors.backgroundSecondary,
                              borderWidth: 1,
                              borderColor: colors.border,
                            },
                      ]}
                      onPress={() => setEditCategory(key)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.chipIcon}>{meta.icon}</Text>
                      <Text
                        style={[
                          styles.chipLabel,
                          { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                        ]}
                      >
                        {CATEGORY_LABELS[key] ?? key}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Error */}
              {editError !== '' && (
                <Text style={[styles.errorText, { color: colors.error }]}>{editError}</Text>
              )}

              {/* Save button */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                  isSaveDisabled && styles.buttonDisabled,
                ]}
                onPress={handleSave}
                disabled={isSaveDisabled}
                activeOpacity={0.85}
              >
                {editLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>{t('history.edit.saving')}</Text>
                  </View>
                ) : (
                  <Text style={styles.saveButtonText}>{t('history.edit.saveButton')}</Text>
                )}
              </TouchableOpacity>

              {/* Secondary actions row */}
              <View style={styles.secondaryRow}>
                {/* Duplicate */}
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor: colors.surface,
                      borderWidth: 1.5,
                      borderColor: colors.primary,
                      flex: 1,
                    },
                    isSaveDisabled && styles.buttonDisabled,
                  ]}
                  onPress={handleDuplicate}
                  disabled={isSaveDisabled}
                  activeOpacity={0.8}
                >
                  <Ionicons name="copy-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                    {t('history.edit.duplicateButton')}
                  </Text>
                </TouchableOpacity>

                {/* Delete / Confirm */}
                {confirmingDelete ? (
                  <View style={[styles.confirmDeleteWrap, { flex: 1.4 }]}>
                    <Text style={[styles.confirmDeleteText, { color: colors.error }]}>
                      {t('history.edit.confirmDelete')}
                    </Text>
                    <View style={styles.confirmDeleteBtns}>
                      <TouchableOpacity
                        style={[styles.confirmBtn, { backgroundColor: colors.error }]}
                        onPress={handleDelete}
                        disabled={editLoading}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.confirmBtnText, { color: '#FFFFFF' }]}>
                          {t('history.edit.confirmDeleteYes')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.confirmBtn,
                          {
                            backgroundColor: colors.backgroundSecondary,
                            borderWidth: 1,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => setConfirmingDelete(false)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.confirmBtnText, { color: colors.textSecondary }]}>
                          {t('history.edit.confirmDeleteCancel')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      { backgroundColor: colors.errorLight, flex: 1 },
                    ]}
                    onPress={() => setConfirmingDelete(true)}
                    disabled={editLoading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.error} style={{ marginRight: 6 }} />
                    <Text style={[styles.secondaryButtonText, { color: colors.error }]}>
                      {t('history.edit.deleteButton')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// ── Transaction Row ──────────────────────────────────────────────────────────

interface TransactionRowProps {
  item: Transaction;
  isLast: boolean;
  onLongPress: (tx: Transaction) => void;
  cardsMap: Record<string, { bankName: string; lastFour: string; type: string }>;
}

function TransactionRow({ item, isLast, onLongPress, cardsMap }: TransactionRowProps) {
  const { colors } = useTheme();
  const cat = CATEGORY_META[item.category] ?? CATEGORY_META.other;
  const isExpense = item.type === 'expense';
  const card = item.cardId ? cardsMap[item.cardId] : null;
  const descLabel = item.isInstallment
    ? `${item.description} (Cuota ${item.installmentNumber}/${item.installmentTotal})`
    : item.description;

  return (
    <TouchableOpacity
      onLongPress={() => onLongPress(item)}
      delayLongPress={350}
      activeOpacity={0.7}
      style={[
        styles.txRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <View style={[styles.txIconWrap, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={styles.txIconText}>{cat.icon}</Text>
      </View>
      <View style={styles.txMeta}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={[styles.txTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {descLabel}
          </Text>
          {item.isFixed && (
            <View style={[styles.fixedBadge, { backgroundColor: colors.primaryLight ?? `${colors.primary}22` }]}>
              <Text style={[styles.fixedBadgeText, { color: colors.primary }]}>Fijo</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          <Text style={[styles.txTime, { color: colors.textTertiary }]}>
            {CATEGORY_LABELS[item.category] ?? item.category}
          </Text>
          {card && (
            <View style={[styles.txCardChip, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.txCardChipText, { color: colors.primary }]}>
                {`${card.bankName} ••${card.lastFour}`}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Text style={[styles.txAmount, { color: isExpense ? colors.error : colors.secondary }]}>
        {isExpense ? `−${formatCurrency(item.amount)}` : `+${formatCurrency(item.amount)}`}
      </Text>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { cards } = useCards(user?.uid ?? '');
  const cardsMap = Object.fromEntries(cards.map((c) => [c.id, c]));
  const { showToast } = useToast();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const MIN_YEAR = 2020;

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Siempre volver al mes actual al entrar
  useFocusEffect(useCallback(() => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setActiveFilter('all');
    setSearchQuery('');
    setMonthPickerOpen(false);
  }, []));

  const { transactions, totalIncome, totalExpenses, balance, loading } = useTransactions(
    user?.uid ?? '',
    year,
    month,
    refreshKey
  );

  // Month navigation helpers
  const resetFilters = () => {
    setActiveFilter('all');
    setSearchQuery('');
  };

  const goToPrevMonth = () => {
    resetFilters();
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    if (isCurrentMonth) return;
    resetFilters();
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const handleLongPress = useCallback((tx: Transaction) => {
    setEditingTx(tx);
    setSheetVisible(true);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSheetVisible(false);
    setEditingTx(null);
  }, []);

  const handleActionDone = useCallback((action: EditAction) => {
    setRefreshKey((k) => k + 1);
    if (action === 'saved')      showToast('Cambios guardados', 'success');
    if (action === 'deleted')    showToast('Transacción eliminada', 'success');
    if (action === 'duplicated') showToast('Transacción duplicada', 'info');
  }, [showToast]);

  const filteredTransactions = transactions
    .filter(t => activeFilter === 'all' || t.type === activeFilter)
    .filter(t => searchQuery.trim() === '' || t.description.toLowerCase().includes(searchQuery.toLowerCase()));

  const groups = groupByDay(filteredTransactions);

  const toggleFilter = (f: 'income' | 'expense') => {
    setActiveFilter(prev => prev === f ? 'all' : f);
  };

  const nowForPicker = new Date();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.backgroundSecondary }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('history.title')}
        </Text>
      </View>

      {/* Month navigation */}
      <View style={[styles.monthNav, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMonthPickerOpen(v => !v)}
          style={styles.monthNavLabelBtn}
          activeOpacity={0.7}
        >
          <Text style={[styles.monthNavLabel, { color: colors.primary }]}>
            {MONTHS_ES[month].toUpperCase()} {year}
          </Text>
          <Ionicons name={monthPickerOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goToNextMonth}
          style={styles.monthNavBtn}
          activeOpacity={isCurrentMonth ? 1 : 0.7}
          disabled={isCurrentMonth}
        >
          <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? colors.border : colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Month/year picker inline */}
      {monthPickerOpen && (
        <View style={[styles.monthPickerWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Year navigation */}
          <View style={styles.pickerYearRow}>
            <TouchableOpacity
              onPress={() => setYear(y => Math.max(MIN_YEAR, y - 1))}
              style={styles.pickerNavBtn}
              activeOpacity={year <= MIN_YEAR ? 1 : 0.7}
            >
              <Ionicons name="chevron-back" size={20} color={year <= MIN_YEAR ? colors.border : colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.pickerYearLabel, { color: colors.textPrimary }]}>{year}</Text>
            <TouchableOpacity
              onPress={() => setYear(y => Math.min(nowForPicker.getFullYear(), y + 1))}
              style={styles.pickerNavBtn}
              activeOpacity={year >= nowForPicker.getFullYear() ? 1 : 0.7}
              disabled={year >= nowForPicker.getFullYear()}
            >
              <Ionicons name="chevron-forward" size={20} color={year >= nowForPicker.getFullYear() ? colors.border : colors.textPrimary} />
            </TouchableOpacity>
          </View>
          {/* Month grid 3×4 */}
          <View style={styles.monthPickerGrid}>
            {MONTHS_ES.map((name, idx) => {
              const isFuture = year === nowForPicker.getFullYear() && idx > nowForPicker.getMonth();
              const isSelected = idx === month && year === year;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.monthPickerChip,
                    { backgroundColor: isSelected ? colors.primary : colors.backgroundSecondary },
                    isFuture && { opacity: 0.3 },
                  ]}
                  onPress={() => { if (!isFuture) { resetFilters(); setMonth(idx); setMonthPickerOpen(false); } }}
                  disabled={isFuture}
                  activeOpacity={isFuture ? 1 : 0.8}
                >
                  <Text style={[styles.monthPickerChipText, { color: isSelected ? '#fff' : colors.textPrimary }]}>
                    {name.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Summary card */}
      {!loading && (
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Balance row */}
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Balance del mes</Text>
            <Text style={[styles.balanceValue, {
              color: balance > 0 ? colors.secondary : balance < 0 ? colors.error : colors.textTertiary,
            }]}>
              {balance > 0 ? '+' : ''}{formatCurrency(balance)}
            </Text>
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

          {/* Income / Expense tabs */}
          <View style={styles.summaryTabs}>
            <TouchableOpacity
              style={[
                styles.summaryTab,
                activeFilter === 'income' && { backgroundColor: colors.secondary + '22', borderRadius: 10 },
              ]}
              onPress={() => toggleFilter('income')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-down" size={13} color={colors.secondary} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {t('history.incomeLabel')}:
              </Text>
              <Text style={[styles.summaryValue, { color: colors.secondary }]}>
                {formatCurrency(totalIncome)}
              </Text>
            </TouchableOpacity>

            <View style={[styles.summaryVerticalDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={[
                styles.summaryTab,
                activeFilter === 'expense' && { backgroundColor: colors.error + '18', borderRadius: 10 },
              ]}
              onPress={() => toggleFilter('expense')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up" size={13} color={colors.error} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {t('history.expensesLabel')}:
              </Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>
                {formatCurrency(totalExpenses)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search input */}
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar transacción..."
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {t('history.noTransactions')}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {t('history.noTransactionsSub')}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {groups.map((group) => (
            <View key={group.dateKey} style={styles.daySection}>
              <Text style={[styles.dayLabel, { color: colors.textTertiary }]}>{group.label}</Text>
              <View style={[styles.txCard, { backgroundColor: colors.surface }]}>
                {group.items.map((tx, i) => (
                  <TransactionRow
                    key={tx.id}
                    item={tx}
                    isLast={i === group.items.length - 1}
                    onLongPress={handleLongPress}
                    cardsMap={cardsMap}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Edit Sheet */}
      <EditTransactionSheet
        visible={sheetVisible}
        transaction={editingTx}
        onClose={handleSheetClose}
        onActionDone={handleActionDone}
      />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: Fonts.bold,
  },

  // Month navigation
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 10,
  },
  monthNavBtn: {
    padding: 6,
  },
  monthNavLabelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthNavLabel: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  monthPickerWrap: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  pickerYearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerNavBtn: { padding: 8 },
  pickerYearLabel: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  monthPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthPickerChip: {
    width: '30%',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  monthPickerChipText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
    paddingVertical: 0,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Summary card
  summaryCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  balanceLabel: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  balanceValue: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  summaryDivider: {
    height: 1,
  },
  summaryTabs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  summaryValue: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  summaryVerticalDivider: {
    width: 1,
    height: 16,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 120,
  },

  // Day group
  daySection: {
    marginBottom: 16,
  },
  dayLabel: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingLeft: 4,
  },
  txCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },

  // Transaction row
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  txIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconText: { fontSize: 18 },
  txMeta: { flex: 1 },
  txTitle: { fontSize: 14, fontFamily: Fonts.semiBold, marginBottom: 2 },
  txTime: { fontSize: 12, fontFamily: Fonts.regular },
  txAmount: { fontSize: 14, fontFamily: Fonts.bold },
  txCardChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  txCardChipText: { fontSize: 10, fontFamily: Fonts.semiBold },
  fixedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fixedBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 42, marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontFamily: Fonts.semiBold, marginBottom: 6 },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Sheet ──────────────────────────────────────────────────────────────────
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
  sheetTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  sheetScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Fields
  fieldLabel: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textInput: {
    fontSize: 15,
    fontFamily: Fonts.regular,
  },

  // Category chips
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
    marginTop: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipIcon: { fontSize: 14 },
  chipLabel: { fontSize: 13, fontFamily: Fonts.medium },

  // Error
  errorText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginBottom: 8,
  },

  // Buttons
  saveButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  buttonDisabled: { opacity: 0.4 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Secondary actions
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },

  // Confirm delete
  confirmDeleteWrap: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  confirmDeleteText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    textAlign: 'center',
  },
  confirmDeleteBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
});
