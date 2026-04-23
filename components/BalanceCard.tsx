import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';

interface BalanceCardProps {
  displayBalance: number;
  totalIncome: number;
  totalExpenses: number;
  formatCurrency: (amount: number) => string;
  balanceLabel: string;
  incomeLabel: string;
  expensesLabel: string;
}

export default function BalanceCard({
  displayBalance,
  totalIncome,
  totalExpenses,
  formatCurrency,
  balanceLabel,
  incomeLabel,
  expensesLabel,
}: BalanceCardProps) {
  const { colors, isDark } = useTheme();

  const expenseRatio = totalIncome > 0 ? Math.min(totalExpenses / totalIncome, 1) : 0;
  const incomeRatio = 1 - expenseRatio;
  const isPositive = displayBalance >= 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.primary + '2E',
          ...(Platform.OS !== 'web' && {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDark ? 0.40 : 0.22,
            shadowRadius: 24,
            elevation: 12,
          }),
          ...(Platform.OS === 'web' && {
            boxShadow: `0 8px 32px 0 ${colors.primary}38`,
          } as any),
        },
      ]}
    >
      {/* Inner highlight — simulates light source from above, material feel */}
      <View
        style={[
          styles.innerHighlight,
          {
            borderColor: isDark
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(255,255,255,0.55)',
          },
        ]}
        pointerEvents="none"
      />

      {/* Decorative blobs (palette-tinted) */}
      <View
        style={[
          styles.accentBlob,
          {
            backgroundColor: isDark
              ? colors.primary + '18'
              : colors.primaryLight,
          },
        ]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.accentBlobSecondary,
          {
            backgroundColor: isDark
              ? colors.primary + '10'
              : colors.primaryLight,
          },
        ]}
        pointerEvents="none"
      />

      {/* Top accent bar — 3px brand stripe, unique identifier of this card */}
      <View
        style={[styles.topAccentBar, { backgroundColor: colors.primary }]}
        pointerEvents="none"
      />

      {/* Label row */}
      <View style={styles.labelRow}>
        <Text style={[styles.balanceLabel, { color: colors.textTertiary }]}>
          {balanceLabel}
        </Text>
        {/* Health ring + dot (Stripe/Linear-style pulse indicator) */}
        <View
          style={[
            styles.healthRing,
            {
              borderColor: isPositive
                ? colors.success + '50'
                : colors.expense + '50',
            },
          ]}
        >
          <View
            style={[
              styles.healthDot,
              { backgroundColor: isPositive ? colors.success : colors.expense },
            ]}
          />
        </View>
      </View>

      {/* Amount — primary color connects to brand identity per palette */}
      <Text
        style={[
          styles.balanceAmount,
          { color: isPositive ? colors.primary : colors.expense },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {formatCurrency(displayBalance)}
      </Text>

      {/* Progress bar: income vs expenses */}
      {totalIncome > 0 && (
        <View style={styles.progressWrap}>
          <View
            style={[styles.progressTrack, { backgroundColor: colors.border }]}
          >
            <View
              style={[
                styles.progressIncome,
                { flex: incomeRatio, backgroundColor: colors.success, opacity: 0.85 },
              ]}
            />
            {expenseRatio > 0 && (
              <View
                style={[
                  styles.progressExpense,
                  { flex: expenseRatio, backgroundColor: colors.expense, opacity: 0.85 },
                ]}
              />
            )}
          </View>
          <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>
            {Math.round(expenseRatio * 100)}%
          </Text>
        </View>
      )}

      {/* Stats footer — primary-tinted surface, flush to card bottom */}
      <View
        style={[
          styles.statsRow,
          {
            backgroundColor: isDark
              ? colors.primary + '12'
              : colors.primary + '08',
            borderTopColor: isDark
              ? colors.primary + '25'
              : colors.primary + '18',
          },
        ]}
      >
        <View style={styles.statCol}>
          <View style={styles.statLabelRow}>
            <View
              style={[styles.statIconWrap, { backgroundColor: colors.success + '20' }]}
            >
              <Ionicons name="arrow-down" size={11} color={colors.success} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              {incomeLabel}
            </Text>
          </View>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {formatCurrency(totalIncome)}
          </Text>
        </View>

        <View
          style={[
            styles.vertSep,
            { backgroundColor: isDark ? colors.primary + '30' : colors.border },
          ]}
        />

        <View style={styles.statCol}>
          <View style={styles.statLabelRow}>
            <View
              style={[styles.statIconWrap, { backgroundColor: colors.expense + '20' }]}
            >
              <Ionicons name="arrow-up" size={11} color={colors.expense} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              {expensesLabel}
            </Text>
          </View>
          <Text style={[styles.statValue, { color: colors.expense }]}>
            {formatCurrency(totalExpenses)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1.5,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 0,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },

  // Renders a subtle white border just inside the card border,
  // simulating a light source from above — creates material depth
  innerHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 27,
    borderWidth: 1,
  },

  // 3px primary brand stripe at card top — differentiator vs other cards
  topAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.85,
  },

  accentBlob: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -50,
    right: -38,
    opacity: 0.45,
  },
  accentBlobSecondary: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    bottom: -28,
    left: -22,
    opacity: 0.20,
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  balanceLabel: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  healthRing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  balanceAmount: {
    fontSize: 40,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.5,
    marginBottom: 16,
    includeFontPadding: false,
    minHeight: 52,
    textAlign: 'center',
  },

  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressIncome: { height: 5, borderRadius: 3 },
  progressExpense: { height: 5, borderRadius: 3 },
  progressLabel: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    minWidth: 32,
    textAlign: 'right',
  },

  // Footer section flush to card bottom edges via negative margin
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  statCol: {
    flex: 1,
    gap: 5,
    alignItems: 'center',
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    letterSpacing: -0.4,
    includeFontPadding: false,
  },
  vertSep: {
    width: 1,
    height: 38,
    marginHorizontal: 16,
  },
});
