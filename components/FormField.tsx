import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppIcon from './AppIcon';
import { useTheme } from '../context/ThemeContext';
import { readableTint } from '../utils/contrast';
import { Fonts } from '../config/fonts';

/**
 * Etiqueta de campo de formulario. Existe porque el placeholder NO es una
 * etiqueta: con "¿En qué lo usaste?" como único rótulo, un usuario que dejaba
 * el campo vacío no tenía forma de saber que ese era el dato que le faltaba
 * para que se activara Guardar.
 *
 * `required` pinta un punto del color de acento — la marca de "esto es
 * obligatorio" — y `missing` lo tiñe de error DESPUÉS de un intento fallido,
 * nunca antes: regañar con el formulario recién abierto es hostil.
 * `optional` rotula lo contrario a la derecha, para que la ausencia de punto
 * no se lea como un descuido.
 */
export function FieldLabel({ label, required, missing, optional }: {
  label: string;
  required?: boolean;
  missing?: boolean;
  optional?: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  // El token crudo de error no se lee en modo claro (#EF4444 sobre blanco =
  // 3.76:1). readableTint conserva el TONO y solo lo ajusta hasta 4.5:1.
  const errorInk = readableTint(colors.error, colors.background);

  return (
    <View style={styles.labelRow}>
      {required && (
        <View style={[styles.dot, { backgroundColor: missing ? errorInk : colors.primary }]} />
      )}
      <Text style={[styles.label, { color: missing ? errorInk : colors.textSecondary }]}>
        {label}
      </Text>
      {optional && (
        <Text style={[styles.optional, { color: colors.textTertiary }]}>
          {t('common.optional')}
        </Text>
      )}
    </View>
  );
}

/** Mensaje de error pegado al campo que lo causa, no al pie del formulario.
 *  Lleva icono además del color: el color por sí solo no es información. */
export function FieldError({ message }: { message: string }) {
  const { colors } = useTheme();
  const errorInk = readableTint(colors.error, colors.background);
  return (
    <View style={styles.errorRow} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <AppIcon name="alert-circle" size={14} color={errorInk} />
      <Text style={[styles.errorText, { color: errorInk }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  label: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 0.9, textTransform: 'uppercase' },
  optional: { marginLeft: 'auto', fontSize: 10, fontFamily: Fonts.medium, letterSpacing: 0.4 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  errorText: { fontSize: 12, fontFamily: Fonts.semiBold, flex: 1 },
});
