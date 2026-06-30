import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  ReactNode,
} from 'react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import AppIcon from './AppIcon';
import ProSheen from './ProSheen';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';

const HIDDEN_MASK = '••••••';

interface MonthNav {
  year: number;
  month: number;
  months: string[];
  minYear: number;
  maxYear: number;
  onChange: (year: number, month: number) => void;
}

interface BalanceCardProps {
  displayBalance: number;
  totalIncome: number;
  totalExpenses: number;
  formatCurrency: (amount: number) => string;
  balanceLabel: string;
  incomeLabel: string;
  expensesLabel: string;
  hidden?: boolean;
  onToggleHidden?: () => void;
  footer?: ReactNode;
  monthNav?: MonthNav;
  loading?: boolean;
  /** Tratamiento premium: gradiente teal + barrido de luz + glow reforzado. */
  pro?: boolean;
}

export default function BalanceCard({
  displayBalance,
  totalIncome,
  totalExpenses,
  formatCurrency,
  balanceLabel,
  incomeLabel,
  expensesLabel,
  hidden = false,
  onToggleHidden,
  footer,
  monthNav,
  loading = false,
  pro = false,
}: BalanceCardProps) {
  const { colors, isDark } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);

  const canGoPrev = monthNav
    ? !(monthNav.year <= monthNav.minYear && monthNav.month === 0)
    : false;
  const canGoNext = monthNav
    ? !(monthNav.year >= monthNav.maxYear && monthNav.month === 11)
    : false;

  const goPrev = () => {
    if (!monthNav || !canGoPrev) return;
    if (monthNav.month === 0) monthNav.onChange(monthNav.year - 1, 11);
    else monthNav.onChange(monthNav.year, monthNav.month - 1);
  };
  const goNext = () => {
    if (!monthNav || !canGoNext) return;
    if (monthNav.month === 11) monthNav.onChange(monthNav.year + 1, 0);
    else monthNav.onChange(monthNav.year, monthNav.month + 1);
  };

  const expenseRatio = totalIncome > 0 ? Math.min(totalExpenses / totalIncome, 1) : 0;
  const incomeRatio = 1 - expenseRatio;
  const isPositive = displayBalance >= 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: pro ? colors.primary + '4A' : colors.primary + '2E',
          ...(Platform.OS !== 'web' && {
            shadowColor: isDark || pro ? colors.primary : '#000000',
            shadowOffset: { width: 0, height: pro ? 8 : 4 },
            shadowOpacity: pro ? (isDark ? 0.55 : 0.18) : (isDark ? 0.40 : 0.07),
            shadowRadius: pro ? (isDark ? 32 : 20) : (isDark ? 24 : 8),
            elevation: pro ? 16 : (isDark ? 12 : 4),
          }),
          ...(Platform.OS === 'web' && {
            boxShadow: pro
              ? (isDark ? `0 12px 44px 0 ${colors.primary}55` : `0 10px 30px 0 ${colors.primary}33`)
              : (isDark ? `0 8px 32px 0 ${colors.primary}38` : '0 4px 12px 0 rgba(0,0,0,0.08)'),
          } as any),
        },
      ]}
    >
      {/* Premium: lavado de gradiente teal + barrido de luz */}
      {pro && (
        <>
          <LinearGradient
            colors={
              isDark
                ? [colors.primary + '22', 'transparent', colors.primary + '12']
                : [colors.primary + '24', 'transparent', colors.primary + '12']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <ProSheen
            trigger={`${displayBalance}-${loading}`}
            color={isDark ? 'rgba(255,255,255,0.22)' : colors.primary + '3D'}
          />
        </>
      )}

      {/* Inner highlight */}
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

      {/* Decorative blobs */}
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

      {/* Top accent bar */}
      <View
        style={[styles.topAccentBar, { backgroundColor: colors.primary }]}
        pointerEvents="none"
      />

      {/* Month navigation */}
      {monthNav && (
        <>
          <View style={styles.monthNavRow}>
            <TouchableOpacity
              onPress={goPrev}
              disabled={!canGoPrev}
              style={styles.monthNavBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <AppIcon name="chevron-back" size={18} color={canGoPrev ? colors.primary : colors.border} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPickerOpen((v) => !v)}
              style={styles.monthNavLabelBtn}
              hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Text style={[styles.monthNavLabel, { color: colors.primary }]}>
                {monthNav.months[monthNav.month].toUpperCase()} {monthNav.year}
              </Text>
              <AppIcon name={pickerOpen ? 'chevron-up' : 'chevron-down'} size={13} color={colors.primary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={goNext}
              disabled={!canGoNext}
              style={styles.monthNavBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <AppIcon name="chevron-forward" size={18} color={canGoNext ? colors.primary : colors.border} />
            </TouchableOpacity>
          </View>

          {pickerOpen && (
            <View style={[styles.pickerWrap, { borderColor: isDark ? colors.primary + '25' : colors.border }]}>
              <View style={styles.pickerYearRow}>
                <TouchableOpacity
                  onPress={() => monthNav.onChange(Math.max(monthNav.minYear, monthNav.year - 1), monthNav.month)}
                  disabled={monthNav.year <= monthNav.minYear}
                  style={styles.pickerNavBtn}
                  activeOpacity={0.7}
                >
                  <AppIcon name="chevron-back" size={18} color={monthNav.year <= monthNav.minYear ? colors.border : colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.pickerYearLabel, { color: colors.textPrimary }]}>{monthNav.year}</Text>
                <TouchableOpacity
                  onPress={() => monthNav.onChange(Math.min(monthNav.maxYear, monthNav.year + 1), monthNav.month)}
                  disabled={monthNav.year >= monthNav.maxYear}
                  style={styles.pickerNavBtn}
                  activeOpacity={0.7}
                >
                  <AppIcon name="chevron-forward" size={18} color={monthNav.year >= monthNav.maxYear ? colors.border : colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <View style={styles.monthGrid}>
                {monthNav.months.map((name, idx) => {
                  const isSelected = idx === monthNav.month;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.monthChip,
                        { backgroundColor: isSelected ? colors.primary : (isDark ? colors.primary + '12' : colors.primaryLight) },
                      ]}
                      onPress={() => { monthNav.onChange(monthNav.year, idx); setPickerOpen(false); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.monthChipText, { color: isSelected ? colors.onPrimary : colors.textPrimary }]}>
                        {name.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </>
      )}

      {/* Label row */}
      <View style={styles.labelRow}>
        <Text style={[styles.balanceLabel, { color: colors.textTertiary }]}>
          {balanceLabel}
        </Text>
        <View style={styles.labelRowRight}>
          {/* Health indicator */}
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
          {/* Eye toggle */}
          {onToggleHidden && (
            <TouchableOpacity
              onPress={onToggleHidden}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              style={styles.eyeBtn}
            >
              <AppIcon
                name={hidden ? 'eye-off-outline' : 'eye-outline'}
                size={15}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Amount */}
      {loading ? (
        <View style={[styles.balanceAmount, styles.amountLoader]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <Text
          style={[
            styles.balanceAmount,
            {
              color: hidden
                ? colors.textTertiary
                : isPositive ? colors.primary : colors.expense,
              letterSpacing: hidden ? 4 : -0.5,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {hidden ? HIDDEN_MASK : formatCurrency(displayBalance)}
        </Text>
      )}

      {/* Progress bar — solo cuando hay datos y no está oculto */}
      {totalIncome > 0 && !hidden && !loading && (
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

      {/* Stats footer */}
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
              <AppIcon name="arrow-down" size={11} color={colors.success} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              {incomeLabel}
            </Text>
          </View>
          <Text style={[styles.statValue, { color: hidden ? colors.textTertiary : colors.success, letterSpacing: hidden ? 3 : -0.4 }]}>
            {loading ? '—' : hidden ? HIDDEN_MASK : formatCurrency(totalIncome)}
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
              <AppIcon name="arrow-up" size={11} color={colors.expense} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              {expensesLabel}
            </Text>
          </View>
          <Text style={[styles.statValue, { color: hidden ? colors.textTertiary : colors.expense, letterSpacing: hidden ? 3 : -0.4 }]}>
            {loading ? '—' : hidden ? HIDDEN_MASK : formatCurrency(totalExpenses)}
          </Text>
        </View>
      </View>

      {/* Footer slot — tasas de cambio u otro contenido contextual */}
      {footer && (
        <View style={[styles.footerRow, { borderTopColor: isDark ? colors.primary + '20' : colors.border }]}>
          {footer}
        </View>
      )}
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

  innerHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 27,
    borderWidth: 1,
  },

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

  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  monthNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavLabelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
    paddingVertical: 4,
  },
  monthNavLabel: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    letterSpacing: 0.6,
  },
  pickerWrap: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginBottom: 14,
  },
  pickerYearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 12,
  },
  pickerNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerYearLabel: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    minWidth: 54,
    textAlign: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  monthChip: {
    width: '23%',
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
  },
  monthChipText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  labelRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  eyeBtn: {
    padding: 2,
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
    marginBottom: 16,
    includeFontPadding: false,
    minHeight: 52,
    textAlign: 'center',
  },
  amountLoader: {
    alignItems: 'center',
    justifyContent: 'center',
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
    includeFontPadding: false,
  },
  vertSep: {
    width: 1,
    height: 38,
    marginHorizontal: 16,
  },
  footerRow: {
    marginHorizontal: -24,
    borderTopWidth: 1,
  },
});
