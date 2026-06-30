import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';
import { useProMotion } from '../../hooks/useProMotion';
import type { MonthBucket } from '../../hooks/useMonthlyTrend';

interface Props {
  data: MonthBucket[];
  metric: 'balance' | 'expenses' | 'income';
  monthLabels: string[];           // 12 nombres localizados
  activeIndex: number;             // índice del mes seleccionado dentro de data
  formatCurrency: (n: number) => string;
}

function Bar({ ratio, active, delay }: { ratio: number; active: boolean; delay: number }) {
  const { colors } = useTheme();
  const { animate } = useProMotion();
  const h = useRef(new Animated.Value(animate ? 0 : ratio)).current;

  useEffect(() => {
    if (!animate) { h.setValue(ratio); return; }
    const a = Animated.timing(h, {
      toValue: ratio,
      duration: 150,
      delay,
      useNativeDriver: false,
    });
    a.start();
    return () => a.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratio, animate]);

  const heightPct = h.interpolate({ inputRange: [0, 1], outputRange: ['2%', '100%'] });

  return (
    <View style={styles.barWrap}>
      <Animated.View style={[styles.bar, { height: heightPct }]}>
        {active ? (
          <LinearGradient colors={[colors.primary, colors.secondary]} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary + (active ? 'FF' : '33') }]} />
        )}
      </Animated.View>
    </View>
  );
}

export default function TrendBars({ data, metric, monthLabels, activeIndex, formatCurrency }: Props) {
  const { colors } = useTheme();
  const values = data.map((d) => (metric === 'balance' ? Math.max(0, d.balance) : d[metric]));
  const max = Math.max(1, ...values);
  const activeVal = data[activeIndex] ? values[activeIndex] : 0;

  return (
    <View>
      <View style={styles.peakRow}>
        <Text style={[styles.peakVal, { color: colors.primary }]}>{formatCurrency(activeVal)}</Text>
        <Text style={[styles.peakLbl, { color: colors.textTertiary }]}>
          {monthLabels[data[activeIndex]?.month] ?? ''}
        </Text>
      </View>
      <View style={styles.bars}>
        {data.map((d, i) => (
          <View key={`${d.year}_${d.month}`} style={styles.col}>
            <Bar ratio={values[i] / max} active={i === activeIndex} delay={i * 20} />
            <Text style={[styles.bm, { color: i === activeIndex ? colors.primary : colors.textTertiary }]}>
              {(monthLabels[d.month] ?? '').slice(0, 3)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  peakRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  peakVal: { fontSize: 18, fontFamily: Fonts.extraBold, letterSpacing: -0.5 },
  peakLbl: { fontSize: 11, fontFamily: Fonts.semiBold, textTransform: 'capitalize' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 110, paddingTop: 8 },
  col: { flex: 1, alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' },
  barWrap: { width: '62%', flex: 1, justifyContent: 'flex-end', minHeight: 4 },
  bar: { width: '100%', borderRadius: 6, overflow: 'hidden', minHeight: 4 },
  bm: { fontSize: 10, fontFamily: Fonts.bold },
});
