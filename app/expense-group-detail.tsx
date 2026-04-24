// app/expense-group-detail.tsx
import { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useExpenseGroups, useGroupExpenses } from '../hooks/useExpenseGroups';
import { calculateSettlements } from '../utils/settlementCalc';
import { Settlement } from '../types/expenseGroup';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import AppDialog from '../components/AppDialog';
import AppHeader from '../components/AppHeader';
import AppSegmentedControl from '../components/AppSegmentedControl';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import { Fonts } from '../config/fonts';

// ─── helpers ────────────────────────────────────────────────────────────────

type TabType = 'expenses' | 'settlement';
type DialogMode = 'addExpense' | 'deleteExpense' | 'settle' | 'reopen' | 'deleteGroup' | 'options' | null;

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

// ─── screen ─────────────────────────────────────────────────────────────────

export default function ExpenseGroupDetailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const transitionRef = useRef<ScreenTransitionRef>(null);
  const { id: groupId } = useLocalSearchParams<{ id: string }>();

  const { groups, loading: groupsLoading, settleGroup, reopenGroup, deleteGroup } =
    useExpenseGroups(user?.uid ?? '');
  const group = groups.find((g) => g.id === groupId);

  const { expenses, loading: expensesLoading, addExpense, deleteExpense } =
    useGroupExpenses(groupId ?? '');

  const loading = groupsLoading || expensesLoading;

  // ── tab ──
  const [tab, setTab] = useState<TabType>('expenses');

  // ── dialogs ──
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [saving, setSaving] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

  // ── add expense form ──
  const [descInput, setDescInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [paidById, setPaidById] = useState<string>('');
  const [splitIds, setSplitIds] = useState<string[]>([]);

  const resetForm = () => {
    setDescInput('');
    setAmountInput('');
    setPaidById('');
    setSplitIds(group?.participants.map((p) => p.id) ?? []);
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedExpenseId(null);
    resetForm();
  };

  const openAddExpense = () => {
    setSplitIds(group?.participants.map((p) => p.id) ?? []);
    setPaidById('');
    setDescInput('');
    setAmountInput('');
    setDialogMode('addExpense');
  };

  const openDeleteExpense = (expenseId: string) => {
    setSelectedExpenseId(expenseId);
    setDialogMode('deleteExpense');
  };

  // ── handlers ──

  const handleAddExpense = async () => {
    const amount = parseInt(amountInput.replace(/\D/g, ''), 10);
    if (!descInput.trim()) {
      showToast(t('expenseGroups.addExpense.validationDesc'), 'error');
      return;
    }
    if (!amount || amount <= 0) {
      showToast(t('expenseGroups.addExpense.validationAmount'), 'error');
      return;
    }
    if (!paidById) {
      showToast(t('expenseGroups.addExpense.validationPaidBy'), 'error');
      return;
    }
    if (splitIds.length === 0) {
      showToast(t('expenseGroups.addExpense.validationSplit'), 'error');
      return;
    }
    setSaving(true);
    try {
      await addExpense(descInput.trim(), amount, paidById, splitIds, user?.uid);
      showToast(t('expenseGroups.addExpense.add'), 'success');
      closeDialog();
    } catch {
      showToast(t('expenseGroups.addExpense.validationDesc'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpenseId) return;
    setSaving(true);
    try {
      await deleteExpense(selectedExpenseId);
      showToast(t('expenseGroups.detail.deleteExpense'), 'success');
      closeDialog();
    } catch (e) {
      console.error('[handleDeleteExpense]', e);
      showToast(t('common.genericError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSettle = async () => {
    if (!groupId) return;
    setSaving(true);
    try {
      await settleGroup(groupId);
      showToast(t('expenseGroups.settled'), 'success');
      closeDialog();
    } catch (e) {
      console.error('[handleSettle]', e);
      showToast(t('common.genericError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReopen = async () => {
    if (!groupId) return;
    setSaving(true);
    try {
      await reopenGroup(groupId);
      showToast(t('expenseGroups.statusActive'), 'success');
      closeDialog();
    } catch (e) {
      console.error('[handleReopen]', e);
      showToast(t('common.genericError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupId) return;
    setSaving(true);
    try {
      await deleteGroup(groupId);
      showToast(t('expenseGroups.deleteGroup'), 'success');
      closeDialog();
      transitionRef.current?.animateOut(() => router.back());
    } catch (e) {
      console.error('[handleDeleteGroup]', e);
      showToast(t('common.genericError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── settlements & balance ──
  const settlements: Settlement[] = useMemo(() => {
    if (!group) return [];
    return calculateSettlements(group.participants, expenses);
  }, [group, expenses]);

  const myBalance = useMemo(() => {
    if (!group || !user?.uid) return null;
    const me = group.participants.find((p) => p.uid === user.uid);
    if (!me) return null;

    let totalPaid = 0;
    let yourShare = 0;

    for (const exp of expenses) {
      if (exp.paidById === me.id) totalPaid += exp.amount;
      if (exp.splitAmong.includes(me.id)) {
        yourShare += exp.amount / exp.splitAmong.length;
      }
    }

    return {
      totalPaid: Math.round(totalPaid),
      yourShare: Math.round(yourShare),
      balance: Math.round(totalPaid - yourShare),
    };
  }, [group, expenses, user?.uid]);

  // ── derived ──
  const isSettled = group?.status === 'settled';
  const accentColor = isSettled ? colors.textTertiary : colors.primary;

  const isAddExpenseDisabled =
    !descInput.trim() ||
    !amountInput ||
    !paidById ||
    splitIds.length === 0;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader
            showBack
            onBack={() => transitionRef.current?.animateOut(() => router.back())}
            rightAction={
              <TouchableOpacity
                onPress={() => setDialogMode('options')}
                activeOpacity={0.7}
                style={styles.headerIconBtn}
              >
                <Ionicons name="ellipsis-horizontal" size={22} color={colors.primary} />
              </TouchableOpacity>
            }
          />

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : !group ? (
            <View style={styles.center}>
              <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
                {t('expenseGroups.title')}
              </Text>
            </View>
          ) : (
            <>
              {/* Title */}
              <PageTitle
                title={`${group.emoji} ${group.title}`}
                description={t(isSettled ? 'expenseGroups.statusSettled' : 'expenseGroups.statusActive')}
              />

              {/* Settled banner */}
              {isSettled && (
                <View style={[styles.settledBanner, { backgroundColor: `${colors.success}18`, borderColor: `${colors.success}35` }]}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={[styles.settledBannerText, { color: colors.success }]}>
                    {t('expenseGroups.settled')}
                  </Text>
                </View>
              )}

              {/* Tabs */}
              <AppSegmentedControl
                segments={[
                  { key: 'expenses', label: t('expenseGroups.detail.expenses') },
                  { key: 'settlement', label: t('expenseGroups.settlement.title') },
                ]}
                activeKey={tab}
                onChange={(key) => setTab(key as TabType)}
                activeColor={accentColor}
                style={styles.tabRow}
              />

              {/* Tab: Gastos */}
              {tab === 'expenses' && (
                <ScrollView
                  contentContainerStyle={styles.scroll}
                  showsVerticalScrollIndicator={false}
                >
                  {expenses.length === 0 ? (
                    <LinearGradient
                      colors={[`${accentColor}18`, `${accentColor}06`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.emptyCard, { borderColor: `${accentColor}25`, borderWidth: 1 }]}
                    >
                      <View style={[styles.emptyIconWrap, { backgroundColor: `${accentColor}18` }]}>
                        <Ionicons name="receipt-outline" size={36} color={accentColor} />
                      </View>
                      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                        {t('expenseGroups.detail.noExpenses')}
                      </Text>
                      <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                        {t('expenseGroups.detail.noExpensesSub')}
                      </Text>
                    </LinearGradient>
                  ) : (
                    expenses.map((exp) => {
                      const paidByParticipant = group.participants.find((p) => p.id === exp.paidById);
                      const splitNames = exp.splitAmong
                        .map((sid) => group.participants.find((p) => p.id === sid)?.name)
                        .filter(Boolean)
                        .join(', ');

                      return (
                        <TouchableOpacity
                          key={exp.id}
                          onLongPress={() => {
                            const isCreator = !exp.createdByUid || exp.createdByUid === user?.uid;
                            if (!isSettled && isCreator) openDeleteExpense(exp.id);
                          }}
                          activeOpacity={0.8}
                          style={[styles.expenseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        >
                          <View style={[styles.expenseAccent, { backgroundColor: accentColor }]} />
                          <View style={styles.expenseInner}>
                            <View style={styles.expenseTopRow}>
                              <Text style={[styles.expenseDesc, { color: colors.textPrimary }]} numberOfLines={1}>
                                {exp.description}
                              </Text>
                              <Text style={[styles.expenseAmount, { color: accentColor }]}>
                                {formatCurrency(exp.amount)}
                              </Text>
                            </View>
                            <Text style={[styles.expenseMeta, { color: colors.textSecondary }]}>
                              {t('expenseGroups.detail.paidBy')}{' '}
                              <Text style={{ fontFamily: Fonts.semiBold, color: colors.textPrimary }}>
                                {paidByParticipant?.name ?? '-'}
                              </Text>
                            </Text>
                            <Text style={[styles.expenseMeta, { color: colors.textSecondary }]}>
                              {t('expenseGroups.detail.splitAmong')}{' '}
                              <Text style={{ fontFamily: Fonts.semiBold, color: colors.textPrimary }}>
                                {splitNames || t('expenseGroups.detail.everyone')}
                              </Text>
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                  <View style={{ height: 120 }} />
                </ScrollView>
              )}

              {/* Tab: Liquidación */}
              {tab === 'settlement' && (
                <ScrollView
                  contentContainerStyle={styles.scroll}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Tu balance */}
                  {myBalance && (
                    <LinearGradient
                      colors={[`${accentColor}1A`, `${accentColor}06`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.balanceCard, { borderColor: `${accentColor}28` }]}
                    >
                      <Text style={[styles.balanceCardTitle, { color: colors.textSecondary }]}>
                        {t('expenseGroups.settlement.balance')}
                      </Text>
                      <Text style={[
                        styles.balanceHero,
                        { color: myBalance.balance >= 0 ? colors.success : colors.error },
                      ]}>
                        {myBalance.balance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(myBalance.balance))}
                      </Text>
                      <View style={[styles.balanceDivider, { backgroundColor: `${accentColor}20` }]} />
                      <View style={styles.balanceRow}>
                        <BalanceStat
                          label={t('expenseGroups.settlement.totalPaid')}
                          value={formatCurrency(myBalance.totalPaid)}
                          color={colors.success}
                          colors={colors}
                        />
                        <View style={[styles.balanceStatDivider, { backgroundColor: `${accentColor}20` }]} />
                        <BalanceStat
                          label={t('expenseGroups.settlement.yourShare')}
                          value={formatCurrency(myBalance.yourShare)}
                          color={colors.textSecondary}
                          colors={colors}
                        />
                      </View>
                    </LinearGradient>
                  )}

                  {/* Lista de deudas */}
                  {settlements.length === 0 ? (
                    <LinearGradient
                      colors={[`${colors.success}18`, `${colors.success}06`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.emptyCard, { borderColor: `${colors.success}25`, borderWidth: 1 }]}
                    >
                      <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.success}18` }]}>
                        <Ionicons name="checkmark-done-circle-outline" size={36} color={colors.success} />
                      </View>
                      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                        {t('expenseGroups.settlement.balanced')}
                      </Text>
                    </LinearGradient>
                  ) : (
                    settlements.map((s, i) => (
                      <View
                        key={i}
                        style={[styles.settlementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        <View style={[styles.settlementNamePill, { backgroundColor: `${colors.error}18`, borderColor: `${colors.error}30` }]}>
                          <Text style={[styles.settlementName, { color: colors.error }]} numberOfLines={1}>{s.fromName}</Text>
                        </View>
                        <Ionicons name="arrow-forward" size={14} color={colors.textTertiary} style={styles.settlementArrow} />
                        <View style={[styles.settlementNamePill, { backgroundColor: `${colors.success}18`, borderColor: `${colors.success}30` }]}>
                          <Text style={[styles.settlementName, { color: colors.success }]} numberOfLines={1}>{s.toName}</Text>
                        </View>
                        <View style={{ flex: 1 }} />
                        <Text style={[styles.settlementAmount, { color: colors.warning }]}>
                          {formatCurrency(s.amount)}
                        </Text>
                      </View>
                    ))
                  )}

                  <View style={{ height: 60 }} />
                </ScrollView>
              )}

              {/* FAB agregar gasto */}
              {tab === 'expenses' && !isSettled && (
                <TouchableOpacity
                  onPress={openAddExpense}
                  activeOpacity={0.85}
                  style={[styles.fab, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="add" size={26} color={colors.onPrimary} />
                  <Text style={[styles.fabLabel, { color: colors.onPrimary }]}>
                    {t('expenseGroups.detail.addExpense')}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* ── Dialog: opciones ── */}
          {dialogMode === 'options' && group && (
            <AppDialog
              visible
              type="info"
              title={`${group.emoji} ${group.title}`}
              description={
                <View style={{ alignSelf: 'stretch', gap: 10 }}>
                  {!isSettled ? (
                    <TouchableOpacity
                      onPress={() => { setDialogMode('settle'); }}
                      activeOpacity={0.8}
                      style={[styles.optionBtn, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}30` }]}
                    >
                      <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                      <Text style={[styles.optionBtnText, { color: colors.success }]}>
                        {t('expenseGroups.settle')}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => { setDialogMode('reopen'); }}
                      activeOpacity={0.8}
                      style={[styles.optionBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
                    >
                      <Ionicons name="refresh-circle-outline" size={20} color={colors.primary} />
                      <Text style={[styles.optionBtnText, { color: colors.primary }]}>
                        {t('expenseGroups.reopen')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => { setDialogMode('deleteGroup'); }}
                    activeOpacity={0.8}
                    style={[styles.optionBtn, { backgroundColor: `${colors.error}12`, borderColor: `${colors.error}28` }]}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                    <Text style={[styles.optionBtnText, { color: colors.error }]}>
                      {t('expenseGroups.deleteGroup')}
                    </Text>
                  </TouchableOpacity>
                </View>
              }
              primaryLabel={t('goals.cancelButton')}
              onPrimary={closeDialog}
            />
          )}

          {/* ── Dialog: Agregar gasto ── */}
          {dialogMode === 'addExpense' && group && (
            <AppDialog
              visible
              type="info"
              title={t('expenseGroups.addExpense.title')}
              description={
                <View style={{ alignSelf: 'stretch', gap: 14 }}>
                  {/* Descripción */}
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      {t('expenseGroups.addExpense.descriptionPlaceholder')}
                    </Text>
                    <TextInput
                      value={descInput}
                      onChangeText={setDescInput}
                      placeholder={t('expenseGroups.addExpense.descriptionPlaceholder')}
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.textInput, {
                        borderColor: descInput ? colors.primary : colors.border,
                        color: colors.textPrimary,
                        backgroundColor: colors.backgroundSecondary,
                      }]}
                      maxLength={60}
                    />
                  </View>

                  {/* Monto */}
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      {t('expenseGroups.addExpense.amountPlaceholder')}
                    </Text>
                    <TextInput
                      value={amountInput}
                      onChangeText={(v) => setAmountInput(formatCurrencyInput(v))}
                      placeholder="$ 0"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.textInput, styles.amountInput, {
                        borderColor: amountInput ? colors.primary : colors.border,
                        color: colors.textPrimary,
                        backgroundColor: colors.backgroundSecondary,
                      }]}
                    />
                  </View>

                  {/* ¿Quién pagó? */}
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      {t('expenseGroups.addExpense.paidByLabel')}
                    </Text>
                    <View style={styles.chipRow}>
                      {group.participants.map((p) => {
                        const active = paidById === p.id;
                        return (
                          <TouchableOpacity
                            key={p.id}
                            onPress={() => setPaidById(p.id)}
                            activeOpacity={0.75}
                            style={[styles.chip, {
                              backgroundColor: active ? colors.primary : colors.backgroundSecondary,
                              borderColor: active ? colors.primary : colors.border,
                            }]}
                          >
                            <Text style={[styles.chipText, { color: active ? colors.onPrimary : colors.textSecondary }]}>
                              {p.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* ¿Entre quiénes? */}
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      {t('expenseGroups.addExpense.splitLabel')}
                    </Text>
                    <View style={styles.chipRow}>
                      {group.participants.map((p) => {
                        const active = splitIds.includes(p.id);
                        return (
                          <TouchableOpacity
                            key={p.id}
                            onPress={() =>
                              setSplitIds((prev) =>
                                active ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                              )
                            }
                            activeOpacity={0.75}
                            style={[styles.chip, {
                              backgroundColor: active ? `${colors.primary}20` : colors.backgroundSecondary,
                              borderColor: active ? colors.primary : colors.border,
                            }]}
                          >
                            {active && (
                              <Ionicons name="checkmark" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                            )}
                            <Text style={[styles.chipText, { color: active ? colors.primary : colors.textSecondary }]}>
                              {p.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              }
              primaryLabel={t('expenseGroups.addExpense.add')}
              secondaryLabel={t('goals.cancelButton')}
              onPrimary={handleAddExpense}
              onSecondary={closeDialog}
              loading={saving}
              primaryDisabled={isAddExpenseDisabled}
            />
          )}

          {/* ── Dialog: Eliminar gasto ── */}
          {dialogMode === 'deleteExpense' && selectedExpenseId && (
            <AppDialog
              visible
              type="error"
              title={t('expenseGroups.detail.deleteExpense')}
              description={
                <Text style={{ fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center', alignSelf: 'stretch' }}>
                  {t('expenseGroups.detail.deleteExpenseConfirm')}
                </Text>
              }
              primaryLabel={t('expenseGroups.detail.deleteExpense')}
              secondaryLabel={t('goals.cancelButton')}
              onPrimary={handleDeleteExpense}
              onSecondary={closeDialog}
              loading={saving}
              primaryDanger
            />
          )}

          {/* ── Dialog: Marcar liquidado ── */}
          {dialogMode === 'settle' && group && (
            <AppDialog
              visible
              type="success"
              title={t('expenseGroups.settle')}
              description={
                <Text style={{ fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center', alignSelf: 'stretch' }}>
                  {t('expenseGroups.settleConfirm')}{' '}
                  <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{group.title}</Text>
                  {'?'}
                </Text>
              }
              primaryLabel={t('expenseGroups.settle')}
              secondaryLabel={t('goals.cancelButton')}
              onPrimary={handleSettle}
              onSecondary={closeDialog}
              loading={saving}
            />
          )}

          {/* ── Dialog: Reabrir ── */}
          {dialogMode === 'reopen' && group && (
            <AppDialog
              visible
              type="info"
              title={t('expenseGroups.reopen')}
              description={
                <Text style={{ fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center', alignSelf: 'stretch' }}>
                  {t('expenseGroups.reopen')}{' '}
                  <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{group.title}</Text>
                  {'?'}
                </Text>
              }
              primaryLabel={t('expenseGroups.reopen')}
              secondaryLabel={t('goals.cancelButton')}
              onPrimary={handleReopen}
              onSecondary={closeDialog}
              loading={saving}
            />
          )}

          {/* ── Dialog: Eliminar grupo ── */}
          {dialogMode === 'deleteGroup' && group && (
            <AppDialog
              visible
              type="error"
              title={t('expenseGroups.deleteGroup')}
              description={
                <Text style={{ fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center', alignSelf: 'stretch' }}>
                  {t('expenseGroups.deleteGroupConfirm')}{' '}
                  <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{group.emoji} {group.title}</Text>
                  {'?'}
                </Text>
              }
              primaryLabel={t('expenseGroups.deleteGroup')}
              secondaryLabel={t('goals.cancelButton')}
              onPrimary={handleDeleteGroup}
              onSecondary={closeDialog}
              loading={saving}
              primaryDanger
            />
          )}
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

// ─── BalanceStat sub-component ───────────────────────────────────────────────

function BalanceStat({
  label,
  value,
  color,
  colors,
}: {
  label: string;
  value: string;
  color: string;
  colors: any;
}) {
  return (
    <View style={styles.balanceStat}>
      <Text style={[styles.balanceStatLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.balanceStatValue, { color }]}>{value}</Text>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontFamily: Fonts.regular, fontSize: 15 },
  headerIconBtn: { padding: 4 },

  // Settled banner
  settledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  settledBannerText: { fontFamily: Fonts.semiBold, fontSize: 13 },

  // Tabs
  tabRow: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
  },

  // Scroll
  scroll: { padding: 16, paddingTop: 4, paddingBottom: 40, width: '100%', maxWidth: 768, alignSelf: 'center' },

  // Empty state
  emptyCard: { borderRadius: 20, padding: 36, alignItems: 'center', marginBottom: 16 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontFamily: Fonts.bold, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 21 },

  // Expense card
  expenseCard: {
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  expenseAccent: { width: 4 },
  expenseInner: { flex: 1, padding: 12, gap: 3 },
  expenseTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  expenseDesc: { fontFamily: Fonts.semiBold, fontSize: 14, flex: 1 },
  expenseAmount: { fontFamily: Fonts.bold, fontSize: 15 },
  expenseMeta: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 18 },

  // Settlement card
  settlementCard: {
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    minHeight: 52,
  },
  settlementNamePill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 100,
  },
  settlementName: { fontFamily: Fonts.semiBold, fontSize: 12 },
  settlementArrow: { marginHorizontal: 2 },
  settlementAmount: { fontFamily: Fonts.bold, fontSize: 14 },

  // Balance card
  balanceCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  balanceCardTitle: { fontFamily: Fonts.semiBold, fontSize: 12, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  balanceHero: { fontFamily: Fonts.bold, fontSize: 32, marginBottom: 14 },
  balanceDivider: { height: 1, marginBottom: 14, borderRadius: 1 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  balanceStatDivider: { width: 1, borderRadius: 1 },
  balanceStat: { alignItems: 'center', flex: 1 },
  balanceStatLabel: { fontFamily: Fonts.regular, fontSize: 11, marginBottom: 4, textAlign: 'center' },
  balanceStatValue: { fontFamily: Fonts.bold, fontSize: 13, textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
    }),
  },
  fabLabel: { fontFamily: Fonts.bold, fontSize: 15 },

  // Options buttons inside dialog
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  optionBtnText: { fontFamily: Fonts.semiBold, fontSize: 15 },

  // Form fields
  fieldLabel: { fontFamily: Fonts.regular, fontSize: 12, marginBottom: 6 },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: Fonts.regular,
    fontSize: 15,
  },
  amountInput: { fontFamily: Fonts.semiBold, fontSize: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
  },
  chipText: { fontFamily: Fonts.semiBold, fontSize: 13 },
});
