// app/expense-groups.tsx
import { useState, useRef, memo } from 'react';
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
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';

import { useExpenseGroups } from '../hooks/useExpenseGroups';
import { ExpenseGroup, ExpenseGroupParticipant } from '../types/expenseGroup';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import AppDialog from '../components/AppDialog';
import { EmojiPicker } from '../components/EmojiPicker';
import AppHeader from '../components/AppHeader';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import { Fonts } from '../config/fonts';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useAuthStore } from '../store/authStore';

type DialogMode = 'create' | 'delete' | null;

// ─── GroupCard ────────────────────────────────────────────────────────────────

const GroupCard = memo(function GroupCard({
  group,
  colors,
  t,
  onPress,
  onLongPress,
}: {
  group: ExpenseGroup;
  colors: any;
  t: any;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const isActive = group.status === 'active';
  const accentColor = isActive ? colors.primary : colors.textTertiary;
  const badgeColor = isActive ? colors.success : colors.textTertiary;
  const badgeBg = isActive ? `${colors.success}1A` : `${colors.textTertiary}18`;
  const count = group.participants.length;
  const participantsLabel =
    count === 1
      ? `1 ${t('expenseGroups.participants')}`
      : `${count} ${t('expenseGroups.participants_plural')}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />
      <View style={styles.cardInner}>
        <View style={styles.cardTop}>
          <View style={[styles.emojiWrap, { backgroundColor: `${accentColor}18` }]}>
            <Text style={styles.emoji}>{group.emoji}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {group.title}
            </Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
              {participantsLabel}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.badge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>
                {isActive ? t('expenseGroups.statusActive') : t('expenseGroups.statusSettled')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginLeft: 6 }} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExpenseGroupsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const transitionRef = useRef<ScreenTransitionRef>(null);

  const { groups, loading, createGroup, deleteGroup } = useExpenseGroups(user?.uid ?? '');

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedGroup, setSelectedGroup] = useState<ExpenseGroup | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [nameInput, setNameInput] = useState('');
  const [emojiInput, setEmojiInput] = useState('👥');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [participants, setParticipants] = useState<string[]>(['']); // extra participant names
  const [participantInputError, setParticipantInputError] = useState(false);

  const resetForms = () => {
    setNameInput('');
    setEmojiInput('👥');
    setShowEmojiPicker(false);
    setParticipants(['']);
    setParticipantInputError(false);
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedGroup(null);
    resetForms();
  };

  const openCreate = () => setDialogMode('create');

  const openDelete = (group: ExpenseGroup) => {
    setSelectedGroup(group);
    setDialogMode('delete');
  };

  const addParticipantField = () => setParticipants((prev) => [...prev, '']);

  const updateParticipant = (idx: number, value: string) => {
    setParticipants((prev) => prev.map((p, i) => (i === idx ? value : p)));
    setParticipantInputError(false);
  };

  const removeParticipant = (idx: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreate = async () => {
    const filledExtras = participants.filter((p) => p.trim().length > 0);
    if (filledExtras.length === 0) {
      setParticipantInputError(true);
      return;
    }

    const builtParticipants: ExpenseGroupParticipant[] = [
      { id: user!.uid, name: t('expenseGroups.createGroup.youLabel'), uid: user!.uid },
      ...filledExtras.map((name) => ({ id: randomUUID(), name: name.trim() })),
    ];

    setSaving(true);
    try {
      await createGroup(nameInput.trim(), emojiInput, builtParticipants);
      showToast(t('expenseGroups.toasts.created'), 'success');
      closeDialog();
    } catch {
      showToast(t('expenseGroups.toasts.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;
    setSaving(true);
    try {
      await deleteGroup(selectedGroup.id);
      showToast(t('expenseGroups.toasts.deleted'), 'success');
      closeDialog();
    } catch {
      showToast(t('expenseGroups.toasts.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const filledExtras = participants.filter((p) => p.trim().length > 0);
  const isCreateDisabled = !nameInput.trim() || filledExtras.length === 0;

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader showBack onBack={() => transitionRef.current?.animateOut(() => router.back())} />
          <PageTitle title={t('expenseGroups.title')} description={t('expenseGroups.pageDesc')} />

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {/* Nuevo grupo button */}
              <TouchableOpacity
                onPress={openCreate}
                activeOpacity={0.8}
                style={[styles.newBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="add" size={18} color={colors.onPrimary} />
                <Text style={[styles.newBtnText, { color: colors.onPrimary }]}>
                  {t('expenseGroups.newGroup')}
                </Text>
              </TouchableOpacity>

              {/* Empty state */}
              {groups.length === 0 && (
                <LinearGradient
                  colors={[`${colors.primary}18`, `${colors.primary}06`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.emptyCard, { borderColor: `${colors.primary}25`, borderWidth: 1 }]}
                >
                  <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                    <Ionicons name="people-outline" size={36} color={colors.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    {t('expenseGroups.emptyTitle')}
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    {t('expenseGroups.emptySub')}
                  </Text>
                </LinearGradient>
              )}

              {/* Lista de grupos */}
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  colors={colors}
                  t={t}
                  onPress={() => router.push(`/expense-group-detail?id=${group.id}`)}
                  onLongPress={() => openDelete(group)}
                />
              ))}

              <View style={{ height: 100 }} />
            </ScrollView>
          )}

          {/* Dialog: Crear grupo */}
          {dialogMode === 'create' && (
            <AppDialog
              visible
              type="info"
              title={t('expenseGroups.createGroup.title')}
              description={
                <View style={{ alignSelf: 'stretch', gap: 14 }}>
                  {/* Emoji */}
                  <View>
                    <Text style={[dialogStyles.label, { color: colors.textSecondary }]}>
                      {t('expenseGroups.createGroup.emojiLabel')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowEmojiPicker((v) => !v)}
                      activeOpacity={0.8}
                      style={[dialogStyles.emojiBtn, {
                        borderColor: colors.primary,
                        backgroundColor: colors.backgroundSecondary,
                      }]}
                    >
                      <Text style={{ fontSize: 28 }}>{emojiInput}</Text>
                    </TouchableOpacity>
                    {showEmojiPicker && (
                      <View style={[dialogStyles.emojiPickerWrap, {
                        borderColor: colors.border,
                        backgroundColor: colors.backgroundSecondary,
                      }]}>
                        <EmojiPicker
                          selected={emojiInput}
                          onSelect={(e) => { setEmojiInput(e); setShowEmojiPicker(false); }}
                        />
                      </View>
                    )}
                  </View>

                  {/* Nombre */}
                  <View>
                    <Text style={[dialogStyles.label, { color: colors.textSecondary }]}>
                      {t('expenseGroups.createGroup.namePlaceholder')}
                    </Text>
                    <TextInput
                      value={nameInput}
                      onChangeText={setNameInput}
                      placeholder={t('expenseGroups.createGroup.namePlaceholder')}
                      placeholderTextColor={colors.textTertiary}
                      maxLength={40}
                      style={[dialogStyles.input, {
                        borderColor: nameInput ? colors.primary : colors.border,
                        color: colors.textPrimary,
                        backgroundColor: colors.backgroundSecondary,
                        fontFamily: Fonts.regular,
                      }]}
                    />
                  </View>

                  {/* Participantes */}
                  <View>
                    <Text style={[dialogStyles.label, { color: colors.textSecondary }]}>
                      {t('expenseGroups.createGroup.participantsLabel')}
                    </Text>

                    {/* "Tú" — siempre primero, no editable */}
                    <View style={[dialogStyles.participantRow, {
                      borderColor: colors.border,
                      backgroundColor: `${colors.primary}10`,
                    }]}>
                      <Ionicons name="person-circle-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={[dialogStyles.participantFixed, { color: colors.primary, fontFamily: Fonts.semiBold }]}>
                        {t('expenseGroups.createGroup.youLabel')}
                      </Text>
                    </View>

                    {participants.map((p, idx) => (
                      <View key={idx} style={dialogStyles.participantInputRow}>
                        <TextInput
                          value={p}
                          onChangeText={(v) => updateParticipant(idx, v)}
                          placeholder={t('expenseGroups.createGroup.participantPlaceholder')}
                          placeholderTextColor={colors.textTertiary}
                          maxLength={30}
                          style={[dialogStyles.participantInput, {
                            borderColor: p.trim() ? colors.primary : (participantInputError && idx === 0 ? colors.error : colors.border),
                            color: colors.textPrimary,
                            backgroundColor: colors.backgroundSecondary,
                            fontFamily: Fonts.regular,
                          }]}
                        />
                        {participants.length > 1 && (
                          <TouchableOpacity
                            onPress={() => removeParticipant(idx)}
                            activeOpacity={0.7}
                            style={[dialogStyles.removeBtn, { backgroundColor: `${colors.error}15` }]}
                          >
                            <Ionicons name="close" size={14} color={colors.error} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}

                    {participantInputError && (
                      <Text style={[dialogStyles.errorText, { color: colors.error, fontFamily: Fonts.regular }]}>
                        {t('expenseGroups.createGroup.minParticipants')}
                      </Text>
                    )}

                    <TouchableOpacity
                      onPress={addParticipantField}
                      activeOpacity={0.75}
                      style={[dialogStyles.addParticipantBtn, {
                        borderColor: colors.primary,
                        backgroundColor: `${colors.primary}08`,
                      }]}
                    >
                      <Ionicons name="add" size={15} color={colors.primary} />
                      <Text style={[dialogStyles.addParticipantText, { color: colors.primary, fontFamily: Fonts.medium }]}>
                        {t('expenseGroups.createGroup.addParticipant')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              }
              primaryLabel={t('expenseGroups.createGroup.create')}
              secondaryLabel={t('goals.cancelButton')}
              onPrimary={handleCreate}
              onSecondary={closeDialog}
              loading={saving}
              primaryDisabled={isCreateDisabled}
            />
          )}

          {/* Dialog: Eliminar grupo */}
          {dialogMode === 'delete' && selectedGroup && (
            <AppDialog
              visible
              type="error"
              title={t('expenseGroups.deleteGroup')}
              description={
                <View style={{ alignSelf: 'stretch', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontFamily: Fonts.bold, fontSize: 15, color: colors.textPrimary, textAlign: 'center' }}>
                    {selectedGroup.title}
                  </Text>
                  <Text style={{
                    fontFamily: Fonts.regular,
                    fontSize: 14,
                    lineHeight: 20,
                    color: colors.textSecondary,
                    textAlign: 'center',
                  }}>
                    {t('expenseGroups.deleteGroupConfirm')}
                  </Text>
                </View>
              }
              primaryLabel={t('expenseGroups.deleteGroup')}
              secondaryLabel={t('goals.cancelButton')}
              onPrimary={handleDelete}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingTop: 8, paddingBottom: 40, width: '100%', maxWidth: 768, alignSelf: 'center' },
  // New group button
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  newBtnText: { fontFamily: Fonts.semiBold, fontSize: 15 },
  // Empty state
  emptyCard: { borderRadius: 20, padding: 36, alignItems: 'center', marginBottom: 16 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontFamily: Fonts.bold, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 21 },
  // Group card
  card: {
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardAccent: { width: 4 },
  cardInner: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emojiWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22 },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 14, fontFamily: Fonts.semiBold },
  cardSub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontFamily: Fonts.semiBold },
  cardRight: { flexDirection: 'row' as const, alignItems: 'center' as const },
});

const dialogStyles = StyleSheet.create({
  label: { fontSize: 13, marginBottom: 6 },
  emojiBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  emojiPickerWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 6,
  },
  participantFixed: { fontSize: 14 },
  participantInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  participantInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: { fontSize: 12, marginBottom: 6, marginTop: -2 },
  addParticipantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 2,
  },
  addParticipantText: { fontSize: 13 },
});
