import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useEnergySaver } from './useEnergySaver';

/**
 * Centraliza el "modo pro" visual: los usuarios premium reciben animaciones y
 * efectos extra; los gratuitos mantienen la UI actual. Respeta reduce-motion.
 *
 * - pro: aplica tratamientos visuales premium (gradientes, glow) — estáticos OK.
 * - animate: además habilita movimiento (entradas, sheen).
 *
 * El movimiento se apaga por dos motivos, ninguno de los cuales exige que el
 * usuario configure nada: porque ha pedido reducir movimiento en el sistema, o
 * porque al teléfono le queda poca batería (ver `useEnergySaver`). Antes esto
 * era un interruptor dentro de la app; que el usuario tenga que acordarse de
 * apagar los efectos cuando se está quedando sin batería es hacerle a él el
 * trabajo que puede hacer la app.
 */
export function useProMotion() {
  const { isPremium } = useAuthStore();
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (mounted) setSystemReduceMotion(v); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduceMotion);
    return () => { mounted = false; sub.remove(); };
  }, []);

  const energySaver = useEnergySaver();
  const reduceMotion = systemReduceMotion || energySaver;
  return { pro: isPremium, animate: isPremium && !reduceMotion, reduceMotion };
}
