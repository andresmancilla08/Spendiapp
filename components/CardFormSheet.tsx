import { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { COLOMBIAN_BANKS, Bank } from '../config/banks';
import { addCard } from '../hooks/useCards';
import type { CardType } from '../types/card';

interface CardFormSheetProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

export default function CardFormSheet({ visible, onClose, userId }: CardFormSheetProps) {
  const { colors } = useTheme();

  const [step, setStep] = useState<'bank' | 'details'>('bank');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [cardType, setCardType] = useState<CardType>('debit');
  const [lastFour, setLastFour] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setStep('bank');
    setSelectedBank(null);
    setCardType('debit');
    setLastFour('');
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
    if (lastFour.length !== 4) { setError('Ingresa exactamente 4 dígitos'); return; }
    setError('');
    setSaving(true);
    try {
      await addCard(userId, selectedBank.id, selectedBank.name, cardType, lastFour);
      handleClose();
    } catch {
      setError('No se pudo guardar la tarjeta. Intenta de nuevo.');
      setSaving(false);
    }
  };

  const canSave = lastFour.length === 4 && !saving;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]} />
      </TouchableWithoutFeedback>

      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
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
            {step === 'bank' ? 'Selecciona el banco' : selectedBank?.name ?? ''}
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
                <Text style={[styles.bankItemText, { color: colors.textPrimary }]}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          />
        )}

        {/* Paso 2: Tipo + últimos 4 */}
        {step === 'details' && (
          <View style={styles.detailsForm}>
            {/* Chips tipo */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tipo de tarjeta</Text>
            <View style={styles.typeRow}>
              {(['debit', 'credit'] as CardType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                    cardType === t && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setCardType(t)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.typeChipText,
                    { color: colors.textSecondary },
                    cardType === t && { color: '#FFFFFF' },
                  ]}>
                    {t === 'debit' ? 'Débito' : 'Crédito'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Últimos 4 dígitos */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Últimos 4 dígitos</Text>
            <TextInput
              style={[styles.lastFourInput, { borderColor: error ? colors.error : colors.border, color: colors.textPrimary, backgroundColor: colors.backgroundSecondary }]}
              placeholder="0000"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              maxLength={4}
              value={lastFour}
              onChangeText={(v) => { setError(''); setLastFour(v.replace(/\D/g, '').slice(0, 4)); }}
            />
            {error !== '' && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}

            {/* Botón guardar */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }, !canSave && { opacity: 0.4 }]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.saveBtnText}>Agregar tarjeta</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  bankItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  bankItemText: { fontSize: 15, fontFamily: Fonts.medium },
  detailsForm: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  typeChipText: { fontSize: 14, fontFamily: Fonts.semiBold },
  lastFourInput: { height: 56, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, fontSize: 22, fontFamily: Fonts.bold, letterSpacing: 6, textAlign: 'center' },
  errorText: { fontSize: 12, fontFamily: Fonts.regular },
  saveBtn: { height: 52, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 16, fontFamily: Fonts.bold, color: '#FFFFFF' },
});
