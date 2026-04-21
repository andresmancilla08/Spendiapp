import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Switch,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { useFriends } from '../hooks/useFriends';
import { getUserProfile } from '../hooks/useUserProfile';
import type { UserProfile } from '../types/friend';
import type { SharedParticipant } from '../types/sharedTransaction';
import { calcEqualPercentages, calcSharedAmount } from '../utils/sharedCalc';

interface Props {
  userId: string;
  userName: string;
  displayName: string;
  isShared: boolean;
  onIsSharedChange: (v: boolean) => void;
  participants: SharedParticipant[];
  onParticipantsChange: (p: SharedParticipant[]) => void;
  amount: number;
  interestRate: number;
  installmentCount: number;
  ownerPercentage: number;
  onOwnerPercentageChange: (p: number) => void;
  onExpand?: () => void;
}

type SplitType = 'equal' | 'custom';
type AddMode  = 'friends' | 'external';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SharedExpenseSection({
  userId, userName, displayName,
  isShared, onIsSharedChange,
  participants, onParticipantsChange,
  amount, interestRate, installmentCount,
  ownerPercentage, onOwnerPercentageChange, onExpand,
}: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { acceptedFriends } = useFriends(userId);
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [splitType, setSplitType]   = useState<SplitType>('equal');
  const [addMode, setAddMode]       = useState<AddMode>('friends');
  const [extName, setExtName]       = useState('');
  const [extEmail, setExtEmail]     = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (acceptedFriends.length === 0) return;
    async function load() {
      const profiles: UserProfile[] = [];
      for (const f of acceptedFriends) {
        const friendUid = f.fromId === userId ? f.toId : f.fromId;
        const profile = await getUserProfile(friendUid);
        if (profile) profiles.push(profile);
      }
      setFriendProfiles(profiles);
    }
    load();
  }, [acceptedFriends, userId]);

  useEffect(() => {
    if (splitType !== 'equal') return;
    const total = participants.length + 1;
    const percs = calcEqualPercentages(total);
    onOwnerPercentageChange(percs[0]);
    onParticipantsChange(
      participants.map((p, i) => ({ ...p, percentage: percs[i + 1] })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants.length, splitType]);

  const toggleFriend = (profile: UserProfile) => {
    const exists = participants.find((p) => p.uid === profile.uid);
    if (exists) {
      onParticipantsChange(participants.filter((p) => p.uid !== profile.uid));
    } else {
      onParticipantsChange([
        ...participants,
        { uid: profile.uid, userName: profile.userName, displayName: profile.displayName, percentage: 0 },
      ]);
    }
  };

  const addExternal = () => {
    setEmailError('');
    if (!extName.trim()) return;
    const email = extEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { setEmailError(t('sharedExpense.invalidEmail')); return; }
    if (participants.find((p) => p.uid === email)) { setEmailError(t('sharedExpense.emailAlreadyAdded')); return; }
    onParticipantsChange([
      ...participants,
      { uid: email, userName: '', displayName: extName.trim(), percentage: 0, isExternal: true, email },
    ]);
    setExtName('');
    setExtEmail('');
  };

  const removeParticipant = (uid: string) =>
    onParticipantsChange(participants.filter((p) => p.uid !== uid));

  const allParticipants: SharedParticipant[] = [
    { uid: userId, userName, displayName, percentage: ownerPercentage },
    ...participants,
  ];
  const totalPct  = Math.round(ownerPercentage + participants.reduce((s, p) => s + p.percentage, 0));
  const isPctValid = totalPct === 100;

  return (
    <View style={styles.root}>

      {/* Toggle principal */}
      <View style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.toggleLabel}>
          <Ionicons name="people-outline" size={20} color={colors.primary} />
          <Text style={[styles.toggleText, { color: colors.textPrimary }]}>
            {t('sharedExpense.toggle')}
          </Text>
        </View>
        <Switch
          value={isShared}
          onValueChange={onIsSharedChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.onPrimary}
        />
      </View>

      {isShared && (
        <>
          {/* Chips de participantes ya seleccionados */}
          {participants.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('sharedExpense.selectedWith').toUpperCase()}
              </Text>
              <View style={styles.chipsRow}>
                {participants.map((p) => (
                  <View
                    key={p.uid}
                    style={[styles.chip, {
                      backgroundColor: p.isExternal
                        ? (isDark ? 'rgba(255,167,38,0.15)' : '#FFF3E0')
                        : colors.primaryLight,
                      borderColor: p.isExternal ? '#FFA726' : colors.primary,
                    }]}
                  >
                    <Ionicons
                      name={p.isExternal ? 'mail-outline' : 'person-outline'}
                      size={12}
                      color={p.isExternal ? '#FFA726' : colors.primary}
                    />
                    <Text style={[styles.chipText, { color: p.isExternal ? '#FFA726' : colors.primary }]}>
                      {p.isExternal ? p.displayName : `@${p.userName}`}
                    </Text>
                    {p.isExternal && (
                      <Text style={[styles.externalBadge, { color: '#FFA726' }]}>
                        {t('sharedExpense.externalBadge')}
                      </Text>
                    )}
                    <TouchableOpacity onPress={() => removeParticipant(p.uid)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={16} color={p.isExternal ? '#FFA726' : colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Tab: Amigos en la app | Persona externa */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t('sharedExpense.withWho').toUpperCase()}
          </Text>
          <View style={[styles.tabRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            {(['friends', 'external'] as AddMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.tab,
                  addMode === mode && { backgroundColor: colors.primary },
                ]}
                onPress={() => { setAddMode(mode); setEmailError(''); onExpand?.(); }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={mode === 'friends' ? 'people-outline' : 'mail-outline'}
                  size={14}
                  color={addMode === mode ? colors.onPrimary : colors.textSecondary}
                />
                <Text style={[styles.tabText, { color: addMode === mode ? colors.onPrimary : colors.textSecondary }]}>
                  {t(mode === 'friends' ? 'sharedExpense.appFriendsTab' : 'sharedExpense.externalTab')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Contenido del tab activo */}
          {addMode === 'friends' ? (
            friendProfiles.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('sharedExpense.noFriends')}
              </Text>
            ) : (
              friendProfiles.map((profile) => {
                const selected = !!participants.find((p) => p.uid === profile.uid);
                return (
                  <TouchableOpacity
                    key={profile.uid}
                    style={[
                      styles.friendRow,
                      {
                        backgroundColor: selected ? colors.primaryLight : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => toggleFriend(profile)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={selected ? colors.primary : colors.border}
                    />
                    <Text style={[styles.friendDisplay, { color: colors.textPrimary }]}>
                      {profile.displayName}
                    </Text>
                    <Text style={[styles.friendUser, { color: colors.textSecondary }]}>
                      @{profile.userName}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )
          ) : (
            <View style={[styles.externalForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={extName}
                onChangeText={setExtName}
                placeholder={t('sharedExpense.externalNamePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                style={[styles.externalInput, { color: colors.textPrimary, borderColor: colors.border }]}
              />
              <TextInput
                value={extEmail}
                onChangeText={(v) => { setExtEmail(v); setEmailError(''); }}
                placeholder={t('sharedExpense.externalEmailPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.externalInput,
                  { color: colors.textPrimary, borderColor: emailError ? colors.error : colors.border },
                ]}
              />
              {!!emailError && (
                <Text style={[styles.emailError, { color: colors.error }]}>{emailError}</Text>
              )}
              <TouchableOpacity
                style={[styles.addExternalBtn, { backgroundColor: colors.primary }]}
                onPress={addExternal}
                activeOpacity={0.85}
              >
                <Ionicons name="person-add-outline" size={16} color={colors.onPrimary} />
                <Text style={[styles.addExternalBtnText, { color: colors.onPrimary }]}>
                  {t('sharedExpense.addExternalBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Split type + porcentajes + preview (solo cuando hay al menos un participante) */}
          {participants.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('sharedExpense.splitType').toUpperCase()}
              </Text>
              <View style={styles.splitRow}>
                {(['equal', 'custom'] as SplitType[]).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.splitBtn,
                      {
                        backgroundColor: splitType === s ? colors.primary : colors.surface,
                        borderColor: splitType === s ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSplitType(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.splitBtnText,
                      { color: splitType === s ? colors.onPrimary : colors.textSecondary },
                    ]}>
                      {t(s === 'equal' ? 'sharedExpense.equalParts' : 'sharedExpense.customParts')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {splitType === 'custom' && (
                <View style={styles.pctContainer}>
                  {allParticipants.map((p) => {
                    const isOwnerRow = p.uid === userId;
                    return (
                      <View key={p.uid} style={styles.pctRow}>
                        <Text style={[styles.pctName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {isOwnerRow ? t('sharedExpense.you') : (p.isExternal ? p.displayName : `@${p.userName}`)}
                        </Text>
                        <View style={[styles.pctInput, { borderColor: !isPctValid ? colors.error : colors.border }]}>
                          <TextInput
                            value={isOwnerRow ? String(ownerPercentage) : String(p.percentage)}
                            onChangeText={(v) => {
                              const num = Math.min(100, parseInt(v.replace(/\D/g, ''), 10) || 0);
                              const remaining = 100 - num;
                              const otherCount = allParticipants.length - 1;
                              const base  = Math.floor(remaining / otherCount);
                              const extra = remaining - base * otherCount;
                              if (isOwnerRow) {
                                onOwnerPercentageChange(num);
                                onParticipantsChange(
                                  participants.map((pp, i) => ({ ...pp, percentage: base + (i === 0 ? extra : 0) })),
                                );
                              } else {
                                onOwnerPercentageChange(base + extra);
                                onParticipantsChange(
                                  participants.map((pp) =>
                                    pp.uid === p.uid ? { ...pp, percentage: num } : { ...pp, percentage: base },
                                  ),
                                );
                              }
                            }}
                            keyboardType="number-pad"
                            maxLength={3}
                            style={[styles.pctTextInput, { color: colors.textPrimary }]}
                          />
                          <Text style={[styles.pctSymbol, { color: colors.textSecondary }]}>%</Text>
                        </View>
                      </View>
                    );
                  })}
                  {!isPctValid && (
                    <Text style={[styles.pctError, { color: colors.error }]}>
                      {t('sharedExpense.percentageError', { total: totalPct })}
                    </Text>
                  )}
                </View>
              )}

              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('sharedExpense.preview').toUpperCase()}
              </Text>
              <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {allParticipants.map((p) => {
                  const isOwnerRow = p.uid === userId;
                  const monthly = calcSharedAmount(amount, interestRate, installmentCount, p.percentage);
                  const formatted = monthly.toLocaleString('es-CO');
                  return (
                    <View key={p.uid} style={styles.previewRow}>
                      <View style={styles.previewNameRow}>
                        {p.isExternal && (
                          <Ionicons name="mail-outline" size={13} color={colors.textTertiary} style={{ marginRight: 4 }} />
                        )}
                        <Text style={[styles.previewName, { color: colors.textPrimary }]}>
                          {isOwnerRow ? t('sharedExpense.you') : (p.isExternal ? p.displayName : `@${p.userName}`)}
                        </Text>
                      </View>
                      <Text style={[styles.previewAmt, { color: colors.primary }]}>
                        {installmentCount > 1
                          ? t('sharedExpense.previewInstallment', { amount: `$${formatted}`, n: installmentCount })
                          : `$${formatted}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 12 },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 14,
  },
  toggleLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleText: { fontSize: 15, fontFamily: Fonts.medium },

  sectionLabel: {
    fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 0.6,
    marginTop: 16, marginBottom: 8,
  },

  // Chips de seleccionados
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 50, borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: Fonts.medium },
  externalBadge: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.3 },

  // Tabs
  tabRow: {
    flexDirection: 'row', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
    padding: 3, gap: 3, marginBottom: 10,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 10,
  },
  tabText: { fontSize: 13, fontFamily: Fonts.medium },

  // Amigos
  emptyText: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', paddingVertical: 8 },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 6,
  },
  friendDisplay: { fontSize: 14, fontFamily: Fonts.medium, flex: 1 },
  friendUser: { fontSize: 12, fontFamily: Fonts.regular },

  // Formulario externo
  externalForm: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    padding: 14, gap: 10,
  },
  externalInput: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, fontFamily: Fonts.regular,
  },
  emailError: { fontSize: 12, fontFamily: Fonts.regular },
  addExternalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 10,
  },
  addExternalBtnText: { fontSize: 14, fontFamily: Fonts.semiBold },

  // Split
  splitRow: { flexDirection: 'row', gap: 10 },
  splitBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth, alignItems: 'center',
  },
  splitBtnText: { fontSize: 13, fontFamily: Fonts.medium },

  // Porcentajes
  pctContainer: { marginTop: 10, gap: 10 },
  pctRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pctName: { fontSize: 14, fontFamily: Fonts.regular, flex: 1, marginRight: 8 },
  pctInput: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, minWidth: 72,
  },
  pctTextInput: { fontSize: 15, fontFamily: Fonts.bold, textAlign: 'center', minWidth: 36 },
  pctSymbol: { fontSize: 15, fontFamily: Fonts.regular },
  pctError: { fontSize: 12, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 2 },

  // Preview
  previewCard: {
    borderRadius: 14, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  previewName: { fontSize: 14, fontFamily: Fonts.regular },
  previewAmt: { fontSize: 14, fontFamily: Fonts.bold },
});
