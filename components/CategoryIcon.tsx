import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { CATEGORY_ICONS, FALLBACK_ICON } from '../constants/categoryIcons';

interface Props {
  /** Clave del catálogo ('pizza') o un emoji de una categoría creada antes del catálogo. */
  icon?: string | null;
  size?: number;
  color?: string;
}

/**
 * Pinta el icono de una categoría venga como venga: clave del catálogo → icono
 * Tabler; emoji legado → el propio emoji (la migración de `useCategories` los va
 * convirtiendo, pero un mirror de otro usuario puede traer uno viejo); nada
 * reconocible → el icono de "Otro".
 */
export default function CategoryIcon({ icon, size = 20, color }: Props) {
  const { colors } = useTheme();
  const tint = color ?? colors.textPrimary;

  if (icon && CATEGORY_ICONS[icon]) {
    const Icon = CATEGORY_ICONS[icon];
    return <Icon size={size} color={tint} strokeWidth={2} />;
  }

  if (icon && !/^[a-z0-9-]+$/.test(icon)) {
    return <Text style={[styles.emoji, { fontSize: size * 0.9, lineHeight: size * 1.15 }]}>{icon}</Text>;
  }

  const Fallback = CATEGORY_ICONS[FALLBACK_ICON];
  return <Fallback size={size} color={tint} strokeWidth={2} />;
}

const styles = StyleSheet.create({
  emoji: { textAlign: 'center' },
});
