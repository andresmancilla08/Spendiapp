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
  PanResponder,
} from 'react-native';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { useHistoryStore } from '../../store/historyStore';
import AppHeader from '../../components/AppHeader';
import PageTitle from '../../components/PageTitle';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import ScreenBackground from '../../components/ScreenBackground';
import { useSharedTransactions } from '../../hooks/useSharedTransactions';
import { getUserProfile } from '../../hooks/useUserProfile';
import ScreenTransition from '../../components/ScreenTransition';

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

const EXPENSE_CATEGORIES = ['food', 'transport', 'health', 'entertainment', 'shopping', 'home', 'other'];
const INCOME_CATEGORIES = ['salary', 'other'];

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

function groupByDay(transactions: Transaction[], weekdays: string[]): DayGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = localDateKey(tx.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return Array.from(map.entries()).map(([key, items]) => {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const weekday = weekdays[date.getDay()];
    // Unpaid (income + unpaid expenses) primero, paid expenses al final
    const sorted = [
      ...items.filter(tx => tx.type === 'income' || !tx.isPaid),
      ...items.filter(tx => tx.type === 'expense' && tx.isPaid === true),
    ];
    return { dateKey: key, label: `${weekday} ${d}`, items: sorted };
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extrae el ID real de Firestore (las copias virtuales tienen id = "realId_virtual_year_month") */
function getActualId(transaction: Transaction): string {
  if (transaction.isVirtualFixed) {
    return transaction.id.split('_virtual_')[0];
  }
  return transaction.id;
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

  const CATEGORY_LABELS: Record<string, string> = {
    food: t('categories.names.food'),
    transport: t('categories.names.transport'),
    health: t('categories.names.health'),
    entertainment: t('categories.names.entertainment'),
    shopping: t('categories.names.shopping'),
    home: t('categories.names.home'),
    salary: t('categories.names.salary'),
    other: t('categories.names.other'),
  };

  const slideAnim = useRef(new Animated.Value(0)).current;

  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  // Pre-fill when transaction changes
  useEffect(() => {
    if (transaction) {
      setEditDesc(transaction.description);
      setEditAmount(String(transaction.amount));
      setEditCategory(transaction.category);
      setEditError('');
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
      await updateDoc(doc(db, 'transactions', getActualId(transaction)), {
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
              {/* Nota gasto fijo */}
              {transaction?.isVirtualFixed && (
                <View style={[styles.fixedNoteBar, { backgroundColor: `${colors.primary}18` }]}>
                  <Ionicons name="repeat" size={14} color={colors.primary} />
                  <Text style={[styles.fixedNoteText, { color: colors.primary }]}>
                    {t('history.edit.fixedNote')}
                  </Text>
                </View>
              )}

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
  onPress: (tx: Transaction) => void;
  onLongPress: (tx: Transaction) => void;
  cardsMap: Record<string, { bankName: string; nickname: string; type: string }>;
  onTogglePaid?: (tx: Transaction) => void;
  paidLoading?: boolean;
}

function TransactionRow({ item, isLast, onPress, onLongPress, cardsMap, onTogglePaid, paidLoading }: TransactionRowProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const cat = CATEGORY_META[item.category] ?? CATEGORY_META.other;
  const CATEGORY_LABELS: Record<string, string> = {
    food: t('categories.names.food'),
    transport: t('categories.names.transport'),
    health: t('categories.names.health'),
    entertainment: t('categories.names.entertainment'),
    shopping: t('categories.names.shopping'),
    home: t('categories.names.home'),
    salary: t('categories.names.salary'),
    other: t('categories.names.other'),
  };
  const isExpense = item.type === 'expense';
  const isPaid = item.isPaid === true;
  const card = item.cardId ? cardsMap[item.cardId] : null;
  const descLabel = item.isInstallment
    ? `${item.description} (${t('history.installmentChip', { n: item.installmentNumber, total: item.installmentTotal })})`
    : item.description;

  const ACTION_WIDTH = 70;
  const SWIPE_THRESHOLD = 45;
  const swipeX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const snapClose = useCallback(() => {
    Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, bounciness: 6, speed: 18 }).start();
    isOpen.current = false;
  }, [swipeX]);

  const snapOpen = useCallback(() => {
    Animated.spring(swipeX, { toValue: -ACTION_WIDTH, useNativeDriver: true, bounciness: 6, speed: 18 }).start();
    isOpen.current = true;
  }, [swipeX]);

  // Auto-close when paid state changes (after toggle)
  useEffect(() => {
    snapClose();
  }, [isPaid, snapClose]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 8,
      onPanResponderMove: (_, gs) => {
        const base = isOpen.current ? -ACTION_WIDTH : 0;
        const next = Math.max(Math.min(base + gs.dx, 0), -ACTION_WIDTH);
        swipeX.setValue(next);
      },
      onPanResponderRelease: (_, gs) => {
        const base = isOpen.current ? -ACTION_WIDTH : 0;
        if (base + gs.dx < -SWIPE_THRESHOLD) {
          snapOpen();
        } else {
          snapClose();
        }
      },
    })
  ).current;

  const handleActionPress = useCallback(() => {
    snapClose();
    setTimeout(() => onTogglePaid?.(item), 180);
  }, [snapClose, onTogglePaid, item]);

  const rowBg = isPaid ? colors.primaryLight : colors.surface;
  const amountColor = isExpense ? (isPaid ? colors.primaryDark : colors.error) : colors.secondary;

  return (
    <View
      style={[
        styles.txSwipeContainer,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
        isExpense && !isPaid && { borderRightWidth: 4, borderRightColor: colors.primaryDark },
      ]}
    >
      {/* Action button — revealed on swipe left */}
      {isExpense && (
        <TouchableOpacity
          onPress={handleActionPress}
          disabled={paidLoading}
          activeOpacity={0.85}
          style={[
            styles.txActionBtn,
            { width: ACTION_WIDTH, backgroundColor: colors.primary },
          ]}
        >
          <Ionicons name={isPaid ? 'close-circle-outline' : 'checkmark-circle-outline'} size={22} color="#FFFFFF" />
          <Text style={[styles.txActionLabel, { fontFamily: Fonts.semiBold }]}>
            {isPaid ? t('history.swipe.unmark') : t('history.swipe.mark')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Swipeable row content */}
      <Animated.View
        {...(isExpense ? panResponder.panHandlers : {})}
        style={[{ transform: [{ translateX: isExpense ? swipeX : 0 }] }]}
      >
        <TouchableOpacity
          onPress={() => onPress(item)}
          onLongPress={() => onLongPress(item)}
          delayLongPress={350}
          activeOpacity={0.7}
          style={[styles.txRow, { backgroundColor: rowBg }]}
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
                  <Text style={[styles.fixedBadgeText, { color: colors.primary }]}>{t('history.fixedBadge')}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              <Text style={[styles.txTime, { color: colors.textTertiary }]}>
                {CATEGORY_LABELS[item.category] ?? item.category}
              </Text>
              {card && (
                <View style={[styles.txCardChip, {
                  backgroundColor: card.type === 'credit'
                    ? `${colors.primary}18`
                    : `${colors.tertiary}18`,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }]}>
                  <Text style={[styles.txCardChipText, {
                    color: card.type === 'credit' ? colors.primary : colors.tertiary,
                  }]}>
                    {card.nickname ? `${card.bankName} · ${card.nickname}` : card.bankName}
                  </Text>
                  <View style={[styles.txCardTypeBadge, {
                    backgroundColor: card.type === 'credit'
                      ? `${colors.primary}28`
                      : `${colors.tertiary}28`,
                  }]}>
                    <Text style={[styles.txCardTypeBadgeText, {
                      color: card.type === 'credit' ? colors.primary : colors.tertiary,
                    }]}>
                      {card.type === 'credit'
                        ? t('history.detail.creditType')[0]
                        : t('history.detail.debitType')[0]}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
          {/* Chip ingreso recibido de un amigo */}
          {item.isSentIncome && item.sentByName ? (
            <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
              {paidLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ minWidth: 60 }} />
              ) : (
                <Text style={[styles.txAmount, { color: amountColor }]}>
                  {`+${formatCurrency(item.amount)}`}
                </Text>
              )}
              <View style={[styles.sentIncomeChip, { backgroundColor: `${colors.secondary}18`, borderColor: `${colors.secondary}28` }]}>
                <Ionicons name="gift-outline" size={11} color={colors.secondary} />
                <Text style={[styles.sentIncomeChipText, { color: colors.secondary }]} numberOfLines={1}>
                  {t('sentIncome.chip.sentBy', { name: item.sentByName })}
                </Text>
              </View>
            </View>
          ) : item.sentIncomeTransactionId && item.sentIncomeToName ? (
            /* Chip gasto enviado como ingreso a un amigo */
            <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
              {paidLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ minWidth: 60 }} />
              ) : (
                <Text style={[styles.txAmount, { color: amountColor }]}>
                  {`−${formatCurrency(item.amount)}`}
                </Text>
              )}
              <View style={[styles.sentIncomeChip, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}28` }]}>
                <Ionicons name="send-outline" size={11} color={colors.primary} />
                <Text style={[styles.sentIncomeChipText, { color: colors.primary }]} numberOfLines={1}>
                  {t('sentIncome.chip.sentTo', { name: item.sentIncomeToName })}
                </Text>
              </View>
            </View>
          ) : paidLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ minWidth: 60 }} />
          ) : (
            <Text style={[styles.txAmount, { color: amountColor }]}>
              {isExpense
                ? `−${formatCurrency(item.isShared && item.sharedAmount != null ? item.sharedAmount : item.amount)}`
                : `+${formatCurrency(item.amount)}`}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
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
  const { deleteSharedTransaction } = useSharedTransactions();
  const [currentUserName, setCurrentUserName] = useState('');

  useEffect(() => {
    if (user?.uid) {
      getUserProfile(user.uid).then((p) => { if (p) setCurrentUserName(p.userName); });
    }
  }, [user?.uid]);

  const MONTHS = t('history.months', { returnObjects: true }) as string[];
  const WEEKDAYS = t('history.weekdays', { returnObjects: true }) as string[];

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [sharedFilter, setSharedFilter] = useState<'all' | 'shared' | 'notShared'>('all');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const MIN_YEAR = 2020;

  const { setSelectedTransaction, pendingEditTx, setPendingEditTx, lastAction, setLastAction } = useHistoryStore();

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [paidLoadingId, setPaidLoadingId] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // Siempre volver al mes actual al entrar
  useFocusEffect(useCallback(() => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setActiveFilter('all');
    setSearchQuery('');
    setPaidFilter('all');
    setSharedFilter('all');
    setFilterPanelOpen(false);
    setMonthPickerOpen(false);
  }, []));

  // Manejar acciones pendientes desde la pantalla de detalle
  useFocusEffect(useCallback(() => {
    if (pendingEditTx) {
      setPendingEditTx(null);
      setEditingTx(pendingEditTx);
      setSheetVisible(true);
    }
    if (lastAction) {
      setLastAction(null);
      setRefreshKey((k) => k + 1);
      if (lastAction === 'saved')      showToast(t('history.toasts.saved'), 'success');
      if (lastAction === 'deleted')    showToast(t('history.toasts.deleted'), 'success');
      if (lastAction === 'duplicated') showToast(t('history.toasts.duplicated'), 'info');
    }
  }, [pendingEditTx, setPendingEditTx, lastAction, setLastAction, showToast, t]));

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
    setPaidFilter('all');
    setSharedFilter('all');
    setFilterPanelOpen(false);
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

  const MAX_YEAR = now.getFullYear() + 2;

  const goToNextMonth = () => {
    resetFilters();
    if (month === 11) {
      if (year >= MAX_YEAR) return;
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const isPastMonth = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth());

  const handleTapTx = useCallback((tx: Transaction) => {
    setSelectedTransaction(tx, {
      cardsMap,
      viewYear: year,
      viewMonth: month,
      isPastMonth,
      currentUserName,
    });
    router.push('/transaction-detail');
  }, [setSelectedTransaction, cardsMap, year, month, isPastMonth, currentUserName]);

  const handleLongPress = useCallback((tx: Transaction) => {
    if (tx.isFixed && isPastMonth) return; // fijos pasados: bloqueados
    setEditingTx(tx);
    setSheetVisible(true);
  }, [isPastMonth]);

  const handleSheetClose = useCallback(() => {
    setSheetVisible(false);
    setEditingTx(null);
  }, []);

  const handleActionDone = useCallback((action: EditAction) => {
    setRefreshKey((k) => k + 1);
    if (action === 'saved')      showToast(t('history.toasts.saved'), 'success');
    if (action === 'deleted')    showToast(t('history.toasts.deleted'), 'success');
    if (action === 'duplicated') showToast(t('history.toasts.duplicated'), 'info');
  }, [showToast, t]);

  const handleTogglePaid = useCallback(async (tx: Transaction) => {
    const actualId = getActualId(tx);
    setPaidLoadingId(actualId);
    try {
      const newValue = !tx.isPaid;
      await updateDoc(doc(db, 'transactions', actualId), { isPaid: newValue });
      setRefreshKey((k) => k + 1);
      showToast(
        newValue ? t('history.toasts.markedPaid') : t('history.toasts.markedUnpaid'),
        newValue ? 'success' : 'info'
      );
    } catch {
      showToast(t('errors.genericError'), 'error');
    } finally {
      setPaidLoadingId(null);
    }
  }, [showToast, t, db]);

  const filteredTransactions = useMemo(() =>
    transactions
      .filter(t => activeFilter === 'all' || t.type === activeFilter)
      .filter(t => searchQuery.trim() === '' || t.description.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(t => paidFilter === 'all' || (paidFilter === 'paid' ? t.isPaid === true : t.isPaid !== true))
      .filter(t => sharedFilter === 'all' || (sharedFilter === 'shared' ? t.isShared === true : t.isShared !== true)),
    [transactions, activeFilter, searchQuery, paidFilter, sharedFilter]
  );

  const groups = groupByDay(filteredTransactions, WEEKDAYS);

  // ── Animations ───────────────────────────────────────────────────────────────
  const filterAnim = useRef(new Animated.Value(0)).current;
  const [filterMounted, setFilterMounted] = useState(false);
  const summaryAnim = useRef(new Animated.Value(0)).current;
  const [summaryMounted, setSummaryMounted] = useState(false);

  useEffect(() => {
    if (filterPanelOpen) setFilterMounted(true);
    Animated.timing(filterAnim, {
      toValue: filterPanelOpen ? 1 : 0,
      duration: filterPanelOpen ? 200 : 150,
      easing: filterPanelOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => { if (!filterPanelOpen) setFilterMounted(false); });
  }, [filterPanelOpen]);

  useEffect(() => {
    if (summaryExpanded) setSummaryMounted(true);
    Animated.timing(summaryAnim, {
      toValue: summaryExpanded ? 1 : 0,
      duration: summaryExpanded ? 220 : 170,
      easing: summaryExpanded ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => { if (!summaryExpanded) setSummaryMounted(false); });
  }, [summaryExpanded]);

  const toggleSummary = () => setSummaryExpanded(prev => !prev);

  const hasActiveFilters = paidFilter !== 'all' || sharedFilter !== 'all';

  const toggleFilter = (f: 'income' | 'expense') => {
    setActiveFilter(prev => prev === f ? 'all' : f);
  };

  const nowForPicker = new Date();

  return (
    <ScreenTransition>
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground>
      <AppHeader showBack />
      <PageTitle title={t('history.title')} description={t('history.pageDesc')} />

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
            {MONTHS[month].toUpperCase()} {year}
          </Text>
          <Ionicons name={monthPickerOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goToNextMonth}
          style={styles.monthNavBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
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
              onPress={() => setYear(y => Math.min(MAX_YEAR, y + 1))}
              style={styles.pickerNavBtn}
              activeOpacity={year >= MAX_YEAR ? 1 : 0.7}
              disabled={year >= MAX_YEAR}
            >
              <Ionicons name="chevron-forward" size={20} color={year >= MAX_YEAR ? colors.border : colors.textPrimary} />
            </TouchableOpacity>
          </View>
          {/* Month grid 3×4 */}
          <View style={styles.monthPickerGrid}>
            {MONTHS.map((name, idx) => {
              const isSelected = idx === month && year === year;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.monthPickerChip,
                    { backgroundColor: isSelected ? colors.primary : colors.backgroundSecondary },
                  ]}
                  onPress={() => { resetFilters(); setMonth(idx); setMonthPickerOpen(false); }}
                  activeOpacity={0.8}
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

      {/* Summary card — colapsable */}
      {!loading && (
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header tap area: toggle */}
          <TouchableOpacity onPress={toggleSummary} activeOpacity={0.85} style={styles.balanceRow}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
              {t('history.balanceLabel').toUpperCase()}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.balanceValue, {
                color: balance > 0 ? colors.secondary : balance < 0 ? colors.error : colors.textTertiary,
              }]}>
                {balance > 0 ? '+' : ''}{formatCurrency(balance)}
              </Text>
              <Ionicons
                name={summaryExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textTertiary}
              />
            </View>
          </TouchableOpacity>

          {/* Expandable section */}
          {summaryMounted && (
            <Animated.View style={{
              opacity: summaryAnim,
              transform: [{ translateY: summaryAnim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
            }}>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
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
            </Animated.View>
          )}
        </View>
      )}

      {/* Search + Filter button */}
      <View style={styles.searchRow}>
        <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('history.searchPlaceholder')}
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
        <TouchableOpacity
          style={[
            styles.filterBtn,
            {
              backgroundColor: colors.surface,
              borderColor: hasActiveFilters ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setFilterPanelOpen(p => !p)}
          activeOpacity={0.75}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={hasActiveFilters ? colors.primary : colors.textTertiary}
          />
          {hasActiveFilters && (
            <View style={[styles.filterDot, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      {filterMounted && (
        <Animated.View
          style={[
            styles.filterPanel,
            { backgroundColor: colors.surface, borderColor: colors.border },
            {
              opacity: filterAnim,
              transform: [{ translateY: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
            },
          ]}
        >
          {/* Pago */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionLabel, { color: colors.primary }]}>
              {t('history.filters.payLabel').toUpperCase()}
            </Text>
            <View style={styles.filterSectionOptions}>
              {(['all', 'paid', 'unpaid'] as const).map((val) => (
                <TouchableOpacity
                  key={val}
                  onPress={() => setPaidFilter(p => p === val ? 'all' : val)}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Text style={[
                    styles.filterSectionOption,
                    {
                      color: paidFilter === val ? colors.textPrimary : colors.textTertiary,
                      fontFamily: paidFilter === val ? Fonts.bold : Fonts.regular,
                    },
                  ]}>
                    {t(`history.filters.${val === 'all' ? 'allLabel' : val}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.filterDivider, { backgroundColor: colors.border }]} />

          {/* Compartido */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionLabel, { color: colors.primary }]}>
              {t('history.filters.shareLabel').toUpperCase()}
            </Text>
            <View style={styles.filterSectionOptions}>
              {(['all', 'shared', 'notShared'] as const).map((val) => (
                <TouchableOpacity
                  key={val}
                  onPress={() => setSharedFilter(s => s === val ? 'all' : val)}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Text style={[
                    styles.filterSectionOption,
                    {
                      color: sharedFilter === val ? colors.textPrimary : colors.textTertiary,
                      fontFamily: sharedFilter === val ? Fonts.bold : Fonts.regular,
                    },
                  ]}>
                    {t(`history.filters.${val === 'all' ? 'allLabel' : val}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      )}


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
                    onPress={handleTapTx}
                    onLongPress={handleLongPress}
                    cardsMap={cardsMap}
                    onTogglePaid={handleTogglePaid}
                    paidLoading={paidLoadingId === getActualId(tx)}
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
      </ScreenBackground>
    </SafeAreaView>
    </ScreenTransition>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    gap: 8,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterPanel: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 6,
  },
  filterSection: {
    gap: 6,
  },
  filterSectionLabel: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
  filterSectionOptions: {
    flexDirection: 'row',
    gap: 16,
  },
  filterSectionOption: {
    fontSize: 13,
  },
  filterDivider: {
    height: 1,
    marginVertical: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
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
    marginBottom: 24,
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
  txSwipeContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  txActionBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  txActionLabel: {
    color: '#FFFFFF',
    fontSize: 10,
  },
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
  sentIncomeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 150, flexShrink: 1,
  },
  sentIncomeChipText: { fontSize: 11, fontFamily: Fonts.semiBold, flexShrink: 1 },
  txCardTypeBadge: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 5 },
  txCardTypeBadgeText: { fontSize: 9, fontFamily: Fonts.bold },
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

  // Fixed note bar
  fixedNoteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  fixedNoteText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    flex: 1,
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
    fontSize: 16,
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

  // Fixed bottom actions bar (detail sheet)
  detailFixedActions: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },

  // Action tiles (detail sheet)
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionTile: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  actionTileLabel: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
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

  // Detail sheet
  detailHero: {
    borderRadius: 24,
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
    gap: 10,
  },
  detailHeroIcon: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  // legacy — ya no se usa pero evita errores si algún ref quedó
  detailHeroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailCatIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  detailTypeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  detailTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  detailTypeBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    letterSpacing: 0.4,
  },
  detailAmount: {
    fontSize: 40,
    fontFamily: Fonts.extraBold,
    letterSpacing: -1,
  },
  detailDescription: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
  detailCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  detailRowLabel: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.5,
  },
  detailRowValue: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  detailDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  detailCardTypeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  detailCardTypeBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  detailFixedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  detailFixedBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
  },
  installmentTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  installmentFill: {
    height: 6,
    borderRadius: 3,
  },
  installmentHint: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    textAlign: 'right',
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
