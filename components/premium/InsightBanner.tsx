import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppIcon, { AppIconName } from '../AppIcon';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';

interface Props {
  kicker: string;
  sentence: string;
  /** Chip de contexto opcional: dato con signo + flecha + label (no color solo). */
  chip?: { label: string; tone: 'pos' | 'neg' | 'muted' };
}

/**
 * "Tu mes en una frase" — movimiento de firma de Aurora Ledger. Un insight
 * editorial que encabeza el mes, con un glow radial suave y un chip de tono.
 */
export default function InsightBanner({ kicker, sentence, chip }: Props) {
  const { colors, isDark } = useTheme();
  const toneColor = chip
    ? chip.tone === 'pos' ? colors.success : chip.tone === 'neg' ? colors.expense : colors.textTertiary
    : colors.textTertiary;

  return (
    <View style={[styles.wrap, { borderColor: colors.primary + '2A' }]}>
      <LinearGradient
        colors={[colors.primary + (isDark ? '30' : '22'), colors.tertiary + '10', 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.row}>
        <View style={[styles.kickDot, { backgroundColor: colors.tertiary }]} />
        <Text style={[styles.kicker, { color: colors.tertiary }]}>{kicker}</Text>
      </View>
      <Text style={[styles.sentence, { color: colors.textPrimary }]}>{sentence}</Text>
      {chip && (
        <View style={[styles.chip, { backgroundColor: toneColor + '20' }]}>
          <AppIcon name={(chip.tone === 'pos' ? 'trending-down' : chip.tone === 'neg' ? 'trending-up' : 'remove') as AppIconName} size={12} color={toneColor} />
          <Text style={[styles.chipText, { color: toneColor }]}>{chip.label}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 22, borderWidth: 1, padding: 18, overflow: 'hidden', position: 'relative', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kickDot: { width: 6, height: 6, borderRadius: 3 },
  kicker: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1.8, textTransform: 'uppercase' },
  sentence: { fontSize: 16, lineHeight: 22, fontFamily: Fonts.bold, marginTop: 10 },
  chip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginTop: 12 },
  chipText: { fontSize: 11, fontFamily: Fonts.bold },
});
