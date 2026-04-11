// components/SharedExpenseChip.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { useTranslation } from 'react-i18next';
import type { SharedParticipant } from '../types/sharedTransaction';

interface Props {
  isOwner: boolean;
  ownerDisplayName?: string;
  ownerUserName?: string;
  participants?: SharedParticipant[];
  currentUid: string;
}

export default function SharedExpenseChip({
  isOwner,
  ownerDisplayName,
  ownerUserName,
  participants = [],
  currentUid,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  let label: string;
  if (isOwner) {
    const others = participants.filter((p) => p.uid !== currentUid);
    if (others.length === 0) {
      label = t('sharedExpense.chip.sharedWith', { name: '—' });
    } else if (others.length <= 2) {
      const names = others
        .map((o) => o.displayName || o.userName)
        .join(` ${t('common.and')} `);
      label = t('sharedExpense.chip.sharedWith', { name: names });
    } else {
      label = t('sharedExpense.chip.sharedWithMore', {
        name: others[0].displayName || others[0].userName,
        count: others.length - 1,
      });
    }
  } else {
    const name = ownerDisplayName || ownerUserName || '';
    label = t('sharedExpense.chip.sharedBy', { name });
  }

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: colors.primaryLight,
          borderWidth: 1,
          borderColor: `${colors.primary}28`,
        },
      ]}
    >
      <Ionicons name="people-outline" size={13} color={colors.primary} />
      <Text style={[styles.text, { color: colors.primary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 2,
  },
  text: { fontSize: 12, fontFamily: Fonts.semiBold },
});
