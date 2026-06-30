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
  const cols = colors as Record<string, string>;
  const toneColor = (t?: string) =>
    t === 'pos' ? colors.success
    : t === 'neg' ? colors.expense
    : t === 'warn' ? (cols.warning ?? '#FFB74D')
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
          <View style={styles.kRow}>
            <Text style={styles.kIcon}>{it.icon}</Text>
            <Text style={[styles.k, { color: colors.textSecondary }]} numberOfLines={2}>
              {it.label}
            </Text>
          </View>
          <Text
            style={[styles.big, { color: colors.textPrimary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
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
  kRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, minHeight: 30 },
  kIcon: { fontSize: 13, lineHeight: 15 },
  k: { flex: 1, fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.3, textTransform: 'uppercase', lineHeight: 14 },
  big: { fontSize: 21, fontFamily: Fonts.extraBold, marginTop: 6, letterSpacing: -0.5 },
  delta: { fontSize: 11, fontFamily: Fonts.bold, marginTop: 4 },
});
