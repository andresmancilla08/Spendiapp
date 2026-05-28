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
import { useExchangeRates } from '../hooks/useExchangeRates';
import { Skeleton } from './Skeleton';
import { Fonts } from '../config/fonts';

const GREEN = '#22C55E';
const RED = '#EF4444';

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

// Pulsing live dot
function LiveDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.6, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(dotOpacity, { toValue: 0, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(dotOpacity, { toValue: 1, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
        ]),
        Animated.delay(900),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.dot,
        { transform: [{ scale }], opacity: dotOpacity },
      ]}
    />
  );
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
      <View style={[styles.wrap, { backgroundColor: colors.primary + '07' }, style]}>
        <View style={styles.ratesRow}>
          <Skeleton width={88} height={22} borderRadius={4} />
          <View style={[styles.sep, { backgroundColor: colors.border }]} />
          <Skeleton width={88} height={22} borderRadius={4} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.wrap, { backgroundColor: colors.primary + '07' }, style]}>
        <View style={styles.ratesRow}>
          <View style={styles.item}>
            <Text style={[styles.code, { color: colors.textTertiary }]}>USD</Text>
            <Text style={[styles.value, { color: colors.textTertiary }]}>—</Text>
          </View>
          <View style={[styles.sep, { backgroundColor: colors.border }]} />
          <View style={styles.item}>
            <Text style={[styles.code, { color: colors.textTertiary }]}>EUR</Text>
            <Text style={[styles.value, { color: colors.textTertiary }]}>—</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={retry}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.retryBtn}
        >
          <Text style={[styles.retryText, { color: colors.textTertiary }]}>↺</Text>
        </TouchableOpacity>
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
        {
          opacity: wrapOpacity,
          backgroundColor: colors.primary + '07',
        },
      ]}
    >
      {/* Live dot — top center */}
      {updatedAt && (
        <View style={styles.dotRow}>
          <LiveDot />
        </View>
      )}

      {/* Rates — centered */}
      <View style={styles.ratesRow}>
        <TouchableOpacity onPress={() => copyRate('USD', usd)} activeOpacity={0.7} style={styles.item}>
          <Text style={[styles.code, { color: colors.textSecondary }]}>USD</Text>
          <RateValue value={usd} prev={prevUsd} textColor={colors.textPrimary} />
        </TouchableOpacity>

        <View style={[styles.sep, { backgroundColor: colors.border }]} />

        <TouchableOpacity onPress={() => copyRate('EUR', eur)} activeOpacity={0.7} style={styles.item}>
          <Text style={[styles.code, { color: colors.textSecondary }]}>EUR</Text>
          <RateValue value={eur} prev={prevEur} textColor={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingBottom: 10,
    paddingHorizontal: 14,
  },
  dotRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  ratesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingHorizontal: 4,
  },
  code: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  sep: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: GREEN,
  },
  retryBtn: {
    marginTop: 4,
    alignItems: 'center',
  },
  retryText: {
    fontSize: 16,
  },
});
