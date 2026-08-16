/**
 * Prueba de humo del generador de paletas. Sin framework: `npx tsx
 * utils/derivePalette.test.ts` o el runner del proyecto.
 *
 * Lo que comprueba es lo único que puede arruinar una paleta creada por el
 * usuario: que el texto no se lea. Recorre TODO el círculo cromático porque el
 * problema aparece en zonas concretas —los amarillos y los cianes son los que
 * rompen el contraste— y basta con que una franja falle para que alguien se
 * cree una paleta ilegible.
 */
import { derivePalette, paletteContrastReport, hsl, hexToHsl, contrastRatio } from './derivePalette';
import type { SecondaryMode, PaletteFeel } from './derivePalette';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) { failures++; console.error(`✗ ${label} ${detail}`); }
};

// ── Conversión de color ──
{
  const cases = ['#FF0000', '#00ACC1', '#123456', '#FFFFFF', '#000000'];
  for (const hex of cases) {
    const p = hexToHsl(hex)!;
    check(`ida y vuelta ${hex}`, !!p, 'no se pudo parsear');
    const back = hsl(p.h, p.s, p.l);
    const d = hexToHsl(back)!;
    // Se permite 1 punto por el redondeo a enteros.
    check(`ida y vuelta ${hex} → ${back}`, Math.abs(d.l - p.l) <= 1 && Math.abs(d.s - p.s) <= 1);
  }
  check('hex inválido devuelve null', hexToHsl('nope') === null);
  check('acepta forma corta', hexToHsl('#0AC') !== null);
  check('blanco sobre negro = 21', Math.round(contrastRatio('#FFFFFF', '#000000')) === 21);
}

// ── Contraste en TODO el círculo cromático ──
const modes: SecondaryMode[] = ['analogous', 'complementary', 'triadic'];
const feels: PaletteFeel[] = ['vivid', 'soft'];
let checked = 0;
for (let hue = 0; hue < 360; hue += 10) {
  for (const secondaryMode of modes) {
    for (const feel of feels) {
      const p = derivePalette({ hue, secondaryMode, feel }, 'custom_test');
      for (const r of paletteContrastReport(p)) {
        checked++;
        check(
          `contraste ${r.pair} · matiz ${hue} · ${secondaryMode} · ${feel}`,
          r.ratio >= r.min,
          `→ ${r.ratio.toFixed(2)} < ${r.min}`,
        );
      }
      // La paleta tiene que estar completa: un token que falte se vería como
      // "undefined" en la app y rompería el render.
      for (const mode of ['light', 'dark'] as const) {
        const missing = Object.entries(p.colors[mode]).filter(([, v]) => !v);
        check(`sin tokens vacíos (${mode}, matiz ${hue})`, missing.length === 0, missing.map(([k]) => k).join(', '));
      }
      check(`6 pares de blobs oscuros · matiz ${hue}`, p.auroraBlobs.dark.length === 6);
      check(`6 pares de blobs claros · matiz ${hue}`, p.auroraBlobs.light.length === 6);
      check(`3 stops de degradado · matiz ${hue}`, p.gradientLight.length === 3 && p.gradientDark.length === 3);
    }
  }
}

console.log(`${checked} comprobaciones de contraste sobre 36 matices × 3 armonías × 2 acabados`);
if (failures) {
  console.error(`\n${failures} FALLOS`);
  process.exit(1);
}
console.log('✓ todas las paletas generadas son legibles');
