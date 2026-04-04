import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useAuthStore } from '../../store/authStore';
import { Fonts } from '../../config/fonts';
import { COLOMBIAN_BANKS, BANK_CATEGORY_LABELS, Bank } from '../../config/banks';
import { addCard, deleteCard, useCards } from '../../hooks/useCards';
import type { CardType } from '../../types/card';
import BankLogo from '../../components/BankLogo';

const CATEGORIES: Bank['category'][] = ['traditional', 'digital', 'other'];

export default function SelectCardsScreen() {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { user, setJustRegistered } = useAuthStore();
  const { cards } = useCards(user?.uid ?? '');

  const [expandedBankId, setExpandedBankId] = useState<string | null>(null);
  const [formType, setFormType] = useState<CardType>('debit');
  const [formLastFour, setFormLastFour] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [focusedDigit, setFocusedDigit] = useState<number | null>(null);
  const digitRefs = useRef<(TextInput | null)[]>([null, null, null, null]);

  const handleDigitChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const chars = formLastFour.padEnd(4, '').split('');
    chars[index] = digit;
    const next = chars.join('').trimEnd();
    setFormError('');
    setFormLastFour(next);
    if (digit && index < 3) digitRefs.current[index + 1]?.focus();
  };

  const handleDigitKey = (key: string, index: number) => {
    if (key === 'Backspace' && !formLastFour[index] && index > 0) {
      const chars = formLastFour.padEnd(4, '').split('');
      chars[index - 1] = '';
      setFormLastFour(chars.join('').trimEnd());
      digitRefs.current[index - 1]?.focus();
    }
  };

  const gradientColors: [string, string, string] = isDark
    ? ['#0D1A1C', '#062830', '#003840']
    : ['#FFFFFF', '#F5F9FA', '#E0F7FA'];

  const handleToggleBank = (bankId: string) => {
    setFormLastFour('');
    setFormType('debit');
    setFormError('');
    setFocusedDigit(null);
    setExpandedBankId(expandedBankId === bankId ? null : bankId);
  };

  const handleAddCard = async (bank: Bank) => {
    if (!user) return;
    if (formLastFour.length !== 4) { setFormError('Ingresa exactamente 4 dígitos'); return; }
    setFormError('');
    setFormSaving(true);
    try {
      await addCard(user.uid, bank.id, bank.name, formType, formLastFour);
      setFormLastFour('');
      setFormType('debit');
      setExpandedBankId(null);
    } catch {
      setFormError('No se pudo agregar la tarjeta');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDone = () => {
    if (cards.length > 0) {
      const n = cards.length;
      showToast(
        n === 1 ? '1 tarjeta agregada correctamente' : `${n} tarjetas agregadas correctamente`,
        'success',
      );
    }
    setJustRegistered(false);
    router.replace('/(tabs)/');
  };

  const handleSkip = () => {
    setJustRegistered(false);
    router.replace('/(tabs)/');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: gradientColors[0] }]}>
      <LinearGradient colors={gradientColors} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.gradient}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>¿Qué tarjetas tienes?</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Selecciona tus tarjetas para llevar un mejor control de tus gastos.
          </Text>
        </View>

        {/* Lista de bancos */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {CATEGORIES.map((cat) => {
            const banksInCat = COLOMBIAN_BANKS.filter((b) => b.category === cat);
            return (
              <View key={cat} style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
                  {BANK_CATEGORY_LABELS[cat].toUpperCase()}
                </Text>

                <View style={[styles.bankGroup, { backgroundColor: colors.surface }]}>
                  {banksInCat.map((bank, idx) => {
                    const isExpanded = expandedBankId === bank.id;
                    const cardsForBank = cards.filter((c) => c.bankId === bank.id);
                    const isLast = idx === banksInCat.length - 1;

                    return (
                      <View
                        key={bank.id}
                        style={[
                          styles.bankRow,
                          !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                        ]}
                      >
                        {/* Bank name row */}
                        <TouchableOpacity
                          style={styles.bankNameRow}
                          onPress={() => handleToggleBank(bank.id)}
                          activeOpacity={0.7}
                        >
                          <BankLogo bankId={bank.id} size={36} radius={10} />
                          <Text style={[styles.bankName, { color: colors.textPrimary }]}>{bank.name}</Text>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'add-circle-outline'}
                            size={20}
                            color={isExpanded ? colors.primary : colors.textTertiary}
                          />
                        </TouchableOpacity>

                        {/* Tarjetas ya agregadas para este banco */}
                        {cardsForBank.length > 0 && (
                          <View style={styles.addedCards}>
                            {cardsForBank.map((card) => (
                              <View key={card.id} style={[styles.addedChip, { backgroundColor: colors.primaryLight }]}>
                                <Text style={[styles.addedChipText, { color: colors.primary }]}>
                                  {`•••• ${card.lastFour} · ${card.type === 'credit' ? 'Crédito' : 'Débito'}`}
                                </Text>
                                <TouchableOpacity onPress={() => deleteCard(card.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                  <Ionicons name="close-circle" size={16} color={colors.primary} />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Formulario expandido */}
                        {isExpanded && (
                          <View style={[styles.expandedForm, { backgroundColor: colors.backgroundSecondary }]}>
                            {/* Chips débito / crédito */}
                            <View style={styles.typeRow}>
                              {(['debit', 'credit'] as CardType[]).map((t) => (
                                <TouchableOpacity
                                  key={t}
                                  style={[
                                    styles.typeChip,
                                    { borderColor: colors.border, backgroundColor: colors.surface },
                                    formType === t && { backgroundColor: colors.primary, borderColor: colors.primary },
                                  ]}
                                  onPress={() => setFormType(t)}
                                  activeOpacity={0.8}
                                >
                                  <Text style={[
                                    styles.typeChipText,
                                    { color: colors.textSecondary },
                                    formType === t && { color: '#FFFFFF' },
                                  ]}>
                                    {t === 'debit' ? 'Débito' : 'Crédito'}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>

                            {/* Últimos 4 dígitos — 4 cajas individuales */}
                            <View style={styles.digitRow}>
                              {[0, 1, 2, 3].map((i) => {
                                const filled = !!formLastFour[i];
                                const focused = focusedDigit === i;
                                const borderColor = formError
                                  ? colors.error
                                  : focused
                                  ? colors.borderFocus
                                  : filled
                                  ? colors.primary
                                  : colors.border;
                                const bg = focused || filled ? colors.primaryLight : colors.surface;
                                return (
                                  <TextInput
                                    key={i}
                                    ref={(r) => { digitRefs.current[i] = r; }}
                                    style={[styles.digitBox, { borderColor, backgroundColor: bg, color: colors.primary }]}
                                    value={formLastFour[i] ?? ''}
                                    onChangeText={(t) => handleDigitChange(t, i)}
                                    onKeyPress={(e) => handleDigitKey(e.nativeEvent.key, i)}
                                    onFocus={() => setFocusedDigit(i)}
                                    onBlur={() => setFocusedDigit(null)}
                                    keyboardType="numeric"
                                    maxLength={1}
                                    textAlign="center"
                                    caretHidden
                                  />
                                );
                              })}
                            </View>

                            {formError !== '' && (
                              <Text style={[styles.formError, { color: colors.error }]}>{formError}</Text>
                            )}

                            {/* Botón agregar */}
                            <TouchableOpacity
                              style={[
                                styles.addBtn,
                                { backgroundColor: colors.primary },
                                (formLastFour.length !== 4 || formSaving) && { opacity: 0.4 },
                              ]}
                              onPress={() => handleAddCard(bank)}
                              disabled={formLastFour.length !== 4 || formSaving}
                              activeOpacity={0.85}
                            >
                              {formSaving
                                ? <ActivityIndicator color="#FFFFFF" size="small" />
                                : <Text style={styles.addBtnText}>Agregar tarjeta</Text>
                              }
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={handleDone}
            activeOpacity={0.85}
          >
            <Text style={[styles.doneBtnText, { color: '#FFFFFF' }]}>
              {cards.length > 0 ? `Listo (${cards.length})` : 'Listo'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.skipBtn, { borderColor: colors.primary }]}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipText, { color: colors.primary }]}>Omitir por ahora</Text>
          </TouchableOpacity>
        </View>

      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  gradient: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontFamily: Fonts.bold, marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: Fonts.regular, lineHeight: 22 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  bankGroup: { borderRadius: 16, overflow: 'hidden' },
  bankRow: { paddingVertical: 4 },
  bankNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  bankName: { fontSize: 15, fontFamily: Fonts.medium, flex: 1 },
  addedCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  addedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  addedChipText: { fontSize: 12, fontFamily: Fonts.semiBold },
  expandedForm: { marginHorizontal: 12, marginBottom: 12, padding: 16, borderRadius: 12, gap: 12 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, alignItems: 'center' },
  typeChipText: { fontSize: 13, fontFamily: Fonts.semiBold },
  digitRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  digitBox: { width: 44, height: 44, borderRadius: 10, borderWidth: 1.5, fontSize: 18, fontFamily: Fonts.bold },
  formError: { fontSize: 12, fontFamily: Fonts.regular },
  addBtn: { height: 46, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: '#FFFFFF' },
  footer: { flexDirection: 'column', paddingHorizontal: 20, paddingVertical: 16, gap: 10, borderTopWidth: 1 },
  skipBtn: { height: 52, borderRadius: 50, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 16, fontFamily: Fonts.semiBold },
  doneBtn: { height: 52, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { fontSize: 16, fontFamily: Fonts.bold },
});
