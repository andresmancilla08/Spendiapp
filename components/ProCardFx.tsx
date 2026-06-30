import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ProSheen from './ProSheen';
import { useTheme } from '../context/ThemeContext';
import { useProMotion } from '../hooks/useProMotion';

interface ProCardFxProps {
  /** Cambia para re-disparar el barrido (ej. el dato principal del card). */
  trigger?: unknown;
  /** 'subtle' para cards secundarios; 'normal' para el hero. */
  intensity?: 'subtle' | 'normal';
}

/**
 * Overlay premium para dejar caer dentro de cualquier card (premium-only):
 * lavado de gradiente teal + barrido de luz. No-op para usuarios free.
 *
 * El card contenedor debe tener position:relative y overflow:hidden.
 * Colocar como primer hijo para que quede detrás del contenido.
 */
export default function ProCardFx({ trigger, intensity = 'normal' }: ProCardFxProps) {
  const { colors, isDark } = useTheme();
  const { pro } = useProMotion();

  if (!pro) return null;

  const top = intensity === 'subtle' ? '16' : '24';
  const bottom = intensity === 'subtle' ? '0A' : '12';

  return (
    <>
      <LinearGradient
        colors={[colors.primary + top, 'transparent', colors.primary + bottom]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <ProSheen
        trigger={trigger}
        color={isDark ? 'rgba(255,255,255,0.20)' : colors.primary + '38'}
      />
    </>
  );
}
