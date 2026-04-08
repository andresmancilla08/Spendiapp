import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import ScreenBackground from '../../components/ScreenBackground';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useAuthStore } from '../../store/authStore';
import { Fonts } from '../../config/fonts';
import { COLOMBIAN_BANKS, BANK_CATEGORY_LABELS, Bank } from '../../config/banks';
import { addCard, deleteCard, useCards } from '../../hooks/useCards';
import type { CardType } from '../../types/card';
import { TextInput } from 'react-native';
import BankLogo from '../../components/BankLogo';

const CATEGORIES: Bank['category'][] = ['traditional', 'digital', 'other'];

export default function SelectCardsScreen() {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { user, setJustRegistered } = useAuthStore();
  const { cards } = useCards(user?.uid ?? '');

  const [expandedBankId, setExpandedBankId] = useState<string | null>(null);
  const [formType, setFormType] = useState<CardType>('debit');
  const [formNickname, setFormNickname] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleToggleBank = (bankId: string) => {
    setFormNickname('');
    setFormType('debit');
    setFormError('');
    setExpandedBankId(expandedBankId === bankId ? null : bankId);
  };

  const handleAddCard = async (bank: Bank) => {
    if (!user) return;
    const trimmed = formNickname.trim();
    if (!trimmed) { setFormError(t('selectCards.nicknameError')); return; }
    setFormError('');
    setFormSaving(true);
    try {
      await addCard(user.uid, bank.id, bank.name, formType, trimmed);
      setFormNickname('');
      setFormType('debit');
      setExpandedBankId(null);
    } catch {
      setFormError(t('selectCards.saveError'));
    } finally {
      setFormSaving(false);
    }
  };

  const handleDone = () => {
    if (cards.length > 0) {
      const n = cards.length;
      showToast(
        n === 1 ? t('selectCards.toastOne') : t('selectCards.toastMany', { n }),
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
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('selectCards.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('selectCards.subtitle')}
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
                                  {card.nickname ? `${card.nickname} · ${card.type === 'credit' ? t('selectCards.credit') : t('selectCards.debit')}` : (card.type === 'credit' ? t('selectCards.credit') : t('selectCards.debit'))}
                                </Text>
                                <TouchableOpacity
                                  onPress={async () => {
                                    try {
                                      await deleteCard(card.id);
                                    } catch {
                                      showToast(t('selectCards.deleteError'), 'error');
                                    }
                                  }}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
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
                              {(['debit', 'credit'] as CardType[]).map((cardTypeOpt) => (
                                <TouchableOpacity
                                  key={cardTypeOpt}
                                  style={[
                                    styles.typeChip,
                                    { borderColor: colors.border, backgroundColor: colors.surface },
                                    formType === cardTypeOpt && { backgroundColor: colors.primary, borderColor: colors.primary },
                                  ]}
                                  onPress={() => setFormType(cardTypeOpt)}
                                  activeOpacity={0.8}
                                >
                                  <Text style={[
                                    styles.typeChipText,
                                    { color: colors.textSecondary },
                                    formType === cardTypeOpt && { color: '#FFFFFF' },
                                  ]}>
                                    {cardTypeOpt === 'debit' ? t('selectCards.debit') : t('selectCards.credit')}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>

                            {/* Nombre / apodo */}
                            <Text style={[styles.pinLabel, { color: colors.textSecondary }]}>
                              {t('selectCards.nicknameLabel')}
                            </Text>
                            <TextInput
                              style={[
                                styles.nicknameInput,
                                {
                                  borderColor: formError ? colors.error : colors.border,
                                  color: colors.textPrimary,
                                  backgroundColor: colors.surface,
                                },
                              ]}
                              placeholder={t('selectCards.nicknamePlaceholder')}
                              placeholderTextColor={colors.textTertiary}
                              maxLength={15}
                              autoCapitalize="words"
                              value={formNickname}
                              onChangeText={(v) => { setFormError(''); setFormNickname(v); }}
                            />

                            {formError !== '' && (
                              <Text style={[styles.formError, { color: colors.error }]}>{formError}</Text>
                            )}

                            {/* Botón agregar */}
                            <TouchableOpacity
                              style={[
                                styles.addBtn,
                                { backgroundColor: colors.primary },
                                (!formNickname.trim() || formSaving) && { opacity: 0.4 },
                              ]}
                              onPress={() => handleAddCard(bank)}
                              disabled={!formNickname.trim() || formSaving}
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

      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
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
  pinLabel: { fontSize: 12, fontFamily: Fonts.semiBold, alignSelf: 'flex-start' },
  nicknameInput: { height: 44, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, fontSize: 14, fontFamily: Fonts.semiBold },
  formError: { fontSize: 12, fontFamily: Fonts.regular },
  addBtn: { height: 46, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: '#FFFFFF' },
  footer: { flexDirection: 'column', paddingHorizontal: 20, paddingVertical: 16, gap: 10, borderTopWidth: 1 },
  skipBtn: { height: 52, borderRadius: 50, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 16, fontFamily: Fonts.semiBold },
  doneBtn: { height: 52, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { fontSize: 16, fontFamily: Fonts.bold },
});
