// components/SharedExpenseChip.tsx
import { View, Text, StyleSheet } from 'react-native';
import AppIcon from './AppIcon';
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
  /** `income_claim` = "te debe / le debes"; por defecto gasto compartido. */
  sharedType?: 'expense_share' | 'income_claim';
  /** `compact` iguala el tamaño de los chips de la lista de historial. */
  compact?: boolean;
}

export default function SharedExpenseChip({
  isOwner,
  ownerDisplayName,
  ownerUserName,
  participants = [],
  currentUid,
  sharedType = 'expense_share',
  compact = false,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isClaim = sharedType === 'income_claim';

  const nameOf = (p: SharedParticipant) => p.displayName || p.userName || '…';

  let label: string;
  if (isOwner) {
    const others = participants.filter((p) => p.uid !== currentUid);
    if (others.length === 0) {
      label = t(isClaim ? 'sharedExpense.chip.owesYou' : 'sharedExpense.chip.sharedWith', { name: '—' });
    } else if (others.length <= 2) {
      const names = others.map(nameOf).join(` ${t('common.and')} `);
      label = t(isClaim ? 'sharedExpense.chip.owesYou' : 'sharedExpense.chip.sharedWith', { name: names });
    } else {
      label = t(isClaim ? 'sharedExpense.chip.owesYouMore' : 'sharedExpense.chip.sharedWithMore', {
        name: nameOf(others[0]),
        count: others.length - 1,
      });
    }
  } else {
    const owner = participants.find((p) => p.uid !== currentUid && p.displayName);
    const name = ownerDisplayName || ownerUserName || (owner ? nameOf(owner) : '…');
    label = t(isClaim ? 'sharedExpense.chip.youOwe' : 'sharedExpense.chip.sharedBy', { name });
  }

  return (
    <View
      style={[
        styles.chip,
        compact && styles.chipCompact,
        {
          backgroundColor: colors.primaryLight,
          borderWidth: compact ? StyleSheet.hairlineWidth : 1,
          borderColor: `${colors.primary}28`,
        },
      ]}
    >
      <AppIcon name="people-outline" size={compact ? 11 : 13} color={colors.primary} />
      <Text
        style={[styles.text, compact && styles.textCompact, { color: colors.primary }]}
        numberOfLines={1}
      >
        {label}
      </Text>
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
  // Mismas medidas que los chips de ingreso enviado/recibido del historial.
  chipCompact: {
    alignSelf: 'flex-end',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 0,
    maxWidth: 150,
    flexShrink: 1,
  },
  text: { fontSize: 12, fontFamily: Fonts.semiBold },
  textCompact: { fontSize: 11, flexShrink: 1 },
});
