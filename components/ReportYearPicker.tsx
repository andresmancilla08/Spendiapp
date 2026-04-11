// components/ReportYearPicker.tsx
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';

interface ReportYearPickerProps {
  years: number[];
  selected: number;
  onSelect: (year: number) => void;
}

export default function ReportYearPicker({ years, selected, onSelect }: ReportYearPickerProps) {
  const { colors } = useTheme();

  if (years.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {years.map((year) => {
        const isSelected = year === selected;
        return (
          <TouchableOpacity
            key={year}
            onPress={() => onSelect(year)}
            activeOpacity={0.75}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              {year}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 4,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
  },
});
