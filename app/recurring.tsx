// app/recurring.tsx — Recurrentes / suscripciones detectadas del historial.
import { useRef } from 'react';
import { scrollFadeMask } from '../components/ScrollFadeEdges';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { goBack } from '../utils/nav';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { accentInk } from '../utils/contrast';
import { useRecurring } from '../hooks/useRecurring';
import { useCategories } from '../hooks/useCategories';
import { resolveCategory, categoryLabel } from '../constants/categories';
import AppIcon from '../components/AppIcon';
import AppHeader from '../components/AppHeader';
import CategoryIcon from '../components/CategoryIcon';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import { Fonts } from '../config/fonts';
import { formatMoney } from '../utils/formatMoney';

const formatCurrency = formatMoney;

export default function RecurringScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { categories } = useCategories(user?.uid ?? '');
  const { data, loading, error } = useRecurring(user?.uid ?? '');
  const transitionRef = useRef<ScreenTransitionRef>(null);
  const back = () => transitionRef.current?.animateOut(() => goBack('/(tabs)/tools'));

  const daysAgo = (ms: number) => Math.max(0, Math.round((Date.now() - ms) / 86400000));

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader showBack onBack={back} />
          <PageTitle title={t('recurring.title')} description={t('recurring.pageDesc')} />

          <ScrollView
        style={scrollFadeMask(0, 0)} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
            ) : error || data.items.length === 0 ? (
              <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <AppIcon name="repeat" size={40} color={colors.textTertiary} style={styles.emptyEmoji} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('recurring.empty')}</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>{t('recurring.emptySub')}</Text>
              </View>
            ) : (
              <>
                <View style={[styles.totalCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '30' }]}>
                  <Text style={[styles.totalLabel, { color: colors.textTertiary }]}>{t('recurring.monthlyTotalLabel')}</Text>
                  <Text style={[styles.totalValue, { color: accentInk(colors, 'primary', colors.primaryLight) }]}>{formatCurrency(data.monthlyTotal)}</Text>
                  <Text style={[styles.totalSub, { color: colors.textSecondary }]}>{t('recurring.monthlyTotalSub')}</Text>
                </View>

                {data.items.map((it, i) => {
                  const cat = resolveCategory(it.category, categories);
                  const d = daysAgo(it.lastDateMs);
                  return (
                    <View key={`${it.label}-${i}`} style={[styles.row, { backgroundColor: colors.surface, borderColor: it.stale ? colors.expense + '40' : colors.border }]}>
                      <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
                        <CategoryIcon icon={cat.icon} size={18} color={colors.textSecondary} />
                      </View>
                      <View style={styles.rowMid}>
                        <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>{it.label}</Text>
                        <Text style={[styles.rowSub, { color: colors.textTertiary }]} numberOfLines={1}>
                          {categoryLabel(it.category, categories, t)} · {t('recurring.itemCharges', { count: it.count, months: it.months })}
                        </Text>
                        <Text style={[styles.rowSub, { color: it.stale ? colors.expense : colors.textTertiary }]} numberOfLines={1}>
                          {it.stale ? t('recurring.staleBadge') : d === 0 ? t('recurring.lastToday') : t('recurring.lastCharge', { days: d })}
                        </Text>
                      </View>
                      <View style={styles.rowRight}>
                        <Text style={[styles.amount, { color: colors.textPrimary }]}>{formatCurrency(it.amount)}</Text>
                        <Text style={[styles.perMonth, { color: colors.textTertiary }]}>{t('recurring.perMonth')}</Text>
                      </View>
                    </View>
                  );
                })}

                <Text style={[styles.footnote, { color: colors.textTertiary }]}>{t('recurring.footnote')}</Text>
              </>
            )}
          </ScrollView>
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },
  center: { paddingTop: 80, alignItems: 'center' },
  empty: { marginTop: 24, padding: 28, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  emptyEmoji: { marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontFamily: Fonts.bold, textAlign: 'center', marginBottom: 6 },
  emptySub: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 19 },
  totalCard: { padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 16, alignItems: 'center' },
  totalLabel: { fontSize: 11, fontFamily: Fonts.semiBold, letterSpacing: 1, textTransform: 'uppercase' },
  totalValue: { fontSize: 34, fontFamily: Fonts.extraBold, marginVertical: 4 },
  totalSub: { fontSize: 12, fontFamily: Fonts.regular },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10, gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  rowMid: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontFamily: Fonts.bold },
  rowSub: { fontSize: 12, fontFamily: Fonts.regular },
  rowRight: { alignItems: 'flex-end' },
  amount: { fontSize: 15, fontFamily: Fonts.bold },
  perMonth: { fontSize: 11, fontFamily: Fonts.regular },
  footnote: { fontSize: 11, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 14, lineHeight: 16 },
});
