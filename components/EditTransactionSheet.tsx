import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  FlatList,
  Switch,
} from 'react-native';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import type { Transaction } from '../types/transaction';

export type EditAction = 'saved' | 'deleted' | 'duplicated';

export interface EditTransactionSheetProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onActionDone: (action: EditAction) => void;
}

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  food:          { icon: '🍽️', color: '#EF4444' },
  transport:     { icon: '🚗', color: '#F59E0B' },
  health:        { icon: '💊', color: '#10B981' },
  entertainment: { icon: '🎉', color: '#8B5CF6' },
  shopping:      { icon: '🛍️', color: '#EC4899' },
  home:          { icon: '🏡', color: '#00897B' },
  salary:        { icon: '💰', color: '#00ACC1' },
  other:         { icon: '📌', color: '#737879' },
};

const EXPENSE_CATEGORIES = ['food', 'transport', 'health', 'entertainment', 'shopping', 'home', 'other'];
const INCOME_CATEGORIES  = ['salary', 'other'];

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatDisplayDate(date: Date): string {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getActualId(transaction: { id: string; isVirtualFixed?: boolean }): string {
  return transaction.isVirtualFixed
    ? transaction.id.split('_virtual_')[0]
    : transaction.id;
}

const MIN_YEAR = 2020;

export default function EditTransactionSheet({ visible, transaction, onClose, onActionDone }: EditTransactionSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const SHEET_HEIGHT = Math.round(screenHeight * 0.88);

  const CATEGORY_LABELS: Record<string, string> = {
    food:          t('categories.names.food'),
    transport:     t('categories.names.transport'),
    health:        t('categories.names.health'),
    entertainment: t('categories.names.entertainment'),
    shopping:      t('categories.names.shopping'),
    home:          t('categories.names.home'),
    salary:        t('categories.names.salary'),
    other:         t('categories.names.other'),
  };

  const slideAnim = useRef(new Animated.Value(0)).current;

  // Core fields
  const [editDesc, setEditDesc]         = useState('');
  const [editAmount, setEditAmount]     = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLoading, setEditLoading]   = useState(false);
  const [editError, setEditError]       = useState('');
  const [editIsFixed, setEditIsFixed]   = useState(false);

  // Date picker state
  const now = new Date();
  const [selectedDate, setSelectedDate]     = useState(now);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerMode, setPickerMode]         = useState<'day' | 'month'>('day');
  const [pickerYear, setPickerYear]         = useState(now.getFullYear());
  const [pickerMonth, setPickerMonth]       = useState(now.getMonth());
  const [pickerDay, setPickerDay]           = useState(now.getDate());

  const daysInMonth  = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const nowForPicker = new Date();

  // Sync selectedDate from picker values
  useEffect(() => {
    const validDay = Math.min(pickerDay, daysInMonth);
    setSelectedDate(new Date(pickerYear, pickerMonth, validDay));
  }, [pickerYear, pickerMonth, pickerDay, daysInMonth]);

  const prevMonth = () => {
    if (pickerMonth === 0) { setPickerMonth(11); setPickerYear((y) => y - 1); }
    else { setPickerMonth((m) => m - 1); }
  };

  const nextMonth = () => {
    if (pickerMonth === 11) { setPickerMonth(0); setPickerYear((y) => y + 1); }
    else { setPickerMonth((m) => m + 1); }
  };

  // Init form from transaction
  useEffect(() => {
    if (transaction) {
      setEditDesc(transaction.description);
      setEditAmount(String(transaction.amount));
      setEditCategory(transaction.category);
      setEditError('');
      setEditIsFixed(transaction.isFixed ?? false);
      setDatePickerOpen(false);
      setPickerMode('day');
      const d = transaction.date instanceof Date ? transaction.date : new Date((transaction.date as any).seconds * 1000);
      setSelectedDate(d);
      setPickerYear(d.getFullYear());
      setPickerMonth(d.getMonth());
      setPickerDay(d.getDate());
    }
  }, [transaction]);

  const animateIn = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 1, duration: 350,
      easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [slideAnim]);

  const animateOut = useCallback((callback: () => void) => {
    Animated.timing(slideAnim, {
      toValue: 0, duration: 280,
      easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web',
    }).start(() => callback());
  }, [slideAnim]);

  useEffect(() => {
    if (visible) animateIn();
  }, [visible, animateIn]);

  const handleClose = useCallback(() => {
    animateOut(() => { slideAnim.setValue(0); onClose(); });
  }, [animateOut, onClose, slideAnim]);

  const handleSave = async () => {
    if (!transaction) return;
    const parsed = parseFloat(editAmount.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) return;
    setEditLoading(true);
    setEditError('');
    try {
      await updateDoc(doc(db, 'transactions', getActualId(transaction)), {
        description: editDesc,
        amount: parsed,
        category: editCategory,
        date: Timestamp.fromDate(selectedDate),
        isFixed: editIsFixed,
      });
      handleClose();
      onActionDone('saved');
    } catch {
      setEditError(t('history.edit.saveError'));
      setEditLoading(false);
    }
  };

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [SHEET_HEIGHT, 0] });
  const activeCategories = transaction?.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const parsedAmount = parseFloat(editAmount.replace(',', '.'));
  const isSaveDisabled = editLoading || isNaN(parsedAmount) || parsedAmount <= 0 || editCategory === '';

  const dateDisplayText = formatDisplayDate(selectedDate);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, {
          opacity: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
        }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheetWrapper, { height: SHEET_HEIGHT, transform: [{ translateY }] }]} pointerEvents="box-none">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, height: SHEET_HEIGHT }]}>
            <View style={styles.dragHandleRow}>
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.titleRow}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{t('history.edit.title')}</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScrollContent} keyboardShouldPersistTaps="handled">
              {transaction?.isVirtualFixed && (
                <View style={[styles.fixedNoteBar, { backgroundColor: `${colors.primary}18` }]}>
                  <Ionicons name="repeat" size={14} color={colors.primary} />
                  <Text style={[styles.fixedNoteText, { color: colors.primary }]}>{t('history.edit.fixedNote')}</Text>
                </View>
              )}

              {/* Descripción */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('history.edit.descriptionLabel').toUpperCase()}</Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                <TextInput style={[styles.textInput, { color: colors.textPrimary }]} value={editDesc} onChangeText={setEditDesc} placeholderTextColor={colors.textSecondary} returnKeyType="done" />
              </View>

              {/* Monto */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('history.edit.amountLabel').toUpperCase()}</Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                <TextInput style={[styles.textInput, { color: colors.textPrimary }]} value={editAmount} onChangeText={setEditAmount} keyboardType="numeric" returnKeyType="done" />
              </View>

              {/* Fecha */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('history.edit.dateLabel').toUpperCase()}</Text>
              <View style={[styles.dateCard, { borderColor: colors.border, overflow: 'hidden' }]}>
                <TouchableOpacity
                  style={[styles.dateRow, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => setDatePickerOpen((v) => !v)}
                  activeOpacity={0.8}
                >
                  <View style={styles.dateRowLeft}>
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{dateDisplayText}</Text>
                  </View>
                  <Ionicons
                    name={datePickerOpen ? 'chevron-up' : 'chevron-down'}
                    size={15}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {datePickerOpen && (
                  <View style={[styles.datePickerBody, { borderTopColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                    {pickerMode === 'day' ? (
                      <>
                        <View style={styles.pickerMonthRow}>
                          <TouchableOpacity style={styles.pickerNavBtn} onPress={prevMonth} activeOpacity={0.7}>
                            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setPickerMode('month')} activeOpacity={0.7} style={styles.pickerLabelBtn}>
                            <Text style={[styles.pickerMonthLabel, { color: colors.primary }]}>
                              {MONTHS_ES[pickerMonth].toUpperCase()} {pickerYear}
                            </Text>
                            <Ionicons name="chevron-down" size={14} color={colors.primary} style={{ marginLeft: 4, marginTop: 1 }} />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.pickerNavBtn} onPress={nextMonth} activeOpacity={0.7}>
                            <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
                          </TouchableOpacity>
                        </View>

                        <FlatList
                          horizontal
                          data={Array.from({ length: daysInMonth }, (_, i) => i + 1)}
                          keyExtractor={(item) => String(item)}
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
                          renderItem={({ item: day }) => {
                            const isCurrentMonth = pickerMonth === nowForPicker.getMonth() && pickerYear === nowForPicker.getFullYear();
                            const isSelected = day === pickerDay;
                            const isTodayDay = day === nowForPicker.getDate() && isCurrentMonth;
                            return (
                              <TouchableOpacity
                                style={[
                                  styles.dayCircle,
                                  isSelected && { backgroundColor: colors.primary },
                                  !isSelected && isTodayDay && { borderWidth: 1.5, borderColor: colors.tertiary ?? colors.primary },
                                  !isSelected && !isTodayDay && { backgroundColor: colors.surface },
                                ]}
                                onPress={() => setPickerDay(day)}
                                activeOpacity={0.8}
                              >
                                <Text style={[styles.dayText, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                                  {day}
                                </Text>
                              </TouchableOpacity>
                            );
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <View style={styles.pickerMonthRow}>
                          <TouchableOpacity
                            style={styles.pickerNavBtn}
                            onPress={() => setPickerYear((y) => Math.max(MIN_YEAR, y - 1))}
                            activeOpacity={pickerYear <= MIN_YEAR ? 1 : 0.7}
                          >
                            <Ionicons name="chevron-back" size={20} color={pickerYear <= MIN_YEAR ? colors.textSecondary : colors.textPrimary} />
                          </TouchableOpacity>
                          <Text style={[styles.pickerMonthLabel, { color: colors.textPrimary }]}>{pickerYear}</Text>
                          <TouchableOpacity
                            style={styles.pickerNavBtn}
                            onPress={() => setPickerYear((y) => y + 1)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.monthGrid}>
                          {MONTHS_ES.map((name, idx) => {
                            const isSelectedMonth = idx === pickerMonth;
                            return (
                              <TouchableOpacity
                                key={idx}
                                style={[
                                  styles.monthChip,
                                  isSelectedMonth && { backgroundColor: colors.primary },
                                  !isSelectedMonth && { backgroundColor: colors.surface },
                                ]}
                                onPress={() => { setPickerMonth(idx); setPickerMode('day'); }}
                                activeOpacity={0.8}
                              >
                                <Text style={[styles.monthChipText, { color: isSelectedMonth ? '#FFFFFF' : colors.textPrimary }]}>
                                  {name.slice(0, 3)}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    )}
                  </View>
                )}
              </View>

              {/* Categoría */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('history.edit.categoryLabel').toUpperCase()}</Text>
              <View style={styles.categoryGrid}>
                {activeCategories.map((key) => {
                  const meta = CATEGORY_META[key] ?? CATEGORY_META.other;
                  const isSelected = editCategory === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.categoryChip,
                        isSelected
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border },
                      ]}
                      onPress={() => setEditCategory(key)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.chipIcon}>{meta.icon}</Text>
                      <Text style={[styles.chipLabel, { color: isSelected ? '#FFFFFF' : colors.textSecondary }]}>
                        {CATEGORY_LABELS[key] ?? key}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Fijo mensual */}
              {!transaction?.isInstallment && (
                <View style={[styles.fixedToggleRow, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fixedToggleLabel, { color: colors.textPrimary }]}>
                      {t('history.edit.isFixedLabel')}
                    </Text>
                    <Text style={[styles.fixedToggleHint, { color: colors.textTertiary }]}>
                      {t('history.edit.isFixedHint')}
                    </Text>
                  </View>
                  <Switch
                    value={editIsFixed}
                    onValueChange={setEditIsFixed}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#fff"
                  />
                </View>
              )}

              {editError !== '' && <Text style={[styles.errorText, { color: colors.error }]}>{editError}</Text>}

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }, isSaveDisabled && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isSaveDisabled}
                activeOpacity={0.85}
              >
                {editLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>{t('history.edit.saving')}</Text>
                  </View>
                ) : (
                  <Text style={styles.saveButtonText}>{t('history.edit.saveButton')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:           { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000' },
  sheetWrapper:       { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheet:              { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  dragHandleRow:      { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  dragHandle:         { width: 36, height: 4, borderRadius: 2 },
  titleRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  sheetTitle:         { fontSize: 18, fontFamily: Fonts.bold },
  sheetScrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  fixedNoteBar:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, marginTop: 4 },
  fixedNoteText:      { fontSize: 13, fontFamily: Fonts.semiBold, flex: 1 },
  fieldLabel:         { fontSize: 11, fontFamily: Fonts.semiBold, letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  inputWrap:          { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  textInput:          { fontSize: 16, fontFamily: Fonts.regular },
  categoryGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20, marginTop: 4 },
  categoryChip:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  chipIcon:           { fontSize: 14 },
  chipLabel:          { fontSize: 13, fontFamily: Fonts.medium },
  errorText:          { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center', marginBottom: 8 },
  saveButton:         { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 10 },
  saveButtonText:     { fontSize: 15, fontFamily: Fonts.bold, color: '#FFFFFF' },
  buttonDisabled:     { opacity: 0.4 },
  loadingRow:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // Date picker
  dateCard:           { borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  dateRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13 },
  dateRowLeft:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateValue:          { fontSize: 15, fontFamily: Fonts.semiBold },
  datePickerBody:     { borderTopWidth: StyleSheet.hairlineWidth, padding: 14 },
  pickerMonthRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  pickerNavBtn:       { padding: 8 },
  pickerLabelBtn:     { flexDirection: 'row', alignItems: 'center' },
  pickerMonthLabel:   { fontSize: 15, fontFamily: Fonts.bold },
  dayCircle:          { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayText:            { fontSize: 13, fontFamily: Fonts.semiBold },
  monthGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  monthChip:          { width: '30%', paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  monthChipText:      { fontSize: 13, fontFamily: Fonts.semiBold },
  // isFixed toggle
  fixedToggleRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, gap: 12, marginBottom: 16 },
  fixedToggleLabel:   { fontSize: 14, fontFamily: Fonts.semiBold, marginBottom: 2 },
  fixedToggleHint:    { fontSize: 11, fontFamily: Fonts.regular },
});
