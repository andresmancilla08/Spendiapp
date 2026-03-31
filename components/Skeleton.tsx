import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const { colors, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const baseColor = isDark ? colors.surfaceSecondary : colors.border;

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: baseColor, opacity },
        style,
      ]}
    />
  );
}

// ── Skeleton para la tarjeta de balance ──────────────────────────
export function BalanceCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[skeletonStyles.balanceCard, { backgroundColor: colors.primaryDark }]}>
      <Skeleton width={120} height={11} borderRadius={6} style={{ opacity: 0.4 } as any} />
      <Skeleton width={200} height={40} borderRadius={8} style={{ marginTop: 12, opacity: 0.35 } as any} />
      <Skeleton width={90} height={28} borderRadius={20} style={{ marginTop: 18, opacity: 0.3 } as any} />
    </View>
  );
}

// ── Skeleton para las cards de ingresos/gastos ───────────────────
export function SummaryCardsSkeleton() {
  return (
    <View style={skeletonStyles.summaryRow}>
      {[0, 1].map((i) => (
        <View key={i} style={skeletonStyles.summaryCard}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <Skeleton width={60} height={10} borderRadius={5} style={{ marginTop: 8 } as any} />
          <Skeleton width={80} height={18} borderRadius={6} style={{ marginTop: 6 } as any} />
        </View>
      ))}
    </View>
  );
}

// ── Skeleton para una fila de transacción ────────────────────────
export function TransactionRowSkeleton() {
  return (
    <View style={skeletonStyles.txRow}>
      <Skeleton width={46} height={46} borderRadius={14} />
      <View style={skeletonStyles.txMeta}>
        <Skeleton width="70%" height={14} borderRadius={6} />
        <Skeleton width="40%" height={11} borderRadius={5} style={{ marginTop: 6 } as any} />
      </View>
      <Skeleton width={64} height={14} borderRadius={6} />
    </View>
  );
}

// ── Skeleton completo del home ───────────────────────────────────
export function HomeScreenSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={skeletonStyles.container}>
      {/* Greeting */}
      <View style={skeletonStyles.greeting}>
        <Skeleton width={120} height={13} borderRadius={6} />
        <Skeleton width={200} height={22} borderRadius={8} style={{ marginTop: 8 } as any} />
      </View>

      {/* Balance card */}
      <BalanceCardSkeleton />

      {/* Summary cards */}
      <SummaryCardsSkeleton />

      {/* Section header */}
      <View style={skeletonStyles.sectionHeader}>
        <Skeleton width={160} height={18} borderRadius={6} />
        <Skeleton width={55} height={13} borderRadius={6} />
      </View>

      {/* Transaction rows */}
      <View style={[skeletonStyles.txCard, { backgroundColor: colors.surface }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={i < 2 ? { borderBottomWidth: 1, borderBottomColor: colors.border } : undefined}>
            <TransactionRowSkeleton />
          </View>
        ))}
      </View>

      {/* Insight card */}
      <View style={[skeletonStyles.insightCard, { backgroundColor: colors.surface }]}>
        <View style={skeletonStyles.insightTop}>
          <Skeleton width={26} height={26} borderRadius={13} />
          <Skeleton width={130} height={11} borderRadius={5} />
        </View>
        <Skeleton width="90%" height={13} borderRadius={5} style={{ marginTop: 4 } as any} />
        <Skeleton width="70%" height={13} borderRadius={5} style={{ marginTop: 6 } as any} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  greeting: {
    marginBottom: 20,
  },
  balanceCard: {
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  txCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  txMeta: {
    flex: 1,
    gap: 4,
  },
  insightCard: {
    borderRadius: 20,
    padding: 18,
  },
  insightTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
});
