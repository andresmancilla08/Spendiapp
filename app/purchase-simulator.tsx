import { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import AppHeader from '../components/AppHeader';
import AppIcon from '../components/AppIcon';
import AppSegmentedControl from '../components/AppSegmentedControl';
import CardChip, { CardChipNone } from '../components/CardChip';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import { scrollFadeMask } from '../components/ScrollFadeEdges';
import ProjectionList from '../components/simulator/ProjectionList';
import TermCompare from '../components/simulator/TermCompare';
import HeadroomGauge from '../components/simulator/HeadroomGauge';

import { Fonts } from '../config/fonts';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { useCards } from '../hooks/useCards';
import { useTEARate } from '../hooks/useTEARate';
import { usePurchaseImpact } from '../hooks/usePurchaseImpact';
import { mixHex, readableTint } from '../utils/contrast';
import { formatMoney } from '../utils/formatMoney';
import { getMonthNames } from '../utils/dateLocale';
import { goBack } from '../utils/nav';
import { effectivePurchaseDate } from '../utils/installmentCalc';
import {
  simulate, compareTerms, teaFromMonthlyPct, monthlyPctFromTea, buildLoadTimeline,
  termRailPosition, TERM_STOPS, COMPARE_TERMS, MAX_INSTALLMENTS,
} from '../utils/simulator';

type TabKey = 'projection' | 'compare' | 'impact';

/** 200 % anual ≈ 9,6 % mensual. Cada unidad tiene su propio techo. */
const RATE_MAX = { tea: 200, monthly: 20 } as const;

const groupDigits = (raw: string) => (raw ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '');
const toInt = (raw: string) => (raw ? parseInt(raw, 10) : 0);

export default function PurchaseSimulatorScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const { user, isPremium } = useAuthStore();
  const uid = user?.uid ?? '';
  const transitionRef = useRef<ScreenTransitionRef>(null);
  const months = useMemo(() => getMonthNames(i18n.language), [i18n.language]);
  const money = (n: number) => formatMoney(n, i18n.language);

  const { cards } = useCards(uid);
  const reference = useTEARate();

  const [priceRaw, setPriceRaw] = useState('');
  const [cardId, setCardId] = useState<string | null>(null);
  const [installments, setInstallments] = useState(12);
  const [rateMode, setRateMode] = useState<'tea' | 'monthly'>('tea');
  const [rateRaw, setRateRaw] = useState(String(reference.tea));
  const [showMore, setShowMore] = useState(false);
  const [downRaw, setDownRaw] = useState('');
  const [feeRaw, setFeeRaw] = useState('');
  const [tab, setTab] = useState<TabKey>('projection');

  const creditCards = cards.filter((c) => c.type === 'credit');
  const card = creditCards.find((c) => c.id === cardId) ?? null;

  const price = toInt(priceRaw);
  const downPayment = Math.min(price, toInt(downRaw));
  const monthlyFee = toInt(feeRaw);

  const rateNum = rateRaw.trim() ? parseFloat(rateRaw.replace(',', '.')) : NaN;
  const rateValid = Number.isFinite(rateNum) && rateNum >= 0 && rateNum <= RATE_MAX[rateMode];
  /**
   * La tasa NO depende del plazo elegido.
   *
   * Antes se anulaba con `installments <= 1`, y ese mismo null se le pasaba a
   * `compareTerms`: bastaba poner una cuota para que la comparación entera
   * dijera «+0 % de sobrecosto» en los seis plazos. El plan de UNA cuota ya sale
   * sin intereses por su cuenta —`calculateInstallments` devuelve el monto tal
   * cual con n<=1—, así que no hace falta anular nada aquí.
   */
  const teaValue = !rateValid || rateNum <= 0
    ? null
    : rateMode === 'tea' ? rateNum : teaFromMonthlyPct(rateNum);
  const teaAsAnnual = teaValue ?? 0;
  const monthlyPct = teaValue != null ? monthlyPctFromTea(teaValue) : 0;

  const startDate = useMemo(() => effectivePurchaseDate(new Date(), card?.cutoffDay), [card?.cutoffDay]);

  const result = useMemo(() => {
    if (price <= 0 || !rateValid) return null;
    return simulate({ price, downPayment, installments, tea: teaValue, monthlyFee, startDate });
  }, [price, downPayment, installments, teaValue, monthlyFee, startDate, rateValid]);

  const scenarios = useMemo(() => {
    if (price <= 0 || !rateValid) return [];
    return compareTerms({ price, downPayment, tea: teaValue, monthlyFee, startDate }, COMPARE_TERMS);
  }, [price, downPayment, teaValue, monthlyFee, startDate, rateValid]);

  const impactOn = isPremium && tab === 'impact' && !!result;
  const impact = usePurchaseImpact(uid, impactOn);
  const peak = useMemo(() => {
    if (!result) return { load: 0, committed: 0 };
    const now = new Date();
    const span = Math.min(24, Math.max(6, result.schedule.length + 1));
    const line = buildLoadTimeline(impact.committedByMonth, result.schedule, new Date(now.getFullYear(), now.getMonth(), 1), span);
    const worst = line.reduce((b, x) => (x.total > b.total ? x : b), line[0]);
    return { load: worst.total, committed: worst.committed };
  }, [result, impact.committedByMonth]);

  const pickCard = (id: string | null) => {
    setCardId(id);
    // B2·1: la tarjeta trae su tasa. Si la tiene, manda sobre la referencia.
    const c = creditCards.find((x) => x.id === id);
    if (c?.tea != null) { setRateMode('tea'); setRateRaw(String(c.tea)); }
  };

  const cardStyle = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }];
  const ruleInk = mixHex(colors.border, colors.textPrimary, isDark ? 0.22 : 0.18);

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader showBack onBack={() => transitionRef.current?.animateOut(() => goBack('/(tabs)/tools'))} />
          <PageTitle title={t('simulator.title')} description={t('simulator.pageDesc')} />

          {/* ══ A2·1 · La cabecera ES el input ══
              Fondo opaco a propósito: en la PWA instalada de iOS el cristal
              mancha el degradado del fondo animado. */}
          <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: ruleInk }]}>
            <View style={styles.hCol}>
              <Text style={[styles.ovl, { color: colors.textTertiary }]}>{t('simulator.headerPrice')}</Text>
              <TextInput
                style={[styles.hPrice, { color: colors.primary }]}
                keyboardType="numeric"
                value={priceRaw ? `$${groupDigits(priceRaw)}` : ''}
                onChangeText={(v) => setPriceRaw(v.replace(/\D/g, '').slice(0, 10))}
                placeholder="$0"
                placeholderTextColor={colors.textTertiary}
                returnKeyType="done"
                accessibilityLabel={t('simulator.headerPrice')}
              />
            </View>
            <View style={[styles.hDiv, { backgroundColor: ruleInk }]} />
            <View style={styles.hRight}>
              <Text style={[styles.ovl, { color: colors.textTertiary }]}>{t('simulator.headerFee')}</Text>
              <Text style={[styles.hFee, { color: result ? colors.textPrimary : colors.textTertiary }]}>
                {result ? money(result.monthlyPayment) : '—'}
              </Text>
            </View>
          </View>

          <ScrollView
            style={scrollFadeMask(0, 0)}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={cardStyle}>
              {/* ── Tarjeta ── */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('simulator.cardLabel')}</Text>
              {creditCards.length === 0 ? (
                <Text style={[styles.hint, { color: colors.textTertiary }]}>{t('simulator.noCardsHint')}</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {creditCards.map((c) => (
                      <CardChip key={c.id} card={c} showTea selected={cardId === c.id} onPress={() => pickCard(c.id)} />
                    ))}
                    {/* «Sin tarjeta» al final: abrir mostrando una opción vacía
                        y medio banco desaprovecha la única fila visible. */}
                    <CardChipNone selected={cardId === null} onPress={() => pickCard(null)} />
                  </View>
                </ScrollView>
              )}
              {card?.tea != null && (
                <Text style={[styles.hint, { color: colors.textTertiary }]}>
                  {card.teaSource === 'learned'
                    ? t('simulator.teaLearned', { card: card.nickname || card.bankName })
                    : t('simulator.teaManual', { card: card.nickname || card.bankName })}
                </Text>
              )}

              {/* ── C2·2 · Riel de paso desigual ── */}
              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 20 }]}>
                {t('simulator.installmentsLabel')}
              </Text>
              <View style={styles.termHead}>
                <Text style={[styles.termBig, { color: colors.textPrimary }]}>{installments}</Text>
                <Text style={[styles.ovl, { color: colors.textTertiary }]}>
                  {installments === 1 ? t('simulator.installmentSingle') : t('simulator.installmentsPlural')}
                </Text>
                <View style={styles.termSteps}>
                  <TouchableOpacity
                    onPress={() => setInstallments((v) => Math.max(1, v - 1))}
                    style={[styles.stepBtn, { borderColor: colors.border }]}
                    accessibilityRole="button" accessibilityLabel="-1"
                  >
                    <AppIcon name="remove" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setInstallments((v) => Math.min(MAX_INSTALLMENTS, v + 1))}
                    style={[styles.stepBtn, { borderColor: colors.border }]}
                    accessibilityRole="button" accessibilityLabel="+1"
                  >
                    <AppIcon name="add" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Los TOPES se reparten el ancho a partes iguales, no las cuotas:
                  así el tramo 3→6 —donde el sobrecosto cambia mucho— mide lo
                  mismo que el 24→36, donde ya nadie decide nada.
                  Cada tope es un botón real: no hay librería de gestos en el
                  proyecto y un riel de PanResponder no es operable con teclado
                  ni se anuncia como control. Los intermedios salen del ±. */}
              <View style={styles.rail}>
                <View style={[styles.railTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.railFill, { width: `${termRailPosition(installments) * 100}%` as any, backgroundColor: colors.primary }]} />
                </View>
                <View
                  pointerEvents="none"
                  style={[styles.railThumb, {
                    left: `${termRailPosition(installments) * 100}%` as any,
                    backgroundColor: colors.primary, borderColor: colors.surface,
                  }]}
                />
                {TERM_STOPS.map((n, i) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setInstallments(n)}
                    style={[styles.railHit, { left: `${(i / (TERM_STOPS.length - 1)) * 100}%` as any }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: installments === n }}
                    accessibilityLabel={t('simulator.termValue', { n })}
                  >
                    <View style={[styles.railTick, { backgroundColor: colors.textTertiary }]} />
                    <Text style={[styles.railLbl, { color: installments === n ? colors.primary : colors.textTertiary }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── D1·2 · Segmentado con la cifra dentro ──
                  Las dos tasas están calculadas y visibles siempre, así que
                  cambiar de pestaña no convierte nada y no puede romper nada. */}
              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 34 }]}>{t('simulator.rateLabel')}</Text>
              <View style={[styles.seg, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {(['tea', 'monthly'] as const).map((m) => {
                  const on = rateMode === m;
                  const shown = m === 'tea' ? teaAsAnnual : monthlyPct;
                  return (
                    <TouchableOpacity
                      key={m}
                      onPress={() => {
                        if (on) return;
                        // Se reescribe con el valor YA calculado de la otra unidad,
                        // no convirtiendo lo tecleado: así no se pierde nada a medio escribir.
                        setRateRaw(shown > 0 ? shown.toFixed(2) : '');
                        setRateMode(m);
                      }}
                      activeOpacity={0.8}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: on }}
                      style={[styles.segItem, on && { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.segLbl, { color: on ? colors.onPrimary : colors.textSecondary }]}>
                        {m === 'tea' ? t('simulator.rateTea') : t('simulator.rateMonthly')}
                      </Text>
                      <Text style={[styles.segVal, { color: on ? colors.onPrimary : colors.textTertiary }]}>
                        {`${shown.toFixed(2).replace('.', ',')} %`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.rateRow}>
                <TouchableOpacity
                  onPress={() => setRateRaw((v) => String(Math.max(0, (parseFloat(v.replace(',', '.')) || 0) - 0.25)))}
                  style={[styles.stepBtn, { borderColor: colors.border }]}
                  accessibilityRole="button" accessibilityLabel="-0,25"
                >
                  <AppIcon name="remove" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.rateField, {
                    borderColor: rateValid ? colors.border : colors.error,
                    backgroundColor: colors.backgroundSecondary, color: colors.textPrimary,
                  }]}
                  keyboardType="decimal-pad"
                  value={rateRaw}
                  onChangeText={setRateRaw}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  returnKeyType="done"
                  accessibilityLabel={t('simulator.rateLabel')}
                />
                <TouchableOpacity
                  onPress={() => setRateRaw((v) => String(Math.min(RATE_MAX[rateMode], (parseFloat(v.replace(',', '.')) || 0) + 0.25)))}
                  style={[styles.stepBtn, { borderColor: colors.border }]}
                  accessibilityRole="button" accessibilityLabel="+0,25"
                >
                  <AppIcon name="add" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {!rateValid ? (
                <View style={styles.errRow}>
                  <AppIcon name="alert-circle" size={13} color={colors.error} />
                  <Text style={[styles.hint, { color: colors.error, marginTop: 0 }]}>
                    {t('simulator.rateInvalid', { max: RATE_MAX[rateMode] })}
                  </Text>
                </View>
              ) : teaValue == null ? (
                <Text style={[styles.hint, { color: colors.textTertiary }]}>{t('simulator.rateZero')}</Text>
              ) : null}

              {/* La referencia se muestra CON su trimestre, y avisa si caducó. */}
              <Text style={[styles.hint, { color: reference.isStale ? colors.warning : colors.textTertiary }]}>
                {reference.isStale
                  ? t('simulator.rateRefStale', { rate: reference.tea, year: reference.year, quarter: reference.quarter })
                  : t('simulator.rateRef', { rate: reference.tea, year: reference.year, quarter: reference.quarter })}
              </Text>

              {/* ── Más opciones ── */}
              <TouchableOpacity
                onPress={() => setShowMore((v) => !v)}
                activeOpacity={0.8}
                accessibilityRole="button"
                style={styles.moreRow}
              >
                <Text style={[styles.moreText, { color: readableTint(colors.primary, colors.surface, 4.5) }]}>
                  {showMore ? t('simulator.lessOptions') : t('simulator.moreOptions')}
                </Text>
                <AppIcon name={showMore ? 'chevron-up' : 'chevron-down'} size={13} color={colors.primary} />
              </TouchableOpacity>

              {showMore && (
                <View style={{ gap: 14 }}>
                  {([
                    ['down', t('simulator.downPayment'), t('simulator.downPaymentHint'), downRaw, setDownRaw, 10],
                    ['fee', t('simulator.monthlyFee'), t('simulator.monthlyFeeHint'), feeRaw, setFeeRaw, 8],
                  ] as const).map(([key, label, hint, val, set, max]) => (
                    <View key={key}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
                      <TextInput
                        style={[styles.field, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.textPrimary }]}
                        keyboardType="numeric"
                        value={val ? `$${groupDigits(val)}` : ''}
                        onChangeText={(v) => (set as (s: string) => void)(v.replace(/\D/g, '').slice(0, max))}
                        placeholder="$0"
                        placeholderTextColor={colors.textTertiary}
                        accessibilityLabel={label}
                      />
                      <Text style={[styles.hint, { color: colors.textTertiary }]}>{hint}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ══ E2·1 · Recibo de dos tipografías ══ */}
            {price <= 0 ? (
              <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <AppIcon name="calculator-outline" size={26} color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('simulator.emptyTitle')}</Text>
                <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{t('simulator.emptyBody')}</Text>
              </View>
            ) : !result ? null : (
              <>
                <View style={[styles.receipt, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.ovl, { color: colors.textTertiary }]}>{t('simulator.resultLabel')}</Text>
                  {/* La cifra se queda en Montserrat ExtraBold: DM Mono no tiene
                      bold real (monoBold es Medium 500) y en mono perdería peso.
                      Baja de tamaño por regla explícita — adjustsFontSizeToFit
                      es no-op en web y Android. */}
                  <Text
                    style={[styles.rBig, { color: colors.textPrimary }, money(result.monthlyPayment).length > 13 && styles.rBigSmall]}
                    numberOfLines={1}
                  >
                    {money(result.monthlyPayment)}
                  </Text>
                  <Text style={[styles.rSub, { color: colors.textSecondary }]}>
                    {installments === 1
                      ? t('simulator.resultSingleTerm', { month: `${months[result.lastDate.getMonth()]} ${result.lastDate.getFullYear()}` })
                      : t('simulator.resultTerm', { n: installments, month: `${months[result.lastDate.getMonth()]} ${result.lastDate.getFullYear()}` })}
                  </Text>
                  {!result.levelPayments && (
                    <Text style={[styles.rNote, { color: colors.textTertiary }]}>
                      {t('simulator.resultUneven', { amount: money(result.lastPayment) })}
                    </Text>
                  )}

                  {/* La línea de corte con sus dos semicírculos: es lo que
                      convierte una línea punteada en un tiquete. */}
                  <View style={styles.cut}>
                    <View style={[styles.cutLine, { borderTopColor: ruleInk }]} />
                    <View style={[styles.notch, styles.notchL, { backgroundColor: colors.background }]} />
                    <View style={[styles.notch, styles.notchR, { backgroundColor: colors.background }]} />
                  </View>

                  {([
                    [t('simulator.receiptFinanced'), money(result.financed), false],
                    [t('simulator.receiptInterest'), money(result.creditCost), result.creditCost > 0],
                    [t('simulator.receiptFees'), money(monthlyFee * result.schedule.length), false],
                    [t('simulator.receiptTotal'), money(result.totalPaid), false],
                  ] as const).map(([k, v, red]) => (
                    <View key={k} style={styles.rLine}>
                      <Text style={[styles.rKey, { color: colors.textSecondary }]}>{k}</Text>
                      <Text style={[styles.rVal, { color: red ? readableTint(colors.error, colors.surface, 4.5) : colors.textPrimary }]}>{v}</Text>
                    </View>
                  ))}
                  {result.effectiveTea != null && (
                    <View style={styles.rLine}>
                      <Text style={[styles.rKey, { color: colors.textSecondary }]}>{t('simulator.statRealRate')}</Text>
                      <Text style={[styles.rVal, { color: colors.textPrimary }]}>{`${result.effectiveTea.toFixed(1)} %`}</Text>
                    </View>
                  )}
                </View>

                <AppSegmentedControl
                  segments={[
                    { key: 'projection', label: t('simulator.tabProjection') },
                    { key: 'compare', label: t('simulator.tabCompare') },
                    { key: 'impact', label: t('simulator.tabImpact') },
                  ]}
                  activeKey={tab}
                  onChange={(k) => setTab(k as TabKey)}
                />

                <View style={cardStyle}>
                  {tab === 'projection' && <ProjectionList schedule={result.schedule} />}
                  {tab === 'compare' && (
                    <TermCompare
                      rows={scenarios}
                      current={installments}
                      onPick={setInstallments}
                      cashPrice={price}
                      hasInterest={teaValue != null}
                    />
                  )}
                  {tab === 'impact' && (
                    isPremium ? (
                      <HeadroomGauge
                        peakLoad={peak.load}
                        committed={peak.committed}
                        monthlyPayment={result.monthlyPayment}
                        typicalIncome={impact.typicalIncome}
                        fixedExpenses={impact.fixedExpenses}
                        hasIncomeData={impact.hasIncomeData}
                        loading={impact.loading}
                      />
                    ) : (
                      <View style={styles.locked}>
                        <AppIcon name="lock-closed-outline" size={24} color={colors.primary} />
                        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('simulator.impactLockedTitle')}</Text>
                        <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{t('simulator.impactLockedBody')}</Text>
                        <TouchableOpacity
                          onPress={() => transitionRef.current?.animateOut(() => goBack('/upgrade'))}
                          activeOpacity={0.85}
                          accessibilityRole="button"
                          style={[styles.unlock, { backgroundColor: colors.primary }]}
                        >
                          <AppIcon name="star" size={14} color={colors.onPrimary} />
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
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingTop: 12, paddingBottom: 40, gap: 14, width: '100%', maxWidth: 640, alignSelf: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    width: '100%', maxWidth: 640, alignSelf: 'center',
  },
  hCol: { flex: 1 },
  hDiv: { width: 1, alignSelf: 'stretch', marginVertical: 4 },
  hRight: { width: 138, alignItems: 'flex-end' },
  hPrice: {
    fontSize: 26, fontFamily: Fonts.extraBold, letterSpacing: -0.6, paddingVertical: 2,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
  },
  hFee: { fontSize: 21, fontFamily: Fonts.monoBold },

  card: { borderRadius: 20, borderWidth: 1, padding: 16 },
  ovl: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1.2, textTransform: 'uppercase' },
  label: { fontSize: 12, fontFamily: Fonts.semiBold, marginBottom: 9 },
  hint: { fontSize: 11.5, fontFamily: Fonts.regular, lineHeight: 16, marginTop: 7 },
  field: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: Fonts.mono },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },

  termHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  termBig: { fontSize: 28, fontFamily: Fonts.extraBold },
  termSteps: { flexDirection: 'row', gap: 8, marginLeft: 'auto' },
  stepBtn: { width: 34, height: 34, borderRadius: 50, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  rail: { height: 40, marginTop: 18, marginHorizontal: 10, position: 'relative' },
  railTrack: { height: 8, borderRadius: 4, position: 'absolute', left: 0, right: 0, top: 0 },
  railFill: { height: 8, borderRadius: 4 },
  railThumb: { position: 'absolute', top: -8, width: 24, height: 24, borderRadius: 12, borderWidth: 3, marginLeft: -12 },
  // 44×44 de objetivo táctil, centrado en el tope y por encima del riel.
  railHit: { position: 'absolute', top: -14, width: 44, height: 44, marginLeft: -22, alignItems: 'center' },
  railTick: { width: 2, height: 12, marginTop: 12, opacity: 0.5 },
  railLbl: { fontSize: 10, fontFamily: Fonts.mono, marginTop: 4 },

  seg: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, padding: 4, gap: 4 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 12 },
  segLbl: { fontSize: 11, fontFamily: Fonts.semiBold },
  segVal: { fontSize: 15, fontFamily: Fonts.monoBold, marginTop: 1 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, justifyContent: 'center' },
  rateField: { width: 120, borderWidth: 1, borderRadius: 14, paddingVertical: 11, fontSize: 17, fontFamily: Fonts.monoBold, textAlign: 'center' },

  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 18, marginBottom: 4, alignSelf: 'flex-start' },
  moreText: { fontSize: 13, fontFamily: Fonts.semiBold },

  empty: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: Fonts.bold, textAlign: 'center', marginTop: 6 },
  emptyBody: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 19, textAlign: 'center' },

  receipt: { borderRadius: 22, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 18, overflow: 'hidden' },
  rBig: { fontSize: 34, fontFamily: Fonts.extraBold, letterSpacing: -1, marginTop: 3 },
  rBigSmall: { fontSize: 26 },
  rSub: { fontSize: 13, fontFamily: Fonts.medium, marginTop: 2 },
  rNote: { fontSize: 11.5, fontFamily: Fonts.regular, marginTop: 3 },
  cut: { height: 1, marginVertical: 16, marginHorizontal: -20, justifyContent: 'center' },
  cutLine: { borderTopWidth: 1, borderStyle: 'dashed', marginHorizontal: 12 },
  notch: { position: 'absolute', width: 16, height: 16, borderRadius: 8, top: -8 },
  notchL: { left: -8 },
  notchR: { right: -8 },
  rLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rKey: { fontSize: 12, fontFamily: Fonts.mono },
  rVal: { fontSize: 13, fontFamily: Fonts.monoBold },

  locked: { alignItems: 'center', paddingVertical: 10, gap: 4 },
  unlock: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 42, paddingHorizontal: 20, borderRadius: 50, marginTop: 14 },
  unlockText: { fontSize: 13.5, fontFamily: Fonts.bold },
  notSaved: { fontSize: 11, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 4, lineHeight: 16 },
});
