import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import AppIcon, { AppIconName } from './AppIcon';
import { accentInk } from '../utils/contrast';
import { classifyDataError, isRetryable, type DataErrorKind } from '../utils/dataError';

interface Props {
  /** `code` crudo de FirestoreError. */
  code: string | null | undefined;
  onRetry?: () => void;
}

const ICONS: Record<DataErrorKind, AppIconName> = {
  offline: 'cloud-offline-outline',
  auth: 'lock-closed-outline',
  setup: 'warning-outline',
  unknown: 'alert-circle',
};

/**
 * Estado de "no hay datos y no es culpa tuya". Sustituye a las cifras: mostrar
 * $0 cuando la consulta falló es peor que no mostrar nada, porque parece un dato.
 */
export default function DataErrorCard({ code, onRetry }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const kind = classifyDataError(code);
  if (!kind) return null;

  const tint = kind === 'offline' ? colors.textSecondary : colors.expense;
  const actionInk = accentInk(colors, 'primary', colors.surface);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.iconCircle, { backgroundColor: `${tint}1A` }]}>
        <AppIcon name={ICONS[kind]} size={22} color={tint} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t(`dataError.${kind}.title`)}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t(`dataError.${kind}.subtitle`)}</Text>

      {kind === 'auth' ? (
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          activeOpacity={0.8}
          accessibilityRole="button"
          style={[styles.action, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.actionText, { color: colors.onPrimary }]}>{t('dataError.signInAgain')}</Text>
        </TouchableOpacity>
      ) : isRetryable(kind) && onRetry ? (
        <TouchableOpacity
          onPress={onRetry}
          activeOpacity={0.8}
          accessibilityRole="button"
          style={[styles.action, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary }]}
        >
          <AppIcon name="refresh-outline" size={16} color={actionInk} />
          <Text style={[styles.actionText, { color: actionInk }]}>{t('dataError.retry')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 22, alignItems: 'center', marginTop: 16 },
  iconCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 15, fontFamily: Fonts.bold, textAlign: 'center' },
  subtitle: { fontSize: 12.5, fontFamily: Fonts.regular, lineHeight: 18, textAlign: 'center', marginTop: 6 },
  action: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 44, minWidth: 160, borderRadius: 50, paddingHorizontal: 20, marginTop: 16,
  },
  actionText: { fontSize: 13.5, fontFamily: Fonts.bold },
});
