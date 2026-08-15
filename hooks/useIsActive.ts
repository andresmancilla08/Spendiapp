import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

/**
 * ¿Está la app en primer plano y visible?
 *
 * Sin esto, los bucles de animación siguen corriendo con la app minimizada. En
 * web el navegador congela `requestAnimationFrame` en pestaña oculta y tapa el
 * problema; en iOS y Android NO hay ese salvavidas y el fondo animado sigue
 * consumiendo batería con la app en segundo plano.
 *
 * Es un store de módulo con `useSyncExternalStore`: un único par de listeners
 * para toda la app por muchos componentes que lo consulten (los efectos de
 * fondo pueden ser más de cien a la vez).
 */

let active = true;
const listeners = new Set<() => void>();

function set(next: boolean) {
  if (next === active) return;
  active = next;
  listeners.forEach((l) => l());
}

// Un solo par de suscripciones para todo el proceso.
if (Platform.OS === 'web') {
  if (typeof document !== 'undefined') {
    active = !document.hidden;
    document.addEventListener('visibilitychange', () => set(!document.hidden));
  }
} else {
  active = AppState.currentState === 'active';
  AppState.addEventListener('change', (s) => set(s === 'active'));
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}

const getSnapshot = () => active;
// En el render de servidor/exportación estática no hay ventana: se asume activo.
const getServerSnapshot = () => true;

export function useIsActive() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Lectura puntual, para código que no es un componente. */
export const isActiveNow = () => active;
