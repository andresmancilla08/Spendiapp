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
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { Skeleton } from './Skeleton';
import { Fonts } from '../config/fonts';

function formatRate(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

interface RateChipProps {
  flag: string;
  code: string;
  value: number;
  onPress: () => void;
}

function RateChip({ flag, code, value, onPress }: RateChipProps) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1}>
      <Animated.View
        style={[
          styles.chip,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={styles.chipFlag}>{flag}</Text>
        <Text style={[styles.chipCode, { color: colors.textTertiary }]}>{code}</Text>
        <Text style={[styles.chipValue, { color: colors.textPrimary }]}>{formatRate(value)}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

interface ExchangeRateChipsProps {
  style?: object;
}

export default function ExchangeRateChips({ style }: ExchangeRateChipsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { usd, eur, loading, error, updatedAt, retry } = useExchangeRates();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(4)).current;

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    }
  }, [loading]);

  const handleCopy = async (code: string, value: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await Clipboard.setStringAsync(`1 ${code} = ${formatRate(value)} COP`);
  };

  if (loading) {
    return (
      <View style={[styles.wrap, style]}>
        <Skeleton width={110} height={32} borderRadius={8} />
        <Skeleton width={110} height={32} borderRadius={8} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.wrap, style]}>
        <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.chipFlag}>🇺🇸</Text>
          <Text style={[styles.chipCode, { color: colors.textTertiary }]}>USD</Text>
          <Text style={[styles.chipValue, { color: colors.textTertiary }]}>—</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.chipFlag}>🇪🇺</Text>
          <Text style={[styles.chipCode, { color: colors.textTertiary }]}>EUR</Text>
          <Text style={[styles.chipValue, { color: colors.textTertiary }]}>—</Text>
        </View>
        <TouchableOpacity
          onPress={retry}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.retryBtn}
        >
          <Ionicons name="refresh-outline" size={14} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.wrap,
        style,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <RateChip flag="🇺🇸" code="USD" value={usd} onPress={() => handleCopy('USD', usd)} />
      <RateChip flag="🇪🇺" code="EUR" value={eur} onPress={() => handleCopy('EUR', eur)} />
      {updatedAt && (
        <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
          {t('exchangeRate.updatedAt', { time: formatTime(updatedAt) })}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipFlag: {
    fontSize: 13,
  },
  chipCode: {
    fontSize: 9,
    fontFamily: Fonts.regular,
    letterSpacing: 0.3,
  },
  chipValue: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
  },
  timestamp: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    marginLeft: 'auto',
  },
  retryBtn: {
    padding: 4,
    marginLeft: 2,
  },
});
