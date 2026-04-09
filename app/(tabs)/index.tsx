import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { AddTransactionModal } from '../../components/AddTransactionModal';
import ScreenBackground from '../../components/ScreenBackground';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState, useCallback, useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useTransactions } from '../../hooks/useTransactions';
import { useCards } from '../../hooks/useCards';
import { Transaction } from '../../types/transaction';
import { HomeScreenSkeleton } from '../../components/Skeleton';
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
import WhatsNew from '../../components/WhatsNew';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const WHATS_NEW_KEY = '@spendiapp_whats_new_version';

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
  if (diff < 60) return `Hace ${diff} min`;
  if (diff < 1440) return `Hace ${Math.floor(diff / 60)} h`;
  if (diff < 2880) return 'Ayer';
  return `Hace ${Math.floor(diff / 1440)} días`;
}

function TransactionRow({ item, isLast, cardsMap }: {
  item: Transaction;
  isLast: boolean;
  cardsMap: Record<string, { bankName: string; nickname: string; type: string }>;
}) {
  const { colors, isDark } = useTheme();
  const cat = CATEGORY_META[item.category] ?? CATEGORY_META.other;
  const isExpense = item.type === 'expense';
  const card = item.cardId ? cardsMap[item.cardId] : null;
  const descLabel = item.isInstallment
    ? `${item.description} (Cuota ${item.installmentNumber}/${item.installmentTotal})`
    : item.description;

  return (
    <View style={[
      styles.txRow,
      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
    ]}>
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
            <View style={[styles.txCardChip, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.txCardChipText, { color: colors.primary }]}>
                {card.nickname ? `${card.bankName} · ${card.nickname}` : card.bankName}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Text style={[styles.txAmount, { color: isExpense ? colors.error : colors.secondary }]}>
        {isExpense ? `−${formatCurrency(item.amount)}` : `+${formatCurrency(item.amount)}`}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { cards, loading: cardsLoading } = useCards(user?.uid ?? '');
  const cardsMap = Object.fromEntries(cards.map((c) => [c.id, c]));
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const now = new Date();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [biometricOfferVisible, setBiometricOfferVisible] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useEffect(() => {
    async function checkWhatsNew() {
      try {
        const currentVersion = Constants.expoConfig?.version ?? '';
        const seenVersion = await AsyncStorage.getItem(WHATS_NEW_KEY);
        if (seenVersion !== currentVersion) setShowWhatsNew(true);
      } catch {}
    }
    checkWhatsNew();
  }, []);

  const handleDismissWhatsNew = async () => {
    try {
      await AsyncStorage.setItem(WHATS_NEW_KEY, Constants.expoConfig?.version ?? '');
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
    now.getFullYear(),
    now.getMonth(),
    refreshKey
  );

  const nameParts = user?.displayName?.split(' ') ?? ['Usuario'];
  const firstName = nameParts[0];
  const lastInitial = nameParts[1] ? ` ${nameParts[1].charAt(0)}.` : '';
  const displayName = `${firstName}${lastInitial}`;
  const photoUrl = user?.photoURL;
  const recent = transactions.slice(0, 5);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <WhatsNew visible={showWhatsNew} onDismiss={handleDismissWhatsNew} />
      <ScreenBackground>

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Spendia</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {user?.uid && <NotificationBell uid={user.uid} />}
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
            {photoUrl && !avatarError ? (
              <Image
                source={{ uri: photoUrl }}
                style={styles.avatar}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight, borderWidth: 1.5, borderColor: colors.primary + '40' }]}>
                <Ionicons name="person" size={18} color={colors.primary} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

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
        {(loading || refreshing) && <HomeScreenSkeleton />}
        {!loading && !refreshing && <>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={[styles.greetingHi, { color: colors.textPrimary }]}>
            {t(greetingKey, { name: firstName })}
          </Text>
          <View style={styles.greetingSubRow}>
            <Text style={[styles.greetingSubtitle, { color: colors.textSecondary }]}>
              {subtitleKey
                ? t(subtitleKey)
                : t('home.subtitleSpentToday', { amount: formatCurrency(todaySpent) })}
            </Text>
            {pillVisible && (
              <View style={[styles.pill, { backgroundColor: pillColor + '20' }]}>
                <Ionicons name={pillIcon} size={11} color={pillColor} />
                <Text style={[styles.pillText, { color: pillColor }]}>
                  {t('home.pillSpent', { percent: pillPercent })}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* PWA Install Banner */}
        {Platform.OS === 'web' && <PwaInstallBanner />}

        {/* Balance card */}
        <View style={[styles.balanceCard, { backgroundColor: colors.primaryDark }]}>
          <Text style={[styles.balanceLabel, { color: colors.onPrimary }]}>{t('home.balanceLabel')}</Text>
          <Text style={[styles.balanceAmount, { color: colors.onPrimary }]}>{formatCurrency(balance)}</Text>
          <View style={[styles.balanceBadge, { backgroundColor: colors.tertiary }]}>
            <Ionicons name="trending-up" size={12} color={colors.onTertiary} />
            <Text style={[styles.balanceBadgeText, { color: colors.onTertiary }]}>{t('home.balanceBadge')}</Text>
          </View>
        </View>

        {/* Income / Expenses */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.summaryIconCircle, { backgroundColor: colors.success }]}>
              <Ionicons name="arrow-down" size={24} color={colors.onTertiary} />
            </View>
            <Text style={[styles.summaryCardLabel, { color: colors.textTertiary }]}>{t('home.incomeLabel')}</Text>
            <Text style={[styles.summaryCardValue, { color: colors.success }]}>
              {formatCurrency(totalIncome)}
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.summaryIconCircle, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="arrow-up" size={24} color={colors.error} />
            </View>
            <Text style={[styles.summaryCardLabel, { color: colors.textTertiary }]}>{t('home.expensesLabel')}</Text>
            <Text style={[styles.summaryCardValue, { color: colors.error }]}>
              {formatCurrency(totalExpenses)}
            </Text>
          </View>
        </View>

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
            <Ionicons name="card-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.noCardsBannerTitle, { color: colors.textPrimary }]}>
                {t('home.noCardsBannerTitle')}
              </Text>
              <Text style={[styles.noCardsBannerSub, { color: colors.textSecondary }]}>
                {t('home.noCardsBannerSub')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Recent activity */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('home.recentActivity')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history')} activeOpacity={0.7}>
            <Text style={[styles.sectionLink, { color: colors.primary }]}>{t('home.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />
        ) : error ? (
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
              <TransactionRow key={tx.id} item={tx} isLast={i === recent.length - 1} cardsMap={cardsMap} />
            ))}
          </View>
        )}

        </>}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        activeOpacity={0.85}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={30} color={colors.onPrimary} />
      </TouchableOpacity>

      <AddTransactionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={() => { setShowAddModal(false); setRefreshKey(k => k + 1); showToast(t('home.transactionSaved'), 'success'); }}
      />

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
  headerTitle: { fontSize: 22, fontFamily: Fonts.extraBold },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingHorizontal: 20, paddingBottom: 130 },

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

  // Balance card
  balanceCard: {
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    marginBottom: 10,
    opacity: 0.7,
  },
  balanceAmount: {
    fontSize: 40,
    fontFamily: Fonts.extraBold,
    marginBottom: 18,
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  balanceBadgeText: { fontSize: 12, fontFamily: Fonts.bold },

  // Summary
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  summaryCard: {
    flex: 1,
    borderRadius: 24,
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
  summaryCardLabel: { fontSize: 11, fontFamily: Fonts.bold },
  summaryCardValue: { fontSize: 22, fontFamily: Fonts.bold },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontFamily: Fonts.bold },
  sectionLink: { fontSize: 13, fontFamily: Fonts.semiBold },

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
  txCardChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  txCardChipText: { fontSize: 10, fontFamily: Fonts.semiBold },

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
