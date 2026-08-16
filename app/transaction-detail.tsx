import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { scrollFadeMask } from '../components/ScrollFadeEdges';
import { useRouter } from 'expo-router';
import { goBack } from '../utils/nav';
import AppHeader from '../components/AppHeader';
import CategoryIcon from '../components/CategoryIcon';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import BankLogo from '../components/BankLogo';
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
  arrayUnion,
  orderBy,
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
import { useCards } from '../hooks/useCards';
import { useTransactions } from '../hooks/useTransactions';
import { localeFor } from '../utils/dateLocale';
import { effectiveAmount, splitBreakdown } from '../utils/sharedCalc';
import { initialsOf } from '../utils/txRelation';
import { amountInk, blend, inkOn, inkOnFill } from '../utils/detailInk';
import { addMonths, fixedTimeline, installmentPlan, nextMonthSameDay, type ChipState } from '../utils/detailFacts';
import { categoryLabel } from '../constants/categories';
import type { Transaction } from '../types/transaction';
import { formatMoney } from '../utils/formatMoney';

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  food: 'tools-kitchen',
  transport: 'car',
  health: 'pill',
  entertainment: 'confetti',
  shopping: 'shopping-bag',
  home: 'home',
  salary: 'cash',
  other: 'pin',
};

/** Máximo de chips del plan de cuotas / historial del fijo antes de resumir. */
const MAX_CHIPS = 12;
/** Movimientos relacionados que se listan antes del enlace «ver todos». */
const MAX_RELATED = 3;

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = formatMoney;

function getActualId(transaction: { id: string; isVirtualFixed?: boolean }): string {
  if (transaction.isVirtualFixed) {
    return transaction.id.split('_virtual_')[0];
  }
  return transaction.id;
}

// ── Piezas de presentación ───────────────────────────────────────────────────

/** Sello del estado. Vive FUERA del recorte de la ficha héroe (la ficha necesita
 * `overflow:hidden` por la barra de progreso del borde inferior). */
function Stamp({ text, ink }: { text: string; ink: string }) {
  return (
    <View style={styles.stampWrap} pointerEvents="none">
      <View style={[styles.stamp, { borderColor: ink }]}>
        <Text style={[styles.stampText, { color: ink }]}>{text}</Text>
      </View>
    </View>
  );
}

function Tile({ label, labelColor, surface, border, children }: {
  label: string; labelColor: string; surface: string; border: string; children: React.ReactNode;
}) {
  return (
    <View style={[styles.tile, { backgroundColor: surface, borderColor: border }]}>
      <Text style={[styles.tileLabel, { color: labelColor }]} numberOfLines={1}>{label}</Text>
      {children}
    </View>
  );
}

function Module({ label, labelColor, surface, border, children, onPress }: {
  label: string; labelColor: string; surface: string; border: string;
  children: React.ReactNode; onPress?: () => void;
}) {
  const Wrapper: React.ElementType = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.module, { backgroundColor: surface, borderColor: border }]}
      {...(onPress ? { onPress, activeOpacity: 0.75 } : {})}
    >
      <Text style={[styles.moduleLabel, { color: labelColor }]}>{label}</Text>
      {children}
    </Wrapper>
  );
}

function Chips({ items, colors }: {
  items: { label: string; state: ChipState }[];
  colors: { offBg: string; offInk: string; doneBg: string; doneInk: string; nowBg: string; nowInk: string };
}) {
  return (
    <View style={styles.chipRow}>
      {items.map((it, i) => {
        const bg = it.state === 'now' ? colors.nowBg : it.state === 'done' ? colors.doneBg : colors.offBg;
        const ink = it.state === 'now' ? colors.nowInk : it.state === 'done' ? colors.doneInk : colors.offInk;
        return (
          <View key={`${it.label}-${i}`} style={[styles.chip, { backgroundColor: bg }]}>
            <Text style={[
              styles.chipText,
              { color: ink },
              it.state === 'skipped' && styles.chipSkipped,
            ]}>
              {it.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
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
    setSelectedTransaction,
  } = useHistoryStore();

  const { user } = useAuthStore();
  const currentUserUid = user?.uid ?? '';
  const { categories } = useCategories(currentUserUid);
  const { cards } = useCards(currentUserUid);
  const { transactions: monthTx, totalExpenses, totalIncome, balance, loading: monthLoading } = useTransactions(
    currentUserUid,
    viewYear,
    viewMonth,
  );
  const { deleteSharedTransaction } = useSharedTransactions();
  const { deleteSentIncome } = useSentIncome();
  const { showToast } = useToast();

  type DeleteStep = 'idle' | 'scope' | 'confirm';
  type DeleteScope = 'single' | 'fromNow' | 'all';

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle');
  const [deleteScope, setDeleteScope] = useState<DeleteScope>('fromNow');

  const transitionRef = useRef<ScreenTransitionRef>(null);

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
          // Para que el dueño abra el historial en el mes del movimiento.
          txYear: transaction.date.getFullYear(),
          txMonth: transaction.date.getMonth(),
        },
        read: false,
        createdAt: Timestamp.now(),
      });
      setDeleteLoading(false);
      setLastAction('deleted');
      goBack();
      showToast(t('sharedExpense.deleteRequestSent'), 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[handleRequestDeletion] ' + msg);
      showToast(t('history.edit.deleteError'), 'error');
      setDeleteLoading(false);
    }
  }, [transaction, currentUserUid, currentUserName, user, setLastAction, router, showToast, t]);

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
          txYear: transaction.date.getFullYear(),
          txMonth: transaction.date.getMonth(),
        },
        read: false,
        createdAt: Timestamp.now(),
      });
      setDeleteLoading(false);
      setLastAction('deleted');
      goBack();
      showToast(t('sentIncome.deleteRequestSent'), 'success');
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
    goBack();
  }, [transaction, setPendingEditTx, router]);

  const handleDuplicate = useCallback(async () => {
    if (!transaction) return;
    setDuplicateLoading(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: transaction.userId,
        type: transaction.type,
        // `effectiveAmount` y no `amount`: en un compartido sin cuotas `amount` es el
        // total del grupo, así que duplicar creaba un gasto propio por el total.
        amount: effectiveAmount(transaction),
        category: transaction.category,
        description: transaction.description,
        ...(transaction.notes ? { notes: transaction.notes } : {}),
        date: Timestamp.fromDate(transaction.date),
        createdAt: Timestamp.fromDate(new Date()),
        ...(transaction.cardId ? { cardId: transaction.cardId } : {}),
      });
      setDuplicateLoading(false);
      setLastAction('duplicated');
      goBack();
    } catch {
      setDuplicateLoading(false);
      showToast(t('history.edit.duplicateError'), 'error');
    }
  }, [transaction, setLastAction, router, showToast, t]);

  const handleDeletePress = useCallback(() => {
    if (!transaction) return;
    // `handleDelete` ramifica primero por compartido / ingreso enviado y borra la
    // operación ENTERA para todos los implicados: ofrecer aquí un alcance ("solo
    // este mes", "solo esta cuota") prometía algo que no ocurre, y la confirmación
    // llegaba a describir lo contrario de lo que iba a pasar.
    if (transaction.isShared && transaction.sharedId) {
      setDeleteStep('confirm');
    } else if (transaction.sentIncomeTransactionId || transaction.isSentIncome) {
      setDeleteStep('confirm');
    } else if (transaction.isFixed) {
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
        const { orphaned } = await deleteSharedTransaction({
          sharedId: transaction.sharedId,
          currentUserUid,
          currentUserName,
          currentUserDisplayName: user?.displayName ?? currentUserName,
          description: transaction.description,
        });
        // Fallback: si deleteSharedTransaction no borró nuestra tx (coord doc inexistente).
        // Si YA fue borrada por el batch anterior, el deleteDoc falla silenciosamente.
        try {
          await deleteDoc(doc(db, 'transactions', getActualId(transaction)));
        } catch {
          // Ya eliminada por deleteSharedTransaction — OK
        }
        if (orphaned > 0) {
          // Alguna copia sobrevivió (sin permiso, sin red): decir "eliminado" sería
          // mentir, porque los demás lo siguen viendo en su balance.
          showToast(t('sharedExpense.deletePartial'), 'error');
          setDeleteLoading(false);
          setLastAction('deleted');
          goBack();
          return;
        }
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
          const key = `${viewYear}_${viewMonth}`;
          await updateDoc(doc(db, 'transactions', txId), {
            fixedSkipMonths: arrayUnion(key),
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
          if (transaction.installmentNumber == null) {
            showToast(t('history.edit.deleteError'), 'error');
            setDeleteLoading(false);
            return;
          }
          const q = query(
            collection(db, 'transactions'),
            where('userId', '==', currentUserUid),
            where('installmentGroupId', '==', transaction.installmentGroupId),
            where('installmentNumber', '>=', transaction.installmentNumber),
            orderBy('installmentNumber', 'asc'),
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
      goBack();
      setTimeout(() => showToast(t('history.edit.deleteSuccess'), 'success'), 350);
    } catch (e) {
      console.error('[handleDelete]', e);
      setDeleteLoading(false);
      showToast(t('history.edit.deleteError'), 'error');
    }
  }, [transaction, currentUserUid, currentUserName, user, viewYear, viewMonth, deleteScope,
      deleteSharedTransaction, deleteSentIncome, setLastAction, router, showToast, t]);

  useEffect(() => {
    if (!transaction) {
      if (router.canGoBack()) {
        goBack();
      } else {
        router.replace('/(tabs)/');
      }
    }
  }, [transaction, router]);

  /** Abrir otro movimiento relacionado sin apilar pantallas: se cambia el
   * seleccionado del store y se sube el scroll. Volver sigue llevando al origen. */
  const openRelated = useCallback((tx: Transaction) => {
    setSelectedTransaction(tx, {
      cardsMap,
      viewYear,
      viewMonth,
      isPastMonth,
      currentUserName,
    });
    setDeleteStep('idle');
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, [setSelectedTransaction, cardsMap, viewYear, viewMonth, isPastMonth, currentUserName]);

  const MONTHS = t('history.months', { returnObjects: true }) as string[];
  const monthLabel = MONTHS[viewMonth] ?? '';

  // ── Tintas medidas (funcionan en las 31 paletas, ver utils/detailInk) ──────
  const surface = colors.surfaceElevated;
  const ink = useMemo(() => {
    const noteBg = blend(colors.tertiary, surface, 0.1);
    const pillBg = blend(colors.primary, surface, 0.14);
    const lockBg = blend(colors.primary, colors.surface, 0.1);
    const track = blend(colors.textTertiary, surface, 0.28);
    return {
      label: inkOn(surface, colors.textTertiary),
      soft: inkOn(surface, colors.textSecondary),
      expense: amountInk(surface, colors.expense),
      income: amountInk(surface, colors.secondary),
      brand: inkOn(surface, colors.primary),
      neutral: inkOn(surface, colors.textTertiary),
      onPrimary: inkOnFill(colors.primary, colors.onPrimary, colors.textPrimary),
      onDanger: inkOnFill(colors.error, '#FFFFFF', colors.textPrimary),
      secondaryLabel: inkOn(colors.surface, colors.primary),
      noteBg,
      noteInk: inkOn(noteBg, colors.textSecondary),
      noteLabel: inkOn(noteBg, colors.textTertiary),
      pillBg,
      pillInk: inkOn(pillBg, colors.primary),
      lockBg,
      lockInk: inkOn(lockBg, colors.primary),
      track,
      barBrand: inkOn(track, colors.primary),
      barExpense: inkOn(track, colors.expense),
      barIncome: inkOn(track, colors.secondary),
      chipDoneBg: blend(colors.primary, surface, 0.22),
      chipDoneInk: inkOn(blend(colors.primary, surface, 0.22), colors.primary),
      chipOffBg: blend(colors.textTertiary, surface, 0.16),
      chipOffInk: inkOn(blend(colors.textTertiary, surface, 0.16), colors.textSecondary),
      dangerSoft: blend(colors.error, colors.surface, 0.14),
      border: isDark ? blend(colors.primary, surface, 0.14) : colors.border,
    };
  }, [colors, surface, isDark]);

  // ── Datos derivados del mes (todo con lo que ya está cargado) ──────────────
  const derived = useMemo(() => {
    if (!transaction) return null;
    const isExpense = transaction.type === 'expense';
    const mine = effectiveAmount(transaction);
    const catKey = transaction.category;
    const sameType = monthTx.filter((tx) => tx.type === transaction.type);
    const sameCat = sameType.filter((tx) => tx.category === catKey);
    const catTotal = sameCat.reduce((s, tx) => s + effectiveAmount(tx), 0);
    const related = sameCat.filter((tx) => tx.id !== transaction.id);
    const monthTotal = isExpense ? totalExpenses : totalIncome;
    const catPct = monthTotal > 0 ? Math.round((catTotal / monthTotal) * 100) : 0;
    const minePct = monthTotal > 0 ? Math.round((mine / monthTotal) * 100) : 0;

    const card = transaction.cardId ? cards.find((c) => c.id === transaction.cardId) : undefined;
    const cardTx = card ? monthTx.filter((tx) => tx.cardId === card.id && tx.type === 'expense') : [];
    const cardSpent = cardTx.reduce((s, tx) => s + effectiveAmount(tx), 0);

    // Cuotas: `amount` YA es la cuota que te toca (ver docs/contexto/errores-conocidos.md)
    const instTotal = transaction.installmentTotal ?? 0;
    const instNum = transaction.installmentNumber ?? 0;
    const instPaid = mine * Math.max(0, instNum);
    const instLeft = mine * Math.max(0, instTotal - instNum);
    const instNext = nextMonthSameDay(transaction.date);
    const planChips = installmentPlan(transaction.date, instNum, instTotal, MAX_CHIPS)
      .map((c) => ({ label: (MONTHS[c.month] ?? '').slice(0, 3).toUpperCase(), state: c.state }));

    // Fijo: la vida del gasto se cuenta desde su creación real
    const fixedFrom = transaction.createdAt ?? transaction.date;
    const timeline = transaction.isFixed
      ? fixedTimeline(fixedFrom, viewYear, viewMonth, transaction.fixedSkipMonths ?? [], MAX_CHIPS)
      : { chips: [], months: 0, skipped: 0 };
    const fixedChips = timeline.chips
      .map((c) => ({ label: (MONTHS[c.month] ?? '').slice(0, 3).toUpperCase(), state: c.state }));
    const fixedMonths = timeline.months;
    const fixedPaidMonths = Math.max(0, timeline.months - timeline.skipped);
    const fixedPaidTotal = mine * fixedPaidMonths;

    const isOwner = transaction.sharedOwnerUid === currentUserUid;
    const participants = transaction.sharedParticipants ?? [];
    const ownerP = participants.find((p) => p.uid === transaction.sharedOwnerUid);
    // `||` y no `??`: un displayName vacío debe caer al userName, no quedarse en blanco
    const ownerName = ownerP?.displayName || ownerP?.userName || transaction.sharedOwnerUserName || '';
    const peopleNames = participants.length
      ? participants
          .map((p) => (p.uid === currentUserUid ? t('sharedExpense.you') : (p.displayName || p.userName || '…')))
          .join(', ')
      : '';

    const relatedPerson = transaction.isSentIncome
      ? (transaction.sentByName ?? '')
      : transaction.sentIncomeTransactionId
        ? (transaction.sentIncomeToName ?? '')
        : '';
    const personTx = relatedPerson
      ? monthTx.filter((tx) => tx.id !== transaction.id && (
          tx.sentByName === relatedPerson ||
          tx.sentIncomeToName === relatedPerson ||
          (tx.sharedParticipants ?? []).some((p) => (p.displayName || p.userName) === relatedPerson)
        ))
      : [];

    return {
      isExpense, mine, catKey, catTotal, catPct, minePct, monthTotal, related, catCount: sameCat.length,
      card, cardSpent, cardCount: cardTx.length,
      instTotal, instNum, instPaid, instLeft, instNext, planChips,
      fixedFrom, fixedMonths, fixedChips, fixedPaidMonths, fixedPaidTotal,
      isOwner, participants, ownerName, peopleNames,
      relatedPerson, personTx,
    };
  }, [transaction, monthTx, totalExpenses, totalIncome, cards, currentUserUid, viewYear, viewMonth, MONTHS, t]);

  if (!transaction || !derived) return null;

  const {
    isExpense, mine, card, cardSpent, cardCount, catTotal, catPct, monthTotal, related, catCount,
    instTotal, instNum, instPaid, instLeft, instNext, planChips,
    fixedFrom, fixedMonths, fixedChips, fixedPaidMonths, fixedPaidTotal,
    isOwner, participants, ownerName, peopleNames, relatedPerson, personTx,
  } = derived;

  const customCat = categories.find((c) => c.id === transaction.category);
  const catIcon = CATEGORY_ICONS[transaction.category] ?? customCat?.icon ?? CATEGORY_ICONS.other;
  const catName = categoryLabel(transaction.category, categories, t);

  const isReceivedSentIncome = transaction.isSentIncome === true;
  const isSentByMe = !!transaction.sentIncomeTransactionId;
  const isClaim = transaction.sharedType === 'income_claim';
  const isGuestShared = !!transaction.isShared && !isOwner;
  const isFixedClosed = isPastMonth && !!transaction.isFixed;
  const canModify = !isReceivedSentIncome && (!transaction.isShared || isOwner);
  const isLoading = deleteLoading || duplicateLoading;

  const accent = isExpense ? ink.expense : ink.income;
  const dateLong = transaction.date.toLocaleDateString(localeFor(), {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const dateShort = transaction.date.toLocaleDateString(localeFor(), { day: 'numeric', month: 'short' });
  const timeShort = transaction.date.toLocaleTimeString(localeFor(), { hour: 'numeric', minute: '2-digit' });
  const nextMonthLabel = (MONTHS[instNext.getMonth()] ?? '').slice(0, 3).toLowerCase();
  const planEndLabel = MONTHS[addMonths(transaction.date, instTotal - instNum).getMonth()] ?? '';

  // ── Sello: un estado, un sello. Sin estado, sin sello. ────────────────────
  const stamp =
    isFixedClosed ? { text: t('history.detail.stampClosed'), ink: ink.neutral }
    : transaction.isInstallment && instTotal > 0
      ? { text: t('history.detail.stampInstallment', { current: instNum, total: instTotal }), ink: accent }
    : transaction.isFixed ? { text: t('history.detail.stampFixed'), ink: ink.brand }
    : isReceivedSentIncome ? { text: t('history.detail.stampReceived'), ink: ink.income }
    : isSentByMe ? { text: t('history.detail.stampSent'), ink: ink.expense }
    : transaction.isShared && isClaim
      ? { text: isOwner ? t('history.detail.stampOwed') : t('history.detail.stampYouOwe'),
          ink: isOwner ? ink.income : ink.expense }
    : isGuestShared && ownerName
      ? { text: t('history.detail.stampFrom', { name: ownerName.split(' ')[0].toUpperCase() }), ink: ink.brand }
    : transaction.isShared && participants.length > 1
      ? { text: t('history.detail.stampShared', { n: participants.length }), ink: ink.brand }
    : null;

  const kicker =
    transaction.isShared && isClaim
      ? (isOwner ? t('history.detail.kickerOwed') : t('history.detail.kickerYouOwe', { name: ownerName }))
    : isReceivedSentIncome ? t('history.detail.kickerReceived')
    : isSentByMe ? t('history.detail.kickerSent')
    : transaction.isShared ? t('history.detail.kickerShared')
    : transaction.isFixed ? t('history.detail.kickerFixed', { category: catName })
    : `${isExpense ? t('history.detail.typeExpense') : t('history.detail.typeIncome')} · ${catName}`;

  const subline =
    isReceivedSentIncome && transaction.sentByName
      ? t('history.detail.subSentBy', { name: transaction.sentByName, date: dateLong })
    : isSentByMe && transaction.sentIncomeToName
      ? t('history.detail.subSentTo', { name: transaction.sentIncomeToName, date: dateLong })
    : transaction.isShared && transaction.isInstallment && instTotal > 0
      ? t('history.detail.subInstallmentShared', { current: instNum, total: instTotal, people: participants.length })
    : transaction.isShared && isClaim && isOwner
      ? t('history.detail.subToCollect', { total: formatCurrency(transaction.amount), people: participants.length })
    : isGuestShared
      ? t('history.detail.subCreatedBy', { total: formatCurrency(transaction.amount), name: ownerName })
    : transaction.isShared
      ? t('history.detail.subYourPart', { total: formatCurrency(transaction.amount), people: participants.length })
    : transaction.isInstallment && instTotal > 0
      ? t('history.detail.subInstallment', { current: instNum, total: instTotal, date: dateLong })
    : isFixedClosed ? t('history.detail.subMonthClosed', { date: dateLong })
    : transaction.isFixed ? t('history.detail.subFixedRepeats', { date: dateLong })
    : `${dateLong} · ${timeShort}`;

  const figs =
    transaction.isInstallment && instTotal > 0
      ? [
          { label: t('history.detail.figPaid'), value: formatCurrency(instPaid) },
          { label: t('history.detail.figRemaining'), value: formatCurrency(instLeft) },
          { label: t('history.detail.figNext'), value: `${instNext.getDate()} ${nextMonthLabel}` },
        ]
      : transaction.isFixed
        ? [
            { label: t('history.detail.figSince'),
              value: `${(MONTHS[fixedFrom.getMonth()] ?? '').slice(0, 3).toLowerCase()} ${fixedFrom.getFullYear()}` },
            { label: t('history.detail.figMonths'), value: String(fixedMonths) },
            isFixedClosed
              ? { label: t('history.detail.figStatus'), value: t('history.detail.figClosedValue') }
              : { label: t('history.detail.figNext'),
                  value: `${transaction.date.getDate()} ${(MONTHS[(viewMonth + 1) % 12] ?? '').slice(0, 3).toLowerCase()}` },
          ]
        : null;

  const progressPct = transaction.isInstallment && instTotal > 0
    ? Math.max(4, Math.min(100, Math.round((instNum / instTotal) * 100)))
    : null;

  const peopleModule = (() => {
    if (transaction.isShared && participants.length) {
      const label = isClaim
        ? (isOwner ? t('history.detail.owesYouLabel') : t('history.detail.youOweLabel'))
        : (isOwner ? t('history.detail.sharedWithLabel') : t('history.detail.sharedByLabel'));
      // `effectiveAmount` y no `sharedAmount` a secas: en cuotas ese campo es un
      // gemelo redondeado por división plana y desvía la cifra (utils/sharedCalc).
      // Fuera de cuotas devuelve exactamente `sharedAmount`, así que no cambia nada.
      const share = mine;
      const pill = isClaim
        ? (isOwner ? t('history.detail.owedEach', { amount: formatCurrency(share) })
                   : t('history.detail.owePending', { amount: formatCurrency(share) }))
        : t('history.detail.equalSplit', { amount: formatCurrency(share) });
      // Reparto persona a persona: quién asume qué de cada cuota y del gasto entero.
      // Un 0% se enseña igual —es el dato: le llega el movimiento pero no lo asume.
      const lines = splitBreakdown(transaction).map((line) => {
        const p = participants.find((pp) => pp.uid === line.uid);
        return {
          ...line,
          name: line.uid === currentUserUid
            ? t('sharedExpense.you')
            : (p?.displayName || p?.userName || '…'),
        };
      });
      return {
        label, names: peopleNames, pill, lines,
        people: participants.map((p) => p.displayName || p.userName || ''),
      };
    }
    if (isReceivedSentIncome && transaction.sentByName) {
      return {
        label: t('sentIncome.sentByLabel'),
        names: transaction.sentByName,
        pill: t('history.detail.inYourBalance', { month: monthLabel }),
        people: [transaction.sentByName],
      };
    }
    if (isSentByMe && transaction.sentIncomeToName) {
      return {
        label: t('sentIncome.sentToLabel'),
        names: transaction.sentIncomeToName,
        pill: t('history.detail.inTheirBalance', { month: monthLabel }),
        people: [transaction.sentIncomeToName],
      };
    }
    return null;
  })();

  const contextText =
    isGuestShared && ownerName ? t('history.detail.ctxGuest', { name: ownerName })
    : isReceivedSentIncome && transaction.sentByName
      ? t('history.detail.ctxReceived', { name: transaction.sentByName })
    : isSentByMe && transaction.sentIncomeToName
      ? t('history.detail.ctxSent', { name: transaction.sentIncomeToName })
    : transaction.isShared && isClaim && isOwner
      ? t('history.detail.ctxOwed', { month: monthLabel, amount: formatCurrency(balance + mine) })
    : transaction.isShared && isClaim
      ? t('history.detail.ctxYouOwe', { month: monthLabel })
    : transaction.isShared && mine !== transaction.amount
      ? t('history.detail.ctxShared', { month: monthLabel, amount: formatCurrency(mine), total: formatCurrency(transaction.amount) })
    : transaction.isFixed && monthTotal > 0
      ? t('history.detail.ctxBiggestFixed', { pct: derived.minePct })
    : !isExpense
      ? t('history.detail.ctxIncome', { month: monthLabel, amount: formatCurrency(balance) })
    : catCount > 1
      ? t('history.detail.ctxRank', { n: catCount, category: catName, month: monthLabel, amount: formatCurrency(catTotal) })
      : t('history.detail.ctxOnly', { category: catName, month: monthLabel });

  const handleBack = () => {
    if (transitionRef.current) transitionRef.current.animateOut(() => goBack());
    else goBack();
  };

  const tiles: React.ReactNode[] = [
    <Tile key="date" label={t('history.detail.dateLabel')} labelColor={ink.label} surface={surface} border={ink.border}>
      <Text style={[styles.tileBig, { color: colors.textPrimary }]}>{transaction.date.getDate()}</Text>
      <Text style={[styles.tileSub, { color: ink.soft }]} numberOfLines={2}>
        {`${(MONTHS[transaction.date.getMonth()] ?? '').slice(0, 3).toLowerCase()} ${transaction.date.getFullYear()}`
          + (transaction.isFixed ? '' : ` · ${timeShort}`)}
      </Text>
    </Tile>,
    <Tile key="cat" label={t('history.detail.categoryLabel')} labelColor={ink.label} surface={surface} border={ink.border}>
      <View style={styles.tileIcon}><CategoryIcon icon={catIcon} size={18} color={colors.textSecondary} /></View>
      <Text style={[styles.tileSub, { color: ink.soft }]} numberOfLines={2}>
        {isClaim && !isExpense
          ? `${catName} · ${t('history.detail.catNotExpense')}`
          : monthLoading || monthTotal <= 0
            ? catName
            : `${catName} · ${isExpense
                ? t('history.detail.catShareOfMonth', { pct: derived.minePct })
                : t('history.detail.catShareOfIncome', { pct: derived.minePct })}`}
      </Text>
    </Tile>,
  ];
  if (transaction.isFixed) {
    tiles.push(
      <Tile key="repeat" label={t('history.detail.tileRepeat')} labelColor={ink.label} surface={surface} border={ink.border}>
        <Text style={[styles.tileValue, { color: colors.textPrimary }]} numberOfLines={1}>
          {t('history.detail.tileRepeatValue')}
        </Text>
        <Text style={[styles.tileSub, { color: ink.soft }]} numberOfLines={1}>
          {t('history.detail.tileRepeatDay', { day: transaction.date.getDate() })}
        </Text>
      </Tile>,
    );
  } else if (isGuestShared && ownerName) {
    tiles.push(
      <Tile key="owner" label={t('history.detail.tileCreatedBy')} labelColor={ink.label} surface={surface} border={ink.border}>
        <Text style={[styles.tileValue, { color: colors.textPrimary }]} numberOfLines={1}>{ownerName}</Text>
        <Text style={[styles.tileSub, { color: ink.soft }]} numberOfLines={1}>
          {t('history.detail.tileYouParticipate')}
        </Text>
      </Tile>,
    );
  }

  return (
    <ScreenTransition ref={transitionRef}>
    <SafeAreaView style={styles.flex}>
      <ScreenBackground style={styles.flex}>
        <AppHeader showBack onBack={handleBack} />
        <Text style={[styles.screenKicker, { color: ink.label }]}>{t('history.detail.movement')}</Text>

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          style={[styles.flex, scrollFadeMask(0, 0)]}
          contentContainerStyle={styles.scroll}
        >
          {/* ── Ficha héroe: cifra, contexto inmediato y barra de progreso al borde ── */}
          <View style={styles.heroWrap}>
            {stamp && <Stamp text={stamp.text} ink={stamp.ink} />}
            <View style={[
              styles.hero,
              { backgroundColor: surface, borderColor: ink.border },
              !figs && styles.heroFlat,
            ]}>
              <View style={styles.kickerRow}>
                <View style={[styles.kickerDot, { backgroundColor: accent }]} />
                <Text style={[styles.kicker, { color: accent }]} numberOfLines={1}>{kicker}</Text>
              </View>

              {/* adjustsFontSizeToFit no funciona en web (mismo caso que BalanceCard):
                  la cifra se escala por longitud para que SIEMPRE quepa. */}
              {(() => {
                const amountLabel = `${isExpense ? '−' : '+'}${formatCurrency(mine)}`;
                const size = amountLabel.length <= 12 ? 40 : amountLabel.length <= 15 ? 34 : amountLabel.length <= 18 ? 29 : 25;
                return (
                  <Text
                    style={[styles.amount, { color: accent, fontSize: size, lineHeight: Math.round(size * 1.12) }]}
                    numberOfLines={1}
                  >
                    {amountLabel}
                  </Text>
                );
              })()}

              <Text style={[styles.subline, { color: ink.soft }]}>{subline}</Text>

              {figs && (
                <View style={[styles.figsRow, { borderTopColor: colors.border }]}>
                  {figs.map((f) => (
                    <View key={f.label} style={styles.figCol}>
                      <Text style={[styles.figLabel, { color: ink.label }]} numberOfLines={1}>{f.label}</Text>
                      <Text
                        style={[styles.figValue, { color: colors.textPrimary }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        {f.value}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {progressPct != null && (
                <View style={[styles.progressTrack, { backgroundColor: ink.track }]}>
                  <View style={[styles.progressFill, { backgroundColor: ink.barBrand, width: `${progressPct}%` }]} />
                </View>
              )}
            </View>
          </View>

          <Text style={[styles.desc, { color: colors.textPrimary }]}>{transaction.description}</Text>

          <View style={styles.tileRow}>{tiles}</View>

          {/* ── Tarjeta: logo real del banco + lo que hoy no se veía ── */}
          {card && (
            <Module label={t('history.detail.cardLabel')} labelColor={ink.label} surface={surface} border={ink.border}>
              <View style={styles.cardRow}>
                <BankLogo bankId={card.bankId} size={40} radius={11} />
                <View style={styles.cardNames}>
                  <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {card.nickname ? `${card.bankName} · ${card.nickname}` : card.bankName}
                  </Text>
                  <Text style={[styles.cardKind, { color: ink.soft }]} numberOfLines={1}>
                    {card.type === 'credit' ? t('history.detail.creditType') : t('history.detail.debitType')}
                  </Text>
                </View>
                {!monthLoading && (
                  <View style={styles.cardSpent}>
                    <Text style={[styles.cardSpentValue, { color: colors.textPrimary }]} numberOfLines={1}>
                      {formatCurrency(cardSpent)}
                    </Text>
                    <Text style={[styles.cardSpentCaption, { color: ink.soft }]} numberOfLines={1}>
                      {t('history.detail.cardSpentCaption', { month: monthLabel })}
                    </Text>
                  </View>
                )}
              </View>
              {!monthLoading && (
              <View style={[styles.cardFoot, { borderTopColor: colors.border }]}>
                {card.type === 'credit' && card.cutoffDay != null && (
                  <View style={styles.cardFootCol}>
                    <Text style={[styles.figLabel, { color: ink.label }]}>{t('history.detail.cutoffLabel')}</Text>
                    <Text style={[styles.cardFootValue, { color: colors.textPrimary }]} numberOfLines={1}>
                      {t('history.detail.cutoffValue', { day: card.cutoffDay })}
                    </Text>
                  </View>
                )}
                <View style={styles.cardFootCol}>
                  <Text style={[styles.figLabel, { color: ink.label }]}>{t('history.detail.cardMovementsLabel')}</Text>
                  <Text style={[styles.cardFootValue, { color: colors.textPrimary }]} numberOfLines={1}>
                    {t('history.detail.cardMovementsValue', { n: cardCount })}
                  </Text>
                </View>
              </View>
              )}
            </Module>
          )}

          {/* ── Plan de cuotas ── */}
          {planChips.length > 0 && (
            <Module label={t('history.detail.planLabel')} labelColor={ink.label} surface={surface} border={ink.border}>
              <Chips items={planChips} colors={{
                offBg: ink.chipOffBg, offInk: ink.chipOffInk,
                doneBg: ink.chipDoneBg, doneInk: ink.chipDoneInk,
                nowBg: colors.primary, nowInk: ink.onPrimary,
              }} />
              <Text style={[styles.moduleText, { color: ink.soft }]}>
                {t('history.detail.planFoot', {
                  paid: instNum,
                  left: Math.max(0, instTotal - instNum),
                  month: planEndLabel,
                })}
              </Text>
            </Module>
          )}

          {/* ── Historial del fijo ── */}
          {fixedChips.length > 0 && (
            <Module label={t('history.detail.fixedHistoryLabel')} labelColor={ink.label} surface={surface} border={ink.border}>
              <Chips items={fixedChips} colors={{
                offBg: ink.chipOffBg, offInk: ink.chipOffInk,
                doneBg: ink.chipDoneBg, doneInk: ink.chipDoneInk,
                nowBg: colors.primary, nowInk: ink.onPrimary,
              }} />
              <Text style={[styles.moduleText, { color: ink.soft }]}>
                {isFixedClosed
                  ? t('history.detail.fixedHistoryClosed', { month: monthLabel })
                  : t('history.detail.fixedHistoryFoot', { count: fixedPaidMonths, amount: formatCurrency(fixedPaidTotal) })}
              </Text>
            </Module>
          )}

          {/* ── Personas ── */}
          {peopleModule && (
            <Module label={peopleModule.label} labelColor={ink.label} surface={surface} border={ink.border}>
              <View style={styles.avatarRow}>
                {peopleModule.people.slice(0, 4).map((name, i) => {
                  const bg = [colors.primary, colors.secondary, colors.tertiary][i % 3];
                  return (
                    <View
                      key={`${name}-${i}`}
                      style={[styles.avatar, {
                        backgroundColor: bg,
                        borderColor: surface,
                        marginLeft: i === 0 ? 0 : -8,
                      }]}
                    >
                      <Text style={[styles.avatarText, { color: inkOnFill(bg, colors.onPrimary, colors.textPrimary) }]}>
                        {initialsOf(name).charAt(0)}
                      </Text>
                    </View>
                  );
                })}
                <Text style={[styles.avatarNames, { color: colors.textPrimary }]} numberOfLines={2}>
                  {peopleModule.names}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: ink.pillBg }]}>
                <Text style={[styles.pillText, { color: ink.pillInk }]}>{peopleModule.pill}</Text>
              </View>

              {/* Reparto: qué porcentaje y qué importe asume cada uno */}
              {!!peopleModule.lines?.length && (
                <View style={[styles.splitBox, { borderTopColor: colors.border }]}>
                  <Text style={[styles.splitLabel, { color: ink.label }]}>
                    {transaction.isInstallment
                      ? t('history.detail.splitLabelInstallment', { current: instNum, total: instTotal })
                      : t('history.detail.splitLabel')}
                  </Text>
                  {peopleModule.lines.map((line) => (
                    <View key={line.uid} style={styles.splitRow}>
                      <Text style={[styles.splitName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {line.name}
                      </Text>
                      <Text style={[styles.splitPct, {
                        color: line.percentage === 0 ? ink.soft : ink.pillInk,
                        backgroundColor: line.percentage === 0 ? 'transparent' : ink.pillBg,
                      }]}>
                        {t('history.detail.splitPct', { pct: line.percentage })}
                      </Text>
                      <View style={styles.splitAmounts}>
                        <Text style={[styles.splitAmount, {
                          color: line.percentage === 0 ? ink.soft : colors.textPrimary,
                        }]} numberOfLines={1}>
                          {formatCurrency(line.perInstallment)}
                        </Text>
                        {transaction.isInstallment && (
                          <Text style={[styles.splitSub, { color: ink.soft }]} numberOfLines={1}>
                            {t('history.detail.splitOfTotal', { amount: formatCurrency(line.total) })}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                  {peopleModule.lines.some((l) => l.percentage === 0) && (
                    <Text style={[styles.splitFoot, { color: ink.soft }]}>
                      {t('history.detail.splitZeroFoot')}
                    </Text>
                  )}
                </View>
              )}
            </Module>
          )}

          {/* ── Contexto ── */}
          {!monthLoading && (
          <Module label={t('history.detail.contextLabel')} labelColor={ink.label} surface={surface} border={ink.border}>
            <Text style={[styles.moduleText, { color: ink.soft }]}>{contextText}</Text>
          </Module>
          )}

          {/* ── La categoría en el mes ── */}
          {!monthLoading && monthTotal > 0 && (
            <Module
              label={isExpense
                ? t('history.detail.categoryInMonth', { category: catName, month: monthLabel })
                : t('history.detail.incomeInMonth', { month: monthLabel })}
              labelColor={ink.label}
              surface={surface}
              border={ink.border}
              onPress={() => router.push({
                pathname: '/category-detail',
                params: { year: String(viewYear), month: String(viewMonth) },
              })}
            >
              <View style={[styles.barTrack, { backgroundColor: ink.track }]}>
                <View style={[styles.barFill, {
                  backgroundColor: isExpense ? ink.barExpense : ink.barIncome,
                  width: `${Math.max(2, Math.min(100, isExpense ? catPct : derived.minePct))}%`,
                }]} />
              </View>
              <View style={styles.barRow}>
                <Text style={[styles.barValue, { color: colors.textPrimary }]} numberOfLines={1}>
                  {formatCurrency(isExpense ? catTotal : monthTotal)}
                </Text>
                <Text style={[styles.barCaption, { color: ink.soft }]} numberOfLines={1}>
                  {isExpense
                    ? t('history.detail.categoryOfTotal', { total: formatCurrency(monthTotal), pct: catPct })
                    : t('history.detail.incomeShareCaption', { pct: derived.minePct })}
                </Text>
              </View>
            </Module>
          )}

          {/* ── Otros movimientos (de la categoría o de la persona) ── */}
          {(() => {
            if (monthLoading) return null;
            const list = relatedPerson && personTx.length ? personTx : related;
            if (!list.length) return null;
            const shown = list.slice(0, MAX_RELATED);
            const label = relatedPerson && personTx.length
              ? t('history.detail.otherWithPerson', { name: relatedPerson })
              : t('history.detail.otherInCategory', { category: catName, month: monthLabel });
            return (
              <Module label={label} labelColor={ink.label} surface={surface} border={ink.border}>
                {shown.map((tx, i) => {
                  const txMine = effectiveAmount(tx);
                  const txExpense = tx.type === 'expense';
                  const txCard = tx.cardId ? cardsMap[tx.cardId] : null;
                  const icon = CATEGORY_ICONS[tx.category]
                    ?? categories.find((c) => c.id === tx.category)?.icon
                    ?? CATEGORY_ICONS.other;
                  return (
                    <TouchableOpacity
                      key={tx.id}
                      onPress={() => openRelated(tx)}
                      activeOpacity={0.7}
                      style={[
                        styles.relRow,
                        i < shown.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      ]}
                    >
                      <View style={[styles.relIcon, { backgroundColor: blend(colors.primary, surface, 0.12) }]}>
                        <CategoryIcon icon={icon} size={16} color={colors.textSecondary} />
                      </View>
                      <View style={styles.relMeta}>
                        <Text style={[styles.relTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                          {tx.description}
                        </Text>
                        <Text style={[styles.relSub, { color: ink.soft }]} numberOfLines={1}>
                          {[
                            tx.date.toLocaleDateString(localeFor(), { day: 'numeric', month: 'short' }),
                            txCard?.bankName,
                          ].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <Text
                        style={[styles.relAmount, { color: txExpense ? ink.expense : ink.income }]}
                        numberOfLines={1}
                      >
                        {`${txExpense ? '−' : '+'}${formatCurrency(txMine)}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  onPress={() => router.push({
                    pathname: '/category-detail',
                    params: { year: String(viewYear), month: String(viewMonth) },
                  })}
                  activeOpacity={0.7}
                  style={styles.seeAllWrap}
                >
                  <Text style={[styles.seeAll, { color: ink.secondaryLabel }]}>
                    {list.length > MAX_RELATED
                      ? t('history.detail.seeCount', { n: list.length })
                      : t('history.detail.seeCategory')}
                  </Text>
                  <AppIcon name="chevron-forward" size={14} color={ink.secondaryLabel} />
                </TouchableOpacity>
              </Module>
            );
          })()}

          {/* ── Nota ── */}
          {!!transaction.notes && (
            <View style={[styles.note, {
              backgroundColor: ink.noteBg,
              borderColor: blend(colors.tertiary, surface, 0.32),
            }]}>
              <View style={styles.noteHead}>
                <AppIcon name="document-text-outline" size={13} color={ink.noteLabel} />
                <Text style={[styles.noteLabel, { color: ink.noteLabel }]}>{t('history.detail.notesLabel')}</Text>
              </View>
              <Text style={[styles.noteText, { color: ink.noteInk }]}>{transaction.notes}</Text>
            </View>
          )}
        </ScrollView>

        {/* ── Acciones fijas al fondo ── */}
        <View style={[
          styles.actions,
          { borderTopColor: colors.border, paddingBottom: Math.max(20, insets.bottom + 8) },
        ]}>
          {isFixedClosed ? (
            <View style={[styles.lockBox, { backgroundColor: ink.lockBg }]}>
              <AppIcon name="lock-closed-outline" size={18} color={ink.lockInk} />
              <Text style={[styles.lockText, { color: ink.lockInk }]}>{t('history.edit.fixedLocked')}</Text>
            </View>
          ) : deleteStep === 'scope' ? (
            <View style={[styles.scopeWrap, { backgroundColor: surface, borderColor: ink.border }]}>
              <Text style={[styles.scopeTitle, { color: colors.textPrimary }]}>
                {t('history.edit.scopePickerTitle')}
              </Text>
              {(transaction.isFixed
                ? ([
                    ['single', t('history.edit.scopeOnlyThis'), t('history.edit.scopeOnlyThisDesc')],
                    ['fromNow', t('history.edit.scopeFromNow'), t('history.edit.scopeFromNowDesc')],
                    ['all', t('history.edit.scopeAll'), t('history.edit.scopeAllDesc')],
                  ] as const)
                : ([
                    ['single', t('history.edit.scopeOnlyThisInstallment'), t('history.edit.scopeOnlyThisInstallmentDesc')],
                    ['fromNow', t('history.edit.scopeFromNowInstallment'), t('history.edit.scopeFromNowInstallmentDesc')],
                  ] as const)
              ).map(([scope, label, desc]) => {
                const selected = deleteScope === scope;
                return (
                  <TouchableOpacity
                    key={scope}
                    onPress={() => setDeleteScope(scope as DeleteScope)}
                    activeOpacity={0.75}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[styles.scopeOption, {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? blend(colors.primary, colors.surface, 0.1) : colors.surface,
                    }]}
                  >
                    <View style={[styles.radio, { borderColor: selected ? colors.primary : ink.label }]}>
                      {selected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.scopeLabel, { color: colors.textPrimary }]}>{label}</Text>
                      <Text style={[styles.scopeDesc, { color: ink.soft }]}>{desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.error }]}
                  onPress={() => setDeleteStep('confirm')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.btnText, { color: ink.onDanger }]}>{t('history.edit.scopeContinue')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border }]}
                  onPress={() => setDeleteStep('idle')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.btnText, { color: ink.soft }]}>{t('history.edit.confirmDeleteCancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : deleteStep === 'confirm' ? (
            <View style={[styles.confirmWrap, {
              backgroundColor: ink.dangerSoft,
              borderColor: blend(colors.error, colors.surface, 0.32),
            }]}>
              <Text style={[styles.confirmText, { color: inkOn(ink.dangerSoft, colors.error) }]}>
                {isReceivedSentIncome
                  ? t('sentIncome.deleteRequestConfirm')
                  : transaction.isShared && !isOwner
                  ? t('sharedExpense.deleteRequestConfirm')
                  // Un compartido a cuotas se borra ENTERO para todos: la rama de
                  // `isInstallment` de abajo prometía "solo esta cuota".
                  : transaction.isShared && transaction.isInstallment
                  ? t('sharedExpense.deleteConfirmInstallments', { count: transaction.installmentTotal ?? 0 })
                  : transaction.isShared
                  ? t('sharedExpense.deleteConfirm')
                  : transaction.sentIncomeTransactionId || transaction.isSentIncome
                  ? t('sentIncome.deleteConfirmBoth')
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
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.error }, isLoading && styles.btnDisabled]}
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
                    ? <ActivityIndicator size="small" color={ink.onDanger} />
                    : <Text style={[styles.btnText, { color: ink.onDanger }]}>
                        {isReceivedSentIncome || (transaction.isShared && !isOwner)
                          ? t('sharedExpense.deleteRequestButton')
                          : t('history.edit.confirmDeleteYes')}
                      </Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border }]}
                  onPress={() => setDeleteStep(transaction.isFixed || transaction.isInstallment ? 'scope' : 'idle')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.btnText, { color: ink.soft }]}>{t('history.edit.confirmDeleteCancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : !canModify ? (
            // ponytail: btnRow para que flex:1 + height 52 del botón apliquen en eje horizontal
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[
                  styles.btn,
                  { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary },
                  isLoading && styles.btnDisabled,
                ]}
                onPress={() => setDeleteStep('confirm')}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <AppIcon name="mail-outline" size={18} color={ink.secondaryLabel} />
                <Text style={[styles.btnText, { color: ink.secondaryLabel }]}>
                  {t('sharedExpense.deleteRequestButton')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }, isLoading && styles.btnDisabled]}
                onPress={handleEdit}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <AppIcon name="create-outline" size={18} color={ink.onPrimary} />
                <Text style={[styles.btnText, { color: ink.onPrimary }]}>{t('history.detail.editButton')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btn,
                  { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary },
                  isLoading && styles.btnDisabled,
                ]}
                onPress={handleDuplicate}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {duplicateLoading
                  ? <ActivityIndicator size="small" color={ink.secondaryLabel} />
                  : <AppIcon name="copy-outline" size={18} color={ink.secondaryLabel} />}
                <Text style={[styles.btnText, { color: ink.secondaryLabel }]}>
                  {t('history.edit.duplicateButton')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: ink.dangerSoft }, isLoading && styles.btnDisabled]}
                onPress={handleDeletePress}
                disabled={isLoading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={transaction.isFixed
                  ? t('history.edit.cancelFixedButton')
                  : t('history.edit.deleteButton')}
              >
                {deleteLoading
                  ? <ActivityIndicator size="small" color={inkOn(ink.dangerSoft, colors.error)} />
                  : <AppIcon name="trash-outline" size={20} color={inkOn(ink.dangerSoft, colors.error)} />}
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
  flex: { flex: 1 },
  screenKicker: {
    fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 1.6,
    paddingHorizontal: 20, marginTop: -6, marginBottom: 2,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 28, width: '100%', maxWidth: 768, alignSelf: 'center' },

  // Ficha héroe
  heroWrap: { position: 'relative', marginTop: 22 },
  hero: {
    borderRadius: 20, borderWidth: 1, paddingTop: 18, paddingHorizontal: 16,
    overflow: 'hidden', position: 'relative',
  },
  heroFlat: { paddingBottom: 16 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  kickerDot: { width: 6, height: 6, borderRadius: 3 },
  kicker: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1.6, textTransform: 'uppercase', flexShrink: 1 },
  amount: {
    fontSize: 40, fontFamily: Fonts.extraBold, letterSpacing: -1.8, marginTop: 12,
    includeFontPadding: false, fontVariant: ['tabular-nums'],
  },
  subline: { fontSize: 12.5, fontFamily: Fonts.regular, lineHeight: 18, marginTop: 8 },
  figsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 15, paddingTop: 14, paddingBottom: 16, borderTopWidth: 1 },
  figCol: { flex: 1 },
  figLabel: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1.2, textTransform: 'uppercase' },
  figValue: { fontSize: 14, fontFamily: Fonts.bold, marginTop: 4, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  progressTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3 },
  progressFill: { height: 3 },

  // Sello — fuera del recorte de la ficha
  stampWrap: { position: 'absolute', right: -4, top: -16, zIndex: 3 },
  stamp: { borderWidth: 2, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, transform: [{ rotate: '-9deg' }] },
  stampText: { fontSize: 10.5, fontFamily: Fonts.extraBold, letterSpacing: 0.9, lineHeight: 13, textAlign: 'center' },

  desc: { fontSize: 17, fontFamily: Fonts.bold, marginTop: 16 },

  // Teselas
  tileRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tile: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 12 },
  tileLabel: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1.3, textTransform: 'uppercase' },
  tileBig: { fontSize: 21, fontFamily: Fonts.extraBold, letterSpacing: -0.8, marginTop: 5, fontVariant: ['tabular-nums'] },
  tileValue: { fontSize: 14, fontFamily: Fonts.bold, marginTop: 6 },
  tileIcon: { marginTop: 5 },
  tileSub: { fontSize: 10, fontFamily: Fonts.regular, lineHeight: 14, marginTop: 3 },

  // Módulos anchos
  module: { borderRadius: 18, borderWidth: 1, padding: 14, marginTop: 10 },
  moduleLabel: { fontSize: 9.5, fontFamily: Fonts.bold, letterSpacing: 1.5, textTransform: 'uppercase' },
  moduleText: { fontSize: 12.5, fontFamily: Fonts.regular, lineHeight: 19, marginTop: 8 },

  // Tarjeta
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  cardNames: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 13.5, fontFamily: Fonts.bold },
  cardKind: { fontSize: 11, fontFamily: Fonts.regular, marginTop: 2 },
  cardSpent: { alignItems: 'flex-end', maxWidth: '38%' },
  cardSpentValue: { fontSize: 14, fontFamily: Fonts.extraBold, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  cardSpentCaption: { fontSize: 10, fontFamily: Fonts.regular, marginTop: 2 },
  cardFoot: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  cardFootCol: { flex: 1 },
  cardFootValue: { fontSize: 12.5, fontFamily: Fonts.bold, marginTop: 3, fontVariant: ['tabular-nums'] },

  // Chips de plan / historial
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 },
  chip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  chipText: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.3 },
  chipSkipped: { textDecorationLine: 'line-through' },

  // Personas
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginTop: 9 },
  avatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarText: { fontSize: 10, fontFamily: Fonts.bold },
  avatarNames: { flex: 1, fontSize: 12, fontFamily: Fonts.semiBold, marginLeft: 10 },
  pill: { alignSelf: 'flex-start', borderRadius: 50, paddingHorizontal: 11, paddingVertical: 5, marginTop: 9 },
  pillText: { fontSize: 11, fontFamily: Fonts.bold, fontVariant: ['tabular-nums'] },

  // Reparto por persona
  splitBox: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  splitLabel: { fontSize: 9.5, fontFamily: Fonts.bold, letterSpacing: 0.7 },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  splitName: { flex: 1, minWidth: 0, fontSize: 12.5, fontFamily: Fonts.semiBold },
  splitPct: {
    fontSize: 10.5, fontFamily: Fonts.bold, fontVariant: ['tabular-nums'],
    borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden',
  },
  splitAmounts: { alignItems: 'flex-end', maxWidth: '42%' },
  splitAmount: { fontSize: 12.5, fontFamily: Fonts.bold, letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
  splitSub: { fontSize: 10, fontFamily: Fonts.regular, marginTop: 1, fontVariant: ['tabular-nums'] },
  splitFoot: { fontSize: 10.5, fontFamily: Fonts.regular, lineHeight: 15, marginTop: 6 },

  // Barra de la categoría
  barTrack: { height: 8, borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  barValue: { fontSize: 14, fontFamily: Fonts.extraBold, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  barCaption: { fontSize: 11, fontFamily: Fonts.regular, fontVariant: ['tabular-nums'], flexShrink: 1 },

  // Movimientos relacionados
  relRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  relIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  relMeta: { flex: 1, minWidth: 0 },
  relTitle: { fontSize: 12.5, fontFamily: Fonts.semiBold },
  relSub: { fontSize: 10.5, fontFamily: Fonts.regular, marginTop: 1 },
  relAmount: { fontSize: 12.5, fontFamily: Fonts.bold, letterSpacing: -0.2, fontVariant: ['tabular-nums'], maxWidth: '34%' },
  seeAllWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 11, paddingBottom: 2 },
  seeAll: { fontSize: 11.5, fontFamily: Fonts.bold },

  // Nota
  note: { borderRadius: 18, borderWidth: 1, padding: 14, marginTop: 10 },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteLabel: { fontSize: 9.5, fontFamily: Fonts.bold, letterSpacing: 1.5, textTransform: 'uppercase' },
  noteText: { fontSize: 12.5, fontFamily: Fonts.regular, lineHeight: 19, marginTop: 7 },

  // Acciones
  actions: { paddingHorizontal: 15, paddingTop: 15, borderTopWidth: 1, width: '100%', maxWidth: 768, alignSelf: 'center' },
  btnRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  btn: {
    flex: 1, height: 52, borderRadius: 50, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnText: { fontSize: 14, fontFamily: Fonts.bold },
  btnDisabled: { opacity: 0.45 },
  iconBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },

  lockBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, padding: 15 },
  lockText: { flex: 1, fontSize: 12, fontFamily: Fonts.semiBold, lineHeight: 17 },

  // Selector de alcance y confirmación — ancho completo, objetivos táctiles reales
  scopeWrap: { borderRadius: 16, borderWidth: 1, padding: 14 },
  scopeTitle: { fontSize: 13, fontFamily: Fonts.bold, marginBottom: 10 },
  scopeOption: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1.5, borderRadius: 14, padding: 12, marginBottom: 8,
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  radioDot: { width: 9, height: 9, borderRadius: 5 },
  scopeLabel: { fontSize: 13, fontFamily: Fonts.bold },
  scopeDesc: { fontSize: 11, fontFamily: Fonts.regular, lineHeight: 15, marginTop: 2 },
  confirmWrap: { borderRadius: 16, borderWidth: 1, padding: 16 },
  confirmText: { fontSize: 13, fontFamily: Fonts.semiBold, lineHeight: 19, textAlign: 'center', marginBottom: 14 },
});
