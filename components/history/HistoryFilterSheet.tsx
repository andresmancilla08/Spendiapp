/**
 * Hoja de filtros del historial (opción A de `docs/filtros-historial-propuestas.html`).
 *
 * Cada sección es un grupo de chips: el elegido va relleno, así se ve de un vistazo
 * qué está activo. Cada chip dice cuántos movimientos dejaría, para no elegir algo
 * que vacíe la lista. Los filtros se aplican EN VIVO (la lista de atrás ya cambia);
 * «Ver N movimientos» solo cierra.
 */
import { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Modal, Animated, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';
import { readableTint } from '../../utils/contrast';
import {
  countWith, SHEET_FILTER_OPTIONS, type HistoryFilters, type SheetFilterKey,
} from '../../utils/historyFilters';
import type { Transaction } from '../../types/transaction';

const SECTIONS: SheetFilterKey[] = ['type', 'friends', 'kind', 'card'];

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Movimientos del mes SIN filtrar: de aquí salen los conteos. */
  transactions: Transaction[];
  filters: HistoryFilters;
  onChange: <K extends SheetFilterKey>(key: K, value: HistoryFilters[K]) => void;
  onClear: () => void;
  /** Cuántos quedan con los filtros actuales. */
  resultCount: number;
  /** Filtros de la hoja que no están en «Todos». */
  activeCount: number;
}

export default function HistoryFilterSheet({
  visible, onClose, transactions, filters, onChange, onClear, resultCount, activeCount,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (!visible) {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(500);
      return;
    }
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(sheetTranslateY, { toValue: 0, damping: 26, stiffness: 400, mass: 1, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [visible]);

  const clearInk = readableTint(colors.primary, colors.surface, 4.5);
  const empty = resultCount === 0;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Animated.View style={[styles.overlay, { backgroundColor: colors.overlay, opacity: overlayOpacity }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          accessibilityViewIsModal
          style={[styles.sheet, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            transform: [{ translateY: sheetTranslateY }],
          }]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />

          <View style={styles.head}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('history.filters.sheetTitle')}</Text>
            <TouchableOpacity
              onPress={onClear}
              disabled={activeCount === 0}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityState={{ disabled: activeCount === 0 }}
            >
              <Text style={[styles.clear, { color: activeCount === 0 ? colors.textTertiary : clearInk }]}>
                {activeCount > 0 ? t('history.filters.clearN', { count: activeCount }) : t('history.filters.clearAll')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {SECTIONS.map((key) => (
              <View key={key} style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  {t(`history.filters.section.${key}`)}
                </Text>
                <View style={styles.chips} accessibilityRole="radiogroup">
                  {(SHEET_FILTER_OPTIONS[key] as string[]).map((value) => {
                    const on = filters[key] === value;
                    const n = value === 'all' ? null : countWith(transactions, filters, key, value as never);
                    const label = t(`history.filters.opt.${key}.${value}`);
                    return (
                      <TouchableOpacity
                        key={value}
                        onPress={() => onChange(key, value as never)}
                        activeOpacity={0.8}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={n === null ? label : t('history.filters.chipA11y', { label, count: n })}
                        style={[styles.chip, {
                          backgroundColor: on ? colors.primary : colors.surface,
                          borderColor: on ? colors.primary : colors.border,
                        }]}
                      >
                        <Text style={[styles.chipText, { color: on ? colors.onPrimary : colors.textSecondary }]}>{label}</Text>
                        {n !== null && (
                          <Text style={[styles.chipCount, { color: on ? colors.onPrimary : colors.textTertiary }]}>{n}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={[styles.foot, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={[styles.cta, { backgroundColor: empty ? colors.surfaceSecondary : colors.primary }]}
            >
              <Text style={[styles.ctaText, { color: empty ? colors.textSecondary : colors.onPrimary }]}>
                {empty ? t('history.filters.noResults') : t('history.filters.seeN', { count: resultCount })}
              </Text>
            </TouchableOpacity>
            {empty && (
              <Text style={[styles.emptyNote, { color: readableTint(colors.error, colors.surface, 4.5) }]}>
                {t('history.filters.noResultsNote')}
              </Text>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject },
  sheet: {
    width: '100%',
    maxWidth: 768,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '88%',
  },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 4 },
  title: { fontSize: 18, fontFamily: Fonts.extraBold, letterSpacing: -0.4 },
  clear: { fontSize: 13, fontFamily: Fonts.bold },
  body: { paddingHorizontal: 18, paddingBottom: 8 },
  section: { marginTop: 14 },
  sectionLabel: { fontSize: 11, fontFamily: Fonts.extraBold, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 50, paddingHorizontal: 14, paddingVertical: 9, minHeight: 40 },
  chipText: { fontSize: 13, fontFamily: Fonts.bold },
  chipCount: { fontSize: 11, fontFamily: Fonts.bold },
  foot: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, paddingTop: 12 },
  cta: { borderRadius: 50, paddingVertical: 14, alignItems: 'center' },
  ctaText: { fontSize: 15, fontFamily: Fonts.extraBold },
  emptyNote: { fontSize: 12, fontFamily: Fonts.semiBold, textAlign: 'center', marginTop: 8 },
});
