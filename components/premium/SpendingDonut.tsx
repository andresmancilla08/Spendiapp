import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';

export interface DonutSegment {
  key: string;
  label: string;
  amount: number;
  color: string;
}

interface Props {
  segments: DonutSegment[];      // ya ordenados desc, máx ~6
  total: number;
  formatCurrency: (n: number) => string;
  totalLabel: string;
}

const R = 15.915;                // circunferencia ≈ 100 → % = longitud de dash
const CIRC = 2 * Math.PI * R;
const STROKE = 3.4;

export default function SpendingDonut({ segments, total, formatCurrency, totalLabel }: Props) {
  const { colors } = useTheme();

  // Gap entre segmentos solo si hay más de uno (una sola categoría = anillo continuo).
  const gap = segments.length > 1 ? 2.2 : 0;
  let offset = 0;
  const arcs = segments.map((s) => {
    const pct = total > 0 ? (s.amount / total) * 100 : 0;
    const full = (pct / 100) * CIRC;
    const dash = Math.max(0.5, full - gap);
    const arc = { color: s.color, dash, off: offset };
    offset += full;
    return arc;
  });

  const compact = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
    if (n >= 1000) return `$${Math.round(n / 1000)}K`;
    return `$${Math.round(n)}`;
  };

  return (
    <View style={styles.row}>
      <View style={styles.chartWrap}>
        <Svg width={120} height={120} viewBox="0 0 42 42">
          {/* transform como atributo SVG (evita el warning transform-origin en web) */}
          <G transform="rotate(-90 21 21)">
            <Circle cx="21" cy="21" r={R} fill="transparent" stroke={colors.border} strokeWidth={STROKE} opacity={0.5} />
            {arcs.map((a, i) => (
              <Circle
                key={i}
                cx="21"
                cy="21"
                r={R}
                fill="transparent"
                stroke={a.color}
                strokeWidth={STROKE}
                strokeDasharray={`${a.dash} ${CIRC - a.dash}`}
                strokeDashoffset={-a.off}
                strokeLinecap="round"
              />
            ))}
          </G>
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.centerVal, { color: colors.textPrimary }]}>{compact(total)}</Text>
          <Text style={[styles.centerLbl, { color: colors.textTertiary }]}>{totalLabel}</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.amount / total) * 100) : 0;
          return (
            <View key={s.key} style={styles.lg}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={[styles.lgName, { color: colors.textPrimary }]} numberOfLines={1}>{s.label}</Text>
              <Text style={[styles.lgPct, { color: colors.textSecondary }]}>{pct}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  chartWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  centerVal: { fontSize: 19, fontFamily: Fonts.extraBold, letterSpacing: -0.5 },
  centerLbl: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1, marginTop: 2 },
  legend: { flex: 1, gap: 10 },
  lg: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 3 },
  lgName: { flex: 1, fontSize: 13, fontFamily: Fonts.semiBold },
  lgPct: { fontSize: 12, fontFamily: Fonts.bold },
});
