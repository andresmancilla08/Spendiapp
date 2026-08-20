import { useMemo, useRef, useState } from 'react';
import { PanResponder } from 'react-native';
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
import { useToast } from '../context/ToastContext';
import { useCards, updateCard } from '../hooks/useCards';
import { useTEARate } from '../hooks/useTEARate';
import { usePurchaseImpact } from '../hooks/usePurchaseImpact';
import { mixHex, readableTint } from '../utils/contrast';
import { formatMoney } from '../utils/formatMoney';
import { getMonthNames } from '../utils/dateLocale';
import { goBack } from '../utils/nav';
import { effectivePurchaseDate } from '../utils/installmentCalc';
import {
  simulate, compareTerms, teaFromMonthlyPct, monthlyPctFromTea, buildLoadTimeline,
  termRailPosition, termFromRailPosition, TERM_STOPS, COMPARE_TERMS, MAX_INSTALLMENTS,
  simulateVariableBand, type AmortizationSystem, type RateKind,
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
  const { showToast } = useToast();
  const uid = user?.uid ?? '';
  const transitionRef = useRef<ScreenTransitionRef>(null);
  const months = useMemo(() => getMonthNames(i18n.language), [i18n.language]);
  const money = (n: number) => formatMoney(n, i18n.language);
  /**
   * El importe manda sobre el tamaño, no al revés.
   *
   * A 26 px, «$ 9.999.999.999» mide ~242 px contra los ~157 de columna: dos
   * cifras grandes enfrentadas a 390 px no caben por definición. En vez de
   * recortar con puntos suspensivos —que en dinero es inaceptable— la cifra
   * baja de cuerpo. `adjustsFontSizeToFit` no vale: es no-op en web y Android.
   */
  const fitSize = (txt: string) => (txt.length > 13 ? 17 : txt.length > 10 ? 20 : 24);
  /** En español e italiano el mes va en minúscula a mitad de frase; en inglés no. */
  const monthName = (d: Date) => {
    const m = months[d.getMonth()];
    return i18n.language.startsWith('en') ? m : m.toLowerCase();
  };

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
  const [rateKind, setRateKind] = useState<RateKind>('fixed');
  const [system, setSystem] = useState<AmortizationSystem>('french');

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
    return simulate({ price, downPayment, installments, tea: teaValue, monthlyFee, startDate, system });
  }, [price, downPayment, installments, teaValue, monthlyFee, startDate, rateValid, system]);

  /**
   * Con tasa variable una cifra única sería mentira: el banco reliquida cada mes.
   * Se acota entre «no pasa nada» y «sube al techo legal», que son los dos
   * extremos que sí se pueden defender con datos.
   */
  const band = useMemo(() => {
    if (!result || rateKind !== 'variable' || teaValue == null) return null;
    return simulateVariableBand(
      { price, downPayment, installments, monthlyFee, startDate },
      teaValue, reference.tea,
    );
  }, [result, rateKind, teaValue, price, downPayment, installments, monthlyFee, startDate, reference.tea]);

  /** Lo que se pinta en la proyección: el peor escenario si la tasa es variable. */
  const shown = band?.high ?? result;

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

  /**
   * Arrastre del riel de plazos.
   *
   * Mismo patrón que `components/HuePicker.tsx`, el único control de arrastre
   * del repo: el ancho se captura con `onLayout` en un ref mutable y el tirador
   * lleva `pointerEvents="none"` — sin eso, `locationX` salta en cuanto el dedo
   * pasa por encima del propio tirador y el valor da un tirón.
   *
   * El valor SÍ vive en el estado de React: esto es manipulación directa y
   * finita, no una animación en bucle. La regla del proyecto prohíbe lo segundo.
   * Y el tirador sigue al dedo sin transición: cualquier easing entre dedo y
   * pulgar se siente como retraso.
   *
   * Los topes siguen siendo botones: un riel de PanResponder no se anuncia como
   * control ni responde al teclado, así que el arrastre es un ATAJO, nunca la
   * única vía. (Regla del repo: ninguna acción puede vivir solo en un gesto.)
   */
  const railWidth = useRef(0);
  const railResponder = useMemo(
    () =>
      PanResponder.create({
        // NO se reclama el toque simple: si lo hiciera, los topes dejarían de
        // ser botones y el arrastre se comería la única vía accesible.
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        // Solo un movimiento claramente horizontal reclama el gesto: por debajo
        // de 4 px es un toque, y por encima en vertical es el scroll de la página.
        onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 4 && Math.abs(g.dx) > Math.abs(g.dy),
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
        onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
      }),
    [],
  );
  function setFromX(x: number) {
    const w = railWidth.current;
    if (!w) return;
    setInstallments(termFromRailPosition(x / w));
  }

  const pickCard = (id: string | null) => {
    setCardId(id);
    // B2·1: la tarjeta trae su tasa. Si la tiene, manda sobre la referencia.
    const c = creditCards.find((x) => x.id === id);
    if (c?.tea != null) { setRateMode('tea'); setRateRaw(String(c.tea)); }
  };

  // Mismo formateador para las dos: una construida a mano («$20.000.022») y la
  // otra por `formatMoney` («$ 1.913.114», con espacio duro) no casan nunca.
  const priceText = price > 0 ? money(price) : '';
  const feeText = result ? money(result.monthlyPayment) : '—';

  const cardStyle = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }];
  const ruleInk = mixHex(colors.border, colors.textPrimary, isDark ? 0.22 : 0.18);

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader showBack onBack={() => transitionRef.current?.animateOut(() => goBack('/(tabs)/tools'))} />
          <PageTitle title={t('simulator.title')} description={t('simulator.pageDesc')} />

          {/* ══ H2 · Cabecera como TARJETA ══
              Era la única pieza a sangre en una pantalla de tarjetas y por eso
              desentonaba. Ahora comparte caja, radio y borde con todo lo demás,
              pero sigue FIJA fuera del scroll: la cuota no debe perderse de
              vista al bajar. Fondo opaco a propósito — en la PWA instalada de
              iOS el cristal mancha el degradado del fondo animado. */}
          <View style={styles.headerWrap}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.hLabels}>
                <Text style={[styles.ovl, styles.hHalf, { color: colors.textTertiary }]}>{t('simulator.headerPrice')}</Text>
                <Text style={[styles.ovl, styles.hHalf, styles.right, { color: colors.textTertiary }]}>{t('simulator.headerFee')}</Text>
              </View>
              {/* Las dos cifras van en la MISMA fila para que compartan línea
                  base. Antes vivían en columnas con su etiqueta encima y cada
                  una se apoyaba donde quería. */}
              <View style={styles.hValues}>
                <TextInput
                  style={[styles.hPrice, styles.hHalf, { color: colors.primary, fontSize: fitSize(priceText) }]}
                  keyboardType="numeric"
                  value={priceText}
                  onChangeText={(v) => setPriceRaw(v.replace(/\D/g, '').slice(0, 10))}
                  placeholder={money(0)}
                  placeholderTextColor={colors.textTertiary}
                  returnKeyType="done"
                  numberOfLines={1}
                  accessibilityLabel={t('simulator.headerPrice')}
                />
                <Text
                  style={[styles.hFee, styles.hHalf, styles.right, {
                    color: result ? colors.textPrimary : colors.textTertiary,
                    fontSize: fitSize(feeText),
                  }]}
                  numberOfLines={1}
                >
                  {feeText}
                </Text>
              </View>

              {/* La barra parte lo que pagas: azul el precio, rojo el sobrecosto.
                  Es la misma lectura de la sección Comparar, en 6 px. */}
              {!!result && (
                <>
                  <View style={[styles.hBar, { backgroundColor: result.creditCost > 0 ? colors.error : colors.primary }]}>
                    <View style={[styles.hBarFill, {
                      backgroundColor: colors.primary,
                      width: `${(price / Math.max(result.totalPaid, 1)) * 100}%` as any,
                    }]} />
                  </View>
                  <Text style={[styles.hSub, { color: colors.textSecondary }]}>
                    {installments === 1
                      ? t('simulator.resultSingleTerm', { month: `${monthName(result.lastDate)} ${result.lastDate.getFullYear()}` })
                      : t('simulator.resultTerm', { n: installments, month: `${monthName(result.lastDate)} ${result.lastDate.getFullYear()}` })}
                  </Text>
                </>
              )}
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
              {/* La otra mitad de «tasa aprendida»: si la tarjeta no la tiene
                  —o tiene otra— se ofrece guardarla desde aquí. Sin esto el dato
                  solo se aprende al registrar una compra, y quien solo simula
                  nunca llegaría a tenerlo. */}
              {!!card && (
                card.tea != null && teaValue != null && Math.abs(card.tea - teaValue) < 0.005 ? (
                  <Text style={[styles.hint, { color: colors.textTertiary }]}>
                    {card.teaSource === 'learned'
                      ? t('simulator.teaLearned', { card: card.nickname || card.bankName })
                      : t('simulator.teaManual', { card: card.nickname || card.bankName })}
                  </Text>
                ) : teaValue != null ? (
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        await updateCard(card.id, { tea: teaValue });
                        showToast(t('simulator.teaSaved', { card: card.nickname || card.bankName }), 'success');
                      } catch {
                        showToast(t('errors.genericError'), 'error');
                      }
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    style={styles.saveTea}
                  >
                    <AppIcon name="add-circle-outline" size={14} color={colors.primary} />
                    <Text style={[styles.saveTeaText, { color: readableTint(colors.primary, colors.surface, 4.5) }]}>
                      {card.tea == null
                        ? t('simulator.teaSave', { card: card.nickname || card.bankName })
                        : t('simulator.teaUpdate', { card: card.nickname || card.bankName })}
                    </Text>
                  </TouchableOpacity>
                ) : null
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
              <View
                style={styles.rail}
                onLayout={(e) => { railWidth.current = e.nativeEvent.layout.width; }}
                {...railResponder.panHandlers}
              >
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

              {/* ── Fija o variable ──
                  No es un detalle: hay bancos que pactan la tasa al comprar y
                  bancos que la reliquidan cada mes con la vigente del periodo.
                  Con la segunda, proyectar una sola cifra a 24 meses es mentira. */}
              <View style={[styles.kindRow, { borderTopColor: ruleInk }]}>
                {(['fixed', 'variable'] as const).map((k) => {
                  const on = rateKind === k;
                  return (
                    <TouchableOpacity
                      key={k}
                      onPress={() => setRateKind(k)}
                      activeOpacity={0.8}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      style={[
                        styles.kindChip,
                        { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary + '18' : 'transparent' },
                      ]}
                    >
                      <AppIcon
                        name={on ? 'checkmark-circle' : 'ellipse-outline'}
                        size={14}
                        color={on ? colors.primary : colors.textTertiary}
                      />
                      <Text style={[styles.kindText, { color: on ? readableTint(colors.primary, colors.surface, 4.5) : colors.textSecondary }]}>
                        {k === 'fixed' ? t('simulator.rateFixed') : t('simulator.rateVariable')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                {rateKind === 'fixed' ? t('simulator.rateFixedHint') : t('simulator.rateVariableHint')}
              </Text>

              {/* La referencia se muestra CON su mes, y avisa si caducó. */}
              <Text style={[styles.hint, { color: reference.isStale ? colors.warning : colors.textTertiary }]}>
                {reference.isStale
                  ? t('simulator.rateRefStale', { rate: reference.tea, month: months[reference.month], year: reference.year })
                  : t('simulator.rateRef', { rate: reference.tea, month: months[reference.month], year: reference.year })}
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
                  <View>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>{t('simulator.systemLabel')}</Text>
                    <View style={[styles.kindRow, { marginTop: 0, paddingTop: 0, borderTopWidth: 0 }]}>
                      {(['french', 'german'] as const).map((sys) => {
                        const on = system === sys;
                        return (
                          <TouchableOpacity
                            key={sys}
                            onPress={() => setSystem(sys)}
                            activeOpacity={0.8}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: on }}
                            style={[
                              styles.kindChip,
                              { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary + '18' : 'transparent' },
                            ]}
                          >
                            <AppIcon
                              name={on ? 'checkmark-circle' : 'ellipse-outline'}
                              size={14}
                              color={on ? colors.primary : colors.textTertiary}
                            />
                            <Text style={[styles.kindText, { color: on ? readableTint(colors.primary, colors.surface, 4.5) : colors.textSecondary }]}>
                              {sys === 'french' ? t('simulator.systemFrench') : t('simulator.systemGerman')}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text style={[styles.hint, { color: colors.textTertiary }]}>
                      {system === 'french' ? t('simulator.systemFrenchHint') : t('simulator.systemGermanHint')}
                    </Text>
                  </View>
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

                  {/* Con tasa variable el recibo deja de ser una cifra y pasa a
                      ser un rango: es lo único honesto cuando el banco reliquida. */}
                  {band && (
                    <View style={[styles.band, { borderTopColor: ruleInk }]}>
                      <Text style={[styles.bandTitle, { color: readableTint(colors.warning, colors.surface, 4.5) }]}>
                        {t('simulator.bandTitle')}
                      </Text>
                      <Text style={[styles.bandBody, { color: colors.textSecondary }]}>
                        {t('simulator.bandBody', {
                          low: money(band.low.totalPaid),
                          high: money(band.high.totalPaid),
                          peak: money(band.peakPayment),
                          cap: reference.tea,
                        })}
                      </Text>
                      <Text style={[styles.bandBody, { color: colors.textSecondary }]}>
                        {t('simulator.bandExtra', { amount: money(band.extraTotal) })}
                      </Text>
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
                  {tab === 'projection' && <ProjectionList schedule={(shown ?? result).schedule} />}
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

  headerWrap: { paddingHorizontal: 16, paddingBottom: 4, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
  hLabels: { flexDirection: 'row', gap: 12 },
  // `baseline` es lo que alinea de verdad dos cuerpos distintos; `center` los
  // deja flotando cada uno a su altura, que es como se veían desalineados.
  hValues: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 3 },
  hHalf: { flex: 1 },
  right: { textAlign: 'right' },
  hBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 14 },
  hBarFill: { height: 6, borderRadius: 3 },
  hSub: { fontSize: 11.5, fontFamily: Fonts.medium, marginTop: 8 },
  hPrice: {
    fontFamily: Fonts.extraBold, letterSpacing: -0.6, paddingVertical: 0, lineHeight: 32,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
  },
  // Montserrat y no DM Mono: mono no tiene bold real (monoBold es Medium 500) y
  // enfrentado a un ExtraBold se veía como el hermano débil.
  hFee: { fontFamily: Fonts.bold, letterSpacing: -0.4, lineHeight: 32 },

  card: { borderRadius: 20, borderWidth: 1, padding: 16 },
  ovl: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1.2, textTransform: 'uppercase' },
  label: { fontSize: 12, fontFamily: Fonts.semiBold, marginBottom: 9 },
  hint: { fontSize: 11.5, fontFamily: Fonts.regular, lineHeight: 16, marginTop: 7 },
  field: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: Fonts.mono },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  saveTea: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9, alignSelf: 'flex-start' },
  saveTeaText: { fontSize: 11.5, fontFamily: Fonts.semiBold },

  termHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  termBig: { fontSize: 28, fontFamily: Fonts.extraBold },
  termSteps: { flexDirection: 'row', gap: 8, marginLeft: 'auto' },
  stepBtn: { width: 34, height: 34, borderRadius: 50, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // paddingTop reserva la banda que se puede arrastrar sin tocar un tope.
  rail: { height: 44, marginTop: 18, marginHorizontal: 10, position: 'relative' },
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
  rNote: { fontSize: 11.5, fontFamily: Fonts.regular, marginTop: 3 },
  cut: { height: 1, marginVertical: 16, marginHorizontal: -20, justifyContent: 'center' },
  cutLine: { borderTopWidth: 1, borderStyle: 'dashed', marginHorizontal: 12 },
  notch: { position: 'absolute', width: 16, height: 16, borderRadius: 8, top: -8 },
  notchL: { left: -8 },
  notchR: { right: -8 },
  rLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rKey: { fontSize: 12, fontFamily: Fonts.mono },
  rVal: { fontSize: 13, fontFamily: Fonts.monoBold },

  kindRow: { flexDirection: 'row', gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  kindChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  kindText: { fontSize: 12.5, fontFamily: Fonts.semiBold },
  band: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 3 },
  bandTitle: { fontSize: 12.5, fontFamily: Fonts.bold },
  bandBody: { fontSize: 11.5, fontFamily: Fonts.regular, lineHeight: 16 },
  locked: { alignItems: 'center', paddingVertical: 10, gap: 4 },
  unlock: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 42, paddingHorizontal: 20, borderRadius: 50, marginTop: 14 },
  unlockText: { fontSize: 13.5, fontFamily: Fonts.bold },
  notSaved: { fontSize: 11, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 4, lineHeight: 16 },
});
