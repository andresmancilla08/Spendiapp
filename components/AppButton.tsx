/**
 * Botón de acción de la app. Un solo sitio donde vive el patrón:
 *
 *   primary    → tinta sólida (`textPrimary`), texto en el color del fondo
 *   secondary  → superficie clara, texto en tinta
 *   danger     → `error` sólido
 *   ghost      → sin relleno, contorno de tinta
 *
 * El primario NO usa `colors.primary`: con la paleta por defecto ese teal da 2.30:1
 * contra su propio texto blanco y falla AA en claro y en oscuro. La marca sigue
 * viva en los acentos (iconos, foco, badges), no en el relleno del botón.
 */
import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import PressableScale from './PressableScale';
import AppIcon, { type AppIconName } from './AppIcon';
import { Fonts } from '../config/fonts';
import { useTheme } from '../context/ThemeContext';
import { authTokens } from '../utils/authTheme';

export type AppButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: AppIconName;
  /** 60 en las pantallas de acceso, 56 en el resto de la app. */
  size?: 'md' | 'lg';
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export default function AppButton({
  label, onPress, variant = 'primary', disabled = false, loading = false,
  icon, size = 'md', style, accessibilityLabel,
}: AppButtonProps) {
  const { colors, isDark } = useTheme();
  const tk = authTokens(colors, isDark);
  const height = size === 'lg' ? 60 : 56;

  const skin: Record<AppButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary:   { bg: tk.ink, fg: tk.onInk },
    secondary: { bg: colors.surfaceSecondary, fg: colors.textPrimary },
    danger:    { bg: colors.error, fg: colors.onPrimary },
    ghost:     { bg: 'transparent', fg: colors.textPrimary, border: colors.border },
  };
  const s = skin[variant];
  const inert = disabled || loading;

  return (
    <PressableScale
      style={[
        styles.btn,
        { height, borderRadius: height / 2, backgroundColor: s.bg, opacity: inert ? 0.4 : 1 },
        s.border ? { borderWidth: 1.5, borderColor: s.border } : null,
        style,
      ]}
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inert }}
    >
      {loading ? (
        <ActivityIndicator color={s.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <AppIcon name={icon} size={18} color={s.fg} /> : null}
          <Text style={[styles.text, { color: s.fg }]} numberOfLines={1}>{label}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  text: { fontSize: 16, fontFamily: Fonts.bold, letterSpacing: 0.2 },
});
