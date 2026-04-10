import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import Svg, { Circle } from 'react-native-svg';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../context/ThemeContext';
import { useBudgets } from '../../hooks/useBudgets';
import { useTransactions } from '../../hooks/useTransactions';
import { Budget } from '../../types/budget';
import AppDialog from '../../components/AppDialog';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import PageTitle from '../../components/PageTitle';
import { Fonts } from '../../config/fonts';
import { useToast } from '../../context/ToastContext';


const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Comida', icon: '🍽️' },
  { id: 'transport', name: 'Transporte', icon: '🚗' },
  { id: 'health', name: 'Salud', icon: '💊' },
  { id: 'entertainment', name: 'Entretenimiento', icon: '🎉' },
  { id: 'shopping', name: 'Compras', icon: '🛍️' },
  { id: 'home', name: 'Hogar', icon: '🏡' },
  { id: 'other', name: 'Otro', icon: '📌' },
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n);
}

function formatCurrencyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(parseInt(digits, 10));
}

function DonutChart({ percent, color, size = 140 }: { percent: number; color: string; size?: number }) {
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(percent, 100);
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#E5E7EB" strokeWidth={12} fill="none" />
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={color} strokeWidth={12} fill="none"
        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90, ${size / 2}, ${size / 2})`}
      />
    </Svg>
  );
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.min(percent, 100);
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${clamped}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: '#E5E7EB', overflow: 'hidden', marginTop: 6 },
  fill: { height: 6, borderRadius: 3 },
});

function progressColor(percent: number, successColor: string, errorColor: string): string {
  if (percent >= 100) return errorColor;
  if (percent >= 85) return errorColor + 'CC';
  if (percent >= 60) return '#F59E0B';
  return successColor;
}

export default function BudgetScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuthStore();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const { showToast } = useToast();
  const { budgets, loading, addOrUpdateBudget, deleteBudget } = useBudgets(user?.uid ?? '', year, month);
  const { transactions } = useTransactions(user?.uid ?? '', year, month);

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type === 'expense') {
        map[tx.category] = (map[tx.category] ?? 0) + tx.amount;
      }
    }
    return map;
  }, [transactions]);

  const totalLimit = budgets.reduce((s, b) => s + b.limitAmount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spentByCategory[b.categoryId] ?? 0), 0);
  const overallPercent = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
  const donutColor = progressColor(overallPercent, colors.success, colors.error);

  const budgetedIds = new Set(budgets.map((b) => b.categoryId));
  const unlimitedCategories = DEFAULT_EXPENSE_CATEGORIES.filter((c) => !budgetedIds.has(c.id));

  type DialogMode = 'add' | 'edit' | 'delete' | null;
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string; icon: string } | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [saving, setSaving] = useState(false);

  const goToPrevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const goToNextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    if (isCurrentMonth) return;
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const MONTH_NAMES = (t('history.months', { returnObjects: true }) as string[]);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const openAdd = (cat: { id: string; name: string; icon: string }) => {
    setSelectedCategory(cat);
    setLimitInput('');
    setDialogMode('add');
  };
  const openEdit = (b: Budget) => {
    setSelectedBudget(b);
    setLimitInput(formatCurrencyInput(String(b.limitAmount)));
    setDialogMode('edit');
  };
  const openDelete = (b: Budget) => {
    setSelectedBudget(b);
    setDialogMode('delete');
  };
  const closeDialog = () => {
    setDialogMode(null);
    setSelectedBudget(null);
    setSelectedCategory(null);
    setLimitInput('');
  };

  const handleSave = async () => {
    const amount = parseInt(limitInput.replace(/\D/g, ''), 10);
    if (!amount || amount <= 0) return;
    setSaving(true);
    try {
      if (dialogMode === 'add' && selectedCategory) {
        await addOrUpdateBudget(selectedCategory.id, selectedCategory.name, selectedCategory.icon, amount);
      } else if (dialogMode === 'edit' && selectedBudget) {
        await addOrUpdateBudget(selectedBudget.categoryId, selectedBudget.categoryName, selectedBudget.categoryIcon, amount);
      }
      showToast(t('budget.toasts.saved'), 'success');
      closeDialog();
    } catch {
      showToast(t('budget.toasts.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBudget) return;
    setSaving(true);
    try {
      await deleteBudget(selectedBudget.id);
      showToast(t('budget.toasts.deleted'), 'success');
      closeDialog();
    } catch {
      showToast(t('budget.toasts.deleteError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const isSaveDisabled = parseInt(limitInput.replace(/\D/g, ''), 10) <= 0 || limitInput.trim() === '';

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenBackground>
      <AppHeader showBack={false} showNotifications />
      <PageTitle title={t('budget.title')} description={t('budget.pageDesc')} />

      {/* Month nav */}
      <View style={[styles.monthRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.monthBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.8} style={styles.monthLabelBtn}>
          <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
            {MONTH_NAMES[month]} {year}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={goToNextMonth}
          style={[styles.monthBtn, isCurrentMonth && styles.disabledBtn]}
          disabled={isCurrentMonth}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? colors.textTertiary : colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Empty state */}
          {budgets.length === 0 && (
            <LinearGradient
              colors={[`${colors.primary}18`, `${colors.primary}06`]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.emptyCard, { borderColor: `${colors.primary}25`, borderWidth: 1 }]}
            >
              <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="wallet-outline" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('budget.nobudgets.title')}</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>{t('budget.nobudgets.sub')}</Text>
            </LinearGradient>
          )}

          {/* Summary card */}
          {budgets.length > 0 && (
            <LinearGradient
              colors={[`${colors.primary}18`, `${colors.primary}06`]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.summaryCard, { borderColor: `${colors.primary}28`, borderWidth: 1 }]}
            >
              <View style={styles.donutWrapper}>
                <DonutChart percent={overallPercent} color={donutColor} size={130} />
                <View style={styles.donutCenter}>
                  <Text style={[styles.donutPercent, { color: donutColor }]}>{Math.round(overallPercent)}%</Text>
                  <Text style={[styles.donutLabel, { color: colors.textSecondary }]}>{t('budget.spentLabel')}</Text>
                </View>
              </View>
              <View style={styles.summaryStats}>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('budget.totalSpent')}</Text>
                  <Text style={[styles.statValue, { color: donutColor }]}>{formatCurrency(totalSpent)}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: `${colors.primary}25` }]} />
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('budget.totalLimit')}</Text>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatCurrency(totalLimit)}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: `${colors.primary}25` }]} />
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('budget.available')}</Text>
                  <Text style={[styles.statValue, { color: totalLimit - totalSpent >= 0 ? colors.success : colors.error }]}>
                    {formatCurrency(Math.max(totalLimit - totalSpent, 0))}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          )}

          {/* Budget rows */}
          {budgets.length > 0 && (
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>
              {t('budget.monthlyBudget').toUpperCase()}
            </Text>
          )}
          {budgets.map((b) => {
            const spent = spentByCategory[b.categoryId] ?? 0;
            const pct = b.limitAmount > 0 ? (spent / b.limitAmount) * 100 : 0;
            const color = progressColor(pct, colors.success, colors.error);
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.budgetRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => openEdit(b)}
                onLongPress={() => openDelete(b)}
                activeOpacity={0.75}
              >
                {/* Left accent */}
                <View style={[styles.budgetAccent, { backgroundColor: color }]} />
                <View style={styles.budgetRowInner}>
                  <View style={styles.budgetRowTop}>
                    <View style={styles.catInfo}>
                      <View style={[styles.catIconWrap, { backgroundColor: `${color}18` }]}>
                        <Text style={styles.catIcon}>{b.categoryIcon}</Text>
                      </View>
                      <View>
                        <Text style={[styles.catName, { color: colors.textPrimary }]}>{b.categoryName}</Text>
                        <Text style={[styles.pctLabel, { color: color }]}>
                          {pct >= 100 ? t('budget.limitExceeded') : `${Math.round(pct)}% ${t('budget.spentLabel')}`}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.amountInfo}>
                      <Text style={[styles.spentAmt, { color: color }]}>{formatCurrency(spent)}</Text>
                      <Text style={[styles.limitAmt, { color: colors.textTertiary }]}>{' / '}{formatCurrency(b.limitAmount)}</Text>
                    </View>
                  </View>
                  <ProgressBar percent={pct} color={color} />
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Sin límite */}
          {unlimitedCategories.length > 0 && (
            <View style={styles.unlimitedSection}>
              <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>{t('budget.unlimitedSection')}</Text>
              {unlimitedCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.unlimitedRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => openAdd(cat)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.catIconWrap, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={styles.catIcon}>{cat.icon}</Text>
                  </View>
                  <Text style={[styles.catName, { color: colors.textSecondary }]}>{cat.name}</Text>
                  <View style={[styles.addChip, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="add" size={13} color={colors.primary} />
                    <Text style={[styles.addChipText, { color: colors.primary }]}>{t('budget.addLimit')}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Dialog add/edit */}
      {(dialogMode === 'add' || dialogMode === 'edit') && (
        <AppDialog
          visible
          type="info"
          title={dialogMode === 'add' ? t('budget.dialog.addTitle') : t('budget.dialog.editTitle')}
          description={
            <View style={{ alignSelf: 'stretch' }}>
              {(dialogMode === 'add' ? selectedCategory : selectedBudget) && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: `${colors.primary}15`,
                    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
                  }}>
                    <Text style={{ fontSize: 18 }}>
                      {dialogMode === 'add' ? selectedCategory!.icon : selectedBudget!.categoryIcon}
                    </Text>
                    <Text style={{ fontFamily: Fonts.semiBold, fontSize: 14, color: colors.primary }}>
                      {dialogMode === 'add' ? selectedCategory!.name : selectedBudget!.categoryName}
                    </Text>
                  </View>
                </View>
              )}
              <Text style={{ fontFamily: Fonts.regular, fontSize: 13, marginBottom: 8, color: colors.textSecondary }}>
                {t('budget.dialog.limitLabel')}
              </Text>
              <TextInput
                value={limitInput}
                onChangeText={(v) => setLimitInput(formatCurrencyInput(v))}
                placeholder={t('budget.dialog.limitPlaceholder')}
                keyboardType="numeric"
                autoFocus
                style={{
                  width: '100%',
                  borderWidth: 1.5,
                  borderColor: limitInput ? colors.primary : colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontFamily: Fonts.semiBold,
                  fontSize: 18,
                  color: colors.textPrimary,
                  backgroundColor: colors.backgroundSecondary,
                }}
              />
            </View>
          }
          primaryLabel={t('budget.dialog.save')}
          secondaryLabel={t('budget.dialog.cancel')}
          onPrimary={handleSave}
          onSecondary={closeDialog}
          loading={saving}
          primaryDisabled={isSaveDisabled}
        />
      )}

      {/* Dialog delete */}
      {dialogMode === 'delete' && selectedBudget && (
        <AppDialog
          visible
          type="warning"
          title={t('budget.dialog.deleteTitle')}
          description={
            <Text style={{ fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center', alignSelf: 'stretch' }}>
              {t('budget.dialog.deleteDescBefore')}{' '}
              <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{selectedBudget.categoryName}</Text>
              {t('budget.dialog.deleteDescAfter')}
            </Text>
          }
          primaryLabel={t('budget.dialog.delete')}
          secondaryLabel={t('budget.dialog.cancel')}
          onPrimary={handleDelete}
          onSecondary={closeDialog}
          loading={saving}
        />
      )}
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingTop: 12, paddingBottom: 40 },
  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10,
    marginHorizontal: 16, marginTop: 8, marginBottom: 16,
    borderRadius: 14, borderWidth: 1,
  },
  monthBtn: { padding: 8 },
  monthLabelBtn: { flex: 1, alignItems: 'center' },
  disabledBtn: { opacity: 0.3 },
  monthLabel: { fontSize: 15, fontFamily: Fonts.semiBold },
  // Empty
  emptyCard: { borderRadius: 20, padding: 36, alignItems: 'center', marginBottom: 16 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.bold, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 21 },
  // Summary
  summaryCard: { borderRadius: 20, padding: 20, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  donutWrapper: { position: 'relative', width: 130, height: 130 },
  donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  donutPercent: { fontSize: 24, fontFamily: Fonts.extraBold },
  donutLabel: { fontSize: 10, fontFamily: Fonts.regular, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryStats: { flex: 1 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  statLabel: { fontSize: 11, fontFamily: Fonts.regular },
  statValue: { fontSize: 12, fontFamily: Fonts.bold },
  divider: { height: 1, marginVertical: 1 },
  // Budget rows
  sectionHeader: { fontSize: 11, fontFamily: Fonts.semiBold, letterSpacing: 1, marginBottom: 10, marginLeft: 2 },
  budgetRow: { borderRadius: 14, marginBottom: 10, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  budgetAccent: { width: 4 },
  budgetRowInner: { flex: 1, padding: 14 },
  budgetRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  catIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catIcon: { fontSize: 20 },
  catName: { fontSize: 14, fontFamily: Fonts.semiBold },
  amountInfo: { flexDirection: 'row', alignItems: 'baseline' },
  spentAmt: { fontSize: 13, fontFamily: Fonts.bold },
  limitAmt: { fontSize: 11, fontFamily: Fonts.regular },
  pctLabel: { fontSize: 11, fontFamily: Fonts.medium, marginTop: 2 },
  // Unlimited
  unlimitedSection: { marginTop: 8 },
  unlimitedRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 12, marginBottom: 8, gap: 10, borderWidth: 1,
  },
  addChip: {
    marginLeft: 'auto', flexDirection: 'row', alignItems: 'center',
    gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  addChipText: { fontSize: 12, fontFamily: Fonts.medium },
});
