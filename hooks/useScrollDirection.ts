import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * `true` cuando el usuario está bajando en cualquier lista de la app.
 *
 * Escucha el scroll en fase de CAPTURA sobre `document`: los ScrollView de
 * react-native-web son divs con overflow propio y su evento `scroll` no
 * burbujea, así que un listener normal en `window` no se entera de nada. Con
 * captura, un único listener cubre toda la app y ninguna pantalla tiene que
 * pasar su `scrollY` hacia abajo.
 *
 * Solo web; en nativo devuelve siempre `false` (haría falta el `scrollY` de
 * cada pantalla y la app se distribuye como PWA).
 */
export function useScrollDirection({ threshold = 12, activateAfter = 80 } = {}) {
  const [down, setDown] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    // Por scroller: cada lista lleva su propia última posición, si no, alternar
    // entre dos pantallas daría saltos de dirección falsos.
    const lastY = new WeakMap<EventTarget, number>();

    const onScroll = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (!el || typeof el.scrollTop !== 'number') return;
      const y = el.scrollTop;
      const prev = lastY.get(el) ?? 0;
      lastY.set(el, y);
      if (Math.abs(y - prev) < threshold) return;   // ruido / rebote
      setDown(y > prev && y > activateAfter);
    };

    document.addEventListener('scroll', onScroll, true);
    return () => document.removeEventListener('scroll', onScroll, true);
  }, [threshold, activateAfter]);

  return down;
}
