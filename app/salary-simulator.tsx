/**
 * «Simulador de sueldo» — con este sueldo, ¿cómo me queda el mes?
 *
 * Pantalla de PLANIFICACIÓN: lee los movimientos del mes elegido (fijos y
 * variables) y no escribe NUNCA en `transactions`. Apagar un fijo o añadir un
 * gasto simulado solo cambia el escenario guardado en el perfil
 * (`users/{uid}.salarySim`), así que un «¿y si…?» no puede mover el balance.
 *
 * El mes vive en el estado de la pantalla y ninguna acción lo resetea: si el
 * usuario está simulando diciembre, se queda en diciembre.
 *
 * Toda la aritmética está en `utils/salarySim.ts` (gate con tests).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, PanResponder,
  type AccessibilityActionEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import AppIcon from '../components/AppIcon';
import AppHeader from '../components/AppHeader';
import AppButton from '../components/AppButton';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import AppSegmentedControl from '../components/AppSegmentedControl';
import { Skeleton } from '../components/Skeleton';
import { scrollFadeMask } from '../components/ScrollFadeEdges';
import FxLayer, { type FxFrame } from '../components/fx/FxLayer';

import { Fonts } from '../config/fonts';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { usePremium } from '../hooks/usePremium';
import { useFxRates } from '../hooks/useFxRates';
import { useFxIncome } from '../hooks/useFxIncome';
import { useTransactions } from '../hooks/useTransactions';
import { useSalarySim } from '../hooks/useSalarySim';
import { mixHex, readableTint } from '../utils/contrast';
import { formatMoney } from '../utils/formatMoney';
import { getMonthNames, localeFor } from '../utils/dateLocale';
import { goBack } from '../utils/nav';
import { parseAmount } from '../utils/fxIncomeForm';
import { rateFor, toCop, type FxCurrency } from '../utils/fxConvert';
import {
  simulate, monthFixedExpenses, monthVariableSpent, monthKind, daysInMonth, daysLeft, rateDeltaPct,
  clampPct, clampPayments, DEFAULT_PAYMENTS, PAY_FREQUENCIES, PAYMENTS_MAX, PAYMENTS_MIN, SAVE_PRESETS,
  SIMULATED_MAX, SIMULATED_NAME_MAX, type PayFrequency,
} from '../utils/salarySim';

const SYMBOL: Record<FxCurrency, string> = { COP: '$', EUR: '€', USD: 'US$' };
const CURRENCIES: FxCurrency[] = ['COP', 'EUR', 'USD'];
/** Hasta dónde se puede navegar: un año atrás y un trimestre adelante. */
const MONTHS_BACK = 12;
const MONTHS_AHEAD = 3;

/** Mismo latido que «Mi salario» y los chips del Home: «este dato está vivo». */
const DOT_FRAMES: FxFrame[] = [
  { at: 0, opacity: 1, scale: 1 },
  { at: 0.5, opacity: 0, scale: 1.6 },
  { at: 0.5001, opacity: 1, scale: 1 },
  { at: 1, opacity: 1, scale: 1 },
];

/** Número de campo → texto editable, sin decimales de más. */
const toField = (n: number) => (n > 0 ? n.toLocaleString(localeFor(), { maximumFractionDigits: 2 }) : '');

/**
 * Riel del reparto. Los hijos van con `pointerEvents="none"`: así `locationX`
 * siempre se mide contra el riel y no contra el pulgar, que en web hacía saltar
 * el valor al tocar encima de él.
 */
function SaveRail({ value, onChange, color, track, thumbBorder, label }: {
  value: number; onChange: (v: number) => void; color: string; track: string; thumbBorder: string; label: string;
}) {
  const width = useRef(0);
  // El gesto se crea UNA vez: recrearlo en cada render (el padre pasa una flecha
  // nueva) cortaba el arrastre a mitad. La última `onChange` viaja por ref.
  const change = useRef(onChange);
  change.current = onChange;
  const set = (x: number) => { if (width.current) change.current(clampPct((x / width.current) * 100)); };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > Math.abs(g.dy),
    // Un gesto vertical es el scroll de la página: se le deja pasar.
    onPanResponderTerminationRequest: () => true,
    onPanResponderGrant: (e) => set(e.nativeEvent.locationX),
    onPanResponderMove: (e) => set(e.nativeEvent.locationX),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  return (
    <View
      style={styles.rail}
      onLayout={(e) => { width.current = e.nativeEvent.layout.width; }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: value, text: `${value} %` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e: AccessibilityActionEvent) =>
        onChange(clampPct(value + (e.nativeEvent.actionName === 'increment' ? 5 : -5)))}
      {...responder.panHandlers}
    >
      <View pointerEvents="none" style={[styles.railTrack, { backgroundColor: track }]}>
        <View style={[styles.railFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <View pointerEvents="none" style={[styles.railThumb, { left: `${value}%`, backgroundColor: color, borderColor: thumbBorder }]} />
    </View>
  );
}

export default function SalarySimulatorScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const uid = useAuthStore((s) => s.user?.uid ?? '');
  const { isPremium, loading: premiumLoading } = usePremium();

  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const offset = (ym.y * 12 + ym.m) - (now.getFullYear() * 12 + now.getMonth());
  const shiftMonth = (d: number) => setYm(({ y, m }) => {
    const idx = y * 12 + m + d;
    return { y: Math.floor(idx / 12), m: idx % 12 };
  });

  const { transactions, loading: txLoading } = useTransactions(uid, ym.y, ym.m);
  const { rates, loading: ratesLoading, error: ratesError, stale, retry } = useFxRates();
  const { incomes } = useFxIncome(uid);
  const { scenario: sc, setScenario, loading: simLoading } = useSalarySim(uid);

  // Los campos se editan como texto: «2.4» a medio escribir no es un número.
  const [salaryText, setSalaryText] = useState('');
  const [rateText, setRateText] = useState('');
  const [saveText, setSaveText] = useState('');
  const [freeText, setFreeText] = useState('');
  const [amountTexts, setAmountTexts] = useState<Record<string, string>>({});
  const rateRef = useRef<TextInput>(null);
  const hydrated = useRef(false);

  const cur = sc.currency;
  const trm = cur === 'COP' ? 1 : rateFor(cur, rates);
  const manual = cur === 'COP' ? undefined : sc.manualRates[cur];
  const isManual = manual !== undefined;
  const rate = cur === 'COP' ? 1 : (manual ?? trm ?? 0);

  // Una sola vez, cuando llega el escenario guardado.
  useEffect(() => {
    if (simLoading || hydrated.current) return;
    hydrated.current = true;
    setSalaryText(toField(sc.salary));
    setSaveText(String(sc.savePct));
    setFreeText(String(100 - sc.savePct));
    setAmountTexts(Object.fromEntries(sc.simulated.map((s) => [s.id, toField(s.amount)])));
    if (sc.currency !== 'COP' && sc.manualRates[sc.currency] !== undefined) {
      setRateText(toField(sc.manualRates[sc.currency]!));
    }
  }, [simLoading, sc]);

  const monthFixed = useMemo(() => monthFixedExpenses(transactions), [transactions]);
  const variableSpent = useMemo(() => monthVariableSpent(transactions), [transactions]);
  const fixedTotal = monthFixed.filter((f) => !sc.excludedFixedIds.includes(f.id)).reduce((s, f) => s + f.amount, 0)
    + sc.simulated.reduce((s, e) => s + e.amount, 0);

  const res = simulate({
    salary: sc.salary, rate, fixedTotal, savePct: sc.savePct, paymentsPerMonth: sc.paymentsPerMonth, variableSpent,
  });

  const kind = monthKind(ym.y, ym.m, now);
  const monthName = getMonthNames(i18n.language)[ym.m];
  const monthInSentence = i18n.language.startsWith('en') ? monthName : monthName.toLowerCase();

  const money = (n: number) => formatMoney(n, i18n.language);
  const fx = (n: number, c: FxCurrency = cur) => {
    const v = Math.round(n).toLocaleString(localeFor());
    return c === 'EUR' ? `${v} €` : c === 'USD' ? `US$${v}` : money(n);
  };

  const transitionRef = useRef<ScreenTransitionRef>(null);
  const back = () => transitionRef.current?.animateOut(() => goBack('/(tabs)/tools'));

  // ── acciones ──
  const pickCurrency = (c: FxCurrency) => {
    setScenario((p) => ({ ...p, currency: c }));
    setRateText(c !== 'COP' && sc.manualRates[c] !== undefined ? toField(sc.manualRates[c]!) : '');
  };
  const onSalary = (text: string) => {
    setSalaryText(text);
    setScenario((p) => ({ ...p, salary: parseAmount(text) ?? 0 }));
  };
  const editRate = () => {
    if (cur === 'COP') return;
    const start = trm ?? 0;
    setRateText(toField(start));
    setScenario((p) => ({ ...p, manualRates: { ...p.manualRates, [cur]: start } }));
    setTimeout(() => rateRef.current?.focus(), 50);
  };
  const onRate = (text: string) => {
    if (cur === 'COP') return;
    setRateText(text);
    setScenario((p) => ({ ...p, manualRates: { ...p.manualRates, [cur]: parseAmount(text) ?? 0 } }));
  };
  const resetRate = () => {
    if (cur === 'COP') return;
    setRateText('');
    setScenario((p) => {
      const { [cur]: _drop, ...rest } = p.manualRates;
      return { ...p, manualRates: rest };
    });
  };
  /** Copia lo declarado en «Mi salario». Con monedas mezcladas no hay una sola
   *  divisa que sumar, así que se pasa a pesos con la TRM del día. */
  const applyMySalary = () => {
    if (incomes.length === 0) return;
    const currencies = new Set(incomes.map((i) => i.currency));
    let currency: FxCurrency;
    let salary: number;
    if (currencies.size === 1) {
      currency = incomes[0].currency;
      salary = incomes.reduce((s, i) => s + i.amount, 0);
    } else {
      currency = 'COP';
      salary = incomes.reduce((s, i) => s + (toCop(i.amount, i.currency, rates) ?? 0), 0);
    }
    setSalaryText(toField(salary));
    setRateText(currency !== 'COP' && sc.manualRates[currency] !== undefined ? toField(sc.manualRates[currency]!) : '');
    setScenario((p) => ({ ...p, currency, salary }));
  };
  const toggleFixed = (id: string) => setScenario((p) => ({
    ...p,
    excludedFixedIds: p.excludedFixedIds.includes(id)
      ? p.excludedFixedIds.filter((x) => x !== id)
      : [...p.excludedFixedIds, id],
  }));
  const addSimulated = () => setScenario((p) => (p.simulated.length >= SIMULATED_MAX ? p : {
    ...p, simulated: [...p.simulated, { id: `sim_${Date.now()}`, name: '', amount: 0 }],
  }));
  const renameSimulated = (id: string, name: string) => setScenario((p) => ({
    ...p, simulated: p.simulated.map((s) => (s.id === id ? { ...s, name: name.slice(0, SIMULATED_NAME_MAX) } : s)),
  }));
  const amountSimulated = (id: string, text: string) => {
    setAmountTexts((m) => ({ ...m, [id]: text }));
    setScenario((p) => ({
      ...p, simulated: p.simulated.map((s) => (s.id === id ? { ...s, amount: parseAmount(text) ?? 0 } : s)),
    }));
  };
  const removeSimulated = (id: string) => setScenario((p) => ({ ...p, simulated: p.simulated.filter((s) => s.id !== id) }));

  const setSave = (n: number, source?: 'save' | 'free') => {
    const v = clampPct(n);
    if (source !== 'save') setSaveText(String(v));
    if (source !== 'free') setFreeText(String(100 - v));
    setScenario((p) => ({ ...p, savePct: v }));
  };
  const onSaveText = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 3);
    setSaveText(digits === '' ? '' : String(clampPct(Number(digits))));
    setSave(digits === '' ? 0 : Number(digits), 'save');
  };
  const onFreeText = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 3);
    setFreeText(digits === '' ? '' : String(clampPct(Number(digits))));
    setSave(100 - (digits === '' ? 0 : clampPct(Number(digits))), 'free');
  };
  const pickFrequency = (f: PayFrequency) =>
    setScenario((p) => ({ ...p, frequency: f, paymentsPerMonth: DEFAULT_PAYMENTS[f] }));
  const stepPayments = (d: number) =>
    setScenario((p) => ({ ...p, paymentsPerMonth: clampPayments(p.paymentsPerMonth + d) }));

  // ── tintas medidas contra su fondo real ──
  const heroBg = mixHex(colors.surface, colors.primary, 0x12 / 255);
  const heroInk = readableTint(colors.primary, heroBg, 4.5);
  const primaryInk = readableTint(colors.primary, colors.surface, 4.5);
  const saveInk = readableTint(colors.success, colors.surface, 4.5);
  const expenseInk = readableTint(colors.expense, colors.surface, 4.5);
  const warnInk = readableTint(colors.warning, colors.surface, 4.5);
  const liveChipBg = mixHex(colors.surface, colors.success, 0x1c / 255);
  const liveChipInk = readableTint(colors.success, liveChipBg, 4.5);
  const manualChipBg = mixHex(colors.surface, colors.warning, 0x1c / 255);
  const manualChipInk = readableTint(colors.warning, manualChipBg, 4.5);
  const simChipBg = mixHex(colors.surface, colors.primary, 0x1c / 255);
  const simChipInk = readableTint(colors.primary, simChipBg, 4.5);
  const errorBg = mixHex(colors.surface, colors.error, 0x1c / 255);
  const errorInk = readableTint(colors.error, errorBg, 4.5);

  const loading = premiumLoading || simLoading || (cur !== 'COP' && ratesLoading && !isManual);
  const card = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }];
  const cardTitle = [styles.cardTitle, { color: colors.textTertiary }];
  const input = [styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }];

  const renderReal = () => {
    if (res.deficit) return <Text style={[styles.note, { color: colors.textSecondary }]}>{t('salarySim.real.noFree')}</Text>;
    if (kind === 'future') {
      const days = daysInMonth(ym.y, ym.m);
      return (
        <>
          <Text style={[styles.note, { color: colors.textSecondary }]}>{t('salarySim.real.futureEmpty', { month: monthInSentence })}</Text>
          <Text style={[styles.headline, { color: saveInk }]}>{t('salarySim.real.futurePerDay', { amount: money(res.free / days) })}</Text>
          <Text style={[styles.note, { color: colors.textTertiary }]}>{t('salarySim.real.futureNote', { free: money(res.free), days })}</Text>
        </>
      );
    }
    const over = res.left < 0;
    const used = res.free > 0 ? variableSpent / res.free : (variableSpent > 0 ? 1 : 0);
    const left = daysLeft(ym.y, ym.m, now);
    return (
      <>
        <View style={styles.sumRow}>
          <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>
            {t(kind === 'past' ? 'salarySim.real.spentPast' : 'salarySim.real.spentCurrent')}
          </Text>
          <Text style={[styles.sumValue, { color: colors.textPrimary }]}>{money(variableSpent)}</Text>
        </View>
        <View style={[styles.bar, { backgroundColor: colors.inputBackground }]}>
          <View style={{ width: `${Math.min(used, 1) * 100}%`, backgroundColor: over ? colors.error : colors.primary }} />
        </View>
        <Text style={[styles.note, { color: colors.textTertiary }]}>
          {t('salarySim.real.ofFree', { pct: Math.round(used * 100) })}
          {kind === 'current' ? ` · ${t('salarySim.real.day', { day: now.getDate(), days: daysInMonth(ym.y, ym.m) })}` : ''}
        </Text>
        {kind === 'past' ? (
          <>
            <Text style={[styles.note, { color: colors.textSecondary, marginTop: 10 }]}>{t('salarySim.real.pastIntro', { month: monthInSentence })}</Text>
            <Text style={[styles.headline, { color: over ? errorInk : saveInk }]}>
              {t(over ? 'salarySim.real.pastOver' : 'salarySim.real.pastLeft', { amount: money(Math.abs(res.left)) })}
            </Text>
            <Text style={[styles.note, { color: colors.textTertiary }]}>
              {over
                ? t('salarySim.real.pastOverNote', { save: money(res.save), left: money(res.save + res.left) })
                : t('salarySim.real.pastLeftNote', { save: money(res.save) })}
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.headline, { color: over ? errorInk : saveInk }]}>
              {t(over ? 'salarySim.real.over' : 'salarySim.real.left', { amount: money(Math.abs(res.left)) })}
            </Text>
            <Text style={[styles.note, { color: colors.textTertiary }]}>
              {over
                ? t('salarySim.real.overNote', { left: money(Math.max(res.save + res.left, 0)), save: money(res.save) })
                : t('salarySim.real.perDay', { amount: money(res.left / left), count: left })}
            </Text>
          </>
        )}
      </>
    );
  };

  const total = Math.max(res.income, 1);

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader showBack onBack={back} />
          <PageTitle title={t('salarySim.title')} description={t('salarySim.pageDesc')} />

          <ScrollView
            style={[styles.scroller, scrollFadeMask(0, 0)]}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View>
                <Skeleton width="100%" height={52} borderRadius={26} />
                <Skeleton width="100%" height={220} borderRadius={22} style={styles.gap} />
                <Skeleton width="100%" height={180} borderRadius={22} style={styles.gap} />
              </View>
            ) : !isPremium ? (
              <View style={[...card, styles.lockCard]}>
                <View style={[styles.lockIcon, { backgroundColor: colors.primary + '18' }]}>
                  <AppIcon name="lock-closed-outline" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.lockTitle, { color: colors.textPrimary }]}>{t('salarySim.locked.title')}</Text>
                <Text style={[styles.lockBody, { color: colors.textSecondary }]}>{t('salarySim.locked.body')}</Text>
                <AppButton label={t('salarySim.locked.cta')} onPress={() => router.push('/upgrade' as never)} style={styles.lockCta} />
              </View>
            ) : (
              <>
                {/* ── 0 · Mes ── */}
                <View style={[styles.monthNav, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => shiftMonth(-1)}
                    disabled={offset <= -MONTHS_BACK}
                    accessibilityRole="button"
                    accessibilityLabel={t('salarySim.month.prev')}
                    style={[styles.monthBtn, { backgroundColor: colors.primary + '18', opacity: offset <= -MONTHS_BACK ? 0.35 : 1 }]}
                  >
                    <AppIcon name="chevron-back" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <View style={styles.monthMid}>
                    <Text style={[styles.monthName, { color: colors.textPrimary }]}>{`${monthName} ${ym.y}`}</Text>
                    <Text style={[styles.monthKind, { color: colors.textTertiary }]}>{t(`salarySim.month.${kind}`)}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => shiftMonth(1)}
                    disabled={offset >= MONTHS_AHEAD}
                    accessibilityRole="button"
                    accessibilityLabel={t('salarySim.month.next')}
                    style={[styles.monthBtn, { backgroundColor: colors.primary + '18', opacity: offset >= MONTHS_AHEAD ? 0.35 : 1 }]}
                  >
                    <AppIcon name="chevron-forward" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* ── 1 · Ingreso ── */}
                <View style={card}>
                  <View style={styles.cardHead}>
                    <Text style={cardTitle}>{t('salarySim.income.title')}</Text>
                    {incomes.length > 0 && (
                      <TouchableOpacity onPress={applyMySalary} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={[styles.link, { color: primaryInk }]}>{t('salarySim.income.useMine')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <AppSegmentedControl
                    segments={CURRENCIES.map((c) => ({ key: c, label: c }))}
                    activeKey={cur}
                    onChange={(k) => pickCurrency(k as FxCurrency)}
                  />
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>
                    {t('salarySim.income.salaryField', { symbol: SYMBOL[cur] })}
                  </Text>
                  <TextInput
                    value={salaryText}
                    onChangeText={onSalary}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    style={[...input, styles.inputBig]}
                  />

                  {cur !== 'COP' && (isManual ? (
                    <>
                      <View style={styles.rateHead}>
                        <Text style={[styles.fieldLabel, { color: colors.textTertiary, marginTop: 0 }]}>
                          {t('salarySim.income.manualField', { symbol: SYMBOL[cur] })}
                        </Text>
                        {trm !== null && (
                          <View style={[styles.chip, { backgroundColor: manualChipBg, borderColor: colors.warning + '59' }]}>
                            <Text style={[styles.chipText, { color: manualChipInk }]}>
                              {t('salarySim.income.manualChip', {
                                delta: `${rateDeltaPct(rate, trm) >= 0 ? '+' : '−'}${Math.abs(rateDeltaPct(rate, trm)).toLocaleString(localeFor(), { maximumFractionDigits: 1 })} %`,
                              })}
                            </Text>
                          </View>
                        )}
                      </View>
                      <TextInput
                        ref={rateRef}
                        value={rateText}
                        onChangeText={onRate}
                        keyboardType="decimal-pad"
                        inputMode="decimal"
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                        style={[...input, { borderColor: colors.warning + '80' }]}
                      />
                      {trm !== null && (
                        <TouchableOpacity onPress={resetRate} style={styles.linkRow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <AppIcon name="refresh-outline" size={14} color={primaryInk} />
                          <Text style={[styles.link, { color: primaryInk }]}>{t('salarySim.income.backToTrm', { rate: money(trm) })}</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  ) : trm === null ? (
                    <View style={[styles.banner, { backgroundColor: errorBg, borderColor: colors.error + '4D' }]}>
                      <Text style={[styles.bannerText, { color: errorInk }]}>{t('salarySim.income.noRate')}</Text>
                      <TouchableOpacity onPress={retry}><Text style={[styles.link, { color: primaryInk }]}>{t('salarySim.income.retry')}</Text></TouchableOpacity>
                      <TouchableOpacity onPress={editRate}><Text style={[styles.link, { color: primaryInk }]}>{t('salarySim.income.editRate')}</Text></TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.rateRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rateLabel, { color: colors.textTertiary }]}>{t('salarySim.income.trmToday')}</Text>
                        <Text style={[styles.rateValue, { color: colors.textPrimary }]}>{money(trm)}</Text>
                      </View>
                      {stale || ratesError ? (
                        <TouchableOpacity onPress={retry} style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                          <AppIcon name="cloud-offline-outline" size={12} color={colors.textTertiary} />
                          <Text style={[styles.chipText, { color: colors.textTertiary }]}>{t('salarySim.income.saved')}</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.chip, { backgroundColor: liveChipBg, borderColor: colors.success + '4D' }]}>
                          <FxLayer frames={DOT_FRAMES} duration={1800} easing="linear" style={[styles.dot, { backgroundColor: colors.success }]} />
                          <Text style={[styles.chipText, { color: liveChipInk }]}>{t('salarySim.income.live')}</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={editRate}
                        accessibilityRole="button"
                        accessibilityLabel={t('salarySim.income.editRate')}
                        style={[styles.iconBtn, { backgroundColor: colors.primary + '18' }]}
                      >
                        <AppIcon name="pencil-outline" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <View style={[styles.totalBox, { borderTopColor: colors.border }]}>
                    <Text style={[styles.note, { color: colors.textSecondary }]}>{t('salarySim.income.totalLabel')}</Text>
                    <Text style={[styles.bigValue, { color: heroInk }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                      {money(res.income)}
                    </Text>
                    <Text style={[styles.note, { color: colors.textTertiary }]}>
                      {cur === 'COP' ? t('salarySim.income.copFoot') : t('salarySim.income.fxFoot', { amount: fx(sc.salary), rate: money(rate) })}
                    </Text>
                  </View>
                </View>

                {/* ── 2 · Gastos fijos ── */}
                <View style={card}>
                  <View style={styles.cardHead}>
                    <Text style={cardTitle}>{t('salarySim.fixed.title', { month: monthName })}</Text>
                    <Text style={[styles.cardTotal, { color: expenseInk }]}>{money(fixedTotal)}</Text>
                  </View>
                  {txLoading ? (
                    <Skeleton width="100%" height={96} borderRadius={14} />
                  ) : monthFixed.length === 0 ? (
                    <Text style={[styles.note, { color: colors.textSecondary }]}>{t('salarySim.fixed.empty', { month: monthInSentence })}</Text>
                  ) : monthFixed.map((f, i) => {
                    const on = !sc.excludedFixedIds.includes(f.id);
                    return (
                      <View key={f.id} style={[styles.fixedRow, i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                        <Switch
                          value={on}
                          onValueChange={() => toggleFixed(f.id)}
                          trackColor={{ false: colors.border, true: colors.primary }}
                          thumbColor={colors.onPrimary}
                          accessibilityLabel={t('salarySim.fixed.include', { name: f.name })}
                        />
                        <View style={styles.fixedMain}>
                          <Text
                            style={[styles.fixedName, { color: on ? colors.textPrimary : colors.textTertiary }, !on && styles.struck]}
                            numberOfLines={1}
                          >
                            {f.name}
                          </Text>
                          {f.paid && (
                            <View style={[styles.chip, styles.chipInline, { backgroundColor: liveChipBg, borderColor: colors.success + '4D' }]}>
                              <Text style={[styles.chipText, { color: liveChipInk }]}>{t('salarySim.fixed.paid')}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.fixedAmount, { color: on ? colors.textPrimary : colors.textTertiary }, !on && styles.struck]}>
                          {money(f.amount)}
                        </Text>
                      </View>
                    );
                  })}

                  {sc.simulated.map((s) => (
                    <View key={s.id} style={[styles.fixedRow, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                      <View style={styles.fixedMain}>
                        <TextInput
                          value={s.name}
                          onChangeText={(v) => renameSimulated(s.id, v)}
                          maxLength={SIMULATED_NAME_MAX}
                          placeholder={t('salarySim.fixed.namePlaceholder')}
                          placeholderTextColor={colors.textTertiary}
                          style={[...input, styles.inputSmall]}
                        />
                        <View style={[styles.chip, styles.chipInline, { backgroundColor: simChipBg, borderColor: colors.primary + '4D' }]}>
                          <Text style={[styles.chipText, { color: simChipInk }]}>{t('salarySim.fixed.simulated')}</Text>
                        </View>
                      </View>
                      <TextInput
                        value={amountTexts[s.id] ?? ''}
                        onChangeText={(v) => amountSimulated(s.id, v)}
                        keyboardType="number-pad"
                        inputMode="numeric"
                        placeholder="$0"
                        placeholderTextColor={colors.textTertiary}
                        style={[...input, styles.inputSmall, styles.inputAmount]}
                      />
                      <TouchableOpacity
                        onPress={() => removeSimulated(s.id)}
                        accessibilityRole="button"
                        accessibilityLabel={t('salarySim.fixed.remove')}
                        style={[styles.iconBtn, { backgroundColor: colors.error + '18' }]}
                      >
                        <AppIcon name="trash-outline" size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {sc.simulated.length < SIMULATED_MAX ? (
                    <TouchableOpacity
                      onPress={addSimulated}
                      activeOpacity={0.8}
                      style={[styles.addBtn, { borderColor: colors.primary + '66', backgroundColor: colors.primary + '0D' }]}
                    >
                      <AppIcon name="add" size={16} color={primaryInk} />
                      <Text style={[styles.link, { color: primaryInk }]}>{t('salarySim.fixed.add')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.note, { color: colors.textTertiary }]}>{t('salarySim.fixed.max', { max: SIMULATED_MAX })}</Text>
                  )}
                  <Text style={[styles.note, { color: colors.textTertiary }]}>{t('salarySim.fixed.note')}</Text>
                </View>

                {/* ── 3 · Reparto ── */}
                <View style={[...card, res.deficit && styles.dim]} pointerEvents={res.deficit ? 'none' : 'auto'}>
                  <Text style={cardTitle}>{t('salarySim.split.title')}</Text>
                  <View style={styles.pcts}>
                    {([['save', saveText, onSaveText, saveInk], ['free', freeText, onFreeText, primaryInk]] as const).map(([k, val, fn, ink]) => (
                      <View key={k} style={[styles.pctBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                        <Text style={[styles.rateLabel, { color: ink }]}>{t(`salarySim.split.${k}`)}</Text>
                        <View style={styles.pctRow}>
                          <TextInput
                            value={val}
                            onChangeText={fn}
                            keyboardType="number-pad"
                            inputMode="numeric"
                            maxLength={3}
                            placeholder="0"
                            placeholderTextColor={colors.textTertiary}
                            accessibilityLabel={t(`salarySim.split.${k}`)}
                            style={[styles.pctInput, { color: colors.textPrimary }]}
                          />
                          <Text style={[styles.pctSuffix, { color: colors.textTertiary }]}>%</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                  <SaveRail
                    value={sc.savePct}
                    onChange={(v) => setSave(v)}
                    color={colors.primary}
                    track={colors.inputBackground}
                    thumbBorder={colors.surface}
                    label={t('salarySim.split.slider')}
                  />
                  <View style={styles.railLabels}>
                    <Text style={[styles.railLabel, { color: colors.textTertiary }]}>{t('salarySim.split.allFree')}</Text>
                    <Text style={[styles.railLabel, { color: colors.textTertiary }]}>{t('salarySim.split.allSave')}</Text>
                  </View>
                  <View style={styles.presets}>
                    {SAVE_PRESETS.map((p) => {
                      const active = sc.savePct === p;
                      return (
                        <TouchableOpacity
                          key={p}
                          onPress={() => setSave(p)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          style={[styles.preset, {
                            backgroundColor: active ? colors.primary : colors.inputBackground,
                            borderColor: active ? colors.primary : colors.inputBorder,
                          }]}
                        >
                          <Text style={[styles.presetText, { color: active ? colors.onPrimary : colors.textSecondary }]}>
                            {t('salarySim.split.preset', { save: p, free: 100 - p })}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* ── 4 · Resumen ── */}
                <View style={card}>
                  <Text style={cardTitle}>{t('salarySim.summary.title')}</Text>
                  <View style={[styles.bar, styles.barTall, { backgroundColor: colors.inputBackground }]}>
                    <View style={{ width: `${Math.min(res.fixedTotal / total, 1) * 100}%`, backgroundColor: colors.expense }} />
                    <View style={{ width: `${(res.save / total) * 100}%`, backgroundColor: colors.success }} />
                    <View style={{ width: `${(res.free / total) * 100}%`, backgroundColor: colors.primary }} />
                  </View>
                  <View style={styles.sumRow}>
                    <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>{t('salarySim.summary.income')}</Text>
                    <Text style={[styles.sumValue, { color: colors.textPrimary }]}>{money(res.income)}</Text>
                  </View>
                  <View style={styles.sumRow}>
                    <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>{t('salarySim.summary.fixed')}</Text>
                    <Text style={[styles.sumValue, { color: expenseInk }]}>{money(res.fixedTotal)}</Text>
                  </View>
                  <View style={[styles.sumRow, styles.sumEq, { borderTopColor: colors.border }]}>
                    <Text style={[styles.sumLabel, { color: colors.textPrimary }]}>{t('salarySim.summary.available')}</Text>
                    <Text style={[styles.sumValue, styles.sumValueBig, { color: res.deficit ? errorInk : colors.textPrimary }]}>{money(res.available)}</Text>
                  </View>
                  {res.deficit ? (
                    <View style={[styles.banner, { backgroundColor: errorBg, borderColor: colors.error + '4D' }]}>
                      <Text style={[styles.bannerText, { color: errorInk }]}>{t('salarySim.summary.deficit', { amount: money(-res.available) })}</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.sumRow}>
                        <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>{t('salarySim.summary.save', { pct: sc.savePct })}</Text>
                        <Text style={[styles.sumValue, { color: saveInk }]}>{money(res.save)}</Text>
                      </View>
                      <View style={styles.sumRow}>
                        <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>{t('salarySim.summary.free', { pct: 100 - sc.savePct })}</Text>
                        <Text style={[styles.sumValue, { color: primaryInk }]}>{money(res.free)}</Text>
                      </View>
                    </>
                  )}
                </View>

                {/* ── 5 · Frente a tu mes real ── */}
                <View style={[...card, { borderColor: colors.primary + '4D' }]}>
                  <Text style={cardTitle}>{t('salarySim.real.title')}</Text>
                  {txLoading ? <Skeleton width="100%" height={80} borderRadius={14} /> : renderReal()}
                  <Text style={[styles.note, { color: colors.textTertiary, marginTop: 10 }]}>{t('salarySim.real.note')}</Text>
                </View>

                {/* ── 6 · Fondo para fijos ── */}
                <View style={card}>
                  <Text style={cardTitle}>{t('salarySim.fund.title')}</Text>
                  <AppSegmentedControl
                    segments={PAY_FREQUENCIES.map((f) => ({ key: f, label: t(`salarySim.fund.${f}`) }))}
                    activeKey={sc.frequency}
                    onChange={(k) => pickFrequency(k as PayFrequency)}
                  />
                  <View style={[styles.stepRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                    <Text style={[styles.sumLabel, { color: colors.textSecondary, flex: 1 }]}>{t('salarySim.fund.payments')}</Text>
                    <TouchableOpacity
                      onPress={() => stepPayments(-1)}
                      disabled={sc.paymentsPerMonth <= PAYMENTS_MIN}
                      accessibilityRole="button"
                      accessibilityLabel={t('salarySim.fund.fewer')}
                      style={[styles.iconBtn, { backgroundColor: colors.primary + '18', opacity: sc.paymentsPerMonth <= PAYMENTS_MIN ? 0.35 : 1 }]}
                    >
                      <AppIcon name="remove" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.stepValue, { color: colors.textPrimary }]}>{sc.paymentsPerMonth}</Text>
                    <TouchableOpacity
                      onPress={() => stepPayments(1)}
                      disabled={sc.paymentsPerMonth >= PAYMENTS_MAX}
                      accessibilityRole="button"
                      accessibilityLabel={t('salarySim.fund.more')}
                      style={[styles.iconBtn, { backgroundColor: colors.primary + '18', opacity: sc.paymentsPerMonth >= PAYMENTS_MAX ? 0.35 : 1 }]}
                    >
                      <AppIcon name="add" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  {res.fixedTotal <= 0 ? (
                    <Text style={[styles.note, { color: colors.textSecondary, marginTop: 10 }]}>{t('salarySim.fund.noFixed')}</Text>
                  ) : (
                    <>
                      <Text style={[styles.bigValue, { color: colors.textPrimary, marginTop: 12 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {t('salarySim.fund.separate', { amount: cur === 'COP' ? money(res.perPaymentCop) : fx(res.perPaymentFx) })}
                      </Text>
                      <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>
                        {t(`salarySim.fund.per_${sc.frequency}`)}
                        {cur !== 'COP' ? ` · ${t('salarySim.fund.approx', { amount: money(res.perPaymentCop) })}` : ''}
                      </Text>
                      <View style={[styles.formula, { backgroundColor: colors.inputBackground }]}>
                        <Text style={[styles.note, { color: colors.textSecondary, marginTop: 0 }]}>
                          {sc.paymentsPerMonth > 1
                            ? t('salarySim.fund.formula', {
                                count: sc.paymentsPerMonth,
                                each: cur === 'COP' ? money(res.perPaymentCop) : fx(res.perPaymentFx),
                                total: cur === 'COP' ? money(res.fixedTotal) : fx(res.perPaymentFx * sc.paymentsPerMonth),
                                fixed: money(res.fixedTotal),
                              })
                            : t('salarySim.fund.formulaOne', {
                                each: cur === 'COP' ? money(res.perPaymentCop) : fx(res.perPaymentFx),
                                fixed: money(res.fixedTotal),
                              })}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>{t('salarySim.disclaimer')}</Text>
                {isManual && trm !== null && (
                  <Text style={[styles.disclaimer, { color: warnInk, marginTop: 4 }]}>{t('salarySim.manualNote')}</Text>
                )}
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
  scroller: { flex: 1 },
  scroll: { paddingHorizontal: 15, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },
  gap: { marginTop: 12 },

  card: { borderWidth: 1, borderRadius: 22, padding: 16, marginTop: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 10, flexShrink: 1 },
  cardTotal: { fontSize: 15, fontFamily: Fonts.extraBold, letterSpacing: -0.3, marginBottom: 10 },
  dim: { opacity: 0.45 },

  lockCard: { alignItems: 'center', padding: 22 },
  lockIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  lockTitle: { fontSize: 17, fontFamily: Fonts.extraBold, letterSpacing: -0.3, textAlign: 'center' },
  lockBody: { fontSize: 13.5, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  lockCta: { marginTop: 18, alignSelf: 'stretch' },

  monthNav: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 50, padding: 6 },
  monthBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  monthMid: { flex: 1, alignItems: 'center' },
  monthName: { fontSize: 15, fontFamily: Fonts.extraBold, letterSpacing: -0.3 },
  monthKind: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 1 },

  fieldLabel: { fontSize: 10.5, fontFamily: Fonts.bold, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, fontFamily: Fonts.bold },
  inputBig: { fontSize: 20, fontFamily: Fonts.extraBold },
  inputSmall: { fontSize: 13, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  inputAmount: { width: 112, textAlign: 'right' },

  rateHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12, marginBottom: 6, flexWrap: 'wrap' },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, marginTop: 10 },
  rateLabel: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.5, textTransform: 'uppercase' },
  rateValue: { fontSize: 16, fontFamily: Fonts.extraBold, letterSpacing: -0.3, marginTop: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  chipInline: { alignSelf: 'flex-start', marginTop: 4 },
  chipText: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  link: { fontSize: 12.5, fontFamily: Fonts.bold },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-start' },

  totalBox: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 12 },
  bigValue: { fontSize: 28, fontFamily: Fonts.extraBold, letterSpacing: -1.2, marginTop: 2 },
  note: { fontSize: 11.5, fontFamily: Fonts.regular, lineHeight: 17, marginTop: 6 },

  fixedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, minHeight: 48 },
  fixedMain: { flex: 1, minWidth: 0 },
  fixedName: { fontSize: 13.5, fontFamily: Fonts.bold },
  fixedAmount: { fontSize: 13.5, fontFamily: Fonts.extraBold, letterSpacing: -0.2 },
  struck: { textDecorationLine: 'line-through' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 11, marginTop: 10 },

  pcts: { flexDirection: 'row', gap: 10 },
  pctBox: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  pctRow: { flexDirection: 'row', alignItems: 'center' },
  pctInput: { flex: 1, fontSize: 22, fontFamily: Fonts.extraBold, paddingVertical: 2, minWidth: 0 },
  pctSuffix: { fontSize: 13, fontFamily: Fonts.bold },

  rail: { height: 36, marginTop: 14, justifyContent: 'center', marginHorizontal: 12 },
  railTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  railFill: { height: 8, borderRadius: 4 },
  railThumb: { position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 3, marginLeft: -12, top: 6 },
  railLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  railLabel: { fontSize: 10.5, fontFamily: Fonts.bold },
  presets: { flexDirection: 'row', gap: 8, marginTop: 12 },
  preset: { flex: 1, borderWidth: 1, borderRadius: 50, paddingVertical: 9, alignItems: 'center' },
  presetText: { fontSize: 12.5, fontFamily: Fonts.bold },

  bar: { height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row', marginVertical: 8 },
  barTall: { height: 12, borderRadius: 6, marginTop: 0, marginBottom: 10 },
  sumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 6 },
  sumEq: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4, paddingTop: 10 },
  sumLabel: { fontSize: 13, fontFamily: Fonts.semiBold, flexShrink: 1 },
  sumValue: { fontSize: 13.5, fontFamily: Fonts.extraBold, letterSpacing: -0.2 },
  sumValueBig: { fontSize: 16 },
  headline: { fontSize: 22, fontFamily: Fonts.extraBold, letterSpacing: -0.8, marginTop: 6 },
  banner: { borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 10, gap: 6 },
  bannerText: { fontSize: 12.5, fontFamily: Fonts.semiBold, lineHeight: 18 },

  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10 },
  stepValue: { fontSize: 18, fontFamily: Fonts.extraBold, minWidth: 22, textAlign: 'center' },
  formula: { borderRadius: 12, padding: 11, marginTop: 10 },

  disclaimer: { fontSize: 11, fontFamily: Fonts.regular, lineHeight: 16, marginTop: 14, paddingHorizontal: 4 },
});
