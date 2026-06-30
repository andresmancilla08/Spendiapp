import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useAuthStore } from '../store/authStore';

/**
 * Centraliza el "modo pro" visual: los usuarios premium reciben animaciones y
 * efectos extra; los gratuitos mantienen la UI actual. Respeta reduce-motion.
 *
 * - pro: aplica tratamientos visuales premium (gradientes, glow) — estáticos OK.
 * - animate: además habilita movimiento (entradas, sheen). false si reduce-motion.
 */
export function useProMotion() {
  const { isPremium } = useAuthStore();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (mounted) setReduceMotion(v); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; sub.remove(); };
  }, []);

  return { pro: isPremium, animate: isPremium && !reduceMotion, reduceMotion };
}
