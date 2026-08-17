"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIF_LIMIT_PER_WINDOW = exports.NOTIF_WINDOW_MS = void 0;
exports.nextWindow = nextWindow;
// [M-3] Ventana deslizante para el límite de notificaciones por emisor.
// La lógica va aquí, pura y sin Firestore, para poder comprobarla de un vistazo:
//   npm run build && node lib/notifRate.js
const assert_1 = require("assert");
exports.NOTIF_WINDOW_MS = 60 * 60 * 1000; // 1 hora
exports.NOTIF_LIMIT_PER_WINDOW = 60;
/**
 * Decide la ventana nueva tras un intento de notificar.
 * `prev` a null = primer envío del emisor (o ventana ya caducada).
 * `overLimit` a true significa que ESTA notificación sobra y hay que borrarla.
 */
function nextWindow(prev, nowMs, limit = exports.NOTIF_LIMIT_PER_WINDOW) {
    if (!prev || nowMs - prev.windowStartMs >= exports.NOTIF_WINDOW_MS) {
        return { windowStartMs: nowMs, count: 1, overLimit: false };
    }
    const count = prev.count + 1;
    return { windowStartMs: prev.windowStartMs, count, overLimit: count > limit };
}
if (require.main === module) {
    const t0 = 1700000000000;
    // Primer envío: abre ventana y pasa.
    assert_1.strict.deepEqual(nextWindow(null, t0, 3), { windowStartMs: t0, count: 1, overLimit: false });
    // Dentro de la ventana se acumula; el que supera el límite se marca.
    let w = nextWindow({ windowStartMs: t0, count: 1 }, t0 + 1000, 3);
    assert_1.strict.equal(w.count, 2);
    assert_1.strict.equal(w.overLimit, false);
    w = nextWindow({ windowStartMs: t0, count: 3 }, t0 + 2000, 3);
    assert_1.strict.equal(w.overLimit, true, 'el 4º con límite 3 debe sobrar');
    // Al cumplirse la hora la ventana se reinicia aunque venga de estar pasado.
    w = nextWindow({ windowStartMs: t0, count: 999 }, t0 + exports.NOTIF_WINDOW_MS, 3);
    assert_1.strict.deepEqual(w, { windowStartMs: t0 + exports.NOTIF_WINDOW_MS, count: 1, overLimit: false });
    console.log('notifRate OK');
}
//# sourceMappingURL=notifRate.js.map