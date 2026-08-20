import { useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import AppHeader from '../components/AppHeader';
import AppIcon from '../components/AppIcon';
import AppSegmentedControl from '../components/AppSegmentedControl';
import BankLogo from '../components/BankLogo';
import CategoryIcon from '../components/CategoryIcon';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import { scrollFadeMask } from '../components/ScrollFadeEdges';
import PlanTable from '../components/simulator/PlanTable';
import CompareTable from '../components/simulator/CompareTable';
import ImpactPanel from '../components/simulator/ImpactPanel';

import { Fonts } from '../config/fonts';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { useCards } from '../hooks/useCards';
import { useCategories } from '../hooks/useCategories';
import { useBudgets } from '../hooks/useBudgets';
import { useTEARate } from '../hooks/useTEARate';
import { usePurchaseImpact } from '../hooks/usePurchaseImpact';
import { filterCategories, categoryLabel } from '../constants/categories';
import { accentInk } from '../utils/contrast';
import { formatMoney } from '../utils/formatMoney';
import { getMonthNames } from '../utils/dateLocale';
import { goBack } from '../utils/nav';
import { effectivePurchaseDate } from '../utils/installmentCalc';
import {
  simulate, compareTerms, teaFromMonthlyPct, monthlyPctFromTea,
  COMPARE_TERMS, MAX_INSTALLMENTS,
} from '../utils/simulator';

type TabKey = 'plan' | 'compare' | 'impact';

/** Atajos de plazo. Los mismos que compara la tabla, para que elegir y comparar
 *  sean el mismo vocabulario. */
const QUICK_TERMS = COMPARE_TERMS;

/** Tope de la tasa según cómo se escriba: 200 % anual ≈ 9,6 % mensual. */
const RATE_MAX = { tea: 200, monthly: 20 } as const;

function digitsToInt(raw: string): number {
  return raw ? parseInt(raw, 10) : 0;
}

/** Miles con punto, igual que en add-transaction. */
function groupDigits(raw: string): string {
  return raw ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
}

export default function PurchaseSimulatorScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const { user, isPremium } = useAuthStore();
  const uid = user?.uid ?? '';
  const transitionRef = useRef<ScreenTransitionRef>(null);
  const months = useMemo(() => getMonthNames(i18n.language), [i18n.language]);

  const { cards } = useCards(uid);
  const { categories: customCategories } = useCategories(uid);
  const { tea: referenceTEA } = useTEARate();

  // ── Estado del formulario ─────────────────────────────────────────────────
  const [priceRaw, setPriceRaw] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [installments, setInstallments] = useState(12);
  const [withInterest, setWithInterest] = useState(true);
  const [rateMode, setRateMode] = useState<'tea' | 'monthly'>('tea');
  const [rateInput, setRateInput] = useState(String(referenceTEA));
  const [showMore, setShowMore] = useState(false);
  const [downRaw, setDownRaw] = useState('');
  const [feeRaw, setFeeRaw] = useState('');
  const [tab, setTab] = useState<TabKey>('plan');

  // Solo crédito: simular cuotas sobre un débito no significa nada.
  const creditCards = cards.filter((c) => c.type === 'credit');
  const card = creditCards.find((c) => c.id === cardId) ?? null;
  const expenseCategories = useMemo(
    () => filterCategories('expense', customCategories),
    [customCategories],
  );

  // ── Derivados ─────────────────────────────────────────────────────────────
  const price = digitsToInt(priceRaw);
  const downPayment = Math.min(price, digitsToInt(downRaw));
  const monthlyFee = digitsToInt(feeRaw);
  const rateNum = rateInput.trim() ? parseFloat(rateInput.replace(',', '.')) : NaN;
  const rateValid = !withInterest || installments <= 1
    || (Number.isFinite(rateNum) && rateNum > 0 && rateNum <= RATE_MAX[rateMode]);
  const teaValue = !withInterest || installments <= 1 || !rateValid
    ? null
    : rateMode === 'tea' ? rateNum : teaFromMonthlyPct(rateNum);

  const startDate = useMemo(
    () => effectivePurchaseDate(new Date(), card?.cutoffDay),
    [card?.cutoffDay],
  );

  const result = useMemo(() => {
    if (price <= 0 || !rateValid) return null;
    return simulate({ price, downPayment, installments, tea: teaValue, monthlyFee, startDate });
  }, [price, downPayment, installments, teaValue, monthlyFee, startDate, rateValid]);

  const scenarios = useMemo(() => {
    if (price <= 0 || !rateValid) return [];
    return compareTerms({ price, downPayment, tea: teaValue, monthlyFee, startDate }, QUICK_TERMS);
  }, [price, downPayment, teaValue, monthlyFee, startDate, rateValid]);

  // ── Impacto (premium, y solo con la pestaña abierta) ──────────────────────
  const impactEnabled = isPremium && tab === 'impact' && !!result;
  const impact = usePurchaseImpact(uid, impactEnabled);
  const now = new Date();
  const { budgets } = useBudgets(
    impactEnabled && categoryId ? uid : '',
    now.getFullYear(),
    now.getMonth(),
  );
  const categoryBudget = useMemo(() => {
    if (!categoryId) return null;
    const b = budgets.find((x) => x.categoryId === categoryId);
    return b ? { name: b.categoryName, limit: b.limitAmount } : null;
  }, [budgets, categoryId]);

  const ink = accentInk(colors, 'primary', colors.surface);

  const handleRegister = () => {
    if (!result) return;
    router.push({
      pathname: '/add-transaction',
      params: {
        simAmount: String(result.financed),
        simDescription: description,
        simCategory: categoryId ?? '',
        simCardId: cardId ?? '',
        simInstallments: String(installments),
        simTea: teaValue != null ? String(teaValue) : '',
      },
    } as never);
  };

  const sectionCard = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }];

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader showBack onBack={() => transitionRef.current?.animateOut(() => goBack('/(tabs)/tools'))} />
          <PageTitle title={t('simulator.title')} description={t('simulator.pageDesc')} />

          <ScrollView
            style={scrollFadeMask(0, 0)}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ══ LA COMPRA ══ */}
            <View style={sectionCard}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t('simulator.purchaseSection')}</Text>

              <View style={styles.amountRow}>
                <TextInput
                  style={[styles.amountInput, { color: colors.primary }]}
                  keyboardType="numeric"
                  value={priceRaw ? `$${groupDigits(priceRaw)}` : ''}
                  onChangeText={(txt) => setPriceRaw(txt.replace(/\D/g, '').slice(0, 12))}
                  placeholder="$0"
                  placeholderTextColor={colors.textTertiary}
                  returnKeyType="done"
                  accessibilityLabel={t('simulator.emptyTitle')}
                />
              </View>

              <TextInput
                style={[styles.textField, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.textPrimary }]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('simulator.descriptionPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                returnKeyType="done"
                maxLength={60}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('simulator.categoryLabel')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {expenseCategories.map((cat) => {
                    const active = categoryId === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setCategoryId(active ? null : cat.id)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={[
                          styles.catChip,
                          { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                          active && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                      >
                        <CategoryIcon icon={cat.icon} size={16} color={active ? colors.onPrimary : colors.textSecondary} />
                        <Text style={[styles.catChipText, { color: active ? colors.onPrimary : colors.textSecondary }]}>
                          {categoryLabel(cat.id, customCategories, t)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* ══ CÓMO LA PAGAS ══ */}
            <View style={sectionCard}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t('simulator.paymentSection')}</Text>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('simulator.cardLabel')}</Text>
              {creditCards.length === 0 ? (
                <Text style={[styles.hint, { color: colors.textTertiary }]}>{t('simulator.noCardsHint')}</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      onPress={() => setCardId(null)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityState={{ selected: cardId === null }}
                      style={[
                        styles.cardChip,
                        { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                        cardId === null && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.cardChipText, { color: cardId === null ? colors.onPrimary : colors.textSecondary }]}>
                        {t('simulator.noCard')}
                      </Text>
                    </TouchableOpacity>
                    {creditCards.map((c) => {
                      const active = cardId === c.id;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          onPress={() => setCardId(c.id)}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          style={[
                            styles.cardChip,
                            { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                            active && { backgroundColor: colors.primary, borderColor: colors.primary },
                          ]}
                        >
                          <BankLogo bankId={c.bankId} size={20} radius={5} />
                          <Text style={[styles.cardChipText, { color: active ? colors.onPrimary : colors.textSecondary }]}>
                            {c.nickname || c.bankName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              )}

              {/* Cuotas */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>{t('simulator.installmentsLabel')}</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  onPress={() => setInstallments((v) => Math.max(1, v - 1))}
                  style={[styles.stepBtn, { borderColor: colors.border }]}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="-1"
                >
                  <AppIcon name="remove" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.stepValue, { color: colors.textPrimary }]}>{installments}</Text>
                <TouchableOpacity
                  onPress={() => setInstallments((v) => Math.min(MAX_INSTALLMENTS, v + 1))}
                  style={[styles.stepBtn, { borderColor: colors.border }]}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="+1"
                >
                  <AppIcon name="add" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.hint, { color: colors.textTertiary, flex: 1, marginTop: 0 }]}>
                  {installments === 1 ? t('simulator.installmentSingle') : t('simulator.installmentsPlural')}
                </Text>
              </View>

              <View style={styles.chipRow}>
                {QUICK_TERMS.map((n) => {
                  const active = installments === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      onPress={() => setInstallments(n)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.termChip,
                        { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                        active && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.termChipText, { color: active ? colors.onPrimary : colors.textSecondary }]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Interés */}
              {installments > 1 && (
                <>
                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>{t('simulator.withInterest')}</Text>
                      <Text style={[styles.hint, { color: colors.textTertiary }]}>{t('simulator.withInterestHint')}</Text>
                    </View>
                    <Switch
                      value={withInterest}
                      onValueChange={(v) => {
                        setWithInterest(v);
                        if (v) { setRateMode('tea'); setRateInput(String(referenceTEA)); }
                      }}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>

                  {withInterest && (
                    <View style={{ marginTop: 12, gap: 10 }}>
                      <AppSegmentedControl
                        segments={[
                          { key: 'tea', label: t('simulator.rateTea') },
                          { key: 'monthly', label: t('simulator.rateMonthly') },
                        ]}
                        activeKey={rateMode}
                        onChange={(k) => {
                          const next = k as 'tea' | 'monthly';
                          if (next === rateMode) return;
                          // Se convierte el valor en vez de borrarlo: cambiar de
                          // unidad no debería perder la tasa que ya escribió.
                          const n = parseFloat(rateInput.replace(',', '.'));
                          if (Number.isFinite(n) && n > 0) {
                            setRateInput(
                              (next === 'monthly' ? monthlyPctFromTea(n) : teaFromMonthlyPct(n)).toFixed(2),
                            );
                          }
                          setRateMode(next);
                        }}
                      />
                      <View style={styles.rateRow}>
                        <TextInput
                          style={[
                            styles.rateInput,
                            {
                              borderColor: rateValid ? colors.border : colors.error,
                              backgroundColor: colors.backgroundSecondary,
                              color: colors.textPrimary,
                            },
                          ]}
                          keyboardType="decimal-pad"
                          value={rateInput}
                          onChangeText={setRateInput}
                          placeholder="0.0"
                          placeholderTextColor={colors.textTertiary}
                          returnKeyType="done"
                          accessibilityLabel={rateMode === 'tea' ? t('simulator.rateSuffixTea') : t('simulator.rateSuffixMonthly')}
                        />
                        <Text style={[styles.rateSuffix, { color: colors.textSecondary }]}>
                          {rateMode === 'tea' ? t('simulator.rateSuffixTea') : t('simulator.rateSuffixMonthly')}
                        </Text>
                      </View>
                      {!rateValid ? (
                        <Text style={[styles.hint, { color: colors.error }]}>
                          {t('simulator.rateInvalid', { max: RATE_MAX[rateMode] })}
                        </Text>
                      ) : teaValue != null ? (
                        <Text style={[styles.hint, { color: colors.textTertiary }]}>
                          {t('simulator.rateEquivalent', {
                            monthly: monthlyPctFromTea(teaValue).toFixed(2),
                            tea: teaValue.toFixed(2),
                          })}
                        </Text>
                      ) : null}
                      {rateMode === 'tea' && (
                        <Text style={[styles.hint, { color: colors.textTertiary }]}>
                          {t('simulator.rateReference', { rate: referenceTEA })}
                        </Text>
                      )}
                    </View>
                  )}
                </>
              )}

              {/* Más opciones */}
              <TouchableOpacity
                onPress={() => setShowMore((v) => !v)}
                activeOpacity={0.8}
                accessibilityRole="button"
                style={styles.moreRow}
              >
                <Text style={[styles.moreText, { color: ink }]}>
                  {showMore ? t('simulator.lessOptions') : t('simulator.moreOptions')}
                </Text>
                <AppIcon name={showMore ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
              </TouchableOpacity>

              {showMore && (
                <View style={{ gap: 14 }}>
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('simulator.downPayment')}</Text>
                    <TextInput
                      style={[styles.textField, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.textPrimary }]}
                      keyboardType="numeric"
                      value={downRaw ? `$${groupDigits(downRaw)}` : ''}
                      onChangeText={(txt) => setDownRaw(txt.replace(/\D/g, '').slice(0, 12))}
                      placeholder="$0"
                      placeholderTextColor={colors.textTertiary}
                      returnKeyType="done"
                    />
                    <Text style={[styles.hint, { color: colors.textTertiary }]}>{t('simulator.downPaymentHint')}</Text>
                  </View>
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('simulator.monthlyFee')}</Text>
                    <TextInput
                      style={[styles.textField, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.textPrimary }]}
                      keyboardType="numeric"
                      value={feeRaw ? `$${groupDigits(feeRaw)}` : ''}
                      onChangeText={(txt) => setFeeRaw(txt.replace(/\D/g, '').slice(0, 9))}
                      placeholder="$0"
                      placeholderTextColor={colors.textTertiary}
                      returnKeyType="done"
                    />
                    <Text style={[styles.hint, { color: colors.textTertiary }]}>{t('simulator.monthlyFeeHint')}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* ══ RESULTADO ══ */}
            {price <= 0 ? (
              <LinearGradient
                colors={[colors.primary + '18', colors.primary + '06']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[styles.empty, { borderColor: colors.primary + '25' }]}
              >
                <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '18' }]}>
                  <AppIcon name="calculator-outline" size={30} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('simulator.emptyTitle')}</Text>
                <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{t('simulator.emptyBody')}</Text>
              </LinearGradient>
            ) : !result ? null : (
              <>
                <LinearGradient
                  colors={[colors.primary + (isDark ? '2E' : '22'), colors.tertiary + '10', 'transparent']}
                  start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
                  style={[styles.hero, { borderColor: colors.primary + '33' }]}
                >
                  <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>{t('simulator.resultLabel')}</Text>
                  <Text style={[styles.heroValue, { color: colors.textPrimary }]}>
                    {formatMoney(result.monthlyPayment, i18n.language)}
                  </Text>
                  <Text style={[styles.heroTerm, { color: colors.textSecondary }]}>
                    {installments === 1
                      ? t('simulator.resultSingleTerm', { month: `${months[result.lastDate.getMonth()]} ${result.lastDate.getFullYear()}` })
                      : t('simulator.resultTerm', {
                        n: installments,
                        month: `${months[result.lastDate.getMonth()]} ${result.lastDate.getFullYear()}`,
                      })}
                  </Text>
                  {!result.levelPayments && (
                    <Text style={[styles.heroNote, { color: colors.textTertiary }]}>
                      {t('simulator.resultUneven', { amount: formatMoney(result.lastPayment, i18n.language) })}
                    </Text>
                  )}

                  <View style={[styles.statRow, { borderTopColor: colors.border }]}>
                    <View style={styles.stat}>
                      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{t('simulator.statTotal')}</Text>
                      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatMoney(result.totalPaid, i18n.language)}</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{t('simulator.statCost')}</Text>
                      <Text style={[styles.statValue, { color: result.creditCost > 0 ? colors.error : colors.textPrimary }]}>
                        {formatMoney(result.creditCost, i18n.language)}
                      </Text>
                      {result.creditCost > 0 && (
                        <Text style={[styles.statSub, { color: colors.textTertiary }]}>
                          {t('simulator.statOverhead', { pct: result.overheadPct.toFixed(1) })}
                        </Text>
                      )}
                    </View>
                    <View style={styles.stat}>
                      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
                        {result.effectiveTea != null ? t('simulator.statRealRate') : t('simulator.statRate')}
                      </Text>
                      <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                        {`${(result.effectiveTea ?? result.tea).toFixed(1)} %`}
                      </Text>
                    </View>
                  </View>

                  {result.effectiveTea != null && (
                    <Text style={[styles.heroNote, { color: colors.textTertiary, marginTop: 10 }]}>
                      {t('simulator.realRateNote', {
                        pct: result.effectiveTea.toFixed(1),
                        nominal: result.tea.toFixed(1),
                      })}
                    </Text>
                  )}
                </LinearGradient>

                <AppSegmentedControl
                  segments={[
                    { key: 'plan', label: t('simulator.tabPlan') },
                    { key: 'compare', label: t('simulator.tabCompare') },
                    { key: 'impact', label: t('simulator.tabImpact') },
                  ]}
                  activeKey={tab}
                  onChange={(k) => setTab(k as TabKey)}
                  style={{ marginTop: 4 }}
                />

                <View style={sectionCard}>
                  {tab === 'plan' && <PlanTable schedule={result.schedule} />}

                  {tab === 'compare' && (
                    <CompareTable
                      rows={scenarios}
                      current={installments}
                      onPick={setInstallments}
                      cashPrice={price}
                    />
                  )}

                  {tab === 'impact' && (
                    isPremium ? (
                      <ImpactPanel
                        schedule={result.schedule}
                        price={price}
                        creditCost={result.creditCost}
                        monthlyPayment={result.monthlyPayment}
                        committedByMonth={impact.committedByMonth}
                        typicalIncome={impact.typicalIncome}
                        fixedExpenses={impact.fixedExpenses}
                        hasIncomeData={impact.hasIncomeData}
                        loading={impact.loading}
                        categoryBudget={categoryBudget}
                        onCreateGoal={() => router.push('/goals' as never)}
                      />
                    ) : (
                      <View style={styles.locked}>
                        <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '18' }]}>
                          <AppIcon name="lock-closed-outline" size={26} color={colors.primary} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('simulator.impactLockedTitle')}</Text>
                        <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{t('simulator.impactLockedBody')}</Text>
                        <TouchableOpacity
                          onPress={() => router.push('/upgrade' as never)}
                          activeOpacity={0.85}
                          accessibilityRole="button"
                          style={[styles.unlockBtn, { backgroundColor: colors.primary }]}
                        >
                          <AppIcon name="star" size={15} color={colors.onPrimary} />
                          <Text style={[styles.unlockText, { color: colors.onPrimary }]}>{t('simulator.impactUnlock')}</Text>
                        </TouchableOpacity>
                      </View>
                    )
                  )}
                </View>
              </>
            )}

            <Text style={[styles.notSaved, { color: colors.textTertiary }]}>{t('simulator.notSaved')}</Text>
          </ScrollView>

          {/* CTA fijo: convertir la simulación en un movimiento real. */}
          {!!result && (
            <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
              <TouchableOpacity
                onPress={handleRegister}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={[styles.cta, { backgroundColor: colors.primary }]}
              >
                <AppIcon name="add" size={18} color={colors.onPrimary} />
                <Text style={[styles.ctaText, { color: colors.onPrimary }]}>{t('simulator.register')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingTop: 4, paddingBottom: 32, gap: 14, width: '100%', maxWidth: 640, alignSelf: 'center' },

  card: { borderRadius: 20, borderWidth: 1, padding: 16 },
  sectionLabel: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontFamily: Fonts.semiBold, marginBottom: 8 },
  hint: { fontSize: 11.5, fontFamily: Fonts.regular, lineHeight: 16, marginTop: 6 },

  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  amountInput: {
    fontSize: 38, fontFamily: Fonts.extraBold, textAlign: 'center', minWidth: 120,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
  },
  textField: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: Fonts.regular },

  chipRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 8, paddingVertical: 2 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 50, borderWidth: 1 },
  catChipText: { fontSize: 12.5, fontFamily: Fonts.medium },
  cardChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 50, borderWidth: 1 },
  cardChipText: { fontSize: 12.5, fontFamily: Fonts.medium },
  termChip: { minWidth: 44, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 50, borderWidth: 1 },
  termChipText: { fontSize: 13, fontFamily: Fonts.semiBold },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  stepBtn: { width: 38, height: 38, borderRadius: 50, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 20, fontFamily: Fonts.bold, minWidth: 34, textAlign: 'center' },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, gap: 12 },
  switchLabel: { fontSize: 14, fontFamily: Fonts.semiBold },

  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rateInput: { width: 110, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, fontFamily: Fonts.monoBold, textAlign: 'center' },
  rateSuffix: { fontSize: 13, fontFamily: Fonts.medium },

  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 16, marginBottom: 4, alignSelf: 'flex-start' },
  moreText: { fontSize: 13, fontFamily: Fonts.semiBold },

  empty: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center' },
  emptyIcon: { width: 62, height: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontFamily: Fonts.bold, textAlign: 'center' },
  emptyBody: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 19, textAlign: 'center', marginTop: 6 },

  hero: { borderRadius: 22, borderWidth: 1, padding: 18, overflow: 'hidden' },
  heroLabel: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 1.4, textTransform: 'uppercase' },
  heroValue: { fontSize: 36, fontFamily: Fonts.extraBold, marginTop: 4 },
  heroTerm: { fontSize: 13, fontFamily: Fonts.medium, marginTop: 2 },
  heroNote: { fontSize: 11.5, fontFamily: Fonts.regular, lineHeight: 16, marginTop: 4 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  stat: { flex: 1 },
  statLabel: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.8, textTransform: 'uppercase' },
  statValue: { fontSize: 14, fontFamily: Fonts.monoBold, marginTop: 3 },
  statSub: { fontSize: 10.5, fontFamily: Fonts.mono, marginTop: 2 },

  locked: { alignItems: 'center', paddingVertical: 12 },
  unlockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 44, paddingHorizontal: 22, borderRadius: 50, marginTop: 16 },
  unlockText: { fontSize: 14, fontFamily: Fonts.bold },

  notSaved: { fontSize: 11, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 4, lineHeight: 16 },

  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 50, width: '100%', maxWidth: 640, alignSelf: 'center' },
  ctaText: { fontSize: 15, fontFamily: Fonts.bold },
});
