// components/TxRelation.tsx
// Relación social de una transacción (gasto compartido, cobro, o ingreso enviado/recibido).
// Un solo sitio resuelve texto + tono + iniciales, y expone las dos piezas visuales que
// consumen el card del home y del historial:
//   · TxRelationNotch — inicial del amigo enganchada al ícono de categoría (identifica de un vistazo)
//   · TxRelationTier  — pie del card, indentado bajo el título de SU fila (pertenencia inequívoca)
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppIcon from './AppIcon';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import type { Transaction } from '../types/transaction';
import { initialsOf, readableOn, contrastRatio, splitByPerson } from '../utils/txRelation';

export interface TxRelation {
  label: string;
  icon: 'people-outline' | 'gift-outline' | 'send-outline';
  tone: 'primary' | 'secondary';
  /** 1-2 iniciales del amigo, con sufijo `+n` cuando hay más participantes. */
  initials: string;
  /** El nombre tal cual se interpoló en `label`, para poder resaltarlo. */
  person: string;
}

/** Devuelve la relación de la transacción, o `null` si es un movimiento propio y normal. */
export function useTxRelation(item: Transaction): TxRelation | null {
  const { t } = useTranslation();

  // Ingreso que un amigo te envió
  if (item.isSentIncome && item.sentByName) {
    return {
      label: t('sentIncome.chip.sentBy', { name: item.sentByName }),
      icon: 'gift-outline',
      tone: 'secondary',
      initials: initialsOf(item.sentByName),
      person: item.sentByName,
    };
  }

  // Gasto tuyo que salió como ingreso para un amigo
  if (item.sentIncomeTransactionId && item.sentIncomeToName) {
    return {
      label: t('sentIncome.chip.sentTo', { name: item.sentIncomeToName }),
      icon: 'send-outline',
      tone: 'primary',
      initials: initialsOf(item.sentIncomeToName),
      person: item.sentIncomeToName,
    };
  }

  if (!item.isShared) return null;

  // Gasto compartido / cobro entre amigos
  const isClaim = item.sharedType === 'income_claim';
  const participants = item.sharedParticipants ?? [];
  const nameOf = (p: { displayName?: string; userName?: string }) => p.displayName || p.userName || '…';
  const isOwner = item.sharedOwnerUid === item.userId;

  if (isOwner) {
    const others = participants.filter((p) => p.uid !== item.userId);
    // Docs legacy sin participantes: mejor sin franja que "Compartido con —".
    if (others.length === 0) return null;
    const extra = others.length > 1 ? `+${others.length - 1}` : '';
    const person = others.length <= 2
      ? others.map(nameOf).join(` ${t('common.and')} `)
      : nameOf(others[0]);
    const label = others.length <= 2
      ? t(isClaim ? 'sharedExpense.chip.owesYou' : 'sharedExpense.chip.sharedWith', { name: person })
      : t(isClaim ? 'sharedExpense.chip.owesYouMore' : 'sharedExpense.chip.sharedWithMore', {
          name: person,
          count: others.length - 1,
        });
    return {
      label,
      icon: 'people-outline',
      tone: 'primary',
      initials: initialsOf(nameOf(others[0])) + extra,
      person,
    };
  }

  // El dueño del compartido puede faltar en `sharedParticipants` de docs viejos → fallbacks.
  const owner = participants.find((p) => p.uid === item.sharedOwnerUid)
    ?? participants.find((p) => p.uid !== item.userId && p.displayName);
  const name = (owner ? nameOf(owner) : '') || item.sharedOwnerUserName || '…';
  return {
    label: t(isClaim ? 'sharedExpense.chip.youOwe' : 'sharedExpense.chip.sharedBy', { name }),
    icon: 'people-outline',
    tone: 'primary',
    initials: initialsOf(name),
    person: name,
  };
}

// ── Piezas visuales ──────────────────────────────────────────────────────────

/**
 * Inicial del amigo enganchada al ícono de categoría. Relleno sólido del tono con borde del
 * color de la superficie: se lee como avatar recortado sobre el ícono, no como badge de
 * notificación. El padre debe ser `position: relative`.
 */
export function TxRelationNotch({ relation }: { relation: TxRelation }) {
  const { colors } = useTheme();
  const tint = relation.tone === 'primary' ? colors.primary : colors.secondary;
  const deep = relation.tone === 'primary' ? colors.primaryDark : colors.secondaryDark;
  // Hay tonos medios (p.ej. deepWater light secondary) donde ni el texto claro ni el oscuro
  // llegan a 4.5:1 sobre el tono: en ese caso el relleno pasa al tono oscuro, que sí admite texto.
  const textCandidates = [colors.surface, colors.textPrimary];
  const fill = contrastRatio(readableOn(tint, textCandidates), tint) >= 4.5 ? tint : deep;
  return (
    <View style={[styles.notch, { backgroundColor: fill, borderColor: colors.surface }]}>
      <Text style={[styles.notchText, { color: readableOn(fill, textCandidates) }]} numberOfLines={1}>
        {relation.initials}
      </Text>
    </View>
  );
}

/**
 * Pie del card: la relación como una línea indentada bajo el texto de SU fila.
 *
 * Sin fondo ni borde propios y alineada con el título (`indent`), para que se lea como parte
 * del movimiento y no como una barra entre dos tarjetas — que era el problema de la franja
 * a ancho completo.
 *
 * `isPaid` importa para el contraste: la fila pagada tiñe el fondo con `primaryLight`.
 * `indent` = padding del card + ancho del ícono + gap (42+12+16 en historial, 46+12+16 en home).
 */
export function TxRelationTier({
  relation,
  isPaid,
  indent = 70,
}: {
  relation: TxRelation;
  isPaid?: boolean;
  indent?: number;
}) {
  const { colors } = useTheme();
  const deep = relation.tone === 'primary' ? colors.primaryDark : colors.secondaryDark;
  const color = readableOn(isPaid ? colors.primaryLight : colors.surface, [deep, colors.textPrimary]);
  // El nombre, en negrita dentro de la frase.
  const { before, name, after } = splitByPerson(relation.label, relation.person);
  return (
    <View style={[styles.tier, { paddingLeft: indent }]}>
      <AppIcon name={relation.icon} size={12} color={color} />
      {/* numberOfLines: un nombre de 40+ caracteres no debe saltar a una segunda línea
          y romper la alineación con el título. */}
      <Text style={[styles.tierText, { color }]} numberOfLines={1}>
        {before}
        {!!name && <Text style={styles.tierName}>{name}</Text>}
        {after}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notch: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 4,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notchText: { fontSize: 10.5, fontFamily: Fonts.bold, letterSpacing: 0.2 },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 16,
    paddingBottom: 11,
    marginTop: -3,
  },
  tierText: { fontSize: 11.5, fontFamily: Fonts.regular, flexShrink: 1 },
  tierName: { fontFamily: Fonts.bold },
});
