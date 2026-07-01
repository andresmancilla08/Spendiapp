import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';

export interface CategorySegment {
  key: string;
  label: string;
  amount: number;
  color: string;
}

interface Props {
  segments: CategorySegment[];   // ordenados desc
  total: number;
  formatCurrency: (n: number) => string;
}

/**
 * Desglose de gastos por categoría en barras horizontales. Escala de 1 a N
 * categorías sin verse mal (a diferencia del donut, feo con una sola). Premium.
 */
export default function CategoryBars({ segments, total, formatCurrency }: Props) {
  const { colors } = useTheme();
  return (
    <View>
      {segments.map((s) => {
        const pct = total > 0 ? Math.round((s.amount / total) * 100) : 0;
        return (
          <View key={s.key} style={styles.row}>
            <View style={styles.top}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{s.label}</Text>
              <Text style={[styles.amount, { color: colors.textPrimary }]}>{formatCurrency(s.amount)}</Text>
            </View>
            <View style={styles.barRow}>
              <View style={[styles.track, { backgroundColor: colors.border }]}>
                <View style={[styles.fill, { width: `${Math.max(pct, 2)}%`, backgroundColor: s.color }]} />
              </View>
              <Text style={[styles.pct, { color: colors.textTertiary }]}>{pct}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  dot: { width: 9, height: 9, borderRadius: 3 },
  name: { flex: 1, fontSize: 13, fontFamily: Fonts.semiBold },
  amount: { fontSize: 13, fontFamily: Fonts.extraBold, letterSpacing: -0.2 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  pct: { fontSize: 11, fontFamily: Fonts.bold, minWidth: 34, textAlign: 'right' },
});
