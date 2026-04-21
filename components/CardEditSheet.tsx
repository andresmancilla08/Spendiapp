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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { COLOMBIAN_BANKS, Bank } from '../config/banks';
import { updateCard, setDefaultCard } from '../hooks/useCards';
import type { Card, CardType } from '../types/card';
import BankLogo from './BankLogo';

const MAX_NICKNAME = 15;

interface CardEditSheetProps {
  visible: boolean;
  onClose: () => void;
  card: Card | null;
  userId: string;
}

export default function CardEditSheet({ visible, onClose, card, userId }: CardEditSheetProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [step, setStep] = useState<'bank' | 'details'>('details');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [cardType, setCardType] = useState<CardType>('debit');
  const [nickname, setNickname] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible && card) {
      const bank = COLOMBIAN_BANKS.find((b) => b.id === card.bankId) ?? null;
      setSelectedBank(bank);
      setCardType(card.type);
      setNickname(card.nickname);
      setIsDefault(card.isDefault);
      setStep('details');
      setError('');
      setSaving(false);

      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(sheetTranslateY, { toValue: 0, damping: 26, stiffness: 400, mass: 1.0, useNativeDriver: true }),
      ]).start();
    } else {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(400);
    }
  }, [visible, card]);

  const handleClose = () => {
    setStep('details');
    onClose();
  };

  const handleSelectBank = (bank: Bank) => {
    setSelectedBank(bank);
    setStep('details');
  };

  const handleSave = async () => {
    if (!card || !selectedBank) return;
    const trimmed = nickname.trim();
    if (!trimmed) { setError(t('cardForm.nicknameError')); return; }
    setError('');
    setSaving(true);
    try {
      if (isDefault && !card.isDefault) {
        await setDefaultCard(card.id, userId);
      }
      await updateCard(card.id, {
        bankId: selectedBank.id,
        bankName: selectedBank.name,
        type: cardType,
        nickname: trimmed,
        isDefault,
      });
      handleClose();
    } catch {
      setError(t('cardEditForm.saveError'));
      setSaving(false);
    }
  };

  const canSave = nickname.trim().length > 0 && !saving;

  const headerTitle = step === 'bank' ? t('cardForm.selectBank') : t('cardEditForm.title');

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
          {step === 'bank' ? (
            <TouchableOpacity onPress={() => setStep('details')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 22 }} />
          )}
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{headerTitle}</Text>
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
                {selectedBank?.id === item.id && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                )}
                {selectedBank?.id !== item.id && (
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                )}
              </TouchableOpacity>
            )}
          />
        )}

        {/* Paso 2: Editar detalles */}
        {step === 'details' && (
          <View style={styles.detailsForm}>
            {/* Cambiar banco */}
            {selectedBank && (
              <TouchableOpacity
                style={[styles.changeBankRow, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                onPress={() => setStep('bank')}
                activeOpacity={0.8}
              >
                <BankLogo bankId={selectedBank.id} size={32} radius={8} />
                <Text style={[styles.changeBankName, { color: colors.textPrimary }]}>{selectedBank.name}</Text>
                <View style={styles.changeBankAction}>
                  <Text style={[styles.changeBankLabel, { color: colors.primary }]}>{t('cardEditForm.changeBank')}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>
            )}

            {/* Chips tipo */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('cardForm.typeLabel')}</Text>
            <View style={styles.typeRow}>
              {(['debit', 'credit'] as CardType[]).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.typeChip,
                    { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                    cardType === opt && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setCardType(opt)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.typeChipText,
                    { color: colors.textSecondary },
                    cardType === opt && { color: '#FFFFFF' },
                  ]}>
                    {opt === 'debit' ? t('cardForm.debit') : t('cardForm.credit')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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

            {/* Botón guardar */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }, !canSave && { opacity: 0.4 }]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.saveBtnText}>{t('cardEditForm.saveButton')}</Text>
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
    maxHeight: '85%',
    paddingBottom: 40,
  },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontFamily: Fonts.bold, flex: 1, textAlign: 'center' },
  bankList: { maxHeight: 380 },
  bankItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  bankItemText: { flex: 1, fontSize: 15, fontFamily: Fonts.medium },
  detailsForm: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  changeBankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  changeBankName: { flex: 1, fontSize: 15, fontFamily: Fonts.semiBold },
  changeBankAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  changeBankLabel: { fontSize: 13, fontFamily: Fonts.semiBold },
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
  defaultRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  defaultTexts: { flex: 1 },
  defaultLabel: { fontSize: 14, fontFamily: Fonts.semiBold },
  defaultHint: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 },
  saveBtn: { height: 52, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 16, fontFamily: Fonts.bold, color: '#FFFFFF' },
});
