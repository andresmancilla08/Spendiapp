// components/TxRelation.tsx
// Relación social de una transacción (gasto compartido, cobro, o ingreso enviado/recibido).
// Un solo sitio resuelve texto + tono + iniciales, y expone las dos piezas visuales que
// consumen el card del home y del historial:
//   · TxRelationNotch — inicial del amigo enganchada al ícono de categoría (identifica de un vistazo)
//   · TxRelationTier  — franja inferior del card con el chip a ancho completo (nombre sin truncar)
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppIcon from './AppIcon';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import type { Transaction } from '../types/transaction';
import type { AppColors } from '../config/colors';

export interface TxRelation {
  label: string;
  icon: 'people-outline' | 'gift-outline' | 'send-outline';
  tone: 'primary' | 'secondary';
  /** 1-2 iniciales del amigo, con sufijo `+n` cuando hay más participantes. */
  initials: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  const first = parts[0][0] ?? '';
  const second = parts.length > 1 ? (parts[1][0] ?? '') : '';
  return (first + second).toUpperCase();
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
    };
  }

  // Gasto tuyo que salió como ingreso para un amigo
  if (item.sentIncomeTransactionId && item.sentIncomeToName) {
    return {
      label: t('sentIncome.chip.sentTo', { name: item.sentIncomeToName }),
      icon: 'send-outline',
      tone: 'primary',
      initials: initialsOf(item.sentIncomeToName),
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
    if (others.length === 0) {
      return {
        label: t(isClaim ? 'sharedExpense.chip.owesYou' : 'sharedExpense.chip.sharedWith', { name: '—' }),
        icon: 'people-outline',
        tone: 'primary',
        initials: '·',
      };
    }
    const extra = others.length > 1 ? `+${others.length - 1}` : '';
    const label = others.length <= 2
      ? t(isClaim ? 'sharedExpense.chip.owesYou' : 'sharedExpense.chip.sharedWith', {
          name: others.map(nameOf).join(` ${t('common.and')} `),
        })
      : t(isClaim ? 'sharedExpense.chip.owesYouMore' : 'sharedExpense.chip.sharedWithMore', {
          name: nameOf(others[0]),
          count: others.length - 1,
        });
    return { label, icon: 'people-outline', tone: 'primary', initials: initialsOf(nameOf(others[0])) + extra };
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
  };
}

// ── Contraste ────────────────────────────────────────────────────────────────
// Las paletas pastel (cottonCandy, sakura, peach…) tienen `primary` clarísimo: usarlo como
// color de texto sobre el chip da ratios de 1.5:1. Se mide y, si no llega a 4.5:1, se cae a
// `textPrimary`, que siempre se lee.
// ponytail: math WCAG mínima aquí mismo; si algún día hace falta en más sitios, se extrae a utils.
const CHIP_ALPHA = 0.13;

function rgbOf(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Primer candidato que se lee sobre `bg` (≥4.5:1); si ninguno llega, el último. */
function readableOn(bg: string, candidates: string[]): string {
  const bgRgb = rgbOf(bg);
  const last = candidates[candidates.length - 1];
  if (!bgRgb) return last;
  for (const c of candidates) {
    const rgb = rgbOf(c);
    if (rgb && contrast(rgb, bgRgb) >= 4.5) return c;
  }
  return last;
}

/** Color de texto legible para un chip tintado sobre `surface`. */
function readableChipText(tintCandidate: string, tint: string, colors: AppColors): string {
  const over = rgbOf(tint);
  const surface = rgbOf(colors.surface);
  if (!over || !surface) return colors.textPrimary;
  const blended = surface.map((c, i) => Math.round(c * (1 - CHIP_ALPHA) + over[i] * CHIP_ALPHA));
  const hex = `#${blended.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  return readableOn(hex, [tintCandidate, colors.textPrimary]);
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
  return (
    <View style={[styles.notch, { backgroundColor: tint, borderColor: colors.surface }]}>
      <Text
        style={[styles.notchText, { color: readableOn(tint, [colors.surface, colors.textInverse, colors.textPrimary]) }]}
        numberOfLines={1}
      >
        {relation.initials}
      </Text>
    </View>
  );
}

/** Franja inferior del card: el chip de relación con todo el ancho disponible. */
export function TxRelationTier({ relation }: { relation: TxRelation }) {
  const { colors } = useTheme();
  const tint = relation.tone === 'primary' ? colors.primary : colors.secondary;
  const deep = relation.tone === 'primary' ? colors.primaryDark : colors.secondaryDark;
  const textColor = readableChipText(deep, tint, colors);
  return (
    <View style={[styles.tier, { borderTopColor: colors.border, backgroundColor: `${colors.border}2E` }]}>
      <View style={[styles.chip, { backgroundColor: `${tint}22`, borderColor: `${tint}3D` }]}>
        <AppIcon name={relation.icon} size={12} color={tint} />
        <Text style={[styles.chipText, { color: textColor }]} numberOfLines={1}>
          {relation.label}
        </Text>
      </View>
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
    paddingHorizontal: 16,
    paddingTop: 7,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingLeft: 7,
    paddingRight: 9,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 1,
  },
  chipText: { fontSize: 11, fontFamily: Fonts.semiBold, flexShrink: 1 },
});
