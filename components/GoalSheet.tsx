/**
 * Hoja de una meta: el único sitio donde se actúa sobre ella.
 *
 * Antes las tres acciones vivían repartidas —aportar en el toque de la tarjeta,
 * eliminar en un long-press invisible (que en la PWA de iOS ni llega a dispararse)
 * y editar en ninguna parte—. Aquí la lista solo informa y la hoja actúa, que es el
 * patrón que la app ya usa para el detalle de un movimiento.
 *
 * Los atajos de aporte se calculan sobre lo que FALTA, no son cifras fijas: el
 * último completa la meta al céntimo, que es la razón de que exista esta hoja.
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Modal,
  TextInput, Animated, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AppIcon from './AppIcon';
import { useTheme } from '../context/ThemeContext';
import { mixHex, readableTint } from '../utils/contrast';
import { inkOnFill } from '../utils/detailInk';
import { Fonts } from '../config/fonts';
import { formatMoney } from '../utils/formatMoney';
import { localeFor } from '../utils/dateLocale';
import type { Goal } from '../types/goal';

interface Props {
  visible: boolean;
  goal: Goal | null;
  busy?: boolean;
  onClose: () => void;
  onContribute: (amount: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  onReopen: () => void;
}

/** Redondea al millar para que los atajos sean cifras que alguien escribiría. */
const roundish = (n: number) => Math.max(1000, Math.round(n / 1000) * 1000);

function digitsToAmount(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

export default function GoalSheet({
  visible, goal, busy, onClose, onContribute, onEdit, onDelete, onReopen,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [amountInput, setAmountInput] = useState('');

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      setAmountInput('');
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(sheetTranslateY, { toValue: 0, damping: 26, stiffness: 400, mass: 1, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    } else {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(400);
    }
  }, [visible, goal?.id]);

  if (!goal) return null;

  const isCompleted = goal.status === 'completed';
  const accent = isCompleted ? colors.success : colors.primary;
  const accentText = readableTint(isCompleted ? colors.success : colors.primary, colors.surface, 4.5);
  // Cada tinta se mide contra el fondo que de verdad tiene debajo: sobre una pastilla
  // al 12% el token crudo se queda en 1,7:1 en las paletas pastel.
  const pill = (tone: string) => mixHex(colors.surface, tone, 0x1e / 255);
  const chipOnBg = mixHex(colors.surface, colors.primary, 0x14 / 255);
  const chipOnInk = readableTint(colors.primary, chipOnBg, 4.5);
  const ctaInk = inkOnFill(colors.primary, colors.onPrimary, colors.textPrimary);
  const trackBg = colors.border;
  const fillColor = readableTint(accent, trackBg, 2.5);
  const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);
  const pct = goal.targetAmount > 0
    ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100)
    : 0;

  // Dos atajos redondos y el exacto. Se descartan duplicados y lo que pase de lo que falta.
  const shortcuts = remaining > 0
    ? [...new Set([roundish(remaining * 0.1), roundish(remaining * 0.25)]
      .filter((v) => v > 0 && v < remaining)), remaining]
    : [];

  const amount = digitsToAmount(amountInput);
  const canContribute = amount > 0 && !busy;

  const iconBtn = (
    name: 'pencil-outline' | 'trash-outline',
    tone: 'primary' | 'error',
    label: string,
    onPress: () => void,
  ) => {
    const bg = pill(colors[tone]);
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={styles.iconTap}
      >
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
          <AppIcon name={name} size={17} color={readableTint(colors[tone], bg, 3)} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose} accessibilityLabel={t('common.close')}>
        <Animated.View style={[styles.overlay, { backgroundColor: colors.overlay, opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[styles.sheet, { backgroundColor: colors.surface, transform: [{ translateY: sheetTranslateY }] }]}
        accessibilityViewIsModal
      >
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Cabecera: quién es la meta y las dos acciones sobre ella */}
          <View style={styles.head}>
            <View style={[styles.emojiWrap, { backgroundColor: `${accent}1E` }]}>
              <Text style={styles.emoji}>{goal.emoji}</Text>
            </View>
            <View style={styles.headMeta}>
              <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>{goal.name}</Text>
              <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
                {isCompleted
                  ? t('goals.sheet.reached')
                  : t('goals.sheet.remaining', { amount: formatMoney(remaining) })}
                {' · '}{Math.round(pct)}%
              </Text>
            </View>
            {iconBtn('pencil-outline', 'primary', t('goals.sheet.edit'), onEdit)}
            {iconBtn('trash-outline', 'error', t('goals.sheet.delete'), onDelete)}
          </View>

          {/* Progreso */}
          <View style={[styles.track, { backgroundColor: trackBg }]}>
            <View style={[styles.fill, { width: `${pct}%`, backgroundColor: fillColor }]} />
          </View>
          <View style={styles.amountsRow}>
            <Text style={[styles.saved, { color: accentText }]}>{formatMoney(goal.savedAmount)}</Text>
            <Text style={[styles.target, { color: colors.textTertiary }]}>
              {t('goals.sheet.ofTarget', { amount: formatMoney(goal.targetAmount) })}
            </Text>
          </View>

          {isCompleted ? (
            <>
              {!!goal.completedAt && (
                <Text style={[styles.completedAt, { color: colors.textTertiary }]}>
                  {t('goals.sheet.completedOn', {
                    date: goal.completedAt.toDate().toLocaleDateString(localeFor(), {
                      day: 'numeric', month: 'long', year: 'numeric',
                    }),
                  })}
                </Text>
              )}
              <TouchableOpacity
                onPress={onReopen}
                disabled={busy}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={[styles.secondaryCta, { backgroundColor: colors.surface, borderColor: colors.primary }, busy && styles.disabled]}
              >
                {busy
                  ? <ActivityIndicator size="small" color={readableTint(colors.primary, colors.surface, 4.5)} />
                  : <AppIcon name="refresh-outline" size={18} color={readableTint(colors.primary, colors.surface, 4.5)} />}
                <Text style={[styles.secondaryCtaText, { color: readableTint(colors.primary, colors.surface, 4.5) }]}>
                  {t('goals.sheet.reopen')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.textTertiary }]}>{t('goals.sheet.howMuch')}</Text>
              <TextInput
                value={amountInput}
                onChangeText={(v) => {
                  const n = digitsToAmount(v);
                  setAmountInput(n ? new Intl.NumberFormat(localeFor(), { maximumFractionDigits: 0 }).format(n) : '');
                }}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                inputMode="numeric"
                accessibilityLabel={t('goals.sheet.howMuch')}
                style={[styles.input, {
                  borderColor: amountInput ? colors.primary : colors.border,
                  backgroundColor: colors.inputBackground,
                  color: colors.textPrimary,
                }]}
              />

              {shortcuts.length > 0 && (
                <View style={styles.chips}>
                  {shortcuts.map((value, i) => {
                    const isFill = i === shortcuts.length - 1;
                    const active = amount === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        onPress={() => setAmountInput(
                          new Intl.NumberFormat(localeFor(), { maximumFractionDigits: 0 }).format(value),
                        )}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={[styles.chip, {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? chipOnBg : colors.surfaceSecondary ?? colors.surface,
                        }]}
                      >
                        <Text
                          style={[styles.chipText, { color: active ? chipOnInk : colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {isFill ? t('goals.sheet.fill') : `+ ${formatMoney(value)}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity
                onPress={() => onContribute(amount)}
                disabled={!canContribute}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={[styles.cta, { backgroundColor: colors.primary }, !canContribute && styles.disabled]}
              >
                {busy
                  ? <ActivityIndicator size="small" color={ctaInk} />
                  : <AppIcon name="add" size={19} color={ctaInk} />}
                <Text style={[styles.ctaText, { color: ctaInk }]}>
                  {amount > 0
                    ? t('goals.sheet.contributeAmount', { amount: formatMoney(amount) })
                    : t('goals.sheet.contribute')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%',
    width: '100%', maxWidth: 768, alignSelf: 'center',
  },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 34 },

  head: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emojiWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  emoji: { fontSize: 24 },
  headMeta: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, fontFamily: Fonts.extraBold, letterSpacing: -0.3 },
  sub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 3 },

  // 44×44 de área táctil (WCAG/HIG) con la pastilla de 36 dentro: el patrón de
  // botón-ícono de la casa, sin quedarse corto de target.
  iconTap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 18 },
  fill: { height: 6, borderRadius: 3 },
  amountsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 8 },
  saved: { fontSize: 16, fontFamily: Fonts.extraBold, letterSpacing: -0.3 },
  target: { fontSize: 12, fontFamily: Fonts.regular },

  label: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 20, marginBottom: 8 },
  input: {
    height: 54, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16,
    fontSize: 20, fontFamily: Fonts.bold, letterSpacing: -0.3,
  },
  chips: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: { flex: 1, height: 44, borderRadius: 50, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  chipText: { fontSize: 12.5, fontFamily: Fonts.bold },

  cta: { height: 54, borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 20 },
  ctaText: { fontSize: 15, fontFamily: Fonts.bold },
  secondaryCta: {
    height: 52, borderRadius: 50, borderWidth: 1.5, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 20,
  },
  secondaryCtaText: { fontSize: 14.5, fontFamily: Fonts.bold },
  completedAt: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 14, textAlign: 'center' },
  disabled: { opacity: 0.45 },
});
