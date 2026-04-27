import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { COLOMBIAN_BANKS, Bank } from '../config/banks';
import { addCard } from '../hooks/useCards';
import type { CardType } from '../types/card';
import BankLogo from './BankLogo';

const MAX_NICKNAME = 15;

interface CardFormSheetProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

export default function CardFormSheet({ visible, onClose, userId }: CardFormSheetProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [step, setStep] = useState<'bank' | 'details'>('bank');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [cardType, setCardType] = useState<CardType>('debit');
  const [nickname, setNickname] = useState('');
  const [cutoffDayInput, setCutoffDayInput] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(sheetTranslateY, { toValue: 0, damping: 26, stiffness: 400, mass: 1.0, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    } else {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(400);
    }
  }, [visible]);

  const reset = () => {
    setStep('bank');
    setSelectedBank(null);
    setCardType('debit');
    setNickname('');
    setCutoffDayInput('');
    setIsDefault(false);
    setSaving(false);
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSelectBank = (bank: Bank) => {
    setSelectedBank(bank);
    setStep('details');
  };

  const handleSave = async () => {
    if (!selectedBank) return;
    const trimmed = nickname.trim();
    if (!trimmed) { setError(t('cardForm.nicknameError')); return; }
    const cutoffDayNum = cutoffDayInput.trim() ? parseInt(cutoffDayInput.trim(), 10) : undefined;
    if (cutoffDayNum !== undefined && (isNaN(cutoffDayNum) || cutoffDayNum < 1 || cutoffDayNum > 28)) {
      setError(t('cardForm.cutoffDayError'));
      return;
    }
    setError('');
    setSaving(true);
    try {
      await addCard(userId, selectedBank.id, selectedBank.name, cardType, trimmed, isDefault, cutoffDayNum);
      handleClose();
    } catch {
      setError(t('cardForm.saveError'));
      setSaving(false);
    }
  };

  const canSave = nickname.trim().length > 0 && !saving;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { backgroundColor: colors.overlay, opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { backgroundColor: colors.surface, transform: [{ translateY: sheetTranslateY }] }]}>
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* Header */}
        <View style={styles.headerRow}>
          {step === 'details' ? (
            <TouchableOpacity onPress={() => setStep('bank')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 22 }} />
          )}
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {step === 'bank' ? t('cardForm.selectBank') : selectedBank?.name ?? ''}
          </Text>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Paso 1: Lista de bancos */}
        {step === 'bank' && (
          <FlatList
            data={COLOMBIAN_BANKS}
            keyExtractor={(b) => b.id}
            style={styles.bankList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.bankItem, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectBank(item)}
                activeOpacity={0.7}
              >
                <BankLogo bankId={item.id} size={32} radius={8} />
                <Text style={[styles.bankItemText, { color: colors.textPrimary }]}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          />
        )}

        {/* Paso 2: Tipo + apodo */}
        {step === 'details' && (
          <View style={styles.detailsForm}>
            {/* Chips tipo */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('cardForm.typeLabel')}</Text>
            <View style={styles.typeRow}>
              {(['debit', 'credit'] as CardType[]).map((cardTypeOpt) => (
                <TouchableOpacity
                  key={cardTypeOpt}
                  style={[
                    styles.typeChip,
                    { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                    cardType === cardTypeOpt && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setCardType(cardTypeOpt)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.typeChipText,
                    { color: colors.textSecondary },
                    cardType === cardTypeOpt && { color: '#FFFFFF' },
                  ]}>
                    {cardTypeOpt === 'debit' ? t('cardForm.debit') : t('cardForm.credit')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Fecha de corte — solo crédito */}
            {cardType === 'credit' && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 8 }]}>
                  {t('cardForm.cutoffDayLabel')}
                </Text>
                <Text style={[styles.defaultHint, { color: colors.textTertiary, marginBottom: 6 }]}>
                  {t('cardForm.cutoffDayHint')}
                </Text>
                <TextInput
                  style={[
                    styles.nicknameInput,
                    { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.backgroundSecondary },
                  ]}
                  placeholder={t('cardForm.cutoffDayPlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={cutoffDayInput}
                  onChangeText={(v) => { setError(''); setCutoffDayInput(v.replace(/[^0-9]/g, '')); }}
                />
              </>
            )}

            {/* Nombre / apodo */}
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('cardForm.nicknameLabel')}</Text>
              <Text style={[styles.charCount, { color: nickname.length >= MAX_NICKNAME ? colors.error : colors.textTertiary }]}>
                {nickname.length}/{MAX_NICKNAME}
              </Text>
            </View>
            <TextInput
              style={[
                styles.nicknameInput,
                {
                  borderColor: error ? colors.error : colors.border,
                  color: colors.textPrimary,
                  backgroundColor: colors.backgroundSecondary,
                },
              ]}
              placeholder={t('cardForm.nicknamePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              maxLength={MAX_NICKNAME}
              autoCapitalize="words"
              value={nickname}
              onChangeText={(v) => { setError(''); setNickname(v); }}
            />
            {error !== '' && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}

            {/* Toggle predeterminada */}
            <View style={[styles.defaultRow, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
              <View style={styles.defaultTexts}>
                <Text style={[styles.defaultLabel, { color: colors.textPrimary }]}>{t('cardForm.defaultToggle')}</Text>
                <Text style={[styles.defaultHint, { color: colors.textTertiary }]}>{t('cardForm.defaultToggleHint')}</Text>
              </View>
              <Switch
                value={isDefault}
                onValueChange={setIsDefault}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Preview badge */}
            {nickname.trim().length > 0 && (
              <View style={styles.previewRow}>
                <View style={[styles.previewBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.previewBadgeText, { color: colors.primary }]}>
                    {nickname.trim()}
                  </Text>
                </View>
                <View style={[
                  styles.previewBadge,
                  { backgroundColor: cardType === 'credit' ? colors.primaryLight : colors.tertiaryLight },
                ]}>
                  <Text style={[
                    styles.previewBadgeText,
                    { color: cardType === 'credit' ? colors.primary : colors.tertiaryDark },
                  ]}>
                    {cardType === 'debit' ? t('cardForm.debit') : t('cardForm.credit')}
                  </Text>
                </View>
              </View>
            )}

            {/* Botón guardar */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }, !canSave && { opacity: 0.4 }]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.saveBtnText}>{t('cardForm.addButton')}</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontFamily: Fonts.bold, flex: 1, textAlign: 'center' },
  bankList: { maxHeight: 380 },
  bankItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  bankItemText: { flex: 1, fontSize: 15, fontFamily: Fonts.medium },
  detailsForm: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  charCount: { fontSize: 11, fontFamily: Fonts.regular },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  typeChipText: { fontSize: 14, fontFamily: Fonts.semiBold },
  nicknameInput: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: Fonts.semiBold,
  },
  errorText: { fontSize: 12, fontFamily: Fonts.regular },
  previewRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  previewBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  previewBadgeText: { fontSize: 12, fontFamily: Fonts.semiBold },
  saveBtn: { height: 52, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 16, fontFamily: Fonts.bold, color: '#FFFFFF' },
  defaultRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  defaultTexts: { flex: 1 },
  defaultLabel: { fontSize: 14, fontFamily: Fonts.semiBold },
  defaultHint: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 },
});
