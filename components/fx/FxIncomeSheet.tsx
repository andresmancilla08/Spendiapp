/**
 * Hoja para declarar o editar un ingreso en moneda extranjera.
 *
 * El importe se escribe en su moneda de origen y debajo se ve, en vivo, lo que
 * vale hoy en pesos: es el dato por el que existe la pantalla, así que se
 * muestra mientras se teclea y no después de guardar.
 *
 * La conversión que se ve aquí dice «según la TRM» de forma explícita. La TRM
 * del Banco de la República es una referencia pública, no la tasa que aplica el
 * banco del usuario al consignar (que se queda un 1-3%): prometer la cifra
 * bruta como «lo que vas a recibir» sería mentir por unos cientos de miles de
 * pesos al mes.
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Modal,
  TextInput, Animated, Platform, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AppIcon from '../AppIcon';
import AppButton from '../AppButton';
import AppSegmentedControl from '../AppSegmentedControl';
import { FieldLabel, FieldError } from '../FormField';
import { useTheme } from '../../context/ThemeContext';
import { mixHex, readableTint } from '../../utils/contrast';
import { Fonts } from '../../config/fonts';
import { formatMoney } from '../../utils/formatMoney';
import { toCop, type FxCurrency, type FxRates } from '../../utils/fxConvert';
import { validateFxForm, parseAmount, type FxFormField } from '../../utils/fxIncomeForm';
import { FX_LABEL_MAX, type FxIncome } from '../../types/fxIncome';

/** Bandera por moneda, igual que en ExchangeRateChips: se lee antes que el
 *  código de tres letras. */
const FLAG: Record<FxCurrency, string> = { COP: '🇨🇴', EUR: '🇪🇺', USD: '🇺🇸' };
const SYMBOL: Record<FxCurrency, string> = { COP: '$', EUR: '€', USD: 'US$' };

interface Props {
  visible: boolean;
  /** `null` = alta. Con valor = edición de ese ingreso. */
  editing: FxIncome | null;
  rates: FxRates | null;
  busy?: boolean;
  onClose: () => void;
  onSave: (value: Omit<FxIncome, 'id' | 'createdAt'>) => void;
  onDelete?: () => void;
}

export default function FxIncomeSheet({
  visible, editing, rates, busy, onClose, onSave, onDelete,
}: Props) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<FxCurrency>('EUR');
  const [payDay, setPayDay] = useState('');
  // El rojo solo aparece DESPUÉS de intentar guardar: regañar con el formulario
  // recién abierto es hostil.
  const [attempted, setAttempted] = useState(false);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(400)).current;
  const amountRef = useRef<TextInput>(null);
  const labelRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(400);
      return;
    }
    setLabel(editing?.label ?? '');
    setAmount(editing ? String(editing.amount) : '');
    setCurrency(editing?.currency ?? 'EUR');
    setPayDay(editing?.payDay ? String(editing.payDay) : '');
    setAttempted(false);
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(sheetTranslateY, { toValue: 0, damping: 26, stiffness: 400, mass: 1, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [visible, editing?.id]);

  const form = { label, amount, currency, payDay };
  const result = validateFxForm(form);
  const missing: FxFormField | null = result.missing;

  const typed = parseAmount(amount);
  const preview = typed !== null && typed > 0 ? toCop(typed, currency, rates) : null;

  const handleSave = () => {
    if (missing) {
      setAttempted(true);
      // El botón dice qué falta; además se lleva el foco al campo culpable.
      (missing === 'label' ? labelRef : amountRef).current?.focus();
      return;
    }
    onSave(result.value!);
  };

  const cta = missing === 'label'
    ? t('fxIncome.sheet.missingLabel')
    : missing === 'amount'
      ? t('fxIncome.sheet.missingAmount')
      : editing ? t('common.save') : t('fxIncome.sheet.add');

  const previewBg = mixHex(colors.surface, colors.primary, 0x14 / 255);
  const previewInk = readableTint(colors.primary, previewBg, 4.5);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.overlay, { backgroundColor: colors.overlay, opacity: overlayOpacity }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {editing ? t('fxIncome.sheet.editTitle') : t('fxIncome.sheet.newTitle')}
            </Text>

            {/* ── Nombre ── */}
            <FieldLabel label={t('fxIncome.sheet.labelField')} required missing={attempted && missing === 'label'} />
            <TextInput
              ref={labelRef}
              value={label}
              onChangeText={setLabel}
              maxLength={FX_LABEL_MAX}
              placeholder={t('fxIncome.sheet.labelPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, {
                backgroundColor: colors.inputBackground,
                borderColor: attempted && missing === 'label' ? colors.error : colors.inputBorder,
                color: colors.textPrimary,
              }]}
            />
            {attempted && missing === 'label' && <FieldError message={t('fxIncome.sheet.labelError')} />}

            {/* ── Moneda ── */}
            <FieldLabel label={t('fxIncome.sheet.currencyField')} />
            <AppSegmentedControl
              segments={[
                { key: 'EUR', label: `${FLAG.EUR} EUR` },
                { key: 'USD', label: `${FLAG.USD} USD` },
                { key: 'COP', label: `${FLAG.COP} COP` },
              ]}
              activeKey={currency}
              onChange={(key) => setCurrency(key as FxCurrency)}
            />

            {/* ── Importe ── */}
            <View style={styles.spacer} />
            <FieldLabel
              label={t('fxIncome.sheet.amountField', { symbol: SYMBOL[currency] })}
              required
              missing={attempted && missing === 'amount'}
            />
            <TextInput
              ref={amountRef}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder={currency === 'COP' ? '1.500.000' : '2.400'}
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, styles.amountInput, {
                backgroundColor: colors.inputBackground,
                borderColor: attempted && missing === 'amount' ? colors.error : colors.inputBorder,
                color: colors.textPrimary,
              }]}
            />
            {attempted && missing === 'amount' && <FieldError message={t('fxIncome.sheet.amountError')} />}

            {/* ── Conversión en vivo ── */}
            {currency !== 'COP' && (
              <View style={[styles.preview, { backgroundColor: previewBg, borderColor: colors.primary + '30' }]}>
                {preview === null ? (
                  <Text style={[styles.previewHint, { color: colors.textSecondary }]}>
                    {rates ? t('fxIncome.sheet.previewHint') : t('fxIncome.sheet.previewNoRate')}
                  </Text>
                ) : (
                  <>
                    <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                      {t('fxIncome.sheet.previewLabel')}
                    </Text>
                    <Text style={[styles.previewValue, { color: previewInk }]}>
                      {formatMoney(preview, i18n.language)}
                    </Text>
                    <Text style={[styles.previewFoot, { color: colors.textTertiary }]}>
                      {t('fxIncome.sheet.previewFoot')}
                    </Text>
                  </>
                )}
              </View>
            )}

            {/* ── Día de cobro ── */}
            <FieldLabel label={t('fxIncome.sheet.payDayField')} optional />
            <TextInput
              value={payDay}
              onChangeText={setPayDay}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={2}
              placeholder="30"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.textPrimary,
              }]}
            />

            <AppButton
              label={cta}
              onPress={handleSave}
              loading={busy}
              icon={missing ? undefined : 'checkmark'}
              style={styles.cta}
            />

            {editing && onDelete && (
              <TouchableOpacity onPress={onDelete} style={styles.delete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <AppIcon name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.deleteText, { color: colors.error }]}>{t('fxIncome.sheet.delete')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '92%',
  },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  scroll: { padding: 20, paddingBottom: 34 },
  title: { fontSize: 19, fontFamily: Fonts.extraBold, letterSpacing: -0.4, marginBottom: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    marginBottom: 14,
  },
  amountInput: { fontSize: 22, fontFamily: Fonts.extraBold, letterSpacing: -0.6 },
  spacer: { height: 14 },
  preview: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  previewLabel: { fontSize: 11.5, fontFamily: Fonts.semiBold, letterSpacing: 0.2 },
  previewValue: { fontSize: 26, fontFamily: Fonts.extraBold, letterSpacing: -1, marginTop: 2 },
  previewFoot: { fontSize: 11, fontFamily: Fonts.regular, marginTop: 4, lineHeight: 15 },
  previewHint: { fontSize: 12.5, fontFamily: Fonts.regular, lineHeight: 18 },
  cta: { marginTop: 6 },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14 },
  deleteText: { fontSize: 13.5, fontFamily: Fonts.bold },
});
