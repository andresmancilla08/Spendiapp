import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';

export interface InsightItem {
  key: string;
  icon: string;                 // emoji
  label: string;
  value: string;
  delta?: string;
  tone?: 'pos' | 'neg' | 'warn' | 'muted';
}

export default function InsightsGrid({ items }: { items: InsightItem[] }) {
  const { colors, isDark } = useTheme();
  const toneColor = (t?: string) =>
    t === 'pos' ? colors.success
    : t === 'neg' ? colors.expense
    : t === 'warn' ? '#FFB74D'
    : colors.textTertiary;

  return (
    <View style={styles.grid}>
      {items.map((it) => (
        <View
          key={it.key}
          style={[styles.cell, {
            backgroundColor: colors.surfaceElevated,
            borderColor: isDark ? colors.primary + '22' : colors.border,
          }]}
        >
          <Text style={[styles.k, { color: colors.textSecondary }]} numberOfLines={1}>
            {it.icon}  {it.label}
          </Text>
          <Text
            style={[styles.big, { color: colors.textPrimary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {it.value}
          </Text>
          {!!it.delta && (
            <Text style={[styles.delta, { color: toneColor(it.tone) }]} numberOfLines={1}>
              {it.delta}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    width: '47.8%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  k: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.3, textTransform: 'uppercase' },
  big: { fontSize: 21, fontFamily: Fonts.extraBold, marginTop: 8, letterSpacing: -0.5 },
  delta: { fontSize: 11, fontFamily: Fonts.bold, marginTop: 4 },
});
