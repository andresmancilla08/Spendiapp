/**
 * Campo de las pantallas de autenticación: label en versalita + caja con icono.
 *
 * Vive aparte porque las tres pantallas que lo usan (acceso, registro, recuperar PIN)
 * lo tenían copiado con tres juegos de estilos distintos, y cualquier ajuste había que
 * hacerlo tres veces.
 */
import { forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import AppIcon, { type AppIconName } from '../AppIcon';
import { Fonts } from '../../config/fonts';
import { useTheme } from '../../context/ThemeContext';
import { authTokens } from '../../utils/authTheme';

interface AuthFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  icon: AppIconName;
  focused: boolean;
  error?: boolean;
  /** Texto de ayuda bajo el campo. */
  hint?: string;
  /** Mensaje de error; sustituye al `hint` cuando está presente. */
  errorText?: string;
}

const AuthField = forwardRef<TextInput, AuthFieldProps>(function AuthField(
  { label, icon, focused, error = false, hint, errorText, ...inputProps },
  ref,
) {
  const { colors, isDark } = useTheme();
  const tk = authTokens(colors, isDark);
  const line = error ? colors.error : focused ? tk.fieldLineFocus : tk.fieldLine;

  return (
    <View>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      <View style={[styles.box, {
        backgroundColor: tk.fieldBg,
        borderColor: line,
        borderWidth: focused || error ? 2 : 1.5,
      }]}>
        <AppIcon
          name={icon}
          size={18}
          color={error ? colors.error : focused ? tk.accent : colors.textSecondary}
        />
        <TextInput
          ref={ref}
          style={[styles.input, { color: colors.textPrimary }]}
          placeholderTextColor={colors.textTertiary}
          {...inputProps}
        />
      </View>
      {(errorText ?? hint) ? (
        <Text style={[styles.hint, { color: errorText ? colors.error : colors.textSecondary }]}>
          {errorText ?? hint}
        </Text>
      ) : null}
    </View>
  );
});

export default AuthField;

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    lineHeight: 15,
    marginBottom: 8,
  },
  box: {
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 15.5,
    fontFamily: Fonts.medium,
    // Sin esto, en web el input pinta su propio recuadro azul encima del borde.
    ...(({ outlineStyle: 'none' } as unknown) as object),
  },
  hint: {
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: Fonts.regular,
    marginTop: 9,
    marginHorizontal: 2,
  },
});
