// components/SharedExpenseSection.tsx
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
  userName: string;        // userName del usuario actual (owner)
  displayName: string;     // displayName del usuario actual
  isShared: boolean;
  onIsSharedChange: (v: boolean) => void;
  participants: SharedParticipant[];       // solo participantes no-owner seleccionados
  onParticipantsChange: (p: SharedParticipant[]) => void;
  amount: number;
  interestRate: number;
  installmentCount: number;
  ownerPercentage: number;
  onOwnerPercentageChange: (p: number) => void;
}

type SplitType = 'equal' | 'custom';

export default function SharedExpenseSection({
  userId, userName, displayName,
  isShared, onIsSharedChange,
  participants, onParticipantsChange,
  amount, interestRate, installmentCount,
  ownerPercentage, onOwnerPercentageChange,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { acceptedFriends } = useFriends(userId);
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});

  // Cargar perfiles de amigos aceptados al montar
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

  // Recalcular porcentajes iguales cuando cambian los participantes o el tipo de split
  useEffect(() => {
    if (splitType !== 'equal') return;
    const total = participants.length + 1; // +1 por el owner
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

  const allParticipants: SharedParticipant[] = [
    { uid: userId, userName, displayName, percentage: ownerPercentage },
    ...participants,
  ];
  const totalPct = Math.round(ownerPercentage + participants.reduce((s, p) => s + p.percentage, 0));
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
          {/* Lista de amigos */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t('sharedExpense.withWho').toUpperCase()}
          </Text>

          {friendProfiles.length === 0 ? (
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
                  <Text style={[styles.friendDisplay, { color: colors.textPrimary }]}>
                    {profile.displayName}
                  </Text>
                  <Text style={[styles.friendUser, { color: colors.textSecondary }]}>
                    @{profile.userName}
                  </Text>
                  {selected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })
          )}

          {participants.length > 0 && (
            <>
              {/* Tipo de split */}
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

              {/* Porcentajes personalizados */}
              {splitType === 'custom' && (
                <View style={styles.pctContainer}>
                  {allParticipants.map((p) => {
                    const isOwnerRow = p.uid === userId;
                    const inputVal = isOwnerRow
                      ? String(ownerPercentage)
                      : (customInputs[p.uid] ?? String(p.percentage));

                    return (
                      <View key={p.uid} style={styles.pctRow}>
                        <Text style={[styles.pctName, { color: colors.textPrimary }]}>
                          {isOwnerRow ? t('sharedExpense.you') : `@${p.userName}`}
                        </Text>
                        <View style={[styles.pctInput, { borderColor: !isPctValid ? colors.error : colors.border }]}>
                          <TextInput
                            value={inputVal}
                            onChangeText={(v) => {
                              const num = Math.min(100, parseInt(v.replace(/\D/g, ''), 10) || 0);
                              if (isOwnerRow) {
                                onOwnerPercentageChange(num);
                              } else {
                                setCustomInputs((prev) => ({ ...prev, [p.uid]: v }));
                                onParticipantsChange(
                                  participants.map((pp) =>
                                    pp.uid === p.uid ? { ...pp, percentage: num } : pp,
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

              {/* Preview */}
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
                      <Text style={[styles.previewName, { color: colors.textPrimary }]}>
                        {isOwnerRow ? t('sharedExpense.you') : `@${p.userName}`}
                      </Text>
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
  emptyText: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', paddingVertical: 8 },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 6,
  },
  friendDisplay: { fontSize: 14, fontFamily: Fonts.medium, flex: 1 },
  friendUser: { fontSize: 12, fontFamily: Fonts.regular },
  splitRow: { flexDirection: 'row', gap: 10 },
  splitBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth, alignItems: 'center',
  },
  splitBtnText: { fontSize: 13, fontFamily: Fonts.medium },
  pctContainer: { marginTop: 10, gap: 10 },
  pctRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pctName: { fontSize: 14, fontFamily: Fonts.regular, flex: 1 },
  pctInput: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, minWidth: 72,
  },
  pctTextInput: { fontSize: 15, fontFamily: Fonts.bold, textAlign: 'center', minWidth: 36 },
  pctSymbol: { fontSize: 15, fontFamily: Fonts.regular },
  pctError: { fontSize: 12, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 2 },
  previewCard: {
    borderRadius: 14, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewName: { fontSize: 14, fontFamily: Fonts.regular },
  previewAmt: { fontSize: 14, fontFamily: Fonts.bold },
});
