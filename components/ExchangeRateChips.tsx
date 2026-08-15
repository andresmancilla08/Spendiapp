import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import FxLayer, { type FxFrame } from './fx/FxLayer';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { Skeleton } from './Skeleton';
import { Fonts } from '../config/fonts';
import AppIcon from './AppIcon';

const GREEN = '#22C55E';
const RED = '#EF4444';

const CURRENCY_FLAG: Record<'USD' | 'EUR', string> = { USD: '🇺🇸', EUR: '🇪🇺' };

function formatValue(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Animated value cell — fade + color flash on change
function RateValue({ value, prev, textColor }: { value: number; prev: number; textColor: string }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [displayColor, setDisplayColor] = useState(textColor);
  const [displayValue, setDisplayValue] = useState(value);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      setDisplayValue(value);
      return;
    }
    if (value === prev || prev === 0) {
      setDisplayValue(value);
      return;
    }
    const flashColor = value > prev ? GREEN : RED;

    Animated.timing(opacity, {
      toValue: 0,
      duration: 120,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      setDisplayValue(value);
      setDisplayColor(flashColor);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
      setTimeout(() => setDisplayColor(textColor), 600);
    });
  }, [value]);

  useEffect(() => {
    setDisplayColor(textColor);
  }, [textColor]);

  return (
    <Animated.Text style={[styles.value, { color: displayColor, opacity }]}>
      {formatValue(displayValue)}
    </Animated.Text>
  );
}

/** Punto que late para indicar "en vivo". El ciclo son 1,8 s: 0,9 s de latido y
 *  0,9 s de espera. Iba en un bucle que en web corría por JS y no se detenía al
 *  desmontar. */
const DOT_FRAMES: FxFrame[] = [
  { at: 0,   opacity: 1, scale: 1 },
  { at: 0.5, opacity: 0, scale: 1.6 },
  { at: 0.5001, opacity: 1, scale: 1 },
  { at: 1,   opacity: 1, scale: 1 },
];

function LiveDot({ color }: { color: string }) {
  return <FxLayer frames={DOT_FRAMES} duration={1800} easing="linear" style={[styles.dot, { backgroundColor: color }]} />;
}

interface ExchangeRateChipsProps {
  style?: object;
}

export default function ExchangeRateChips({ style }: ExchangeRateChipsProps) {
  const { colors } = useTheme();
  const { usd, eur, prevUsd, prevEur, loading, error, updatedAt, retry } = useExchangeRates();

  const wrapOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading && !error) {
      Animated.timing(wrapOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [loading, error]);

  if (loading) {
    return (
      <View style={[styles.wrap, style]}>
        <View style={styles.ratesRow}>
          <Skeleton width={82} height={30} borderRadius={12} />
          <View style={styles.dotRow} />
          <Skeleton width={82} height={30} borderRadius={12} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.wrap, style]}>
        <View style={styles.ratesRow}>
          <View style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Text style={styles.flag}>{CURRENCY_FLAG.USD}</Text>
            <Text style={[styles.code, { color: colors.textTertiary }]}>USD</Text>
            <Text style={[styles.value, { color: colors.textTertiary }]}>—</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Text style={styles.flag}>{CURRENCY_FLAG.EUR}</Text>
            <Text style={[styles.code, { color: colors.textTertiary }]}>EUR</Text>
            <Text style={[styles.value, { color: colors.textTertiary }]}>—</Text>
          </View>
          <TouchableOpacity
            onPress={retry}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.retryBtn, { backgroundColor: colors.primary + '18' }]}
          >
            <AppIcon name="refresh-outline" size={15} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const copyRate = async (code: string, value: number) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(`1 ${code} = $ ${formatValue(value)} COP`);
  };

  return (
    <Animated.View
      style={[
        styles.wrap,
        style,
        { opacity: wrapOpacity },
      ]}
    >
      {/* Rates — dos chips con dot "en vivo" entre ambos */}
      <View style={styles.ratesRow}>
        <TouchableOpacity
          onPress={() => copyRate('USD', usd)}
          activeOpacity={0.7}
          style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
        >
          <Text style={styles.flag}>{CURRENCY_FLAG.USD}</Text>
          <Text style={[styles.code, { color: colors.textTertiary }]}>USD</Text>
          <RateValue value={usd} prev={prevUsd} textColor={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.dotRow}>
          {updatedAt && <LiveDot color={colors.success} />}
        </View>

        <TouchableOpacity
          onPress={() => copyRate('EUR', eur)}
          activeOpacity={0.7}
          style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
        >
          <Text style={styles.flag}>{CURRENCY_FLAG.EUR}</Text>
          <Text style={[styles.code, { color: colors.textTertiary }]}>EUR</Text>
          <RateValue value={eur} prev={prevEur} textColor={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dotRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  ratesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  flag: {
    fontSize: 12,
  },
  code: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 14,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  retryBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
