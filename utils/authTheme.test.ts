/**
 * npx tsx utils/authTheme.test.ts
 *
 * Los botones de acceso NO pueden probarse solo con la paleta por defecto: la app
 * tiene 31 paletas de usuario × 2 modos = 62 combinaciones, y basta con que una
 * derive un par ilegible para que alguien se quede con un botón que no se lee.
 * Esta prueba recorre las 62 y falla si alguna no llega a AA.
 */
import assert from 'node:assert';
import { PALETTES } from '../config/palettes';
import { authTokens } from './authTheme';
import { contrastRatio } from './contrast';

const AA = 4.5;
/** Trazo y relleno de un control: WCAG 1.4.11 pide 3:1 contra lo que tiene al lado. */
const UI = 3;

let worstPrimary = { name: '', mode: '', ratio: 99 };
let worstSecondary = { name: '', mode: '', ratio: 99 };
const secondaryNeedsEdge: string[] = [];

for (const p of PALETTES) {
  for (const mode of ['light', 'dark'] as const) {
    const colors = p.colors[mode] as unknown as Record<string, string>;
    const tk = authTokens(colors, mode === 'dark');
    const label = `${p.id}/${mode}`;

    // 1. Botón primario: su relleno contra su propio texto.
    const primary = contrastRatio(tk.ink, tk.onInk);
    assert.ok(primary >= AA, `${label}: primario ${tk.ink}/${tk.onInk} = ${primary.toFixed(2)}`);
    if (primary < worstPrimary.ratio) worstPrimary = { name: p.id, mode, ratio: primary };

    // 2. Botón secundario: relleno de superficie con texto en tinta.
    const secondary = contrastRatio(tk.secondaryBg, colors.textPrimary);
    assert.ok(secondary >= AA, `${label}: secundario ${colors.surfaceSecondary} = ${secondary.toFixed(2)}`);
    if (secondary < worstSecondary.ratio) worstSecondary = { name: p.id, mode, ratio: secondary };

    // 3. El secundario tiene que DISTINGUIRSE del fondo de la pantalla. Cuando no
    //    llega a 1.3:1 se lee como texto suelto, no como botón: ahí `AppButton` le
    //    pinta un trazo. Se registra para que el número esté a la vista.
    assert.ok(
      contrastRatio(tk.secondaryBg, colors.background) >= 1.3,
      `${label}: el secundario ${tk.secondaryBg} no se separa del fondo ${colors.background}`,
    );
    if (contrastRatio(colors.surfaceSecondary ?? '', colors.background) < 1.3) {
      secondaryNeedsEdge.push(label);
    }

    // 4. Acento derivado: es el que usan foco, badge e iconos sobre el fondo.
    const accent = contrastRatio(tk.accent, colors.background);
    assert.ok(accent >= AA, `${label}: acento ${tk.accent} = ${accent.toFixed(2)}`);

    // 5. Trazo del campo con foco contra su relleno.
    const focus = contrastRatio(tk.fieldLineFocus, tk.fieldBg);
    assert.ok(focus >= UI, `${label}: foco ${tk.fieldLineFocus} sobre ${tk.fieldBg} = ${focus.toFixed(2)}`);
  }
}

console.log(`authTheme: ok · ${PALETTES.length} paletas × 2 modos = ${PALETTES.length * 2} combinaciones`);
console.log(`  primario   peor caso ${worstPrimary.ratio.toFixed(2)}:1 (${worstPrimary.name}/${worstPrimary.mode})`);
console.log(`  secundario peor caso ${worstSecondary.ratio.toFixed(2)}:1 (${worstSecondary.name}/${worstSecondary.mode})`);
console.log(`  secundario corregido (surfaceSecondary no se separaba): ${secondaryNeedsEdge.length}/${PALETTES.length * 2}`);
