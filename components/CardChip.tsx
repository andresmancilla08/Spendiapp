import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import BankLogo from './BankLogo';
import AppIcon from './AppIcon';
import { useTheme } from '../context/ThemeContext';
import { mixHex, readableTint } from '../utils/contrast';
import { Fonts } from '../config/fonts';
import { isTeaStale, type Card } from '../types/card';

/**
 * EL chip de tarjeta. Único.
 *
 * Vivía copiado en `add-transaction`, `edit-transaction` y `purchase-simulator`,
 * cada uno con su propio bloque de estilos idénticos. Al pedir que la tasa se
 * viera «en todo lado», mantener tres copias sincronizadas dejó de ser viable.
 * Las medidas de aquí son EXACTAMENTE las de `add-transaction` (r20, borde 1,5,
 * 8/12 de padding, texto 13 semiBold): esta extracción no cambia un píxel.
 *
 * El badge de la derecha tiene un solo hueco y dos inquilinos posibles:
 *  · `C`/`D` cuando hay que distinguir crédito de débito;
 *  · la TEA de la tarjeta cuando `showTea` y la tarjeta la tiene.
 * No compiten porque no pueden coexistir: una tasa solo existe en una tarjeta
 * de crédito, así que la propia cifra ya dice lo que decía la «C». Meter los
 * dos ensancharía el chip de 134 a 182 px y a 390 px no caben ni dos.
 */

interface CardChipProps {
  card: Card;
  selected: boolean;
  onPress: () => void;
  /** Atenuado y sin respuesta (ej. otra tarjeta mientras hay cuotas fijadas). */
  locked?: boolean;
  /** Enseña la tasa guardada en vez del badge C/D. */
  showTea?: boolean;
}

export default function CardChip({ card, selected, onPress, locked, showTea }: CardChipProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const isCredit = card.type === 'credit';
  const hasTea = showTea && isCredit && card.tea != null;
  const stale = hasTea && isTeaStale(card);

  const tint = isCredit ? colors.primary : colors.tertiary;
  const badgeBg = selected ? 'rgba(255,255,255,0.22)' : mixHex(colors.backgroundSecondary, tint, 0.16);
  // Medido, no supuesto: con paletas pastel el token crudo se queda en 1,5:1.
  const badgeInk = selected ? colors.onPrimary : readableTint(tint, badgeBg, 4.5);

  const label = card.nickname || card.bankName;
  const a11y = hasTea
    ? `${label}, ${card.tea}% E.A.${stale ? `, ${t('cardChip.staleA11y')}` : ''}`
    : label;

  return (
    <TouchableOpacity
      onPress={locked ? undefined : onPress}
      activeOpacity={locked ? 1 : 0.8}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!locked }}
      accessibilityLabel={a11y}
      style={[
        styles.chip,
        { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
        selected && { backgroundColor: colors.primary, borderColor: colors.primary },
        locked && styles.locked,
      ]}
    >
      <BankLogo bankId={card.bankId} size={20} radius={5} />
      <Text
        style={[styles.label, { color: selected ? colors.onPrimary : colors.textSecondary }]}
        numberOfLines={1}
      >
        {label}
      </Text>

      {hasTea ? (
        <View style={[styles.badge, styles.teaBadge, { backgroundColor: badgeBg }]}>
          {stale && (
            <AppIcon name="time-outline" size={9} color={badgeInk} />
          )}
          <Text style={[styles.teaText, { color: badgeInk }]}>
            {`${String(card.tea).replace('.', ',')}%`}
          </Text>
        </View>
      ) : (
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeInk }]}>
            {isCredit ? t('cardChip.credit') : t('cardChip.debit')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/** La opción «Sin tarjeta». Mismo molde, sin logo ni badge. */
export function CardChipNone({ selected, onPress }: { selected: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
        selected && { backgroundColor: colors.primary, borderColor: colors.primary },
      ]}
    >
      <Text style={[styles.label, { color: selected ? colors.onPrimary : colors.textSecondary }]}>
        {t('cardChip.none')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Medidas heredadas de add-transaction.tsx tal cual. No tocar sin cambiarlas allí.
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
  },
  label: { fontSize: 13, fontFamily: Fonts.semiBold, maxWidth: 108 },
  locked: { opacity: 0.35 },
  badge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontFamily: Fonts.bold },
  teaBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6 },
  // Mono: los dígitos de una tasa se comparan entre chips y deben alinearse.
  teaText: { fontSize: 10.5, fontFamily: Fonts.monoBold },
});
