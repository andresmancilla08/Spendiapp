// app/goals.tsx
import { useState, useMemo, useRef } from 'react';
import { scrollFadeMask } from '../components/ScrollFadeEdges';
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
import AppIcon from '../components/AppIcon';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { accentInk, mixHex, readableTint } from '../utils/contrast';
import { useGoals } from '../hooks/useGoals';
import { localeFor } from '../utils/dateLocale';
import { Goal } from '../types/goal';
import AppDialog from '../components/AppDialog';
import GoalSheet from '../components/GoalSheet';
import { EmojiPicker } from '../components/EmojiPicker';
import AppHeader from '../components/AppHeader';
import AppSegmentedControl from '../components/AppSegmentedControl';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import { Fonts } from '../config/fonts';
import { useToast } from '../context/ToastContext';
import { goBack } from '../utils/nav';
import { formatMoney } from '../utils/formatMoney';

type TabType = 'active' | 'completed';
/** `contribute` ya no es un diálogo: el aporte vive en la hoja de la meta. */
type DialogMode = 'create' | 'edit' | 'delete' | 'completed' | null;

const formatCurrency = formatMoney;

function formatCurrencyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(parseInt(digits, 10));
}

/** `trackColor` es obligatorio: el gris que había por defecto era un hex quemado
 *  que ignoraba la paleta y el modo oscuro. */
function ProgressBar({ percent, color, trackColor }: { percent: number; color: string; trackColor: string }) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  return (
    <View style={[progressStyles.track, { backgroundColor: trackColor }]}>
      <View style={[progressStyles.fill, { width: `${clamped}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  fill: { height: 6, borderRadius: 3 },
});

/**
 * La tarjeta INFORMA; actuar es cosa de la hoja (`components/GoalSheet`). Antes
 * cargaba dos gestos —toque para aportar y long-press para eliminar— y el segundo
 * era invisible y, en la PWA de iOS, ni se disparaba.
 */
function GoalCard({
  goal,
  colors,
  isDark,
  t,
  onOpen,
}: {
  goal: Goal;
  colors: any;
  isDark: boolean;
  t: any;
  onOpen: () => void;
}) {
  // Acotado a 100 como en el resumen premium: aportar de más imprimía "142%"
  // sobre una barra clavada al tope, y las dos vistas se contradecían.
  const pct = goal.targetAmount > 0
    ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100)
    : 0;
  const isCompleted = goal.status === 'completed';
  const accentColor = isCompleted ? colors.success : colors.primary;
  // readableTint y no accentInk: aquí el color ES la señal (progreso, logro) y el
  // fallback gris de accentInk la borraba — el badge "LOGRADA" salía gris en oscuro.
  const accentText = readableTint(isCompleted ? colors.success : colors.primary, colors.surface, 4.5);
  const trackColor = isDark ? mixHex(colors.surface, colors.textPrimary, 0x1a / 255) : colors.border;
  // El relleno PORTA el progreso: se aclara u oscurece lo justo para verse contra el
  // carril (en sunset claro el ámbar de marca se quedaba en 1,65:1 y no se leía).
  const fillColor = readableTint(accentColor, trackColor, 2.5);
  // La tinta del badge se mide contra el badge, no contra la tarjeta.
  const badgeBg = mixHex(colors.surface, colors.success, 0x1e / 255);
  const badgeInk = readableTint(colors.success, badgeBg, 4.5);
  const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);
  const glow = Platform.OS === 'web'
    ? ({ boxShadow: `0 0 16px ${accentColor}44` } as any)
    : { shadowColor: accentColor, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } };

  return (
    <TouchableOpacity
      onPress={onOpen}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${goal.name}, ${formatCurrency(goal.savedAmount)} ${t('goals.of')} ${formatCurrency(goal.targetAmount)}, ${Math.round(pct)}%`}
      accessibilityHint={isCompleted ? t('goals.card.hintCompleted') : t('goals.card.hintActive')}
      style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.goalAccent, { backgroundColor: accentColor }]} />
      <View style={styles.goalInner}>
        <View style={styles.goalTop}>
          <View style={[styles.goalEmojiWrap, { backgroundColor: `${accentColor}1E` }, glow]}>
            <Text style={styles.goalEmoji}>{goal.emoji}</Text>
          </View>
          <Text style={[styles.goalName, { color: colors.textPrimary }]} numberOfLines={1}>
            {goal.name}
          </Text>
          {/* La única pista de que hay más: sin esto la tarjeta no se lee como accionable. */}
          <AppIcon name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>

        {/* Cifras en su propia línea: compartiéndola con el nombre, un nombre largo
            más un importe de siete dígitos empujaba el chevron fuera de la tarjeta. */}
        <View style={styles.goalStats}>
          {isCompleted ? (
            <View style={[styles.doneBadge, { backgroundColor: badgeBg }]}>
              <AppIcon name="checkmark" size={11} color={badgeInk} />
              <Text style={[styles.doneBadgeText, { color: badgeInk }]}>{t('goals.card.reached')}</Text>
            </View>
          ) : (
            <Text style={[styles.goalPct, { color: colors.textSecondary }]} numberOfLines={1}>
              {Math.round(pct)}% · {t('goals.card.remaining', { amount: formatCurrency(remaining) })}
            </Text>
          )}
          <Text style={[styles.goalSaved, { color: accentText }]} numberOfLines={1}>
            {formatCurrency(goal.savedAmount)}
          </Text>
        </View>
        <ProgressBar percent={pct} color={fillColor} trackColor={trackColor} />
      </View>
    </TouchableOpacity>
  );
}

export default function GoalsScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { user, isPremium } = useAuthStore();
  const { showToast } = useToast();
  const trackColor = isDark ? colors.textPrimary + '1A' : colors.border;
  const transitionRef = useRef<ScreenTransitionRef>(null);

  const { goals, loading, addGoal, addContribution, updateGoal, reopenGoal, deleteGoal } = useGoals(user?.uid ?? '');

  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'active'), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.status === 'completed'), [goals]);

  // Premium: resumen agregado de las metas activas.
  const goalsSummary = useMemo(() => {
    const totalTarget = activeGoals.reduce((s, g) => s + g.targetAmount, 0);
    const totalSaved = activeGoals.reduce((s, g) => s + g.savedAmount, 0);
    const pct = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0;
    return { totalTarget, totalSaved, pct, remaining: Math.max(totalTarget - totalSaved, 0) };
  }, [activeGoals]);

  const [tab, setTab] = useState<TabType>('active');
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form
  const [nameInput, setNameInput] = useState('');
  const [emojiInput, setEmojiInput] = useState('🎯');
  const [targetInput, setTargetInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  /** La meta abierta en la hoja. Se guarda aparte de `selectedGoal` porque la hoja
   *  sigue detrás cuando encima hay un diálogo (editar, confirmar borrado). */
  const [sheetGoalId, setSheetGoalId] = useState<string | null>(null);
  const sheetGoal = goals.find((g) => g.id === sheetGoalId) ?? null;

  const resetForms = () => {
    setNameInput('');
    setEmojiInput('🎯');
    setTargetInput('');
    setShowEmojiPicker(false);
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedGoal(null);
    resetForms();
  };

  const openCreate = () => setDialogMode('create');

  const openEdit = (goal: Goal) => {
    setSelectedGoal(goal);
    setNameInput(goal.name);
    setEmojiInput(goal.emoji);
    setTargetInput(formatCurrencyInput(String(goal.targetAmount)));
    setShowEmojiPicker(false);
    setDialogMode('edit');
  };

  const openDelete = (goal: Goal) => {
    setSelectedGoal(goal);
    setDialogMode('delete');
  };

  /** Crear y editar comparten formulario: el mismo diálogo con otro título y otro CTA. */
  const handleSaveGoal = async () => {
    const target = parseInt(targetInput.replace(/\D/g, ''), 10);
    if (!nameInput.trim() || !target || target <= 0) return;
    setSaving(true);
    try {
      if (dialogMode === 'edit' && selectedGoal) {
        await updateGoal(selectedGoal, {
          name: nameInput.trim(),
          emoji: emojiInput.trim(),
          targetAmount: target,
        });
        showToast(t('goals.toasts.updated'), 'success');
      } else {
        await addGoal(nameInput.trim(), emojiInput.trim(), target);
        showToast(t('goals.toasts.created'), 'success');
      }
      closeDialog();
    } catch {
      showToast(t('goals.toasts.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleContribute = async (amount: number) => {
    if (!sheetGoal || amount <= 0) return;
    setSaving(true);
    try {
      const completed = await addContribution(
        sheetGoal.id,
        amount,
        sheetGoal.savedAmount,
        sheetGoal.targetAmount,
      );
      setSheetGoalId(null);
      if (completed) {
        setSelectedGoal({ ...sheetGoal, savedAmount: sheetGoal.savedAmount + amount, status: 'completed' });
        showToast(t('goals.toasts.completed'), 'success');
        setDialogMode('completed');
      } else {
        showToast(t('goals.toasts.contributed'), 'success');
      }
    } catch {
      showToast(t('goals.toasts.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReopen = async () => {
    if (!sheetGoal) return;
    setSaving(true);
    try {
      await reopenGoal(sheetGoal.id);
      setSheetGoalId(null);
      setTab('active');
      showToast(t('goals.toasts.reopened'), 'success');
    } catch {
      showToast(t('goals.toasts.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGoal) return;
    setSaving(true);
    try {
      await deleteGoal(selectedGoal.id);
      setSheetGoalId(null);
      showToast(t('goals.toasts.deleted'), 'success');
      closeDialog();
    } catch {
      showToast(t('goals.toasts.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const targetValue = parseInt(targetInput.replace(/\D/g, ''), 10);
  const isSaveDisabled =
    !nameInput.trim() ||
    !Number.isFinite(targetValue) ||
    targetValue <= 0;

  const displayedGoals = tab === 'active' ? activeGoals : completedGoals;

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader showBack onBack={() => transitionRef.current?.animateOut(() => goBack('/(tabs)/tools'))} />
          <PageTitle title={t('goals.title')} description={t('goals.pageDesc')} />

          {/* Tabs */}
          <AppSegmentedControl
            segments={[
              { key: 'active', label: t('goals.activeTab') },
              { key: 'completed', label: t('goals.completedTab') },
            ]}
            activeKey={tab}
            onChange={(key) => setTab(key as TabType)}
            style={styles.tabRow}
          />

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <ScrollView
        style={scrollFadeMask(0, 0)} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {/* Nueva meta button (solo en tab activas) */}
              {tab === 'active' && (
                <TouchableOpacity
                  onPress={openCreate}
                  activeOpacity={0.8}
                  style={[styles.newGoalBtn, { backgroundColor: colors.primary }]}
                >
                  <AppIcon name="add" size={18} color={colors.onPrimary} />
                  <Text style={[styles.newGoalBtnText, { color: colors.onPrimary }]}>
                    {t('goals.newGoalButton')}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Estado vacío */}
              {displayedGoals.length === 0 && (
                <LinearGradient
                  colors={[`${colors.primary}18`, `${colors.primary}06`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.emptyCard, { borderColor: `${colors.primary}25`, borderWidth: 1 }]}
                >
                  <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                    <AppIcon name="flag-outline" size={36} color={colors.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    {tab === 'active' ? t('goals.emptyActive') : t('goals.emptyCompleted')}
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    {tab === 'active' ? t('goals.emptyActiveSub') : t('goals.emptyCompletedSub')}
                  </Text>
                </LinearGradient>
              )}

              {/* Premium: resumen agregado de metas activas */}
              {isPremium && tab === 'active' && activeGoals.length > 0 && (
                <LinearGradient
                  colors={[`${colors.primary}18`, `${colors.primary}06`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.gsCard, { borderColor: `${colors.primary}25`, borderWidth: 1 }]}
                >
                  <View style={styles.gsHeader}>
                    <Text style={[styles.gsTitle, { color: colors.textSecondary }]}>
                      {t('goals.summaryTitle').toUpperCase()}
                    </Text>
                    <Text style={[styles.gsPct, { color: accentInk(colors, 'primary', colors.surface) }]}>{Math.round(goalsSummary.pct)}%</Text>
                  </View>
                  <ProgressBar percent={goalsSummary.pct} color={colors.primary} trackColor={trackColor} />
                  <View style={styles.gsRow}>
                    <View>
                      <Text style={[styles.gsLabel, { color: colors.textTertiary }]}>{t('goals.summarySaved')}</Text>
                      <Text style={[styles.gsValue, { color: accentInk(colors, 'success', colors.surface) }]}>{formatCurrency(goalsSummary.totalSaved)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.gsLabel, { color: colors.textTertiary }]}>{t('goals.summaryRemaining')}</Text>
                      <Text style={[styles.gsValue, { color: colors.textPrimary }]}>{formatCurrency(goalsSummary.remaining)}</Text>
                    </View>
                  </View>
                </LinearGradient>
              )}

              {/* Lista de metas */}
              {displayedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  colors={colors}
                  isDark={isDark}
                  t={t}
                  onOpen={() => setSheetGoalId(goal.id)}
                />
              ))}

              <View style={{ height: 100 }} />
            </ScrollView>
          )}

          {/* Dialog: Crear / editar meta — mismo formulario, distinto encabezado */}
          {(dialogMode === 'create' || dialogMode === 'edit') && (
            <AppDialog
              visible
              type="info"
              title={dialogMode === 'edit' ? t('goals.editTitle') : t('goals.createTitle')}
              description={
                <View style={{ alignSelf: 'stretch', gap: 12 }}>
                  <View>
                    <Text style={{ fontFamily: Fonts.regular, fontSize: 13, marginBottom: 6, color: colors.textSecondary }}>
                      {t('goals.emojiLabel')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowEmojiPicker((v) => !v)}
                      activeOpacity={0.8}
                      style={{
                        borderWidth: 1.5,
                        borderColor: colors.primary,
                        borderRadius: 12,
                        paddingVertical: 10,
                        alignItems: 'center',
                        backgroundColor: colors.backgroundSecondary,
                      }}
                    >
                      <Text style={{ fontSize: 28 }}>{emojiInput}</Text>
                    </TouchableOpacity>
                    {showEmojiPicker && (
                      <View style={{
                        marginTop: 8,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        padding: 4,
                        backgroundColor: colors.backgroundSecondary,
                      }}>
                        <EmojiPicker
                          selected={emojiInput}
                          onSelect={(e) => { setEmojiInput(e); setShowEmojiPicker(false); }}
                        />
                      </View>
                    )}
                  </View>
                  <View>
                    <Text style={{ fontFamily: Fonts.regular, fontSize: 13, marginBottom: 6, color: colors.textSecondary }}>
                      {t('goals.nameLabel')}
                    </Text>
                    <TextInput
                      value={nameInput}
                      onChangeText={setNameInput}
                      placeholder={t('goals.namePlaceholder')}
                      style={{
                        borderWidth: 1.5,
                        borderColor: nameInput ? colors.primary : colors.border,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        fontFamily: Fonts.regular,
                        fontSize: 15,
                        color: colors.textPrimary,
                        backgroundColor: colors.backgroundSecondary,
                      }}
                      maxLength={40}
                    />
                  </View>
                  <View>
                    <Text style={{ fontFamily: Fonts.regular, fontSize: 13, marginBottom: 6, color: colors.textSecondary }}>
                      {t('goals.targetLabel')}
                    </Text>
                    <TextInput
                      value={targetInput}
                      onChangeText={(v) => setTargetInput(formatCurrencyInput(v))}
                      placeholder={t('goals.targetPlaceholder')}
                      keyboardType="numeric"
                      style={{
                        borderWidth: 1.5,
                        borderColor: targetInput ? colors.primary : colors.border,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        fontFamily: Fonts.semiBold,
                        fontSize: 18,
                        color: colors.textPrimary,
                        backgroundColor: colors.backgroundSecondary,
                      }}
                    />
                  </View>
                </View>
              }
              primaryLabel={dialogMode === 'edit' ? t('goals.saveButton') : t('goals.createButton')}
              secondaryLabel={t('goals.cancelButton')}
              onPrimary={handleSaveGoal}
              onSecondary={closeDialog}
              loading={saving}
              primaryDisabled={isSaveDisabled}
            />
          )}

          {/* Dialog: Eliminar */}
          {dialogMode === 'delete' && selectedGoal && (
            <AppDialog
              visible
              type="error"
              title={t('goals.deleteTitle')}
              description={
                <Text style={{ fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center', alignSelf: 'stretch' }}>
                  {t('goals.deleteDescBefore')}{' '}
                  <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{selectedGoal.name}</Text>
                  {t('goals.deleteDescAfter')}
                </Text>
              }
              primaryLabel={t('goals.deleteButton')}
              secondaryLabel={t('goals.cancelButton')}
              onPrimary={handleDelete}
              onSecondary={closeDialog}
              loading={saving}
              primaryDanger
            />
          )}

          {/* Dialog: Meta cumplida */}
          {dialogMode === 'completed' && selectedGoal && (
            <AppDialog
              visible
              type="success"
              title={t('goals.completedTitle')}
              description={
                <Text style={{ fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center', alignSelf: 'stretch' }}>
                  {t('goals.completedDesc')}{' '}
                  <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{selectedGoal.name}</Text>
                  {t('goals.completedDescAfter')}
                </Text>
              }
              primaryLabel={t('goals.gotIt')}
              onPrimary={() => {
                closeDialog();
                setTab('completed');
              }}
            />
          )}

          <GoalSheet
            visible={!!sheetGoal}
            goal={sheetGoal}
            busy={saving}
            onClose={() => setSheetGoalId(null)}
            onContribute={handleContribute}
            onEdit={() => { if (sheetGoal) { setSheetGoalId(null); openEdit(sheetGoal); } }}
            onDelete={() => { if (sheetGoal) { setSheetGoalId(null); openDelete(sheetGoal); } }}
            onReopen={handleReopen}
          />
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingTop: 8, paddingBottom: 40, width: '100%', maxWidth: 768, alignSelf: 'center' },
  // Tabs
  tabRow: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  // Nueva meta
  newGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  newGoalBtnText: { fontFamily: Fonts.semiBold, fontSize: 15 },
  // Empty state
  emptyCard: { borderRadius: 20, padding: 36, alignItems: 'center', marginBottom: 16 },
  gsCard: { borderRadius: 20, padding: 18, marginBottom: 16 },
  gsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  gsTitle: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1 },
  gsPct: { fontSize: 22, fontFamily: Fonts.extraBold, letterSpacing: -0.5 },
  gsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  gsLabel: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.6, textTransform: 'uppercase' },
  gsValue: { fontSize: 15, fontFamily: Fonts.extraBold, letterSpacing: -0.3, marginTop: 3 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontFamily: Fonts.bold, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 21 },
  // Goal card
  goalCard: {
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  goalAccent: { width: 4 },
  goalInner: { flex: 1, padding: 14 },
  goalTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalEmojiWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  goalEmoji: { fontSize: 22 },
  goalName: { flex: 1, minWidth: 0, fontSize: 14.5, fontFamily: Fonts.semiBold },
  goalStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  goalPct: { flex: 1, minWidth: 0, fontSize: 11.5, fontFamily: Fonts.medium },
  goalSaved: { fontSize: 14, fontFamily: Fonts.bold, letterSpacing: -0.2, flexShrink: 0 },
  doneBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start',
    height: 20, paddingHorizontal: 7, borderRadius: 10, marginTop: 4,
  },
  doneBadgeText: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 0.7 },
});
