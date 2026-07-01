import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import BalanceCard from '../../components/BalanceCard';
import * as Haptics from 'expo-haptics';
import ScreenBackground from '../../components/ScreenBackground';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppIcon from '../../components/AppIcon';
import { useTranslation } from 'react-i18next';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useTransactions } from '../../hooks/useTransactions';
import { useCards } from '../../hooks/useCards';
import { Transaction } from '../../types/transaction';
import { Skeleton, SummaryCardsSkeleton, TransactionRowSkeleton } from '../../components/Skeleton';
import ProReveal from '../../components/ProReveal';
import ProCardFx from '../../components/ProCardFx';
import { useMonthlyTrend } from '../../hooks/useMonthlyTrend';
import InsightsGrid, { InsightItem } from '../../components/premium/InsightsGrid';
import CategoryBars, { CategorySegment } from '../../components/premium/CategoryBars';
import { useHistoryStore } from '../../store/historyStore';
import { Fonts } from '../../config/fonts';
import {
  isBiometricsAvailable,
  isBiometricsAppEnrolled,
  setBiometricsAppEnrolled,
  wasBiometricsOffered,
  markBiometricsOffered,
} from '../../hooks/useBiometrics';
import AppDialog from '../../components/AppDialog';
import PwaInstallBanner from '../../components/PwaInstallBanner';
import NotificationBell from '../../components/NotificationBell';
import WhatsNew, { WHATS_NEW_VERSION } from '../../components/WhatsNew';
import { getUserProfile, setWhatsNewSeen } from '../../hooks/useUserProfile';
import ScreenTransition from '../../components/ScreenTransition';
import { useCategories } from '../../hooks/useCategories';
import { categoryLabel } from '../../constants/categories';
import { categoryColor } from '../../constants/categoryColors';
import type { Category } from '../../types/category';
import { useFlags } from '../../context/FeatureFlagsContext';
import AnnouncementBanner from '../../components/AnnouncementBanner';
import { useAmountsVisibility } from '../../hooks/useAmountsVisibility';
import ExchangeRateChips from '../../components/ExchangeRateChips';


const CATEGORY_META: Record<string, { icon: string; color: string; bg: string; darkBg: string }> = {
  food:          { icon: '🍽️', color: '#EF4444', bg: '#F3F4F6', darkBg: '#252830' },
  transport:     { icon: '🚗', color: '#F59E0B', bg: '#F3F4F6', darkBg: '#252830' },
  health:        { icon: '💊', color: '#10B981', bg: '#F3F4F6', darkBg: '#252830' },
  entertainment: { icon: '🎉', color: '#8B5CF6', bg: '#F3F4F6', darkBg: '#252830' },
  shopping:      { icon: '🛍️', color: '#EC4899', bg: '#F3F4F6', darkBg: '#252830' },
  home:          { icon: '🏡', color: '#00897B', bg: '#F3F4F6', darkBg: '#252830' },
  salary:        { icon: '💰', color: '#00ACC1', bg: '#F3F4F6', darkBg: '#252830' },
  other:         { icon: '📌', color: '#737879', bg: '#F3F4F6', darkBg: '#252830' },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000 / 60);
  if (diff < 0) {
    const days = Math.floor(-diff / 1440);
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Mañana';
    return `En ${days} días`;
  }
  if (diff === 0) return 'Ahora';
  if (diff < 60) return `Hace ${diff} min`;
  if (diff < 1440) return `Hace ${Math.floor(diff / 60)} h`;
  if (diff < 2880) return 'Ayer';
  return `Hace ${Math.floor(diff / 1440)} días`;
}

function TransactionRow({ item, isLast, cardsMap, onPress, customCatMap }: {
  item: Transaction;
  isLast: boolean;
  cardsMap: Record<string, { bankName: string; nickname: string; type: string }>;
  onPress: () => void;
  customCatMap: Record<string, Category>;
}) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const customCat = customCatMap[item.category];
  const cat = CATEGORY_META[item.category] ?? (customCat ? { icon: customCat.icon, color: '#737879', bg: '#F3F4F6', darkBg: '#252830' } : CATEGORY_META.other);
  const isExpense = item.type === 'expense';
  const card = item.cardId ? cardsMap[item.cardId] : null;
  const descLabel = item.isInstallment
    ? `${item.description} (Cuota ${item.installmentNumber}/${item.installmentTotal})`
    : item.description;

  return (
    <TouchableOpacity
      style={[
        styles.txRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.txIconWrap, { backgroundColor: isDark ? cat.darkBg : cat.bg }]}>
        <Text style={styles.txIconText}>{cat.icon}</Text>
      </View>
      <View style={styles.txMeta}>
        <Text style={[styles.txTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {descLabel}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={[styles.txTime, { color: colors.textTertiary }]}>{timeAgo(item.date)}</Text>
          {card && (
            <View style={[
              styles.txCardChip,
              { backgroundColor: card.type === 'credit' ? colors.primaryLight : `${colors.tertiary}18` },
            ]}>
              <Text style={[styles.txCardChipText, { color: card.type === 'credit' ? colors.primary : colors.tertiary }]}>
                {card.nickname ? `${card.bankName} · ${card.nickname}` : card.bankName}
              </Text>
              <View style={[
                styles.txCardTypeBadge,
                { backgroundColor: card.type === 'credit' ? `${colors.primary}28` : `${colors.tertiary}28` },
              ]}>
                <Text style={[styles.txCardTypeBadgeText, { color: card.type === 'credit' ? colors.primary : colors.tertiary }]}>
                  {card.type === 'credit' ? 'C' : 'D'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
      {item.isSentIncome && item.sentByName ? (
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={[styles.txAmount, { color: colors.secondary }]}>
            {`+${formatCurrency(item.amount)}`}
          </Text>
          <View style={[styles.sentIncomeChip, { backgroundColor: `${colors.secondary}18`, borderColor: `${colors.secondary}28` }]}>
            <AppIcon name="gift-outline" size={11} color={colors.secondary} />
            <Text style={[styles.sentIncomeChipText, { color: colors.secondary }]} numberOfLines={1}>
              {t('sentIncome.chip.sentBy', { name: item.sentByName })}
            </Text>
          </View>
        </View>
      ) : item.sentIncomeTransactionId && item.sentIncomeToName ? (
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={[styles.txAmount, { color: colors.error }]}>
            {`−${formatCurrency(item.amount)}`}
          </Text>
          <View style={[styles.sentIncomeChip, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}28` }]}>
            <AppIcon name="send-outline" size={11} color={colors.primary} />
            <Text style={[styles.sentIncomeChipText, { color: colors.primary }]} numberOfLines={1}>
              {t('sentIncome.chip.sentTo', { name: item.sentIncomeToName })}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={[styles.txAmount, { color: isExpense ? colors.error : colors.secondary }]}>
          {isExpense ? `−${formatCurrency(item.amount)}` : `+${formatCurrency(item.amount)}`}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function ProSectionHeader({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.proSecRow}>
      <View style={[styles.proSecAccent, { backgroundColor: colors.primary }]} />
      <Text style={[styles.proSecTitle, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { user, isPremium } = useAuthStore();
  const { categories } = useCategories(user?.uid ?? '');
  const customCatMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);
  const { cards, loading: cardsLoading } = useCards(user?.uid ?? '');
  const cardsMap = Object.fromEntries(cards.map((c) => [c.id, c]));
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { flags } = useFlags();
  const { hidden, toggle: toggleHidden } = useAmountsVisibility();
  const { justLoggedIn, setJustLoggedIn } = useAuthStore();
  const { setSelectedTransaction, pendingEditTx, setPendingEditTx, lastAction, setLastAction } = useHistoryStore();
  const { showToast } = useToast();
  const now = new Date();
  const MONTHS = t('history.months', { returnObjects: true }) as string[];
  const MIN_YEAR = 2020;
  const MAX_YEAR = now.getFullYear() + 2;
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const isPastMonth = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth());
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // Siempre volver al mes actual al entrar al home
  useFocusEffect(useCallback(() => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    if (pendingEditTx) {
      router.push('/edit-transaction');
    }
    if (lastAction) {
      setLastAction(null);
      setRefreshKey((k) => k + 1);
    }
  }, [pendingEditTx, lastAction, setLastAction]));
  const [biometricOfferVisible, setBiometricOfferVisible] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const whatsNewChecked = useRef(false);

  useEffect(() => {
    if (!user?.uid || whatsNewChecked.current) return;
    whatsNewChecked.current = true;
    getUserProfile(user.uid)
      .then((profile) => {
        if (profile?.whatsNewSeen !== WHATS_NEW_VERSION) setShowWhatsNew(true);
      })
      .catch(() => {});
  }, [user?.uid]);

  const handleDismissWhatsNew = async () => {
    try {
      await setWhatsNewSeen(user?.uid ?? '', WHATS_NEW_VERSION);
    } catch {}
    setShowWhatsNew(false);
  };

  useEffect(() => {
    async function offerBiometrics() {
      try {
        const available = await isBiometricsAvailable();
        if (!available) return;
        const alreadyEnrolled = await isBiometricsAppEnrolled();
        if (alreadyEnrolled) return;
        const offered = await wasBiometricsOffered();
        if (offered) return;
        await markBiometricsOffered();
        setBiometricOfferVisible(true);
      } catch {
        // SecureStore failure — silently skip the offer
      }
    }
    offerBiometrics();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const { transactions, totalIncome, totalExpenses, balance, loading, error } = useTransactions(
    user?.uid ?? '',
    year,
    month,
    refreshKey
  );

  // Premium: serie de 6 meses (tendencia + comparación con mes anterior).
  const { data: trend } = useMonthlyTrend(user?.uid ?? '', year, month, 6, isPremium);

  const nameParts = user?.displayName?.split(' ') ?? ['Usuario'];
  const firstName = nameParts[0];
  const lastInitial = nameParts[1] ? ` ${nameParts[1].charAt(0)}.` : '';
  const displayName = `${firstName}${lastInitial}`;
  const photoUrl = user?.photoURL;
  const recent = transactions.slice(0, 5);

  // Animated balance counter
  const animatedBalanceValue = useRef(new Animated.Value(0)).current;
  const [displayBalance, setDisplayBalance] = useState(0);
  useEffect(() => {
    if (loading) return;
    animatedBalanceValue.removeAllListeners();
    animatedBalanceValue.addListener(({ value }) => setDisplayBalance(Math.round(value)));
    Animated.timing(animatedBalanceValue, {
      toValue: balance,
      duration: 800,
      useNativeDriver: false,
    }).start();
    return () => animatedBalanceValue.removeAllListeners();
  }, [balance, loading]);

  const handleTapTx = useCallback((tx: Transaction) => {
    setSelectedTransaction(tx, {
      cardsMap,
      viewYear: year,
      viewMonth: month,
      isPastMonth,
      currentUserName: user?.displayName ?? '',
    });
    router.push('/transaction-detail');
  }, [setSelectedTransaction, cardsMap, year, month, isPastMonth, user?.displayName]);

  // Greeting contextual por hora
  const hour = new Date().getHours();
  const greetingKey =
    hour >= 6 && hour < 12 ? 'home.greetingMorning'
    : hour >= 12 && hour < 18 ? 'home.greetingAfternoon'
    : hour >= 18 && hour < 22 ? 'home.greetingEvening'
    : 'home.greetingNight';

  // Gasto de hoy
  const today = new Date();
  const todaySpent = transactions
    .filter((tx) => {
      if (tx.type !== 'expense') return false;
      const d = tx.date instanceof Date ? tx.date : new Date(tx.date);
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  const expenseRatio = totalIncome > 0 ? totalExpenses / totalIncome : 0;

  const subtitleKey: string | null =
    todaySpent > 0 ? null
    : transactions.length === 0 ? 'home.subtitleStart'
    : expenseRatio >= 0.8 ? 'home.subtitleWarning'
    : expenseRatio < 0.4 && totalIncome > 0 ? 'home.subtitleGood'
    : 'home.subtitleDefault';

  const pillVisible = totalIncome > 0 && totalExpenses > 0;
  const pillPercent = Math.round(expenseRatio * 100);
  const pillColor =
    pillPercent >= 85 ? colors.error
    : pillPercent >= 60 ? '#F59E0B'
    : colors.success;
  const pillIcon =
    pillPercent >= 85 ? 'warning' as const
    : pillPercent >= 60 ? 'alert-circle' as const
    : 'trending-down' as const;

  // ===== Premium: flujo neto, insights, breakdown por categoría, tendencia =====
  const prevBucket = trend.length >= 2 ? trend[trend.length - 2] : null;
  const pctChange = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);
  const compactCurrency = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
    if (n >= 1000) return `$${Math.round(n / 1000)}K`;
    return formatCurrency(Math.round(n));
  };

  const netFlow = prevBucket
    ? { incomePct: pctChange(totalIncome, prevBucket.income), expensePct: pctChange(totalExpenses, prevBucket.expenses) }
    : undefined;

  // Subtítulo premium con historia de datos (comparación de gasto vs mes anterior).
  let premiumSubtitle: string | null = null;
  if (isPremium && isCurrentMonth && prevBucket && prevBucket.expenses > 0) {
    const pct = Math.round(((totalExpenses - prevBucket.expenses) / prevBucket.expenses) * 100);
    premiumSubtitle = pct <= -3 ? t('home.pro.subtitleBelow', { pct: Math.abs(pct) })
      : pct >= 3 ? t('home.pro.subtitleAbove', { pct })
      : t('home.pro.subtitleOnPar');
  }

  const byCat: Record<string, number> = {};
  transactions.forEach((tx) => {
    if (tx.type === 'expense') byCat[tx.category] = (byCat[tx.category] ?? 0) + tx.amount;
  });
  const sortedCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const donutSegments: CategorySegment[] = sortedCats.slice(0, 5).map(([key, amount], i) => ({
    key,
    amount,
    label: categoryLabel(key, categories, t),
    color: categoryColor(key, i),
  }));
  const restSum = sortedCats.slice(5).reduce((s, [, v]) => s + v, 0);
  if (restSum > 0) donutSegments.push({ key: '__rest', amount: restSum, label: t('home.pro.otherCategories'), color: colors.textTertiary });
  const topCategory = donutSegments[0];

  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;
  const prevSavingsRate = prevBucket && prevBucket.income > 0 ? Math.round((prevBucket.balance / prevBucket.income) * 100) : null;
  const savingsDelta = prevSavingsRate != null ? savingsRate - prevSavingsRate : null;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayOfMonth = isCurrentMonth ? today.getDate() : daysInMonth;
  const dailyAvg = dayOfMonth > 0 ? totalExpenses / dayOfMonth : 0;
  const projection = isCurrentMonth && dayOfMonth > 0 ? (totalExpenses / dayOfMonth) * daysInMonth : totalExpenses;
  const prevDaily = prevBucket ? prevBucket.expenses / new Date(prevBucket.year, prevBucket.month + 1, 0).getDate() : null;
  const dailyDelta = prevDaily && prevDaily > 0 ? Math.round(((dailyAvg - prevDaily) / prevDaily) * 100) : null;

  const insights: InsightItem[] = [
    {
      key: 'savings', icon: '💧', label: t('home.pro.savingsRate'), value: `${savingsRate}%`,
      delta: savingsDelta != null ? `${savingsDelta >= 0 ? '▲' : '▼'} ${t('home.pro.points', { value: Math.abs(savingsDelta) })}` : undefined,
      tone: savingsDelta != null ? (savingsDelta >= 0 ? 'pos' : 'neg') : 'muted',
    },
    {
      key: 'projection', icon: '📈', label: t('home.pro.projection'), value: compactCurrency(projection),
      delta: isCurrentMonth ? t('home.pro.estimatedSpend') : undefined, tone: 'warn',
    },
    {
      key: 'topcat', icon: '🍽️', label: t('home.pro.topCategory'),
      value: topCategory ? topCategory.label : '—',
      delta: topCategory && totalExpenses > 0 ? `${compactCurrency(topCategory.amount)} · ${Math.round((topCategory.amount / totalExpenses) * 100)}%` : undefined,
      tone: 'neg',
    },
    {
      key: 'daily', icon: '📅', label: t('home.pro.dailyAvg'), value: compactCurrency(dailyAvg),
      delta: dailyDelta != null ? `${dailyDelta <= 0 ? '▼' : '▲'} ${Math.abs(dailyDelta)}%` : undefined,
      tone: dailyDelta != null ? (dailyDelta <= 0 ? 'pos' : 'neg') : 'muted',
    },
  ];

  const hasCategoryData = donutSegments.length > 0 && totalExpenses > 0;

  return (
    <ScreenTransition>
    <SafeAreaView style={styles.safeArea}>
      <WhatsNew visible={showWhatsNew} onDismiss={handleDismissWhatsNew} />
      <ScreenBackground>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Image source={require('../../assets/logo-transparent.png')} style={styles.headerLogo} resizeMode="contain" />
          <Text style={[styles.headerTitle, { color: colors.primary }]}>Spendia</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {user?.uid && flags.notificationsEnabled && <NotificationBell uid={user.uid} />}
          <View style={{ position: 'relative' }}>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
              {photoUrl && !avatarError ? (
                <Image
                  source={{ uri: photoUrl }}
                  style={styles.avatar}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight, borderWidth: 1.5, borderColor: colors.primary + '40' }]}>
                  <AppIcon name="person" size={18} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
            {isPremium && (
              <View style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 14, height: 14, borderRadius: 7,
                backgroundColor: colors.warning,
                borderWidth: 1.5, borderColor: colors.surface,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <AppIcon name="star" size={7} color="#FFF" />
              </View>
            )}
          </View>
        </View>
      </View>

      <AnnouncementBanner />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="transparent"
            colors={['transparent']}
          />
        }
      >
        {/* Greeting */}
        {loading || refreshing ? (
          <View style={styles.greeting}>
            <Skeleton width={180} height={22} borderRadius={8} />
            <Skeleton width={130} height={13} borderRadius={6} style={{ marginTop: 8 } as any} />
          </View>
        ) : (
          <ProReveal index={0} style={styles.greeting}>
            <Text style={[styles.greetingHi, { color: colors.textPrimary }]}>
              {t(greetingKey, { name: firstName })}
            </Text>
            <View style={styles.greetingSubRow}>
              <Text style={[styles.greetingSubtitle, { color: colors.textSecondary }]}>
                {premiumSubtitle
                  ?? (subtitleKey
                    ? t(subtitleKey)
                    : t('home.subtitleSpentToday', { amount: formatCurrency(todaySpent) }))}
              </Text>
              {pillVisible && (
                <View style={[styles.pill, { backgroundColor: pillColor + '20' }]}>
                  <AppIcon name={pillIcon} size={11} color={pillColor} />
                  <Text style={[styles.pillText, { color: pillColor }]}>
                    {t('home.pillSpent', { percent: pillPercent })}
                  </Text>
                </View>
              )}
            </View>
          </ProReveal>
        )}

        {/* PWA Install Banner */}
        {Platform.OS === 'web' && !loading && !refreshing && <PwaInstallBanner />}

        {/* Balance card — siempre visible para mantener el selector de mes fijo */}
        <ProReveal index={1}>
        <BalanceCard
          pro={isPremium}
          netFlow={isPremium ? netFlow : undefined}
          sparkline={isPremium ? trend.map((b) => b.balance) : undefined}
          detailsToggleLabel={t('home.pro.detailsToggle')}
          loading={loading || refreshing}
          displayBalance={displayBalance}
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          formatCurrency={formatCurrency}
          balanceLabel={t('home.balanceLabel')}
          incomeLabel={t('home.incomeLabel')}
          expensesLabel={t('home.expensesLabel')}
          hidden={hidden}
          onToggleHidden={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleHidden();
          }}
          footer={isPremium ? <ExchangeRateChips /> : undefined}
          monthNav={isPremium ? {
            year,
            month,
            months: MONTHS,
            minYear: MIN_YEAR,
            maxYear: MAX_YEAR,
            onChange: (y, m) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setYear(y);
              setMonth(m);
            },
          } : undefined}
        />
        </ProReveal>

        {loading || refreshing ? (
          <>
            {/* Skeleton del resto mientras carga el mes */}
            <SummaryCardsSkeleton />
            <View style={styles.sectionHeader}>
              <Skeleton width={160} height={18} borderRadius={6} />
              <Skeleton width={55} height={13} borderRadius={6} />
            </View>
            <View style={[styles.txCard, { backgroundColor: colors.surface }]}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={i < 2 ? { borderBottomWidth: 1, borderBottomColor: colors.border } : undefined}>
                  <TransactionRowSkeleton />
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            {isPremium ? (
              <>
                {/* Insights del mes */}
                <ProReveal index={2}>
                  <ProSectionHeader label={t('home.pro.sectionInsights')} />
                  <InsightsGrid items={insights} />
                </ProReveal>

                {/* Gastos por categoría */}
                {hasCategoryData && (
                  <ProReveal index={3}>
                    <ProSectionHeader label={t('home.pro.sectionByCategory')} />
                    <View style={[styles.proCard, { backgroundColor: colors.surface, borderColor: isDark ? colors.primary + '20' : colors.border }]}>
                      <ProCardFx intensity="subtle" trigger={`${year}-${month}`} />
                      <CategoryBars
                        segments={donutSegments}
                        total={totalExpenses}
                        formatCurrency={formatCurrency}
                      />
                    </View>
                  </ProReveal>
                )}

                {/* La tendencia de 6 meses ahora vive como sparkline en el hero */}
              </>
            ) : (
              <ProReveal index={2}>
                <View style={styles.summaryRow}>
                  <View style={[styles.summaryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary + '28' }]}>
                    <View style={[styles.summaryIconCircle, { backgroundColor: colors.primary }]}>
                      <AppIcon name="arrow-down" size={24} color={colors.onPrimary} />
                    </View>
                    <Text style={[styles.summaryCardLabel, { color: colors.textTertiary }]}>{t('home.incomeLabel')}</Text>
                    <Text style={[styles.summaryCardValue, { color: hidden ? colors.textTertiary : colors.primary, letterSpacing: hidden ? 3 : undefined }]}>
                      {hidden ? '••••••' : formatCurrency(totalIncome)}
                    </Text>
                  </View>

                  <View style={[styles.summaryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.expense + '28' }]}>
                    <View style={[styles.summaryIconCircle, { backgroundColor: colors.expenseLight }]}>
                      <AppIcon name="arrow-up" size={24} color={colors.expense} />
                    </View>
                    <Text style={[styles.summaryCardLabel, { color: colors.textTertiary }]}>{t('home.expensesLabel')}</Text>
                    <Text style={[styles.summaryCardValue, { color: hidden ? colors.textTertiary : colors.expense, letterSpacing: hidden ? 3 : undefined }]}>
                      {hidden ? '••••••' : formatCurrency(totalExpenses)}
                    </Text>
                  </View>
                </View>
              </ProReveal>
            )}

            {/* Banner sin tarjetas */}
            {cards.length === 0 && !cardsLoading && (
              <TouchableOpacity
                style={[
                  styles.noCardsBanner,
                  { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary },
                ]}
                onPress={() => router.push('/(onboarding)/select-cards')}
                activeOpacity={0.8}
              >
                <AppIcon name="card-outline" size={24} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.noCardsBannerTitle, { color: colors.textPrimary }]}>
                    {t('home.noCardsBannerTitle')}
                  </Text>
                  <Text style={[styles.noCardsBannerSub, { color: colors.textSecondary }]}>
                    {t('home.noCardsBannerSub')}
                  </Text>
                </View>
                <AppIcon name="chevron-forward" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}

            {/* Recent activity */}
            <ProReveal index={5}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('home.recentActivity')}</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/history')} activeOpacity={0.7}>
                <Text style={[styles.sectionLink, { color: colors.primary }]}>{t('home.seeAll')}</Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={[styles.txCard, { backgroundColor: colors.surface }]}>
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🔒</Text>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('home.firestoreTitle')}</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    {t('home.firestoreSubtitle')}
                  </Text>
                </View>
              </View>
            ) : recent.length === 0 ? (
              <View style={[styles.txCard, { backgroundColor: colors.surface }]}>
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📭</Text>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('home.noTransactions')}</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{t('home.noTransactionsSub')}</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.txCard, { backgroundColor: colors.surface }]}>
                {recent.map((tx, i) => (
                  <TransactionRow key={tx.id} item={tx} isLast={i === recent.length - 1} cardsMap={cardsMap} onPress={() => handleTapTx(tx)} customCatMap={customCatMap} />
                ))}
              </View>
            )}
            </ProReveal>
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        activeOpacity={0.78}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/add-transaction');
        }}
      >
        <AppIcon name="add" size={30} color={colors.onPrimary} />
      </TouchableOpacity>

      {Platform.OS !== 'web' && (
        <AppDialog
          visible={biometricOfferVisible}
          type="info"
          title={t('home.biometricOffer.title')}
          description={
            <Text style={{ fontSize: 15, lineHeight: 22, textAlign: 'center', color: colors.textSecondary }}>
              {t('home.biometricOffer.descPart1')}
              <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{t('home.biometricOffer.descBold')}</Text>
              {t('home.biometricOffer.descPart2')}
            </Text>
          }
          primaryLabel={t('home.biometricOffer.activate')}
          secondaryLabel={t('home.biometricOffer.notNow')}
          onPrimary={() => {
            setBiometricsAppEnrolled(true).catch(() => {}).finally(() => setBiometricOfferVisible(false));
          }}
          onSecondary={() => setBiometricOfferVisible(false)}
        />
      )}
      </ScreenBackground>
    </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 32, height: 32, alignSelf: 'center' },
  headerTitle: { fontSize: 22, fontFamily: Fonts.extraBold, lineHeight: 28, includeFontPadding: false },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingHorizontal: 20, paddingBottom: 130, width: '100%', maxWidth: 768, alignSelf: 'center' },

  greeting: { marginBottom: 20 },
  greetingHi: { fontSize: 22, fontFamily: Fonts.bold, marginBottom: 4 },
  greetingSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  greetingSubtitle: { fontSize: 13, fontFamily: Fonts.regular },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillText: { fontSize: 11, fontFamily: Fonts.semiBold },

  // Summary
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  summaryCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1.5,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
  },
  summaryIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryCardLabel: { fontSize: 11, fontFamily: Fonts.bold, textAlign: 'center' },
  summaryCardValue: { fontSize: 22, fontFamily: Fonts.bold, textAlign: 'center' },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontFamily: Fonts.bold },
  sectionLink: { fontSize: 13, fontFamily: Fonts.semiBold },

  // Premium sections
  proSecRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 12 },
  proSecAccent: { width: 3, height: 14, borderRadius: 2 },
  proSecTitle: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 1, textTransform: 'uppercase' },
  proCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },

  // Transactions
  txCard: { borderRadius: 20, marginBottom: 16, overflow: 'hidden' },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  txIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txIconText: { fontSize: 20 },
  txMeta: { flex: 1 },
  txTitle: { fontSize: 14, fontFamily: Fonts.semiBold, marginBottom: 2 },
  txTime: { fontSize: 12, fontFamily: Fonts.regular },
  txAmount: { fontSize: 14, fontFamily: Fonts.bold },
  txCardChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  txCardChipText: { fontSize: 10, fontFamily: Fonts.semiBold },
  txCardTypeBadge: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 5 },
  txCardTypeBadgeText: { fontSize: 9, fontFamily: Fonts.bold },
  sentIncomeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  sentIncomeChipText: { fontSize: 10, fontFamily: Fonts.semiBold, maxWidth: 110 },

  // Empty
  emptyState: { alignItems: 'center', padding: 36 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 14, fontFamily: Fonts.semiBold, marginBottom: 4 },
  emptySubtitle: { fontSize: 12, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 18 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },

  // No Cards Banner
  noCardsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 3,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  noCardsBannerTitle: { fontSize: 14, fontFamily: Fonts.semiBold, marginBottom: 2 },
  noCardsBannerSub: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 17 },
});
