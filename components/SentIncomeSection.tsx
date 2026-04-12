// components/SentIncomeSection.tsx
import {
  View, Text, StyleSheet, TouchableOpacity, Switch,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { useFriends } from '../hooks/useFriends';
import { getUserProfile } from '../hooks/useUserProfile';
import type { UserProfile } from '../types/friend';

interface Props {
  userId: string;
  isSentIncome: boolean;
  onIsSentIncomeChange: (v: boolean) => void;
  recipient: UserProfile | null;
  onRecipientChange: (p: UserProfile | null) => void;
}

export default function SentIncomeSection({
  userId,
  isSentIncome,
  onIsSentIncomeChange,
  recipient,
  onRecipientChange,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { acceptedFriends } = useFriends(userId);
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);

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

  const toggleRecipient = (profile: UserProfile) => {
    if (recipient?.uid === profile.uid) {
      onRecipientChange(null);
    } else {
      onRecipientChange(profile);
    }
  };

  const successLight = (colors as Record<string, string>).successLight ?? (colors as Record<string, string>).primaryLight;

  return (
    <View style={styles.root}>

      {/* Toggle principal */}
      <View style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.toggleLabel}>
          <Ionicons name="gift-outline" size={20} color={colors.secondary} />
          <Text style={[styles.toggleText, { color: colors.textPrimary }]}>
            {t('sentIncome.toggle')}
          </Text>
        </View>
        <Switch
          value={isSentIncome}
          onValueChange={onIsSentIncomeChange}
          trackColor={{ false: colors.border, true: colors.secondary }}
          thumbColor={colors.onPrimary}
        />
      </View>

      {isSentIncome && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t('sentIncome.forWho').toUpperCase()}
          </Text>

          {friendProfiles.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('sentIncome.noFriends')}
            </Text>
          ) : (
            friendProfiles.map((profile) => {
              const selected = recipient?.uid === profile.uid;
              return (
                <TouchableOpacity
                  key={profile.uid}
                  style={[
                    styles.friendRow,
                    {
                      backgroundColor: selected ? successLight : colors.surface,
                      borderColor: selected ? colors.secondary : colors.border,
                    },
                  ]}
                  onPress={() => toggleRecipient(profile)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.friendDisplay, { color: colors.textPrimary }]}>
                    {profile.displayName}
                  </Text>
                  <Text style={[styles.friendUser, { color: colors.textSecondary }]}>
                    @{profile.userName}
                  </Text>
                  {selected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
                  )}
                </TouchableOpacity>
              );
            })
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
  toggleLabel: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 12 },
  toggleText: { fontSize: 15, fontFamily: Fonts.medium, flex: 1, flexWrap: 'wrap' },
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
});
