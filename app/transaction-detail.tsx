import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import AppHeader from '../components/AppHeader';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import PageTitle from '../components/PageTitle';
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
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../context/ToastContext';
import { Fonts } from '../config/fonts';
import ScreenBackground from '../components/ScreenBackground';
import { useSharedTransactions } from '../hooks/useSharedTransactions';
import { useSentIncome } from '../hooks/useSentIncome';
import { useHistoryStore } from '../store/historyStore';
import { useCategories } from '../hooks/useCategories';

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

function getActualId(transaction: { id: string; isVirtualFixed?: boolean }): string {
  if (transaction.isVirtualFixed) {
    return transaction.id.split('_virtual_')[0];
  }
  return transaction.id;
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function TransactionDetailScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    selectedTransaction: transaction,
    cardsMap,
    viewYear,
    viewMonth,
    isPastMonth,
    currentUserName,
    setLastAction,
    setPendingEditTx,
  } = useHistoryStore();

  const { user } = useAuthStore();
  const currentUserUid = user?.uid ?? '';
  const { categories } = useCategories(currentUserUid);
  const customCatMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);
  const { deleteSharedTransaction } = useSharedTransactions();
  const { deleteSentIncome } = useSentIncome();
  const { showToast } = useToast();

  type DeleteStep = 'idle' | 'scope' | 'confirm';
  type DeleteScope = 'single' | 'fromNow' | 'all';

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle');
  const [deleteScope, setDeleteScope] = useState<DeleteScope>('fromNow');

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

  const handleRequestDeletion = useCallback(async () => {
    if (!transaction?.sharedId || !transaction.sharedOwnerUid) return;
    setDeleteLoading(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        toUserId: transaction.sharedOwnerUid,
        type: 'shared_delete_request',
        data: {
          fromUserId: currentUserUid,
          fromUserName: currentUserName,
          fromDisplayName: user?.displayName ?? currentUserName,
          sharedId: transaction.sharedId,
          description: transaction.description,
          sharedAmount: transaction.sharedAmount ?? 0,
        },
        read: false,
        createdAt: Timestamp.now(),
      });
      setDeleteLoading(false);
      setLastAction('deleted');
      router.back();
      setTimeout(() => showToast(t('sharedExpense.deleteRequestSent'), 'success'), 350);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[handleRequestDeletion] ' + msg);
      showToast(t('history.edit.deleteError'), 'error');
      setDeleteLoading(false);
    }
  }, [transaction, currentUserUid, currentUserName, setLastAction, router, showToast, t]);

  const handleRequestSentIncomeDeletion = useCallback(async () => {
    if (!transaction?.sentByUid) return;
    setDeleteLoading(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        toUserId: transaction.sentByUid,
        type: 'sent_income_delete_request',
        data: {
          fromUserId: currentUserUid,
          fromUserName: currentUserName,
          fromDisplayName: user?.displayName ?? currentUserName,
          transactionId: getActualId(transaction),
          description: transaction.description,
          amount: transaction.amount,
        },
        read: false,
        createdAt: Timestamp.now(),
      });
      setDeleteLoading(false);
      setLastAction('deleted');
      router.back();
      setTimeout(() => showToast(t('sentIncome.deleteRequestSent'), 'success'), 350);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[handleRequestSentIncomeDeletion] ' + msg);
      showToast(t('history.edit.deleteError'), 'error');
      setDeleteLoading(false);
    }
  }, [transaction, currentUserUid, currentUserName, user, setLastAction, router, showToast, t]);

  const handleEdit = useCallback(() => {
    if (!transaction) return;
    const txForEdit = transaction.isVirtualFixed
      ? { ...transaction, id: getActualId(transaction) }
      : transaction;
    setPendingEditTx(txForEdit);
    router.back();
  }, [transaction, setPendingEditTx, router]);

  const handleDuplicate = useCallback(async () => {
    if (!transaction) return;
    setDuplicateLoading(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: transaction.userId,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description,
        date: Timestamp.fromDate(transaction.date),
        createdAt: Timestamp.fromDate(new Date()),
        ...(transaction.cardId ? { cardId: transaction.cardId } : {}),
      });
      setDuplicateLoading(false);
      setLastAction('duplicated');
      router.back();
    } catch {
      setDuplicateLoading(false);
    }
  }, [transaction, setLastAction, router]);

  const handleDeletePress = useCallback(() => {
    if (!transaction) return;
    if (transaction.isFixed) {
      setDeleteScope('fromNow');
      setDeleteStep('scope');
    } else if (transaction.isInstallment) {
      setDeleteScope('single');
      setDeleteStep('scope');
    } else {
      setDeleteStep('confirm');
    }
  }, [transaction]);

  const handleDelete = useCallback(async () => {
    if (!transaction) return;
    setDeleteLoading(true);
    try {
      if (transaction.isShared && transaction.sharedId) {
        await deleteSharedTransaction({
          sharedId: transaction.sharedId,
          currentUserUid,
          currentUserName,
          currentUserDisplayName: user?.displayName ?? currentUserName,
          description: transaction.description,
        });
      } else if (transaction.sentIncomeTransactionId) {
        await deleteSentIncome({
          senderTransactionId: getActualId(transaction),
          incomeTransactionId: transaction.sentIncomeTransactionId,
          senderUid: currentUserUid,
          senderName: currentUserName,
          recipientUid: transaction.sentIncomeToUid ?? '',
          description: transaction.description,
          amount: transaction.amount,
        });
      } else if (transaction.isFixed) {
        const txId = getActualId(transaction);
        if (deleteScope === 'single') {
          const monthKey = `${viewYear}_${viewMonth}`;
          await updateDoc(doc(db, 'transactions', txId), {
            fixedSkipMonths: [...(transaction.fixedSkipMonths ?? []), monthKey],
          });
        } else if (deleteScope === 'fromNow') {
          await updateDoc(doc(db, 'transactions', txId), {
            fixedCancelledFrom: Timestamp.fromDate(new Date(viewYear, viewMonth, 1)),
          });
        } else {
          await deleteDoc(doc(db, 'transactions', txId));
        }
      } else if (transaction.isInstallment && transaction.installmentGroupId) {
        if (deleteScope === 'single') {
          await deleteDoc(doc(db, 'transactions', getActualId(transaction)));
        } else {
          const q = query(
            collection(db, 'transactions'),
            where('installmentGroupId', '==', transaction.installmentGroupId),
            where('installmentNumber', '>=', transaction.installmentNumber ?? 1),
          );
          const snap = await getDocs(q);
          const batch = writeBatch(db);
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } else {
        await deleteDoc(doc(db, 'transactions', getActualId(transaction)));
      }
      setDeleteLoading(false);
      setLastAction('deleted');
      router.back();
      setTimeout(() => showToast(t('history.edit.deleteSuccess'), 'success'), 350);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[handleDelete] ' + msg);
      showToast(t('history.edit.deleteError'), 'error');
      setDeleteLoading(false);
    }
  }, [transaction, currentUserUid, currentUserName, viewYear, viewMonth, deleteScope, deleteSharedTransaction, setLastAction, router]);

  useEffect(() => {
    if (!transaction) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/');
      }
    }
  }, [transaction]);

  if (!transaction) return null;

  const isExpense = transaction.type === 'expense';
  const customCat = customCatMap[transaction.category];
  const cat = CATEGORY_META[transaction.category] ?? (customCat ? { icon: customCat.icon, color: '#737879' } : CATEGORY_META.other);
  const card = transaction.cardId ? cardsMap[transaction.cardId] : null;
  const isLoading = deleteLoading || duplicateLoading;

  const formattedDate = transaction.date.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  // formatTime is defined but we keep it for potential future use
  void formatTime;

  const installmentPct = transaction.isInstallment && transaction.installmentTotal
    ? (transaction.installmentNumber ?? 0) / transaction.installmentTotal
    : 0;

  // ── Shared expense display info ──────────────────────────────────────────────
  const isOwner = transaction.sharedOwnerUid === currentUserUid;
  const isReceivedSentIncome = transaction.isSentIncome === true;
  const canModify = !isReceivedSentIncome && (!transaction.isShared || isOwner);
  const ownerParticipant = transaction.sharedParticipants?.find(
    (p) => p.uid === transaction.sharedOwnerUid,
  );
  const ownerDisplayName = ownerParticipant?.displayName ?? transaction.sharedOwnerUserName ?? '';
  const sharedOthers = (transaction.sharedParticipants ?? []).filter(
    (p) => p.uid !== currentUserUid,
  );
  const sharedNames = isOwner
    ? sharedOthers.length === 0
      ? '—'
      : sharedOthers
          .map((p) => p.displayName || p.userName)
          .join(sharedOthers.length === 2 ? ` ${t('common.and')} ` : ', ')
    : ownerDisplayName;

  const transitionRef = useRef<ScreenTransitionRef>(null);
  const handleBack = () => {
    if (transitionRef.current) {
      transitionRef.current.animateOut(() => router.back());
    } else {
      router.back();
    }
  };

  return (
    <ScreenTransition ref={transitionRef}>
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenBackground style={{ flex: 1 }}>
        <AppHeader showBack onBack={handleBack} />
        <PageTitle title={t('history.detail.title')} description={t('history.detail.pageDesc')} />

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.sheetScrollContent, { paddingBottom: 16 }]}
        >
          {/* Hero — icono, tipo, monto, descripción */}
          {(() => {
            const accentColor = isExpense ? colors.error : colors.secondary;
            return (
              <View
                style={[
                  styles.detailHero,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: accentColor + '2E',
                    ...(Platform.OS !== 'web'
                      ? {
                          shadowColor: isDark ? accentColor : '#000000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isDark ? 0.38 : 0.07,
                          shadowRadius: isDark ? 24 : 8,
                          elevation: isDark ? 12 : 4,
                        }
                      : ({
                          boxShadow: isDark
                            ? `0 8px 32px 0 ${accentColor}38`
                            : '0 4px 12px 0 rgba(0,0,0,0.08)',
                        } as any)),
                  },
                ]}
              >
                {/* Inner highlight — simula luz desde arriba, profundidad material */}
                <View
                  style={[
                    styles.detailHeroInnerHighlight,
                    {
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(255,255,255,0.60)',
                    },
                  ]}
                  pointerEvents="none"
                />

                {/* Top accent bar — stripe del color de acento */}
                <View
                  style={[styles.detailHeroTopBar, { backgroundColor: accentColor }]}
                  pointerEvents="none"
                />

                {/* Blob decorativo top-right */}
                <View
                  style={[
                    styles.detailHeroBlob,
                    {
                      backgroundColor: isDark
                        ? accentColor + '18'
                        : accentColor + '22',
                    },
                  ]}
                  pointerEvents="none"
                />

                {/* Blob secundario bottom-left */}
                <View
                  style={[
                    styles.detailHeroBlobSecondary,
                    {
                      backgroundColor: isDark
                        ? accentColor + '10'
                        : accentColor + '18',
                    },
                  ]}
                  pointerEvents="none"
                />

                {/* Icono grande centrado */}
                <View
                  style={[
                    styles.detailHeroIcon,
                    {
                      backgroundColor: isDark
                        ? accentColor + '20'
                        : accentColor + '14',
                      borderColor: accentColor + '30',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 34 }}>{cat.icon}</Text>
                </View>

                {/* Badge tipo con dot */}
                <View
                  style={[
                    styles.detailTypeBadge,
                    { backgroundColor: accentColor + '18' },
                  ]}
                >
                  <View
                    style={[styles.detailTypeDot, { backgroundColor: accentColor }]}
                  />
                  <Text
                    style={[styles.detailTypeBadgeText, { color: accentColor }]}
                  >
                    {isExpense
                      ? t('history.detail.typeExpense')
                      : t('history.detail.typeIncome')}
                  </Text>
                </View>

                {/* Monto — protagonista */}
                <Text
                  style={[styles.detailAmount, { color: accentColor }]}
                >
                  {isExpense
                    ? `−${formatCurrency(transaction.amount)}`
                    : `+${formatCurrency(transaction.amount)}`}
                </Text>

                {/* Descripción */}
                <Text
                  style={[styles.detailDescription, { color: colors.textSecondary }]}
                >
                  {transaction.description}
                </Text>
              </View>
            );
          })()}

          {/* Info rows card */}
          <View style={[
            styles.detailCardWrapper,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.primary + '20',
            },
          ]}>
            {/* Date */}
            <View style={styles.detailRow}>
              <Text style={[styles.detailRowLabel, { color: colors.textTertiary }]}>
                {t('history.detail.dateLabel')}
              </Text>
              <Text style={[styles.detailRowValue, { color: colors.textPrimary }]}>
                {formattedDate}
              </Text>
            </View>
            <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />

            {/* Category */}
            <View style={styles.detailRow}>
              <Text style={[styles.detailRowLabel, { color: colors.textTertiary }]}>
                {t('history.detail.categoryLabel')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                <Text style={[styles.detailRowValue, { color: colors.textPrimary }]}>
                  {CATEGORY_LABELS[transaction.category] ?? customCat?.name ?? transaction.category}
                </Text>
              </View>
            </View>

            {/* Card */}
            {card && (
              <>
                <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailRowLabel, { color: colors.textTertiary }]}>
                    {t('history.detail.cardLabel')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.detailRowValue, { color: colors.textPrimary }]}>
                      {card.nickname ? `${card.bankName} · ${card.nickname}` : card.bankName}
                    </Text>
                    <View style={[
                      styles.detailCardTypeBadge,
                      {
                        backgroundColor: card.type === 'credit'
                          ? `${colors.primary}18`
                          : `${colors.tertiary ?? colors.secondary}18`,
                      },
                    ]}>
                      <Text style={[
                        styles.detailCardTypeBadgeText,
                        {
                          color: card.type === 'credit'
                            ? colors.primary
                            : (colors.tertiary ?? colors.secondary),
                        },
                      ]}>
                        {card.type === 'credit'
                          ? t('history.detail.creditType')
                          : t('history.detail.debitType')}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* Installments */}
            {transaction.isInstallment && transaction.installmentTotal && (
              <>
                <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
                <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.detailRowLabel, { color: colors.textTertiary }]}>
                      {t('history.detail.installmentLabel')}
                    </Text>
                    <Text style={[styles.detailRowValue, { color: colors.textPrimary }]}>
                      {t('history.detail.installmentProgress', {
                        current: transaction.installmentNumber,
                        total: transaction.installmentTotal,
                      })}
                    </Text>
                  </View>
                  {/* Progress bar */}
                  <View style={[styles.installmentTrack, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.installmentFill,
                        {
                          backgroundColor: colors.primary,
                          width: `${Math.round(installmentPct * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.installmentHint, { color: colors.textTertiary }]}>
                    {`${transaction.installmentNumber} / ${transaction.installmentTotal}`}
                  </Text>
                </View>
              </>
            )}

            {/* Fixed */}
            {transaction.isFixed && (
              <>
                <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailRowLabel, { color: colors.textTertiary }]}>
                    {t('history.detail.fixedLabel').toUpperCase()}
                  </Text>
                  <View style={[styles.detailFixedBadge, { backgroundColor: `${colors.primary}18` }]}>
                    <Ionicons name="repeat" size={11} color={colors.primary} />
                    <Text style={[styles.detailFixedBadgeText, { color: colors.primary }]}>
                      {t('history.detail.fixedLabel')}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Shared */}
            {transaction.isShared && (
              <>
                <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailRowLabel, { color: colors.textTertiary }]}>
                    {transaction.sharedType === 'income_claim'
                      ? (isOwner ? t('history.detail.owesYouLabel') : t('history.detail.youOweLabel'))
                      : (isOwner ? t('history.detail.sharedWithLabel') : t('history.detail.sharedByLabel'))}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end', marginLeft: 16 }}>
                    <Ionicons name="people-outline" size={14} color={colors.primary} />
                    <Text
                      style={{ fontSize: 13, fontFamily: Fonts.medium, color: colors.primary, flexShrink: 1 }}
                      numberOfLines={2}
                    >
                      {sharedNames || '—'}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Ingreso recibido — quién lo envió */}
            {transaction.isSentIncome && transaction.sentByName && (
              <>
                <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailRowLabel, { color: colors.textTertiary }]}>
                    {t('sentIncome.sentByLabel')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end', marginLeft: 16 }}>
                    <Ionicons name="gift-outline" size={14} color={colors.secondary} />
                    <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: colors.secondary, flexShrink: 1 }} numberOfLines={1}>
                      {transaction.sentByName}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Gasto del remitente — a quién le envió el ingreso */}
            {transaction.sentIncomeTransactionId && transaction.sentIncomeToName && (
              <>
                <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailRowLabel, { color: colors.textTertiary }]}>
                    {t('sentIncome.sentToLabel')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end', marginLeft: 16 }}>
                    <Ionicons name="send-outline" size={14} color={colors.primary} />
                    <Text style={{ fontSize: 13, fontFamily: Fonts.medium, color: colors.primary, flexShrink: 1 }} numberOfLines={1}>
                      {transaction.sentIncomeToName}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>

        </ScrollView>

        {/* ── Acciones fijas en la parte inferior ── */}
        <View style={[styles.detailFixedActions, { borderTopColor: colors.border, paddingBottom: Math.max(20, insets.bottom + 8) }]}>
          {isPastMonth && transaction.isFixed ? (
            <View style={[styles.confirmDeleteWrap, { backgroundColor: `${colors.primary}10`, borderRadius: 16, padding: 16 }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={{ alignSelf: 'center', marginBottom: 8 }} />
              <Text style={[styles.confirmDeleteText, { color: colors.primary, textAlign: 'center' }]}>
                {t('history.edit.fixedLocked')}
              </Text>
            </View>
          ) : deleteStep === 'scope' ? (
            /* ── Scope picker ── */
            <View style={[styles.confirmDeleteWrap, { backgroundColor: colors.surfaceElevated, borderRadius: 16, padding: 14, gap: 10 }]}>
              <Text style={[styles.confirmDeleteText, { color: colors.textPrimary, fontSize: 13, marginBottom: 2 }]}>
                {t('history.edit.scopePickerTitle')}
              </Text>
              {transaction.isFixed ? (
                <>
                  {(['single', 'fromNow', 'all'] as const).map((scope) => {
                    const labels: Record<string, string> = {
                      single: t('history.edit.scopeOnlyThis'),
                      fromNow: t('history.edit.scopeFromNow'),
                      all: t('history.edit.scopeAll'),
                    };
                    const descs: Record<string, string> = {
                      single: t('history.edit.scopeOnlyThisDesc'),
                      fromNow: t('history.edit.scopeFromNowDesc'),
                      all: t('history.edit.scopeAllDesc'),
                    };
                    const selected = deleteScope === scope;
                    return (
                      <TouchableOpacity
                        key={scope}
                        onPress={() => setDeleteScope(scope)}
                        activeOpacity={0.75}
                        style={[styles.scopeOption, {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? `${colors.primary}10` : colors.surface,
                        }]}
                      >
                        <View style={[styles.scopeRadio, { borderColor: selected ? colors.primary : colors.textTertiary }]}>
                          {selected && <View style={[styles.scopeRadioDot, { backgroundColor: colors.primary }]} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.scopeLabel, { color: colors.textPrimary }]}>{labels[scope]}</Text>
                          <Text style={[styles.scopeDesc, { color: colors.textTertiary }]}>{descs[scope]}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              ) : (
                <>
                  {(['single', 'fromNow'] as const).map((scope) => {
                    const labels: Record<string, string> = {
                      single: t('history.edit.scopeOnlyThisInstallment'),
                      fromNow: t('history.edit.scopeFromNowInstallment'),
                    };
                    const descs: Record<string, string> = {
                      single: t('history.edit.scopeOnlyThisInstallmentDesc'),
                      fromNow: t('history.edit.scopeFromNowInstallmentDesc'),
                    };
                    const selected = deleteScope === scope;
                    return (
                      <TouchableOpacity
                        key={scope}
                        onPress={() => setDeleteScope(scope)}
                        activeOpacity={0.75}
                        style={[styles.scopeOption, {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? `${colors.primary}10` : colors.surface,
                        }]}
                      >
                        <View style={[styles.scopeRadio, { borderColor: selected ? colors.primary : colors.textTertiary }]}>
                          {selected && <View style={[styles.scopeRadioDot, { backgroundColor: colors.primary }]} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.scopeLabel, { color: colors.textPrimary }]}>{labels[scope]}</Text>
                          <Text style={[styles.scopeDesc, { color: colors.textTertiary }]}>{descs[scope]}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
              <View style={styles.confirmDeleteBtns}>
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: colors.error, flex: 1 }]}
                  onPress={() => setDeleteStep('confirm')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.confirmBtnText, { color: '#FFFFFF' }]}>
                    {t('history.edit.scopeContinue')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border, flex: 1 }]}
                  onPress={() => setDeleteStep('idle')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.confirmBtnText, { color: colors.textSecondary }]}>
                    {t('history.edit.confirmDeleteCancel')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : deleteStep === 'confirm' ? (
            /* ── Confirm delete ── */
            <View style={[styles.confirmDeleteWrap, { backgroundColor: colors.errorLight, borderRadius: 16, padding: 16 }]}>
              <Text style={[styles.confirmDeleteText, { color: colors.error }]}>
                {isReceivedSentIncome
                  ? t('sentIncome.deleteRequestConfirm')
                  : transaction.isShared && !isOwner
                  ? t('sharedExpense.deleteRequestConfirm')
                  : transaction.isFixed && deleteScope === 'single'
                    ? t('history.edit.scopeConfirmFixed_single')
                    : transaction.isFixed && deleteScope === 'all'
                      ? t('history.edit.scopeConfirmFixed_all')
                      : transaction.isFixed
                        ? t('history.edit.confirmCancelFixed')
                        : transaction.isInstallment && deleteScope === 'fromNow'
                          ? t('history.edit.scopeConfirmInstallment_fromNow')
                          : transaction.isInstallment
                            ? t('history.edit.scopeConfirmInstallment_single')
                            : transaction.isShared
                              ? t('sharedExpense.deleteConfirm')
                              : t('history.edit.confirmDelete')}
              </Text>
              <View style={styles.confirmDeleteBtns}>
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: colors.error, flex: 1 }]}
                  onPress={
                    isReceivedSentIncome
                      ? handleRequestSentIncomeDeletion
                      : transaction.isShared && !isOwner
                        ? handleRequestDeletion
                        : handleDelete
                  }
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {deleteLoading
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <Text style={[styles.confirmBtnText, { color: '#FFFFFF' }]}>
                        {isReceivedSentIncome || (transaction.isShared && !isOwner)
                          ? t('sharedExpense.deleteRequestButton')
                          : t('history.edit.confirmDeleteYes')}
                      </Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border, flex: 1 }]}
                  onPress={() => setDeleteStep(transaction.isFixed || transaction.isInstallment ? 'scope' : 'idle')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.confirmBtnText, { color: colors.textSecondary }]}>
                    {t('history.edit.confirmDeleteCancel')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ── Action grid ── */
            <View style={styles.actionGrid}>
              {canModify && (
                <TouchableOpacity
                  style={[styles.actionTile, { backgroundColor: `${colors.primary}15` }]}
                  onPress={handleEdit}
                  activeOpacity={0.75}
                  disabled={isLoading}
                >
                  <Ionicons name="create-outline" size={22} color={colors.primary} />
                  <Text style={[styles.actionTileLabel, { color: colors.primary }]}>
                    {t('history.detail.editButton')}
                  </Text>
                </TouchableOpacity>
              )}

              {canModify && (
                <TouchableOpacity
                  style={[
                    styles.actionTile,
                    { backgroundColor: `${colors.tertiary}18` },
                    duplicateLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleDuplicate}
                  activeOpacity={0.75}
                  disabled={isLoading}
                >
                  {duplicateLoading
                    ? <ActivityIndicator size="small" color={colors.tertiaryDark} />
                    : <Ionicons name="copy-outline" size={22} color={colors.tertiaryDark} />
                  }
                  <Text style={[styles.actionTileLabel, { color: colors.tertiaryDark }]}>
                    {t('history.edit.duplicateButton')}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.actionTile,
                  { backgroundColor: colors.errorLight },
                  deleteLoading && styles.buttonDisabled,
                ]}
                onPress={
                  isReceivedSentIncome
                    ? () => setDeleteStep('confirm')
                    : transaction.isShared && !isOwner
                      ? () => setDeleteStep('confirm')
                      : handleDeletePress
                }
                activeOpacity={0.75}
                disabled={isLoading}
              >
                {deleteLoading
                  ? <ActivityIndicator size="small" color={colors.error} />
                  : <Ionicons
                      name={
                        isReceivedSentIncome || (transaction.isShared && !isOwner)
                          ? 'mail-outline'
                          : transaction.isFixed
                            ? 'stop-circle-outline'
                            : 'trash-outline'
                      }
                      size={22}
                      color={colors.error}
                    />
                }
                <Text style={[styles.actionTileLabel, { color: colors.error }]}>
                  {isReceivedSentIncome || (transaction.isShared && !isOwner)
                    ? t('sharedExpense.deleteRequestButton')
                    : transaction.isFixed
                      ? t('history.edit.cancelFixedButton')
                      : t('history.edit.deleteButton')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScreenBackground>
    </SafeAreaView>
    </ScreenTransition>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheetScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Detail hero
  detailHero: {
    borderRadius: 24,
    borderWidth: 1.5,
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  // Borde blanco interno: simula luz desde arriba (material depth)
  detailHeroInnerHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 23,
    borderWidth: 1,
  },
  // Stripe de 3px en el tope — marca de color de acento
  detailHeroTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.85,
  },
  // Blob decorativo top-right — movimiento sin distracción
  detailHeroBlob: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -50,
    right: -38,
    opacity: 0.45,
  },
  // Blob secundario bottom-left — contrapeso visual
  detailHeroBlobSecondary: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    bottom: -28,
    left: -22,
    opacity: 0.20,
  },
  detailHeroIcon: {
    width: 76,
    height: 76,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
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
    includeFontPadding: false,
  },
  detailDescription: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
  detailCardWrapper: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
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

  // Fixed bottom actions bar
  detailFixedActions: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },

  // Action tiles
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
  buttonDisabled: { opacity: 0.4 },

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

  // Scope picker
  scopeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scopeRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scopeRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scopeLabel: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    marginBottom: 1,
  },
  scopeDesc: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    lineHeight: 14,
  },
});
