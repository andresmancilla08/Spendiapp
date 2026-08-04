/**
 * Generador de las paletas neón. No vive en el build: produce el bloque TS que se
 * pega en config/palettes.ts, con los tokens derivados de un matiz y la luminosidad
 * ajustada por contraste medido (no a ojo), que es lo que exigen
 * utils/reportPalette.test.ts y utils/goalsContrast.test.ts.
 */
const hex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();

function hsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return hex((r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255);
}

const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
function luminance(h: string): number {
  const n = parseInt(h.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => lin(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Baja la L hasta que el tono alcanza `target` sobre un fondo claro. */
function darkenUntil(h: number, s: number, bg: string, target: number, startL = 0.5): string {
  for (let l = startL; l > 0.08; l -= 0.01) {
    const c = hsl(h, s, l);
    if (ratio(c, bg) >= target) return c;
  }
  return hsl(h, s, 0.1);
}
/** Sube la L hasta que el tono alcanza `target` sobre un fondo oscuro. */
function lightenUntil(h: number, s: number, bg: string, target: number, startL = 0.5): string {
  for (let l = startL; l < 0.95; l += 0.01) {
    const c = hsl(h, s, l);
    if (ratio(c, bg) >= target) return c;
  }
  return hsl(h, s, 0.95);
}

type Spec = {
  id: string; h: number; h2: number; h3: number;
  /** Matiz para el modo CLARO. Un amarillo o un lima con 4,8:1 sobre blanco tiene
   *  que ser oscuro, y oscurecerlo en su propio matiz da mostaza y oliva sucios.
   *  Desplazarlo unos grados conserva la temperatura y limpia el tono. */
  hLight?: number;
};

/** Matices elegidos por los HUECOS reales del catálogo: 16 de las 40 paletas eran
 *  cian o verde y no había ni una amarilla ni un azul saturado. */
const SPECS: Spec[] = [
  { id: 'cyberpunk',      h: 315, h2: 185, h3: 90 },
  { id: 'electricViolet', h: 272, h2: 322, h3: 190 },
  { id: 'acidLime',       h: 78,  h2: 300, h3: 192, hLight: 98 },
  { id: 'solarFlare',     h: 45,  h2: 12,  h3: 280, hLight: 34 },
  { id: 'hotMagenta',     h: 330, h2: 265, h3: 48 },
  { id: 'electricBlue',   h: 215, h2: 172, h3: 330 },
  { id: 'tangerine',      h: 22,  h2: 332, h3: 198, hLight: 14 },
  { id: 'infrared',       h: 355, h2: 30,  h3: 285 },
];

function palette(sp: Spec): string {
  const { id, h, h2, h3 } = sp;
  const hL = sp.hLight ?? h;
  const S = 0.96;          // saturación neón
  const Sd = 0.9;

  // ── OSCURO: fondos casi negros teñidos del matiz ──
  const bgD = hsl(h, 0.55, 0.045);
  const bg2D = hsl(h, 0.5, 0.065);
  const surfD = hsl(h, 0.42, 0.095);
  const surf2D = hsl(h, 0.38, 0.13);
  const surfElevD = hsl(h, 0.36, 0.155);
  const surfOverD = hsl(h, 0.34, 0.19);
  const borderD = hsl(h, 0.32, 0.2);

  // El primario del modo oscuro es el neón puro, medido contra la superficie real.
  const primD = lightenUntil(h, S, surfD, 5.5, 0.5);
  const secD = lightenUntil(h2, Sd, surfD, 5.5, 0.5);
  const terD = lightenUntil(h3, Sd, surfD, 5.5, 0.5);
  const primDarkD = hsl(h, S, 0.5);
  const primLightD = hsl(h, 0.7, 0.12);
  const secLightD = hsl(h2, 0.7, 0.12);
  const terLightD = hsl(h3, 0.7, 0.12);
  // Un neón claro pide tinta OSCURA encima, no blanca.
  const onPrimD = hsl(h, 0.9, 0.06);
  const onSecD = hsl(h2, 0.9, 0.06);
  const onTerD = hsl(h3, 0.9, 0.06);
  const textPD = hsl(h, 0.3, 0.96);
  const textSD = hsl(h, 0.14, 0.7);
  const textTD = hsl(h, 0.12, 0.68);
  const successD = lightenUntil(150, 0.75, surfD, 5.5, 0.5);

  // ── CLARO: el mismo matiz, oscurecido hasta ser legible sobre blanco ──
  const primL = darkenUntil(hL, 0.99, '#FFFFFF', 4.8, 0.58);
  const secL = darkenUntil(h2, 0.97, '#FFFFFF', 4.8, 0.58);
  const terL = darkenUntil(h3, 0.97, '#FFFFFF', 4.8, 0.58);
  const primDarkL = darkenUntil(hL, 1, '#FFFFFF', 6.5, 0.45);
  const primLightL = hsl(hL, 0.95, 0.94);
  const secLightL = hsl(h2, 0.95, 0.94);
  const terLightL = hsl(h3, 0.95, 0.94);
  const bg2L = hsl(hL, 0.9, 0.975);
  const surf2L = hsl(hL, 0.85, 0.945);
  const surfElevL = hsl(hL, 0.9, 0.972);
  const borderL = hsl(hL, 0.6, 0.875);
  const inputBorderL = hsl(hL, 0.55, 0.85);
  const textPL = hsl(hL, 0.45, 0.11);
  const successL = darkenUntil(150, 0.95, '#FFFFFF', 4.8, 0.5);

  const blobsD = [
    [primD, hsl(h, 0.85, 0.18)],
    [secD, hsl(h2, 0.85, 0.18)],
    [terD, hsl(h3, 0.85, 0.18)],
    [hsl(h + 18, S, 0.66), hsl(h + 18, 0.85, 0.2)],
    [hsl(h2 - 18, Sd, 0.66), hsl(h2 - 18, 0.85, 0.2)],
    [hsl(h + 40, 0.85, 0.7), hsl(h + 40, 0.8, 0.22)],
  ];
  const blobsL = [
    [hsl(hL, 0.9, 0.93), hsl(hL, 0.9, 0.86)],
    [hsl(h2, 0.9, 0.93), hsl(h2, 0.9, 0.86)],
    [hsl(h3, 0.9, 0.93), hsl(h3, 0.9, 0.86)],
    [hsl(hL + 18, 0.9, 0.94), hsl(hL + 18, 0.9, 0.88)],
    [hsl(h2 - 18, 0.9, 0.94), hsl(h2 - 18, 0.9, 0.88)],
    [hsl(hL + 40, 0.9, 0.95), hsl(hL + 40, 0.9, 0.9)],
  ];
  const pair = (b: string[][]) => b.map(([a, c]) => `['${a}','${c}']`).join(',');

  const title = id.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  return `  // ── ${title} ${'─'.repeat(Math.max(2, 72 - title.length))}
  {
    id: '${id}',
    previewColors: ['${primD}', '${secD}', '${terD}'],
    gradientDark: ['${bgD}', '${bg2D}', '${hsl(h, 0.6, 0.1)}'],
    gradientLight: ['#FFFFFF', '${hsl(hL, 0.9, 0.965)}', '${hsl(hL, 0.92, 0.9)}'],
    auroraBlobs: {
      dark:  [${pair(blobsD)}],
      light: [${pair(blobsL)}],
    },
    colors: {
      light: {
        primary: '${primL}', primaryLight: '${primLightL}', primaryDark: '${primDarkL}', onPrimary: '#FFFFFF',
        secondary: '${secL}', secondaryLight: '${secLightL}', secondaryDark: '${darkenUntil(h2, 1, '#FFFFFF', 6.5, 0.45)}', onSecondary: '#FFFFFF',
        tertiary: '${terL}', tertiaryLight: '${terLightL}', tertiaryDark: '${darkenUntil(h3, 1, '#FFFFFF', 6.5, 0.45)}', onTertiary: '#FFFFFF',
        success: '${successL}', successLight: '#DCFCE7',
        info: '${secL}', infoLight: '${secLightL}',
        background: '#FFFFFF', backgroundSecondary: '${bg2L}',
        surface: '#FFFFFF', surfaceSecondary: '${surf2L}', surfaceElevated: '${surfElevL}',
        textPrimary: '${textPL}',
        border: '${borderL}', borderFocus: '${primL}',
        inputBackground: '${surfElevL}', inputBorder: '${inputBorderL}',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '${primD}', primaryLight: '${primLightD}', primaryDark: '${primDarkD}', onPrimary: '${onPrimD}',
        secondary: '${secD}', secondaryLight: '${secLightD}', secondaryDark: '${hsl(h2, Sd, 0.5)}', onSecondary: '${onSecD}',
        tertiary: '${terD}', tertiaryLight: '${terLightD}', tertiaryDark: '${hsl(h3, Sd, 0.5)}', onTertiary: '${onTerD}',
        success: '${successD}', successLight: '${hsl(150, 0.6, 0.1)}',
        info: '${secD}', infoLight: '${secLightD}',
        background: '${bgD}', backgroundSecondary: '${bg2D}',
        surface: '${surfD}', surfaceSecondary: '${surf2D}', surfaceElevated: '${surfElevD}', surfaceOverlay: '${surfOverD}',
        textPrimary: '${textPD}', textSecondary: '${textSD}', textTertiary: '${textTD}', textInverse: '${bgD}',
        border: '${borderD}', borderFocus: '${primD}',
        inputBackground: '${surfD}', inputBorder: '${borderD}',
        ...FIXED_DARK,
      },
    },
  },`;
}

console.log(SPECS.map(palette).join('\n'));
