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

const hexOf = ([r, g, b]: [number, number, number]) =>
  `#${[r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`;

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
 * Distancia entre dos colores en RGB, de 0 a 441. Responde a "¿se ven distintos?",
 * que NO es lo que mide el contraste: dos tonos opuestos con la misma luminancia dan
 * ratio 1,05 y aun así nadie los confunde.
 */
export function colorDistance(a: string, b: string): number {
  const ra = rgbOf(a);
  const rb = rgbOf(b);
  if (!ra || !rb) return 0;
  return Math.hypot(ra[0] - rb[0], ra[1] - rb[1], ra[2] - rb[2]);
}

/** Mezcla lineal de dos colores: `t` = 0 devuelve `a`, 1 devuelve `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const ra = rgbOf(a);
  const rb = rgbOf(b);
  if (!ra || !rb) return a;
  return hexOf([0, 1, 2].map((i) => ra[i] + (rb[i] - ra[i]) * t) as [number, number, number]);
}

/**
 * El MISMO color de la paleta, aclarado u oscurecido lo justo para llegar a `ratio`
 * sobre `bg`. Es lo que `accentInk` no puede hacer: allí el último recurso es un gris
 * neutro, y con dos identidades enfrentadas (yo / la otra persona) dos grises se leen
 * como el mismo lado. Aquí se conserva el tono, que es lo que porta el significado.
 */
export function readableTint(color: string, bg: string, ratio = 4.5): string {
  const start = rgbOf(color);
  const back = rgbOf(bg);
  if (!start || !back) return color;
  // Fondo claro → hay que oscurecer; fondo oscuro → aclarar.
  const towards: [number, number, number] = relLuminance(back) > 0.4 ? [0, 0, 0] : [255, 255, 255];
  let out = color;
  for (let step = 0; step <= 20; step++) {
    out = hexOf([0, 1, 2].map((i) => start[i] + (towards[i] - start[i]) * (step * 0.05)) as [number, number, number]);
    if (contrastRatio(out, bg) >= ratio) return out;
  }
  return out;   // ni el blanco/negro puro llegó: se devuelve el extremo
}

type AccentTone = 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info';

/**
 * Tinta de acento que SE LEE. Usa el token de la paleta si llega a 4.5:1 sobre `bg`;
 * si no (27 de las 31 paletas fallan en modo claro: los pastel bajan a ~1.2:1), cae a
 * la variante oscura del mismo tono y, en última instancia, al texto secundario.
 *
 * Para TEXTO e iconos pequeños. Fondos, barras y gráficos siguen usando el token crudo.
 */
export function accentInk(
  colors: Record<string, string | undefined>,
  tone: AccentTone,
  bg?: string,
): string {
  const background = bg ?? colors.background ?? '#FFFFFF';
  const candidates = [colors[tone], colors[`${tone}Dark`], colors.textSecondary, colors.textPrimary]
    .filter((c): c is string => typeof c === 'string');
  return readableOn(background, candidates);
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
