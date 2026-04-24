// app/goals.tsx
import { useState, useMemo, useRef } from 'react';
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
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { useGoals } from '../hooks/useGoals';
import { Goal } from '../types/goal';
import AppDialog from '../components/AppDialog';
import { EmojiPicker } from '../components/EmojiPicker';
import AppHeader from '../components/AppHeader';
import AppSegmentedControl from '../components/AppSegmentedControl';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import { Fonts } from '../config/fonts';
import { useToast } from '../context/ToastContext';
import { router } from 'expo-router';

type TabType = 'active' | 'completed';
type DialogMode = 'create' | 'contribute' | 'delete' | 'completed' | null;

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

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${clamped}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: '#E5E7EB', overflow: 'hidden', marginTop: 8 },
  fill: { height: 6, borderRadius: 3 },
});

function GoalCard({
  goal,
  colors,
  t,
  onContribute,
  onDelete,
}: {
  goal: Goal;
  colors: any;
  t: any;
  onContribute?: () => void;
  onDelete: () => void;
}) {
  const pct = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0;
  const isCompleted = goal.status === 'completed';
  const accentColor = isCompleted ? colors.success : colors.primary;

  return (
    <TouchableOpacity
      onPress={onContribute}
      onLongPress={onDelete}
      activeOpacity={onContribute ? 0.75 : 1}
      style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.goalAccent, { backgroundColor: accentColor }]} />
      <View style={styles.goalInner}>
        <View style={styles.goalTop}>
          <View style={[styles.goalEmojiWrap, { backgroundColor: `${accentColor}18` }]}>
            <Text style={styles.goalEmoji}>{goal.emoji}</Text>
          </View>
          <View style={styles.goalMeta}>
            <Text style={[styles.goalName, { color: colors.textPrimary }]} numberOfLines={1}>
              {goal.name}
            </Text>
            <Text style={[styles.goalPct, { color: accentColor }]}>
              {isCompleted ? '✓ ' : ''}{Math.round(pct)}%
            </Text>
          </View>
          <View style={styles.goalAmounts}>
            <Text style={[styles.goalSaved, { color: accentColor }]}>
              {formatCurrency(goal.savedAmount)}
            </Text>
            <Text style={[styles.goalTarget, { color: colors.textTertiary }]}>
              {' / '}{formatCurrency(goal.targetAmount)}
            </Text>
          </View>
        </View>
        <ProgressBar percent={pct} color={accentColor} />
        {isCompleted && goal.completedAt && (
          <Text style={[styles.completedDate, { color: colors.textTertiary }]}>
            {goal.completedAt.toDate().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function GoalsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const transitionRef = useRef<ScreenTransitionRef>(null);

  const { goals, loading, addGoal, addContribution, deleteGoal } = useGoals(user?.uid ?? '');

  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'active'), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.status === 'completed'), [goals]);

  const [tab, setTab] = useState<TabType>('active');
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form
  const [nameInput, setNameInput] = useState('');
  const [emojiInput, setEmojiInput] = useState('🎯');
  const [targetInput, setTargetInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Contribute form
  const [contributionInput, setContributionInput] = useState('');

  const resetForms = () => {
    setNameInput('');
    setEmojiInput('🎯');
    setTargetInput('');
    setContributionInput('');
    setShowEmojiPicker(false);
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedGoal(null);
    resetForms();
  };

  const openCreate = () => setDialogMode('create');

  const openContribute = (goal: Goal) => {
    setSelectedGoal(goal);
    setContributionInput('');
    setDialogMode('contribute');
  };

  const openDelete = (goal: Goal) => {
    setSelectedGoal(goal);
    setDialogMode('delete');
  };

  const handleCreate = async () => {
    const target = parseInt(targetInput.replace(/\D/g, ''), 10);
    if (!nameInput.trim() || !target || target <= 0) return;
    setSaving(true);
    try {
      await addGoal(nameInput.trim(), emojiInput.trim(), target);
      showToast(t('goals.toasts.created'), 'success');
      closeDialog();
    } catch {
      showToast(t('goals.toasts.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleContribute = async () => {
    if (!selectedGoal) return;
    const amount = parseInt(contributionInput.replace(/\D/g, ''), 10);
    if (!amount || amount <= 0) return;
    setSaving(true);
    try {
      const completed = await addContribution(
        selectedGoal.id,
        amount,
        selectedGoal.savedAmount,
        selectedGoal.targetAmount,
      );
      if (completed) {
        resetForms();
        showToast(t('goals.toasts.completed'), 'success');
        setSelectedGoal((prev) =>
          prev ? { ...prev, savedAmount: prev.savedAmount + amount, status: 'completed' } : null,
        );
        setDialogMode('completed');
      } else {
        closeDialog();
        showToast(t('goals.toasts.contributed'), 'success');
      }
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
      showToast(t('goals.toasts.deleted'), 'success');
      closeDialog();
    } catch {
      showToast(t('goals.toasts.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const targetValue = parseInt(targetInput.replace(/\D/g, ''), 10);
  const isCreateDisabled =
    !nameInput.trim() ||
    !Number.isFinite(targetValue) ||
    targetValue <= 0;

  const isContributeDisabled =
    parseInt(contributionInput.replace(/\D/g, ''), 10) <= 0 ||
    contributionInput.trim() === '';

  const displayedGoals = tab === 'active' ? activeGoals : completedGoals;

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader showBack onBack={() => transitionRef.current?.animateOut(() => router.back())} />
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
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {/* Nueva meta button (solo en tab activas) */}
              {tab === 'active' && (
                <TouchableOpacity
                  onPress={openCreate}
                  activeOpacity={0.8}
                  style={[styles.newGoalBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="add" size={18} color={colors.onPrimary} />
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
                    <Ionicons name="flag-outline" size={36} color={colors.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    {tab === 'active' ? t('goals.emptyActive') : t('goals.emptyCompleted')}
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    {tab === 'active' ? t('goals.emptyActiveSub') : t('goals.emptyCompletedSub')}
                  </Text>
                </LinearGradient>
              )}

              {/* Lista de metas */}
              {displayedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  colors={colors}
                  t={t}
                  onContribute={goal.status === 'active' ? () => openContribute(goal) : undefined}
                  onDelete={() => openDelete(goal)}
                />
              ))}

              <View style={{ height: 100 }} />
            </ScrollView>
          )}

          {/* Dialog: Crear meta */}
          {dialogMode === 'create' && (
            <AppDialog
              visible
              type="info"
              title={t('goals.createTitle')}
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
              primaryLabel={t('goals.createButton')}
              secondaryLabel={t('goals.cancelButton')}
              onPrimary={handleCreate}
              onSecondary={closeDialog}
              loading={saving}
              primaryDisabled={isCreateDisabled}
            />
          )}

          {/* Dialog: Agregar contribución */}
          {dialogMode === 'contribute' && selectedGoal && (
            <AppDialog
              visible
              type="info"
              title={t('goals.addContributionTitle')}
              description={
                <View style={{ alignSelf: 'stretch' }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: `${colors.primary}15`,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 14,
                  }}>
                    <Text style={{ fontSize: 22 }}>{selectedGoal.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: Fonts.semiBold, fontSize: 14, color: colors.textPrimary }}>
                        {selectedGoal.name}
                      </Text>
                      <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                        {formatCurrency(selectedGoal.savedAmount)}
                        {' '}{t('goals.of')}{' '}
                        <Text style={{ fontFamily: Fonts.bold, color: colors.primary }}>
                          {formatCurrency(selectedGoal.targetAmount)}
                        </Text>
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontFamily: Fonts.regular, fontSize: 13, marginBottom: 8, color: colors.textSecondary }}>
                    {t('goals.contributionLabel')}
                  </Text>
                  <TextInput
                    value={contributionInput}
                    onChangeText={(v) => setContributionInput(formatCurrencyInput(v))}
                    placeholder="$ 0"
                    keyboardType="numeric"
                    autoFocus
                    style={{
                      borderWidth: 1.5,
                      borderColor: contributionInput ? colors.primary : colors.border,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontFamily: Fonts.semiBold,
                      fontSize: 18,
                      color: colors.textPrimary,
                      backgroundColor: colors.backgroundSecondary,
                      width: '100%',
                    }}
                  />
                </View>
              }
              primaryLabel={t('goals.addButton')}
              secondaryLabel={t('goals.cancelButton')}
              onPrimary={handleContribute}
              onSecondary={closeDialog}
              loading={saving}
              primaryDisabled={isContributeDisabled}
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
  goalMeta: { flex: 1 },
  goalName: { fontSize: 14, fontFamily: Fonts.semiBold },
  goalPct: { fontSize: 11, fontFamily: Fonts.medium, marginTop: 2 },
  goalAmounts: { flexDirection: 'row', alignItems: 'baseline' },
  goalSaved: { fontSize: 12, fontFamily: Fonts.bold },
  goalTarget: { fontSize: 11, fontFamily: Fonts.regular },
  completedDate: { fontSize: 11, fontFamily: Fonts.regular, marginTop: 6 },
});
