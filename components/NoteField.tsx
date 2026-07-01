import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import AppIcon from './AppIcon';
import { Fonts } from '../config/fonts';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function NoteField({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(value.trim() !== '');

  if (!open) {
    return (
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.7} style={styles.toggle}>
        <AppIcon name="add" size={15} color={colors.primary} />
        <Text style={[styles.toggleText, { color: colors.primary }]}>{t('addTransaction.addNote')}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textTertiary }]}>{t('addTransaction.notesLabel')}</Text>
        <TouchableOpacity
          onPress={() => { onChange(''); setOpen(false); }}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppIcon name="close" size={15} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
      <TextInput
        style={[styles.input, { color: colors.textPrimary }]}
        value={value}
        onChangeText={onChange}
        placeholder={t('addTransaction.notesPlaceholder')}
        placeholderTextColor={colors.textSecondary}
        multiline
        maxLength={280}
        returnKeyType="done"
        autoFocus
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleText: { fontSize: 14, fontFamily: Fonts.semiBold },
  wrap: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: { fontSize: 15, fontFamily: Fonts.regular, minHeight: 40, textAlignVertical: 'top' },
});
