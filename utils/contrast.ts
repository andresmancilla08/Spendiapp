/**
 * Contraste WCAG mínimo, sin dependencias: elegir un color de texto que de verdad se lea.
 *
 * Existe porque las paletas pastel del selector de temas (cottonCandy, sakura, peach…) tienen
 * `primary`/`warning` clarísimos: usarlos como color de TEXTO da ratios de 1.5-2.2:1. En vez de
 * mantener listas de excepciones por paleta, se mide y se elige.
 */
function rgbOf(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function contrastRatio(a: string, b: string): number {
  const ra = rgbOf(a);
  const rb = rgbOf(b);
  if (!ra || !rb) return 0;
  const la = relLuminance(ra);
  const lb = relLuminance(rb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Primer candidato que llega a 4.5:1 sobre `bg`. Si ninguno llega (paletas pastel donde ni el
 * texto claro ni el oscuro pasan sobre el tinte), devuelve el de MAYOR contraste disponible.
 */
export function readableOn(bg: string, candidates: string[]): string {
  if (!rgbOf(bg)) return candidates[candidates.length - 1];
  let best = candidates[0];
  let bestRatio = -1;
  for (const c of candidates) {
    if (!rgbOf(c)) continue;
    const r = contrastRatio(c, bg);
    if (r >= 4.5) return c;
    if (r > bestRatio) {
      best = c;
      bestRatio = r;
    }
  }
  return best;
}

/**
 * Parte `label` para poder resaltar `person` dentro de la frase.
 * Busca el nombre exacto en vez de asumir que va al final: en "Compartido con X y 2 más" va
 * en medio. Si no aparece (traducción sin interpolar, nombre vacío), devuelve la frase intacta
 * y `name` vacío — nunca duplica el nombre.
 */
export function splitByPerson(label: string, person: string): { before: string; name: string; after: string } {
  const at = person ? label.indexOf(person) : -1;
  if (at < 0) return { before: label, name: '', after: '' };
  return { before: label.slice(0, at), name: person, after: label.slice(at + person.length) };
}
