/**
 * ExchangeRateBar
 *
 * Fila full-width de tipo "datos financieros" que muestra:
 *   1 USD = $4.200  |  1 EUR = $4.870
 *
 * Diseñada para encajar como footer del BalanceCard y como fila expandida
 * del summaryCard en History. Copia el patrón visual de statsRow / summaryTabs
 * que ya existe en el sistema — no chiplets flotantes.
 *
 * Variante compacta (default) para History, variante card para BalanceCard footer.
 */

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useEffect, useRef } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import AppIcon from './AppIcon';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { Skeleton } from './Skeleton';
import { Fonts } from '../config/fonts';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRateValue(value: number): string {
  // "$4.200" — estilo Colombia: símbolo + número con punto de miles
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// ── Live dot (pulso animado) ──────────────────────────────────────────────────

function LiveDot({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.25,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.liveDot,
        { backgroundColor: color, opacity: pulse },
      ]}
    />
  );
}

// ── RateColumn ────────────────────────────────────────────────────────────────

interface RateColumnProps {
  code: 'USD' | 'EUR';
  value: number;
  accentColor: string;
  onPress: () => void;
}

function RateColumn({ code, value, accentColor, onPress }: RateColumnProps) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 60,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={1}
      style={styles.col}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={`1 ${code} = ${formatRateValue(value)} COP. Toca para copiar.`}
    >
      <Animated.View
        style={[styles.colInner, { transform: [{ scale: scaleAnim }] }]}
      >
        {/* Fila superior: código de moneda */}
        <View style={styles.codeRow}>
          <View
            style={[
              styles.codePill,
              { backgroundColor: accentColor + '1A' },
            ]}
          >
            <Text style={[styles.codeText, { color: accentColor }]}>
              {code}
            </Text>
          </View>
          <Text style={[styles.baseUnit, { color: colors.textTertiary }]}>
            = 1
          </Text>
        </View>

        {/* Valor en COP */}
        <Text
          style={[styles.rateValue, { color: colors.textPrimary }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {formatRateValue(value)}
        </Text>

        {/* Subtítulo contextual */}
        <Text style={[styles.rateSub, { color: colors.textTertiary }]}>
          COP
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── ExchangeRateBar ───────────────────────────────────────────────────────────

interface ExchangeRateBarProps {
  style?: object;
}

export default function ExchangeRateBar({ style }: ExchangeRateBarProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { usd, eur, loading, error, updatedAt, retry } = useExchangeRates();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [loading]);

  const handleCopy = async (code: string, value: number) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await Clipboard.setStringAsync(`1 ${code} = ${formatRateValue(value)} COP`);
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.wrap, style]}>
        <View style={styles.skeletonRow}>
          <Skeleton width={100} height={40} borderRadius={10} />
          <View style={[styles.vertSep, { backgroundColor: colors.border }]} />
          <Skeleton width={100} height={40} borderRadius={10} />
        </View>
      </View>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={[styles.wrap, style]}>
        <View style={styles.errorRow}>
          <AppIcon
            name="wifi-outline"
            size={14}
            color={colors.textTertiary}
          />
          <Text style={[styles.errorText, { color: colors.textTertiary }]}>
            {t('exchangeRate.errorShort', { defaultValue: 'Sin datos de tasas' })}
          </Text>
          <TouchableOpacity
            onPress={retry}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
          >
            <AppIcon name="refresh-outline" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Data ────────────────────────────────────────────────────────────────────
  return (
    <Animated.View
      style={[
        styles.wrap,
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Fila principal de tasas */}
      <View style={styles.ratesRow}>
        <RateColumn
          code="USD"
          value={usd}
          accentColor={colors.primary}
          onPress={() => handleCopy('USD', usd)}
        />

        <View
          style={[
            styles.vertSep,
            {
              backgroundColor: isDark
                ? colors.primary + '25'
                : colors.border,
            },
          ]}
        />

        <RateColumn
          code="EUR"
          value={eur}
          accentColor={colors.secondary}
          onPress={() => handleCopy('EUR', eur)}
        />
      </View>

      {/* Footer: live dot + timestamp */}
      <View style={styles.footerMeta}>
        <LiveDot color={colors.primary} />
        {updatedAt ? (
          <Text style={[styles.timestampText, { color: colors.textTertiary }]}>
            {t('exchangeRate.updatedAt', {
              defaultValue: `Act. {{time}}`,
              time: formatTime(updatedAt),
            })}
          </Text>
        ) : (
          <Text style={[styles.timestampText, { color: colors.textTertiary }]}>
            {t('exchangeRate.live', { defaultValue: 'En tiempo real' })}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },

  // Skeleton
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
  },

  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },

  // Tasas principales
  ratesRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  col: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  colInner: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },

  // Fila de código + "= 1"
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },

  codePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 10,
    fontFamily: Fonts.extraBold,
    letterSpacing: 0.6,
  },
  baseUnit: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    letterSpacing: 0.1,
  },

  // Valor COP
  rateValue: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    letterSpacing: -0.4,
    includeFontPadding: false,
  },

  // "COP" subtítulo
  rateSub: {
    fontSize: 9,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 1,
  },

  // Separador vertical entre USD | EUR
  vertSep: {
    width: 1,
    height: 44,
    alignSelf: 'center',
  },

  // Footer: dot + timestamp
  footerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingBottom: 4,
  },

  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  timestampText: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    letterSpacing: 0.2,
  },
});
