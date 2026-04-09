// components/SharedExpenseChip.tsx
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { useTranslation } from 'react-i18next';
import type { SharedParticipant } from '../types/sharedTransaction';

interface Props {
  isOwner: boolean;
  ownerUserName?: string;
  participants?: SharedParticipant[];
  currentUid: string;
}

export default function SharedExpenseChip({ isOwner, ownerUserName, participants = [], currentUid }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  let label: string;
  if (isOwner) {
    const others = participants.filter((p) => p.uid !== currentUid);
    if (others.length === 0) {
      label = t('sharedExpense.chip.sharedWith', { name: '—' });
    } else if (others.length <= 2) {
      const names = others.map((o) => `@${o.userName}`).join(` ${t('common.and')} `);
      label = t('sharedExpense.chip.sharedWith', { name: names });
    } else {
      label = t('sharedExpense.chip.sharedWithMore', {
        name: `@${others[0].userName}`,
        count: others.length - 1,
      });
    }
  } else {
    label = t('sharedExpense.chip.sharedBy', { name: `@${ownerUserName ?? ''}` });
  }

  return (
    <View style={[styles.chip, { backgroundColor: colors.primaryLight }]}>
      <Text style={[styles.text, { color: colors.primary }]}>
        {`👥 ${label}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  text: { fontSize: 11, fontFamily: Fonts.regular },
});
