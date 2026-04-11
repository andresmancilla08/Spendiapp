// components/ReportYearPicker.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';

interface ReportYearPickerProps {
  years: number[];
  selected: number;
  onSelect: (year: number) => void;
}

export default function ReportYearPicker({ years, selected, onSelect }: ReportYearPickerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  if (years.length === 0) return null;

  return (
    <View style={styles.grid}>
      {years.map((year) => {
        const isSelected = year === selected;
        return (
          <TouchableOpacity
            key={year}
            onPress={() => onSelect(year)}
            activeOpacity={0.75}
            style={[
              styles.card,
              {
                backgroundColor: isSelected ? colors.primary + '20' : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.yearText,
                { color: isSelected ? colors.primary : colors.textPrimary },
              ]}
            >
              {year}
            </Text>
            <Text
              style={[
                styles.yearLabel,
                { color: isSelected ? colors.primary + 'CC' : colors.textTertiary },
              ]}
            >
              {t('reports.fiscalYear')}
            </Text>
            {isSelected && (
              <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    alignSelf: 'stretch',
  },
  card: {
    flex: 1,
    minWidth: 130,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    position: 'relative',
  },
  yearText: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    lineHeight: 32,
  },
  yearLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    marginTop: 3,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
