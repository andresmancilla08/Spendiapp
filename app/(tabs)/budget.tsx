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
import AppHeader from '../../components/AppHeader';
import { Fonts } from '../../config/fonts';


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
        strokeLinecap="round" rotation="-90" origin={`${size / 2}, ${size / 2}`}
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
    setLimitInput(String(b.limitAmount));
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
    } finally {
      setSaving(false);
      closeDialog();
    }
  };

  const handleDelete = async () => {
    if (!selectedBudget) return;
    setSaving(true);
    try {
      await deleteBudget(selectedBudget.id);
    } finally {
      setSaving(false);
      closeDialog();
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.backgroundSecondary }]}>
      <AppHeader showBack={false} />

      <View style={[styles.monthRow, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.monthBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <TouchableOpacity
          onPress={goToNextMonth}
          style={[styles.monthBtn, isCurrentMonth && styles.disabledBtn]}
          disabled={isCurrentMonth}
        >
          <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? colors.textTertiary : colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {budgets.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <Text style={styles.emptyEmoji}>💰</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('budget.nobudgets.title')}</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>{t('budget.nobudgets.sub')}</Text>
            </View>
          )}

          {budgets.length > 0 && (
            <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
              <View style={styles.donutWrapper}>
                <DonutChart percent={overallPercent} color={donutColor} size={140} />
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
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('budget.totalLimit')}</Text>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatCurrency(totalLimit)}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('budget.available')}</Text>
                  <Text style={[styles.statValue, { color: totalLimit - totalSpent >= 0 ? colors.success : colors.error }]}>
                    {formatCurrency(Math.max(totalLimit - totalSpent, 0))}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {budgets.map((b) => {
            const spent = spentByCategory[b.categoryId] ?? 0;
            const pct = b.limitAmount > 0 ? (spent / b.limitAmount) * 100 : 0;
            const color = progressColor(pct, colors.success, colors.error);
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.budgetRow, { backgroundColor: colors.surface }]}
                onPress={() => openEdit(b)}
                onLongPress={() => openDelete(b)}
                activeOpacity={0.7}
              >
                <View style={styles.budgetRowTop}>
                  <View style={styles.catInfo}>
                    <Text style={styles.catIcon}>{b.categoryIcon}</Text>
                    <Text style={[styles.catName, { color: colors.textPrimary }]}>{b.categoryName}</Text>
                  </View>
                  <View style={styles.amountInfo}>
                    <Text style={[styles.spentAmt, { color: color }]}>{formatCurrency(spent)}</Text>
                    <Text style={[styles.limitAmt, { color: colors.textTertiary }]}>{' / '}{formatCurrency(b.limitAmount)}</Text>
                  </View>
                </View>
                <ProgressBar percent={pct} color={color} />
                <Text style={[styles.pctLabel, { color: color }]}>
                  {pct >= 100 ? t('budget.limitExceeded') : `${Math.round(pct)}% ${t('budget.spentLabel')}`}
                </Text>
              </TouchableOpacity>
            );
          })}

          {unlimitedCategories.length > 0 && (
            <View style={styles.unlimitedSection}>
              <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>{t('budget.unlimitedSection')}</Text>
              {unlimitedCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.unlimitedRow, { backgroundColor: colors.surface }]}
                  onPress={() => openAdd(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                  <Text style={[styles.catName, { color: colors.textSecondary }]}>{cat.name}</Text>
                  <View style={[styles.addChip, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <Text style={[styles.addChipText, { color: colors.primary }]}>{t('budget.addLimit')}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {(dialogMode === 'add' || dialogMode === 'edit') && (
        <AppDialog
          visible
          type="info"
          title={dialogMode === 'add' ? t('budget.dialog.addTitle') : t('budget.dialog.editTitle')}
          description={
            <View>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 14, marginBottom: 8, color: colors.textSecondary }}>
                {t('budget.dialog.limitLabel')}
              </Text>
              <TextInput
                value={limitInput}
                onChangeText={(v) => setLimitInput(v.replace(/\D/g, ''))}
                placeholder={t('budget.dialog.limitPlaceholder')}
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 10,
                  fontFamily: Fonts.regular,
                  fontSize: 16,
                  color: colors.textPrimary,
                }}
              />
            </View>
          }
          primaryLabel={t('budget.dialog.save')}
          secondaryLabel={t('budget.dialog.cancel')}
          onPrimary={handleSave}
          onSecondary={closeDialog}
          loading={saving}
        />
      )}

      {dialogMode === 'delete' && selectedBudget && (
        <AppDialog
          visible
          type="warning"
          title={t('budget.dialog.deleteTitle')}
          description={
            <Text style={{ fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary }}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingTop: 12 },
  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10,
    marginHorizontal: 16, marginBottom: 4, borderRadius: 12,
  },
  monthBtn: { padding: 4 },
  disabledBtn: { opacity: 0.3 },
  monthLabel: { fontSize: 15, fontFamily: Fonts.semiBold },
  emptyCard: { borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 16 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.bold, marginBottom: 6, textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 20 },
  summaryCard: {
    borderRadius: 16, padding: 20, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 20,
  },
  donutWrapper: { position: 'relative', width: 140, height: 140 },
  donutCenter: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  donutPercent: { fontSize: 26, fontFamily: Fonts.bold },
  donutLabel: { fontSize: 11, fontFamily: Fonts.regular, marginTop: 2 },
  summaryStats: { flex: 1 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  statLabel: { fontSize: 12, fontFamily: Fonts.regular },
  statValue: { fontSize: 13, fontFamily: Fonts.semiBold },
  divider: { height: 1, marginVertical: 2 },
  budgetRow: { borderRadius: 14, padding: 16, marginBottom: 10 },
  budgetRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catIcon: { fontSize: 22 },
  catName: { fontSize: 14, fontFamily: Fonts.medium },
  amountInfo: { flexDirection: 'row', alignItems: 'baseline' },
  spentAmt: { fontSize: 14, fontFamily: Fonts.bold },
  limitAmt: { fontSize: 12, fontFamily: Fonts.regular },
  pctLabel: { fontSize: 11, fontFamily: Fonts.medium, marginTop: 4 },
  unlimitedSection: { marginTop: 8 },
  sectionHeader: { fontSize: 11, fontFamily: Fonts.semiBold, letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  unlimitedRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 12, marginBottom: 8, gap: 10,
  },
  addChip: {
    marginLeft: 'auto', flexDirection: 'row', alignItems: 'center',
    gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  addChipText: { fontSize: 12, fontFamily: Fonts.medium },
});
