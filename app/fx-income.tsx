/**
 * «Mi salario» — cuánto valen hoy, en pesos, los ingresos que el usuario cobra
 * en otra moneda.
 *
 * Es una pantalla de CONSULTA: lo que se declara aquí vive en el perfil y NO
 * entra en el balance, en los presupuestos ni en el histórico. La conversión se
 * hace al pintar con la TRM del día, así que la cifra cambia cuando cambia la
 * tasa y no cuando el usuario la escribió.
 *
 * La aritmética entera está en `fxPortfolioStats` (utils/fxConvert.ts): con
 * varios ingresos en monedas distintas, el mejor día del total no es el mejor
 * día de ninguna moneda por separado, y eso no se resuelve en el JSX.
 */
import { useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { goBack } from '../utils/nav';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { mixHex, readableTint } from '../utils/contrast';
import { usePremium } from '../hooks/usePremium';
import { useFxRates } from '../hooks/useFxRates';
import { useFxIncome } from '../hooks/useFxIncome';
import { useToast } from '../context/ToastContext';
import AppIcon from '../components/AppIcon';
import AppHeader from '../components/AppHeader';
import AppButton from '../components/AppButton';
import AppDialog from '../components/AppDialog';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import { Skeleton } from '../components/Skeleton';
import { scrollFadeMask } from '../components/ScrollFadeEdges';
import FxIncomeSheet from '../components/fx/FxIncomeSheet';
import FxLayer, { type FxFrame } from '../components/fx/FxLayer';
import { Fonts } from '../config/fonts';
import { formatMoney } from '../utils/formatMoney';
import { localeFor } from '../utils/dateLocale';
import { fxPortfolioStats, type FxCurrency, type FxPortfolioDay } from '../utils/fxConvert';
import { FX_INCOME_MAX, type FxIncome } from '../types/fxIncome';

const FLAG: Record<FxCurrency, string> = { COP: '🇨🇴', EUR: '🇪🇺', USD: '🇺🇸' };
const SYMBOL: Record<FxCurrency, string> = { COP: '$', EUR: '€', USD: 'US$' };

/** Mismo latido que los chips del Home: es el mismo lenguaje visual para decir
 *  «este dato está vivo». Va por FxLayer y no por Animated.loop porque en web
 *  ese bucle corre en JS y no se detiene al desmontar. */
const DOT_FRAMES: FxFrame[] = [
  { at: 0, opacity: 1, scale: 1 },
  { at: 0.5, opacity: 0, scale: 1.6 },
  { at: 0.5001, opacity: 1, scale: 1 },
  { at: 1, opacity: 1, scale: 1 },
];

/**
 * Barras de la serie, una por publicación de la TRM. **Tocables**: la columna
 * entera responde, no solo la barra pintada — una barra baja mide 8px de alto y
 * sería imposible de acertar con el dedo.
 *
 * Sin librería de gráficos: son 30 `View` de altura proporcional, que es lo que
 * ya hace el resto de la app para una tendencia pequeña.
 */
function Sparkline({ series, color, dimColor, selectedDate, onSelect, todayLabel, formatDate }: {
  series: FxPortfolioDay[];
  color: string;
  dimColor: string;
  selectedDate: string | null;
  onSelect: (date: string) => void;
  todayLabel: string;
  formatDate: (iso: string) => string;
}) {
  if (series.length < 2) return null;
  const values = series.map((p) => p.cop);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const lastDate = series[series.length - 1].date;

  return (
    <View style={styles.spark}>
      {series.map((p) => {
        const isSelected = p.date === selectedDate;
        const isLast = p.date === lastDate;
        return (
          <TouchableOpacity
            key={p.date}
            onPress={() => onSelect(p.date)}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel={`${formatDate(p.date)}${isLast ? ` (${todayLabel})` : ''}`}
            accessibilityState={{ selected: isSelected }}
            style={styles.sparkHit}
          >
            <View
              style={[
                styles.sparkBar,
                {
                  // Con span 0 (tasa plana toda la serie) todas al 50%: una
                  // barra de altura 0 se leería como «ese día no valía nada».
                  height: `${span === 0 ? 50 : 18 + ((p.cop - min) / span) * 82}%`,
                  backgroundColor: isSelected || isLast ? color : dimColor,
                },
                isSelected && styles.sparkBarSelected,
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function FxIncomeScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const user = useAuthStore((s) => s.user);
  const uid = user?.uid ?? '';
  const { isPremium, loading: premiumLoading } = usePremium();

  const { rates, prevRates, rows, loading: ratesLoading, error: ratesError, stale, updatedAt, retry } = useFxRates();
  const { incomes, loading: incomesLoading, busy, canAdd, add, update, remove } = useFxIncome(uid);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editing, setEditing] = useState<FxIncome | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FxIncome | null>(null);
  /** Publicación de la TRM que el usuario tocó en el gráfico. `null` = hoy. */
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const transitionRef = useRef<ScreenTransitionRef>(null);
  const back = () => transitionRef.current?.animateOut(() => goBack('/(tabs)/tools'));

  const stats = useMemo(
    () => fxPortfolioStats(incomes, rows, rates, prevRates),
    [incomes, rows, rates, prevRates],
  );

  const selected = selectedDate
    ? stats?.series.find((p) => p.date === selectedDate) ?? null
    : null;

  const money = (n: number) => formatMoney(n, i18n.language);
  const rateLine = (rate: number | undefined) =>
    rate === undefined || !stats?.soleCurrency
      ? null
      : t('fxIncome.rateLine', {
          rate: Math.round(rate).toLocaleString(localeFor()),
          symbol: SYMBOL[stats.soleCurrency],
        });
  const dayLabel = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(localeFor(), { day: 'numeric', month: 'short' });

  const loading = premiumLoading || ratesLoading || incomesLoading;
  // En vacío y en bloqueado el CTA ya vive dentro de su tarjeta; el footer solo
  // aparece cuando hay lista que scrollear.
  const hasFooter = !loading && isPremium && incomes.length > 0;

  const openNew = () => { setEditing(null); setSheetVisible(true); };
  const openEdit = (income: FxIncome) => { setEditing(income); setSheetVisible(true); };

  const handleSave = async (value: Omit<FxIncome, 'id' | 'createdAt'>) => {
    try {
      if (editing) await update(editing.id, value);
      else await add(value);
      setSheetVisible(false);
      showToast(t(editing ? 'fxIncome.toasts.updated' : 'fxIncome.toasts.added'), 'success');
    } catch {
      showToast(t('errors.genericError'), 'error');
    }
  };

  const handleDelete = async () => {
    const target = confirmDelete;
    setConfirmDelete(null);
    if (!target) return;
    try {
      await remove(target.id);
      setSheetVisible(false);
      showToast(t('fxIncome.toasts.removed'), 'info');
    } catch {
      showToast(t('errors.genericError'), 'error');
    }
  };

  const heroBg = mixHex(colors.surface, colors.primary, 0x12 / 255);
  const heroInk = readableTint(colors.primary, heroBg, 4.5);
  const upInk = readableTint(colors.success, colors.surface, 4.5);
  const downInk = readableTint(colors.expense, colors.surface, 4.5);
  // La tinta se mide contra el fondo que de verdad tiene debajo: el chip está
  // sobre el hero teñido, no sobre `surface`, y el token crudo se queda en
  // 1,7:1 en las paletas pastel.
  const liveChipBg = mixHex(heroBg, colors.success, 0x1c / 255);
  const liveChipInk = readableTint(colors.success, liveChipBg, 4.5);
  const warnInk = readableTint(colors.warning, colors.surface, 4.5);

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader showBack onBack={back} />
          <PageTitle title={t('fxIncome.title')} description={t('fxIncome.pageDesc')} />

          <ScrollView
            // `flex: 1` explícito: `scrollFadeMask` devuelve null en nativo y
            // solo la máscara en web, así que sin esto el ScrollView se
            // dimensiona a su contenido y empuja el footer fuera de la pantalla.
            //
            // Y el fade va a 0: el de 74px es para una barra de pestañas que se
            // SUPERPONE al scroll. Este footer no se superpone —es hermano y
            // ocupa su propio alto—, así que ese degradado no separaba nada:
            // borraba los últimos 100px de contenido real, y el aviso de la TRM
            // quedaba invisible bajo la última fila.
            style={[styles.scroller, scrollFadeMask(0, 0)]}
            contentContainerStyle={[styles.scroll, hasFooter && styles.scrollWithFooter]}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingWrap}>
                <Skeleton width="100%" height={148} borderRadius={22} />
                <Skeleton width="100%" height={56} borderRadius={16} style={styles.loadingGap} />
                <Skeleton width="100%" height={72} borderRadius={16} style={styles.loadingGap} />
              </View>
            ) : !isPremium ? (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.lockIcon, { backgroundColor: colors.primary + '18' }]}>
                  <AppIcon name="lock-closed-outline" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('fxIncome.locked.title')}</Text>
                <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{t('fxIncome.locked.body')}</Text>
                <AppButton label={t('fxIncome.locked.cta')} onPress={() => router.push('/upgrade' as never)} style={styles.cardCta} />
              </View>
            ) : incomes.length === 0 ? (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.lockIcon, { backgroundColor: colors.primary + '18' }]}>
                  <AppIcon name="cash-outline" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('fxIncome.empty.title')}</Text>
                <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{t('fxIncome.empty.body')}</Text>
                <AppButton label={t('fxIncome.empty.cta')} onPress={openNew} icon="add" style={styles.cardCta} />
              </View>
            ) : (
              <>
                {/* ── Total de hoy ── */}
                <View style={[styles.hero, { backgroundColor: heroBg, borderColor: colors.primary + '2E' }]}>
                  <View style={styles.heroTop}>
                    <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
                      {t('fxIncome.hero.label')}
                    </Text>
                    {stale ? (
                      <TouchableOpacity
                        onPress={retry}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                      >
                        <AppIcon name="cloud-offline-outline" size={12} color={colors.textTertiary} />
                        <Text style={[styles.chipText, { color: colors.textTertiary }]}>{t('fxIncome.hero.saved')}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.chip, { backgroundColor: liveChipBg, borderColor: colors.success + '4D' }]}>
                        <FxLayer frames={DOT_FRAMES} duration={1800} easing="linear" style={[styles.dot, { backgroundColor: colors.success }]} />
                        <Text style={[styles.chipText, { color: liveChipInk }]}>{t('fxIncome.hero.trmToday')}</Text>
                      </View>
                    )}
                  </View>

                  {stats === null || ratesError ? (
                    <>
                      <Text style={[styles.heroValue, { color: colors.textTertiary }]}>—</Text>
                      <TouchableOpacity onPress={retry} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.retryRow}>
                        <AppIcon name="refresh-outline" size={14} color={colors.primary} />
                        <Text style={[styles.retryText, { color: colors.primary }]}>{t('fxIncome.hero.retry')}</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.heroValue, { color: heroInk }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {money(selected ? selected.cop : stats.today)}
                      </Text>
                      <Text style={[styles.heroFoot, { color: colors.textSecondary }]}>
                        {selected
                          ? [rateLine(selected.rate), t('fxIncome.hero.vsToday', {
                              amount: money(Math.abs(selected.cop - stats.today)),
                              sign: selected.cop >= stats.today ? '+' : '−',
                            })].filter(Boolean).join(' · ')
                          : [rateLine(stats.todayRate), t('fxIncome.hero.foot', { count: incomes.length })]
                              .filter(Boolean).join(' · ')}
                      </Text>
                      <Sparkline
                        series={stats.series}
                        color={colors.primary}
                        dimColor={colors.primary + '4D'}
                        selectedDate={selectedDate}
                        onSelect={(date) => setSelectedDate((current) => (current === date ? null : date))}
                        todayLabel={t('fxIncome.hero.trmToday')}
                        formatDate={dayLabel}
                      />
                      {stats.series.length >= 2 && (
                        selected ? (
                          <TouchableOpacity
                            onPress={() => setSelectedDate(null)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={styles.sparkFootRow}
                          >
                            <Text style={[styles.sparkFootStrong, { color: colors.textPrimary }]}>
                              {dayLabel(selected.date)}
                            </Text>
                            <Text style={[styles.sparkFoot, { color: heroInk }]}>
                              {t('fxIncome.hero.backToToday')}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={[styles.sparkFoot, { color: colors.textTertiary }]}>
                            {t('fxIncome.hero.sparkHint', { count: stats.series.length })}
                          </Text>
                        )
                      )}
                    </>
                  )}
                </View>

                {/* ── Banner de variación ── */}
                {stats?.variation && stats.variation.direction !== 'flat' && (
                  <View
                    style={[styles.banner, {
                      backgroundColor: (stats.variation.direction === 'up' ? colors.warning : colors.expense) + '1A',
                      borderColor: (stats.variation.direction === 'up' ? colors.warning : colors.expense) + '4D',
                    }]}
                  >
                    <AppIcon
                      name={stats.variation.direction === 'up' ? 'flash-outline' : 'trending-down'}
                      size={16}
                      color={stats.variation.direction === 'up' ? warnInk : downInk}
                    />
                    <Text style={[styles.bannerText, { color: colors.textPrimary }]}>
                      {t(stats.variation.direction === 'up' ? 'fxIncome.banner.up' : 'fxIncome.banner.down', {
                        amount: money(Math.abs(stats.variation.delta)),
                      })}
                    </Text>
                  </View>
                )}
                {stats?.variation?.direction === 'flat' && (
                  <View style={[styles.banner, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    <AppIcon name="time-outline" size={16} color={colors.textTertiary} />
                    <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
                      {t('fxIncome.banner.flat')}
                    </Text>
                  </View>
                )}

                {/* ── Mejor y peor del periodo ── */}
                {stats?.best && stats?.worst && stats.best.date !== stats.worst.date && (
                  <View style={styles.statRow}>
                    <View style={[styles.statTile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.statKey, { color: colors.textTertiary }]}>{t('fxIncome.stats.best')}</Text>
                      <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{money(stats.best.cop)}</Text>
                      <Text style={[styles.statRate, { color: colors.textSecondary }]} numberOfLines={1}>
                        {[dayLabel(stats.best.date), rateLine(stats.best.rate)].filter(Boolean).join(' · ')}
                      </Text>
                      <Text style={[styles.statDelta, { color: upInk }]} numberOfLines={1}>
                        +{money(stats.best.delta)}
                      </Text>
                    </View>
                    <View style={[styles.statTile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.statKey, { color: colors.textTertiary }]}>{t('fxIncome.stats.worst')}</Text>
                      <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{money(stats.worst.cop)}</Text>
                      <Text style={[styles.statRate, { color: colors.textSecondary }]} numberOfLines={1}>
                        {[dayLabel(stats.worst.date), rateLine(stats.worst.rate)].filter(Boolean).join(' · ')}
                      </Text>
                      <Text style={[styles.statDelta, { color: downInk }]} numberOfLines={1}>
                        {money(stats.worst.delta)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* ── Ingresos declarados ── */}
                <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
                  {t('fxIncome.list.title')}
                </Text>
                <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {incomes.map((income, index) => {
                    const cop = fxPortfolioStats([income], [], rates)?.today ?? null;
                    return (
                      <TouchableOpacity
                        key={income.id}
                        onPress={() => openEdit(income)}
                        activeOpacity={0.7}
                        style={[styles.row, index < incomes.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
                      >
                        <Text style={styles.rowFlag}>{FLAG[income.currency]}</Text>
                        <View style={styles.rowMain}>
                          <Text style={[styles.rowLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                            {income.label}
                          </Text>
                          <Text style={[styles.rowSub, { color: colors.textTertiary }]} numberOfLines={1}>
                            {income.currency === 'COP'
                              ? t('fxIncome.list.fixed')
                              : `${income.amount.toLocaleString(localeFor())} ${income.currency}`}
                            {income.payDay ? ` · ${t('fxIncome.list.payDay', { day: income.payDay })}` : ''}
                          </Text>
                        </View>
                        <View style={styles.rowEnd}>
                          <Text style={[styles.rowAmount, { color: upInk }]} numberOfLines={1}>
                            {cop === null ? '—' : money(cop)}
                          </Text>
                          <AppIcon name="chevron-forward" size={14} color={colors.textTertiary} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
                  {t('fxIncome.disclaimer')}
                  {updatedAt ? ` ${t('fxIncome.updatedAt', {
                    time: updatedAt.toLocaleTimeString(localeFor(), { hour: '2-digit', minute: '2-digit' }),
                  })}` : ''}
                </Text>

              </>
            )}
          </ScrollView>

          {/* Footer fijo, hermano del ScrollView: el botón vive al fondo del
              contenedor y no al final del contenido. En una pantalla alta
              quedaba a media altura, flotando tras el último bloque.
              Sin `backgroundColor`: una banda opaca cortaría el fondo animado
              de la app; el degradado de `scrollFadeMask` es lo que separa. */}
          {hasFooter && (
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              {canAdd ? (
                <AppButton label={t('fxIncome.addAnother')} onPress={openNew} icon="add" />
              ) : (
                // Un botón que desaparece sin decir nada se lee como un fallo
                // de la app, no como un límite.
                <Text style={[styles.maxNote, { color: colors.textTertiary }]}>
                  {t('fxIncome.maxReached', { max: FX_INCOME_MAX })}
                </Text>
              )}
            </View>
          )}

          <FxIncomeSheet
            visible={sheetVisible}
            editing={editing}
            rates={rates}
            busy={busy}
            onClose={() => setSheetVisible(false)}
            onSave={handleSave}
            onDelete={editing ? () => setConfirmDelete(editing) : undefined}
          />

          <AppDialog
            visible={confirmDelete !== null}
            type="warning"
            title={t('fxIncome.deleteDialog.title')}
            description={t('fxIncome.deleteDialog.body', { label: confirmDelete?.label ?? '' })}
            primaryLabel={t('common.delete')}
            secondaryLabel={t('common.cancel')}
            primaryDanger
            onPrimary={handleDelete}
            onSecondary={() => setConfirmDelete(null)}
          />
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroller: { flex: 1 },
  scroll: { paddingHorizontal: 15, paddingBottom: 40 },
  loadingWrap: { paddingTop: 4 },
  loadingGap: { marginTop: 12 },

  card: { borderWidth: 1, borderRadius: 22, padding: 22, alignItems: 'center' },
  lockIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 17, fontFamily: Fonts.extraBold, letterSpacing: -0.3, textAlign: 'center' },
  cardBody: { fontSize: 13.5, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  cardCta: { marginTop: 18, alignSelf: 'stretch' },

  hero: { borderWidth: 1, borderRadius: 22, padding: 18 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  heroLabel: { fontSize: 12, fontFamily: Fonts.semiBold, flex: 1 },
  heroValue: { fontSize: 32, fontFamily: Fonts.extraBold, letterSpacing: -1.4, marginTop: 6 },
  heroFoot: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 3 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  chipText: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  retryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  retryText: { fontSize: 12.5, fontFamily: Fonts.bold },

  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 44, marginTop: 14 },
  // La columna entera es el área táctil: la barra pintada puede medir 8px.
  sparkHit: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  sparkBar: { borderRadius: 2, minHeight: 3, width: '100%' },
  sparkBarSelected: { borderRadius: 3 },
  sparkFoot: { fontSize: 10.5, fontFamily: Fonts.regular, marginTop: 6 },
  sparkFootRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, paddingVertical: 4 },
  sparkFootStrong: { fontSize: 11.5, fontFamily: Fonts.bold },
  statRate: { fontSize: 10.5, fontFamily: Fonts.semiBold, marginTop: 3 },

  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 12 },
  bannerText: { flex: 1, fontSize: 12.5, fontFamily: Fonts.semiBold, lineHeight: 18 },

  statRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  statTile: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 12 },
  statKey: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.5, textTransform: 'uppercase' },
  statValue: { fontSize: 15.5, fontFamily: Fonts.extraBold, letterSpacing: -0.4, marginTop: 3 },
  statDelta: { fontSize: 11, fontFamily: Fonts.semiBold, marginTop: 3 },

  sectionTitle: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 0.7, textTransform: 'uppercase', marginTop: 22, marginBottom: 8, paddingHorizontal: 4 },
  list: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, minHeight: 48 },
  rowFlag: { fontSize: 18 },
  rowMain: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 14, fontFamily: Fonts.bold },
  rowSub: { fontSize: 11.5, fontFamily: Fonts.semiBold, marginTop: 2 },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowAmount: { fontSize: 14, fontFamily: Fonts.extraBold, letterSpacing: -0.3 },

  disclaimer: { fontSize: 11, fontFamily: Fonts.regular, lineHeight: 16, marginTop: 14, paddingHorizontal: 4 },
  scrollWithFooter: { paddingBottom: 14 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 8,
  },
  maxNote: { fontSize: 12, fontFamily: Fonts.semiBold, textAlign: 'center', paddingVertical: 12 },
});
