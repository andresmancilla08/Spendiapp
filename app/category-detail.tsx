import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import AppIcon from '../components/AppIcon';
import AppHeader from '../components/AppHeader';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import ScreenTransition from '../components/ScreenTransition';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { categoryLabel } from '../constants/categories';
import { categoryColor } from '../constants/categoryColors';
import CategoryBars, { CategorySegment } from '../components/premium/CategoryBars';
import { Fonts } from '../config/fonts';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function CategoryDetailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ year?: string; month?: string }>();

  const now = new Date();
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const month = params.month ? parseInt(params.month, 10) : now.getMonth();

  const { categories } = useCategories(user?.uid ?? '');
  const { transactions, totalExpenses, loading } = useTransactions(user?.uid ?? '', year, month);

  const segments: (CategorySegment & { count: number })[] = useMemo(() => {
    const byCat: Record<string, { amount: number; count: number }> = {};
    transactions.forEach((tx) => {
      if (tx.type !== 'expense') return;
      const entry = byCat[tx.category] ?? { amount: 0, count: 0 };
      entry.amount += tx.amount;
      entry.count += 1;
      byCat[tx.category] = entry;
    });
    return Object.entries(byCat)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([key, { amount, count }], i) => ({
        key,
        amount,
        count,
        label: categoryLabel(key, categories, t),
        color: categoryColor(key, i),
      }));
  }, [transactions, categories, t]);

  const MONTHS = t('history.months', { returnObjects: true }) as string[];
  const monthLabel = `${MONTHS[month] ?? ''} ${year}`.trim();

  return (
    <ScreenTransition>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader showBack />
          <PageTitle title={t('categoryDetail.title')} description={monthLabel} />

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {segments.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '18' }]}>
                    <AppIcon name="pricetag-outline" size={30} color={colors.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    {t('categoryDetail.emptyTitle')}
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    {t('categoryDetail.emptySub')}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Resumen — el total es el protagonista, igual que en Home/Detalle de movimiento */}
                  <View style={[styles.summaryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary + '20' }]}>
                    <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>
                      {t('categoryDetail.totalLabel').toUpperCase()}
                    </Text>
                    <Text style={[styles.summaryHero, { color: colors.textPrimary }]}>
                      {formatCurrency(totalExpenses)}
                    </Text>
                    <View style={[styles.summaryPill, { backgroundColor: colors.primary + '14' }]}>
                      <AppIcon name="pricetag-outline" size={13} color={colors.primary} />
                      <Text style={[styles.summaryPillText, { color: colors.primary }]}>
                        {t('categoryDetail.categoriesLabel')}: {segments.length}
                      </Text>
                    </View>
                  </View>

                  {/* Desglose completo */}
                  <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <CategoryBars
                      segments={segments}
                      total={totalExpenses}
                      formatCurrency={formatCurrency}
                      countLabel={(count) => t('categoryDetail.movementsCount', { count })}
                    />
                  </View>
                </>
              )}
            </ScrollView>
          )}
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingTop: 4, paddingBottom: 40, width: '100%', maxWidth: 768, alignSelf: 'center' },
  emptyCard: { borderRadius: 20, borderWidth: 1.5, padding: 36, alignItems: 'center' },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontFamily: Fonts.bold, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 21 },
  summaryCard: { borderRadius: 20, borderWidth: 1.5, marginBottom: 16, padding: 20, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 6 },
  summaryHero: { fontSize: 34, fontFamily: Fonts.extraBold, letterSpacing: -1, includeFontPadding: false, marginBottom: 14 },
  summaryPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  summaryPillText: { fontSize: 12, fontFamily: Fonts.bold },
  listCard: { borderRadius: 20, borderWidth: 1.5, padding: 16 },
});
