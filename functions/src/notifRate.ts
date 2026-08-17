// [M-3] Ventana deslizante para el límite de notificaciones por emisor.
// La lógica va aquí, pura y sin Firestore, para poder comprobarla de un vistazo:
//   npm run build && node lib/notifRate.js
import { strict as assert } from 'assert';

export const NOTIF_WINDOW_MS = 60 * 60 * 1000; // 1 hora
export const NOTIF_LIMIT_PER_WINDOW = 60;

export interface RateWindow {
  windowStartMs: number;
  count: number;
}

/**
 * Decide la ventana nueva tras un intento de notificar.
 * `prev` a null = primer envío del emisor (o ventana ya caducada).
 * `overLimit` a true significa que ESTA notificación sobra y hay que borrarla.
 */
export function nextWindow(
  prev: RateWindow | null,
  nowMs: number,
  limit: number = NOTIF_LIMIT_PER_WINDOW,
): RateWindow & { overLimit: boolean } {
  if (!prev || nowMs - prev.windowStartMs >= NOTIF_WINDOW_MS) {
    return { windowStartMs: nowMs, count: 1, overLimit: false };
  }
  const count = prev.count + 1;
  return { windowStartMs: prev.windowStartMs, count, overLimit: count > limit };
}

if (require.main === module) {
  const t0 = 1_700_000_000_000;

  // Primer envío: abre ventana y pasa.
  assert.deepEqual(nextWindow(null, t0, 3), { windowStartMs: t0, count: 1, overLimit: false });

  // Dentro de la ventana se acumula; el que supera el límite se marca.
  let w = nextWindow({ windowStartMs: t0, count: 1 }, t0 + 1000, 3);
  assert.equal(w.count, 2);
  assert.equal(w.overLimit, false);
  w = nextWindow({ windowStartMs: t0, count: 3 }, t0 + 2000, 3);
  assert.equal(w.overLimit, true, 'el 4º con límite 3 debe sobrar');

  // Al cumplirse la hora la ventana se reinicia aunque venga de estar pasado.
  w = nextWindow({ windowStartMs: t0, count: 999 }, t0 + NOTIF_WINDOW_MS, 3);
  assert.deepEqual(w, { windowStartMs: t0 + NOTIF_WINDOW_MS, count: 1, overLimit: false });

  console.log('notifRate OK');
}
