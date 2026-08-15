import { useEffect } from 'react';
import { Animated } from 'react-native';

/**
 * Deja un valor animado QUIETO en un punto del ciclo, en vez de recorrerlo.
 *
 * Los efectos de fondo conservan su geometría, sus degradados y su desenfoque
 * originales — solo dejan de moverse. Esa era la fuente real del consumo: un
 * `filter: blur()` estático se pinta UNA vez y el compositor reutiliza la capa;
 * lo caro era rehacer ese desenfoque en cada frame porque debajo algo cambiaba.
 * Medido en la pantalla de login: 1.440 escrituras de estilo por segundo con la
 * app en reposo, y 19× más CPU que con el movimiento apagado.
 *
 * Sustituye a `usePhasedLoop`, que arrancaba el bucle. La firma es la misma
 * para no tocar la geometría de ningún efecto.
 *
 * El punto de congelado (`FROZEN_AT`) no es ni el valle ni el pico. Casi todos
 * los efectos interpolan la opacidad como valle → pico → valle: congelar en el
 * arranque los dejaría en su versión más apagada, y en el pico compiten con el
 * texto que va encima. A un tercio del ciclo el fondo se lee y el contenido
 * sigue mandando.
 */
const FROZEN_AT = 0.3;

export function useFrozenPhase(v: Animated.Value, _duration?: number, phase = 0) {
  useEffect(() => {
    v.setValue(phase + FROZEN_AT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
}

/** Para efectos que reparten sus elementos por índice (partículas, orbes): cada
 *  uno se congela en un punto distinto del ciclo, así el conjunto se ve
 *  disperso y no alineado. */
export function frozenPhaseFor(index: number, count: number) {
  // Razón áurea: reparte sin repetir patrón visible aunque el conjunto crezca.
  return ((index * 0.618) % 1) * (count > 1 ? 1 : 0) || FROZEN_AT;
}

export { FROZEN_AT };
