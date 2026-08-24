// npx tsx utils/sparkline.test.ts
import assert from 'node:assert';
import { sparklinePoints } from './sparkline';

const W = 100, H = 36, P = 4;
const FLOOR = H - P;   // 32 — donde caían las series constantes
const TOP = P;         // 4
const MID = H / 2;     // 18

// ── El bug reportado: seis meses a cero se dibujaban como línea en el suelo ──
{
  const pts = sparklinePoints([0, 0, 0, 0, 0, 0], W, H, P);
  assert.strictEqual(pts.length, 6);
  for (const p of pts) {
    assert.notStrictEqual(p.y, FLOOR, 'una serie sin datos NO puede quedar en el suelo');
    assert.strictEqual(p.y, MID, 'sin variación va al centro');
  }
}

// Constante distinta de cero: mismo criterio.
{
  const pts = sparklinePoints([500, 500, 500], W, H, P);
  assert.deepStrictEqual(pts.map((p) => p.y), [MID, MID, MID]);
}

// ── Y la escala normal sigue intacta ──
{
  const pts = sparklinePoints([0, 50, 100], W, H, P);
  assert.strictEqual(pts[0].y, FLOOR, 'el mínimo va abajo');
  assert.strictEqual(pts[2].y, TOP, 'el máximo va arriba');
  assert.strictEqual(pts[1].y, (FLOOR + TOP) / 2, 'el punto medio, en medio');
  assert.deepStrictEqual(pts.map((p) => p.x), [0, 50, 100]);
}

// Negativos: el mínimo es el más negativo, no el cero.
{
  const pts = sparklinePoints([-100, 0], W, H, P);
  assert.strictEqual(pts[0].y, FLOOR);
  assert.strictEqual(pts[1].y, TOP);
}

// Menos de dos puntos no dibuja nada (y no revienta).
assert.deepStrictEqual(sparklinePoints([], W, H, P), []);
assert.deepStrictEqual(sparklinePoints([1], W, H, P), []);
assert.deepStrictEqual(sparklinePoints(undefined, W, H, P), []);

console.log('sparkline ok');
