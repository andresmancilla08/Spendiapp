import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';

/**
 * Centraliza el "modo pro" visual: los usuarios premium reciben animaciones y
 * efectos extra; los gratuitos mantienen la UI actual. Respeta reduce-motion.
 *
 * - pro: aplica tratamientos visuales premium (gradientes, glow) — estáticos OK.
 * - animate: además habilita movimiento (entradas, sheen). false si reduce-motion.
 *
 * El ahorro de batería de Personalización cuenta igual que reduce-motion: hasta
 * ahora, quien quería la app quieta tenía que activarlo en los ajustes del
 * sistema y afectaba a todo el teléfono.
 */
export function useProMotion() {
  const { isPremium } = useAuthStore();
  const { batterySaver } = useTheme();
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (mounted) setSystemReduceMotion(v); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduceMotion);
    return () => { mounted = false; sub.remove(); };
  }, []);

  const reduceMotion = systemReduceMotion || batterySaver;
  return { pro: isPremium, animate: isPremium && !reduceMotion, reduceMotion };
}
