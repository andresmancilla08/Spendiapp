import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * ¿Conviene ahorrar energía ahora mismo?
 *
 * Sustituye al interruptor manual de "ahorro de batería": pedirle al usuario que
 * apague los efectos cuando le queda poca batería es pedirle que haga el trabajo
 * del sistema. La app lo detecta y se aparta sola.
 *
 * Señales, por orden de fiabilidad:
 *  1. Batería baja y sin cargar (Battery Status API). El umbral es 20 %, el
 *     mismo al que iOS y Android ofrecen su modo de bajo consumo.
 *  2. "Ahorro de datos" activado: quien lo enciende está pidiendo que la app se
 *     modere, y el movimiento decorativo es de lo primero que sobra.
 *
 * LÍMITE CONOCIDO: Safari no implementa la Battery Status API, así que en la
 * PWA de iPhone esto no se dispara por batería. Ahí la señal que sí llega es
 * "Reducir movimiento" de Accesibilidad, que `useProMotion` ya respeta. No se
 * añade una dependencia nativa solo para esto.
 */

type NavigatorWithBattery = Navigator & {
  getBattery?: () => Promise<{
    level: number;
    charging: boolean;
    addEventListener: (t: string, l: () => void) => void;
    removeEventListener: (t: string, l: () => void) => void;
  }>;
  connection?: { saveData?: boolean };
};

/** Mismo umbral al que el sistema propone su modo de bajo consumo. */
const LOW_BATTERY = 0.2;

export function useEnergySaver(): boolean {
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
    const nav = navigator as NavigatorWithBattery;

    if (nav.connection?.saveData) setSaving(true);

    if (!nav.getBattery) return;
    let cancelled = false;
    let battery: Awaited<ReturnType<NonNullable<NavigatorWithBattery['getBattery']>>> | null = null;

    const sync = () => {
      if (!battery) return;
      setSaving(battery.level <= LOW_BATTERY && !battery.charging);
    };

    nav.getBattery()
      .then((b) => {
        if (cancelled) return;
        battery = b;
        sync();
        b.addEventListener('levelchange', sync);
        b.addEventListener('chargingchange', sync);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      battery?.removeEventListener('levelchange', sync);
      battery?.removeEventListener('chargingchange', sync);
    };
  }, []);

  return saving;
}
