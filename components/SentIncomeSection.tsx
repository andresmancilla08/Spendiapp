// components/SentIncomeSection.tsx
import {
  View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator,
} from 'react-native';
import AppIcon from './AppIcon';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { useFriendProfiles } from '../hooks/useFriendProfiles';
import type { PublicProfile } from '../types/friend';

interface Props {
  userId: string;
  isSentIncome: boolean;
  onIsSentIncomeChange: (v: boolean) => void;
  recipient: PublicProfile | null;
  onRecipientChange: (p: PublicProfile | null) => void;
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
  const { profiles: friendProfiles, loading: isLoading } = useFriendProfiles(userId);

  const toggleRecipient = (profile: PublicProfile) => {
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
          <AppIcon name="gift-outline" size={20} color={colors.secondary} />
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

          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
          ) : friendProfiles.length === 0 ? (
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
                    <AppIcon name="checkmark-circle" size={20} color={colors.secondary} />
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
  loader: { paddingVertical: 16 },
  emptyText: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', paddingVertical: 8 },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 6,
  },
  friendDisplay: { fontSize: 14, fontFamily: Fonts.medium, flex: 1 },
  friendUser: { fontSize: 12, fontFamily: Fonts.regular },
});
