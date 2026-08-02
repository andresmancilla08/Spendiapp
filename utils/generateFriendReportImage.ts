/**
 * Documento del reporte entre dos amigos — dirección "Cara a cara", tres formatos.
 *
 *   chat   1080 × 1080  · solo el veredicto y la balanza; sobrevive a la miniatura de un chat
 *   story  1080 × 1920  · vertical, para estados e historias
 *   sheet  1080 × alto variable (≈1:2,2) · el detalle completo, paginado si hace falta
 *
 * Se dibuja con Canvas 2D imperativo: aquí no hay CSS ni layout automático, cada
 * caja se calcula a mano. Las tres composiciones comparten primitivas (balanza,
 * cabecera de personas, barras enfrentadas, filas de movimiento) y solo cambian
 * el lienzo y qué bloques entran; así una corrección de dibujo vale para las tres.
 *
 * Los datos vienen ya calculados en `utils/friendReportModel`, que es el mismo
 * modelo que pinta la pantalla: el documento no vuelve a hacer aritmética.
 */
import type { FriendReportModel, FriendReportEntry } from './friendReportModel';
import { initialOf, scaleTilt } from './friendReportModel';
import { localeFor } from './dateLocale';
import { Fonts } from '../config/fonts';
import { formatMoneyAbs } from './formatMoney';

export type ReportFormat = 'chat' | 'story' | 'sheet';

export interface FriendReportImageLabels {
  /** "Ana te debe" / "Le debes a Ana" / "Están saldados" */
  verdict: string;
  /** "Una sola transferencia y quedan saldados" */
  verdictHint: string;
  resultOf: string;          // "Resultado de agosto"
  period: string;            // "Agosto 2026"
  you: string;               // "Tú"
  favourMine: string;        // "A tu favor"
  favourTheirs: string;      // "A favor de Ana"
  sharedSection: string;     // "Gastos compartidos"
  transfersSection: string;  // "Transferencias"
  monthTotal: string;        // "Total del mes"
  movementsTitle: string;    // "Los 7 movimientos, cada uno de su lado"
  /** Título de las páginas 2+: habla solo de las filas de esa página. */
  movementsContinued: (n: number) => string;
  socialStat: string;        // "Pagaste tú 4 de las 7 veces"
  tiltMine: string;          // "Cae de tu lado"
  tiltTheirs: string;        // "Cae del lado de Ana"
  tiltEven: string;          // "En equilibrio"
  sent: string;              // "Enviado"
  received: string;          // "Recibido"
  footer: string;            // "David Osorio ↔ Ana Ruiz · agosto 2026"
  /** Se llama por página: el texto interpolado una sola vez decía "1 de 1" en todas. */
  pageLabel: (n: number, total: number) => string;
}

export interface FriendReportImageOptions {
  format: ReportFormat;
  logoUri?: string;
}

export interface FriendReportImageResult {
  blob: Blob;
  width: number;
  height: number;
  page: number;
  totalPages: number;
  format: ReportFormat;
}

// ── Lienzo ─────────────────────────────────────────────────────────────────
const SCALE = 2;
/** Ancho lógico: 540 × 2 = 1080 px reales en las tres composiciones. */
const W = 540;
const PAD = 30;

const FORMAT_HEIGHT: Record<ReportFormat, number | null> = {
  chat: 540,     // 1:1
  story: 960,    // 9:16
  sheet: null,   // variable
};

/** Movimientos por página en el formato hoja. */
const ROWS_PER_PAGE = 9;

// ── Identidad "Cara a cara" ────────────────────────────────────────────────
const BG        = '#0B1618';
const PANEL     = '#101E22';
const HAIRLINE  = '#22353A';
/** Carriles, ejes y mástil: portan significado, así que necesitan 3:1 (WCAG 1.4.11). */
const GRAPHIC   = '#5C686B';
const INK       = '#EEF6F8';
const INK_SOFT  = '#9EABAF';
const INK_DIM   = '#7E9198';
const MINE      = '#00BCD4';   // tú
const THEIRS    = '#C0CA33';   // la otra persona
const MINE_DEEP = '#00838F';
const ON_MINE   = '#04252B';
const ON_THEIRS = '#1E2200';

/**
 * `expo-font` registra una familia POR PESO con el nombre de la clave
 * (`Montserrat_700Bold`), no una familia "Montserrat" con pesos. Pedir
 * `700 13px Montserrat` cae a Helvetica sin avisar — el mismo fallo que tenía
 * el generador anterior con Inter. Aquí se elige la familia por peso.
 */
const FAMILY: Record<number, string> = {
  400: Fonts.regular,
  500: Fonts.medium,
  600: Fonts.semiBold,
  650: Fonts.semiBold,
  700: Fonts.bold,
  800: Fonts.extraBold,
};
const FALLBACK = '"SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif';
const MONO_FALLBACK = 'ui-monospace, SFMono-Regular, Menlo, "Roboto Mono", monospace';

const font = (weight: number, size: number, mono = false) =>
  mono
    ? `${size}px "${weight >= 600 ? Fonts.monoBold : Fonts.mono}", ${MONO_FALLBACK}`
    : `${size}px "${FAMILY[weight] ?? Fonts.regular}", ${FALLBACK}`;

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtMoney = formatMoneyAbs;

// es-CO devuelve "24 de ago." y el "de" no aporta nada en una etiqueta de 9px.
const fmtDay = (d: Date) =>
  d.toLocaleDateString(localeFor(), { day: '2-digit', month: 'short' })
    .replace(/\sde\s/gi, ' ')
    .replace(/\./g, '')
    .toUpperCase();

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
/** Recorta con puntos suspensivos: Canvas no sabe hacer text-overflow. */
function clip(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}
function circle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  );
}
function loadImg(uri: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new window.Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.crossOrigin = 'anonymous';
    img.src = uri;
  });
}

/**
 * Espera a que la tipografía de marca esté lista. Sin esto, `measureText` mide con
 * la fuente de reserva y las píldoras salen con el ancho equivocado — es el fallo
 * que tenía el generador anterior, que además pedía una fuente (Inter) que la app
 * ni siquiera carga.
 */
async function ensureFonts(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return;
  try {
    await Promise.race([
      Promise.all([
        fonts.load(font(800, 44)),
        fonts.load(font(700, 13)),
        fonts.load(font(600, 10)),
        fonts.load(font(500, 11)),
        fonts.load(font(700, 12, true)),
        fonts.ready,
      ]),
      new Promise((r) => setTimeout(r, 1200)),
    ]);
  } catch {
    /* con la fuente de reserva el documento sigue saliendo */
  }
}

// ── Piezas de la identidad ─────────────────────────────────────────────────

/** Franja cian→lima del borde superior: la firma de la pareja. */
function drawTopBand(ctx: CanvasRenderingContext2D, w: number) {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, MINE);
  g.addColorStop(0.5, MINE);
  g.addColorStop(0.5, THEIRS);
  g.addColorStop(1, THEIRS);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, 5);
}

function drawBrandRow(ctx: CanvasRenderingContext2D, w: number, y: number, period: string) {
  circle(ctx, PAD + 7, y + 7, 7, MINE);
  circle(ctx, PAD + 7, y + 7, 3, BG);
  ctx.fillStyle = INK_SOFT;
  ctx.font = font(800, 10);
  ctx.textAlign = 'left';
  ctx.letterSpacing = '2px';
  ctx.fillText('SPENDIA', PAD + 22, y + 11);
  ctx.textAlign = 'right';
  ctx.fillText(period.toUpperCase(), w - PAD, y + 11);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
}

/** Avatar con anillo del color de su persona. */
function drawAvatar(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number,
  color: string, onColor: string, letter: string,
) {
  circle(ctx, cx, cy, r, color);
  ctx.fillStyle = onColor;
  ctx.font = font(800, r * 0.95);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, cx, cy + r * 0.04);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

/**
 * La balanza. `tilt` va de -1 (cae de mi lado) a 1 (cae del lado de la otra
 * persona); es el mismo valor que usa la pantalla, así que el ángulo coincide.
 */
function drawScale(ctx: CanvasRenderingContext2D, cx: number, cy: number, halfW: number, tilt: number) {
  const angle = Math.max(-0.34, Math.min(0.34, tilt * 0.42));
  const dy = Math.tan(angle) * halfW;

  // Mástil y base
  ctx.strokeStyle = GRAPHIC;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy + 22);
  ctx.stroke();
  ctx.fillStyle = GRAPHIC;
  ctx.beginPath();
  ctx.moveTo(cx - 9, cy + 26);
  ctx.lineTo(cx + 9, cy + 26);
  ctx.lineTo(cx + 4, cy + 20);
  ctx.lineTo(cx - 4, cy + 20);
  ctx.closePath();
  ctx.fill();

  // Viga: mitad cian, mitad lima
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = MINE;
  ctx.beginPath();
  ctx.moveTo(cx - halfW, cy - dy);
  ctx.lineTo(cx, cy);
  ctx.stroke();
  ctx.strokeStyle = THEIRS;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + halfW, cy + dy);
  ctx.stroke();

  // Fulcro
  circle(ctx, cx, cy, 3.4, rgba(GRAPHIC, 1));

  // Platillos: cuelgan de un tirante y son cuencos rellenos. Como semicírculos
  // sueltos se leían como dos ganchos y la balanza no se reconocía.
  const pan = (px: number, yEnd: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(px, yEnd);
    ctx.lineTo(px, yEnd + 10);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, yEnd + 11, 9, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
  };
  pan(cx - halfW, cy - dy, MINE);
  pan(cx + halfW, cy + dy, THEIRS);
  ctx.lineCap = 'butt';
}

/** Cabecera con las dos personas y la balanza entre ellas. */
function drawPeople(
  ctx: CanvasRenderingContext2D, w: number, y: number,
  model: FriendReportModel, labels: FriendReportImageLabels, avatarR: number,
): number {
  const cy = y + avatarR;
  const leftX = PAD + avatarR + 6;
  const rightX = w - PAD - avatarR - 6;

  drawAvatar(ctx, leftX, cy, avatarR, MINE, ON_MINE, initialOf(model.myName));
  drawAvatar(ctx, rightX, cy, avatarR, THEIRS, ON_THEIRS, initialOf(model.friendName));
  drawScale(ctx, w / 2, cy - 4, Math.min(52, (rightX - leftX) / 2 - avatarR - 18), scaleTilt(model.totals));

  // El texto va centrado en su columna: el ancho disponible es el DOBLE de la
  // distancia al borde más cercano, no una constante. Con `@mariafernandadelaespriella`
  // se salía 10px del lienzo.
  const widthAt = (x: number) => 2 * Math.min(x - PAD, w - PAD - x);

  ctx.textAlign = 'center';
  ctx.font = font(700, 13);
  ctx.fillStyle = INK;
  const myFirst = model.myName.split(' ')[0];
  ctx.fillText(clip(ctx, myFirst, widthAt(leftX)), leftX, cy + avatarR + 20);
  ctx.fillText(clip(ctx, model.friendName, widthAt(rightX)), rightX, cy + avatarR + 20);

  ctx.font = font(500, 10.5);
  ctx.fillStyle = INK_DIM;
  ctx.fillText(clip(ctx, labels.you, widthAt(leftX)), leftX, cy + avatarR + 35);
  if (model.friendUserName) {
    ctx.fillText(clip(ctx, `@${model.friendUserName}`, widthAt(rightX)), rightX, cy + avatarR + 35);
  }

  // Hacia dónde cae
  const tilt = scaleTilt(model.totals);
  const tiltLabel = tilt === 0 ? labels.tiltEven : tilt < 0 ? labels.tiltMine : labels.tiltTheirs;
  ctx.font = font(800, 9);
  ctx.fillStyle = INK_DIM;
  ctx.letterSpacing = '1.4px';
  ctx.fillText(tiltLabel.toUpperCase(), w / 2, cy + avatarR + 20);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';

  return cy + avatarR + 46;
}

/** Veredicto: el bloque que tiene que sobrevivir a una miniatura. */
function drawVerdict(
  ctx: CanvasRenderingContext2D, w: number, y: number,
  model: FriendReportModel, labels: FriendReportImageLabels, big: boolean,
  /** En la tarjeta de chat todo se juega en la miniatura: fuera el eyebrow y
   *  el veredicto a 25px, que a 130px de ancho son 6px reales en vez de 4. */
  thumbnailFirst = false,
): number {
  const color = model.net === 0 ? INK : model.net > 0 ? MINE : THEIRS;

  ctx.textAlign = 'center';
  if (!thumbnailFirst) {
    ctx.font = font(800, 9);
    ctx.fillStyle = INK_DIM;
    ctx.letterSpacing = '1.6px';
    ctx.fillText(labels.resultOf.toUpperCase(), w / 2, y);
    ctx.letterSpacing = '0px';
  }

  ctx.font = font(700, thumbnailFirst ? 25 : big ? 17 : 14);
  ctx.fillStyle = INK;
  ctx.fillText(clip(ctx, labels.verdict, w - PAD * 2), w / 2, y + (thumbnailFirst ? 26 : big ? 28 : 24));

  const amount = fmtMoney(model.net);
  let size = thumbnailFirst ? 48 : big ? 54 : 40;
  ctx.font = font(800, size);
  while (ctx.measureText(amount).width > w - PAD * 2 && size > 24) {
    size -= 2;
    ctx.font = font(800, size);
  }
  ctx.fillStyle = color;
  const amountY = y + (thumbnailFirst ? 84 : big ? 84 : 66);
  ctx.fillText(amount, w / 2, amountY);

  let bottom = amountY;
  if (model.net !== 0) {
    ctx.font = font(500, 11);
    ctx.fillStyle = INK_SOFT;
    ctx.fillText(clip(ctx, labels.verdictHint, w - PAD * 2), w / 2, bottom + 20);
    bottom += 20;
  }
  ctx.textAlign = 'left';
  return bottom + 16;
}

/** Leyenda "a tu favor / a favor de Ana" con sus cuadros de color. */
function drawLegend(ctx: CanvasRenderingContext2D, w: number, y: number, labels: FriendReportImageLabels) {
  ctx.fillStyle = MINE;
  rr(ctx, PAD, y - 7, 8, 8, 2); ctx.fill();
  ctx.font = font(800, 9);
  ctx.letterSpacing = '1.2px';
  ctx.fillStyle = INK_SOFT;
  ctx.textAlign = 'left';
  ctx.fillText(labels.favourMine.toUpperCase(), PAD + 14, y);

  ctx.textAlign = 'right';
  ctx.fillText(labels.favourTheirs.toUpperCase(), w - PAD - 14, y);
  ctx.fillStyle = THEIRS;
  rr(ctx, w - PAD - 8, y - 7, 8, 8, 2); ctx.fill();
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
  return y + 16;
}

/**
 * Barras enfrentadas desde el centro: a la izquierda lo mío, a la derecha lo suyo,
 * proporcionales al mayor de los dos para que se puedan comparar de un vistazo.
 */
function drawFacingBar(
  ctx: CanvasRenderingContext2D, w: number, y: number,
  title: string, mine: number, theirs: number,
): number {
  ctx.textAlign = 'center';
  ctx.font = font(800, 8.5);
  ctx.letterSpacing = '1.2px';
  ctx.fillStyle = INK_DIM;
  ctx.fillText(title.toUpperCase(), w / 2, y);
  ctx.letterSpacing = '0px';

  const rowY = y + 14;
  const cx = w / 2;
  const trackHalf = 82;
  const max = Math.max(mine, theirs, 1);
  const h = 9;

  // Carriles
  ctx.fillStyle = rgba(GRAPHIC, 0.85);
  rr(ctx, cx - trackHalf, rowY, trackHalf - 4, h, h / 2); ctx.fill();
  rr(ctx, cx + 4, rowY, trackHalf - 4, h, h / 2); ctx.fill();

  // Relleno, creciendo desde el centro hacia fuera
  // Suelo de 12px: por debajo, el radio redondea el relleno hasta convertirlo en
  // un punto indistinguible de un marcador.
  const barW = (v: number) => (v > 0 ? Math.max(12, ((trackHalf - 4) * v) / max) : 0);
  const mineW = barW(mine);
  const theirsW = barW(theirs);
  if (mineW > 0) { ctx.fillStyle = MINE; rr(ctx, cx - 4 - mineW, rowY, mineW, h, h / 2); ctx.fill(); }
  if (theirsW > 0) { ctx.fillStyle = THEIRS; rr(ctx, cx + 4, rowY, theirsW, h, h / 2); ctx.fill(); }

  ctx.font = font(700, 11.5, true);
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.fillText(fmtMoney(mine), PAD, rowY + h - 0.5);
  ctx.textAlign = 'right';
  ctx.fillText(fmtMoney(theirs), w - PAD, rowY + h - 0.5);
  ctx.textAlign = 'left';

  return rowY + h + 16;
}

/** Una fila de movimiento, colocada del lado de quien sale beneficiado. */
function drawEntryRow(
  ctx: CanvasRenderingContext2D, w: number, y: number,
  entry: FriendReportEntry, labels: FriendReportImageLabels,
): number {
  const cx = w / 2;
  const isMine = entry.side === 'me';
  const color = isMine ? MINE : THEIRS;
  const gutter = 22;                       // aire a cada lado del eje
  const colW = cx - PAD - gutter;

  // Punto sobre el eje
  circle(ctx, cx, y + 6, 4, color);

  const textX = isMine ? PAD : w - PAD;
  ctx.textAlign = isMine ? 'left' : 'right';

  ctx.font = font(650, 12);
  ctx.fillStyle = INK;
  const amount = fmtMoney(entry.amount);
  ctx.font = font(700, 12, true);
  const amountW = ctx.measureText(amount).width;

  ctx.font = font(650, 12);
  const desc = clip(ctx, entry.description, colW - amountW - 10);
  if (isMine) {
    ctx.fillText(desc, textX, y + 10);
    ctx.font = font(700, 12, true);
    // Alineado contra el eje, no detrás de la descripción: en bandera las cifras
    // arrancaban en siete sitios distintos y no se podían comparar.
    ctx.textAlign = 'right';
    ctx.fillText(amount, cx - gutter, y + 10);
  } else {
    ctx.font = font(700, 12, true);
    ctx.textAlign = 'right';
    ctx.fillText(amount, textX, y + 10);
    ctx.font = font(650, 12);
    ctx.fillText(desc, textX - amountW - 10, y + 10);
  }

  // Segunda línea: fecha, y el reparto o el tipo de transferencia
  ctx.textAlign = isMine ? 'left' : 'right';
  ctx.font = font(600, 9);
  ctx.fillStyle = INK_DIM;
  ctx.letterSpacing = '0.6px';
  const badge = entry.percentage != null
    ? `${entry.percentage}%`
    : entry.kind === 'sent' ? labels.sent.toUpperCase()
    : entry.kind === 'received' ? labels.received.toUpperCase()
    : '';
  const meta = badge ? `${fmtDay(entry.date)}  ·  ${badge}` : fmtDay(entry.date);
  ctx.fillText(meta, textX, y + 26);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';

  return y + 40;
}

function drawFooter(
  ctx: CanvasRenderingContext2D, w: number, y: number,
  model: FriendReportModel, labels: FriendReportImageLabels, logo: HTMLImageElement | null,
  withSocialStat = true,
) {
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(w - PAD, y);
  ctx.stroke();

  if (withSocialStat) {
    ctx.font = font(700, 11);
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText(clip(ctx, labels.socialStat, w - PAD * 2 - 90), PAD, y + 20);
  }

  ctx.font = font(500, 9.5);
  ctx.fillStyle = INK_DIM;
  ctx.textAlign = 'left';
  ctx.fillText(clip(ctx, labels.footer, w - PAD * 2 - 90), PAD, withSocialStat ? y + 35 : y + 24);

  if (logo) {
    const size = 18;
    ctx.drawImage(logo, w - PAD - size, y + 12, size, size);
  } else {
    circle(ctx, w - PAD - 9, y + 21, 9, rgba(MINE, 0.9));
  }
}

// ── Composiciones ──────────────────────────────────────────────────────────

function drawChat(
  ctx: CanvasRenderingContext2D, model: FriendReportModel,
  labels: FriendReportImageLabels, logo: HTMLImageElement | null,
) {
  const h = FORMAT_HEIGHT.chat!;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, h);
  drawTopBand(ctx, W);
  drawBrandRow(ctx, W, 22, labels.period);

  // El cuadrado es ancho y bajo: el bloque se centra en el hueco entre la marca y
  // el pie en vez de colgar de arriba, que dejaba un vacío muerto abajo.
  const top = 46;
  const bottom = h - 76;
  const blockH = 34 * 2 + 46 + 26 + (model.net === 0 ? 84 : 104);
  const y = top + Math.max(0, (bottom - top - blockH) / 2);

  const afterPeople = drawPeople(ctx, W, y, model, labels, 34);
  drawVerdict(ctx, W, afterPeople + 22, model, labels, true, true);
  drawFooter(ctx, W, h - 62, model, labels, logo);
}

function drawStory(
  ctx: CanvasRenderingContext2D, model: FriendReportModel,
  labels: FriendReportImageLabels, logo: HTMLImageElement | null,
) {
  const h = FORMAT_HEIGHT.story!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0E2126');
  g.addColorStop(0.55, BG);
  g.addColorStop(1, '#0A1315');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, h);
  drawTopBand(ctx, W);
  drawBrandRow(ctx, W, 34, labels.period);

  const afterPeople = drawPeople(ctx, W, 120, model, labels, 44);
  let y = drawVerdict(ctx, W, afterPeople + 60, model, labels, true);

  y = drawLegend(ctx, W, y + 40, labels);
  y = drawFacingBar(ctx, W, y + 18, labels.sharedSection, model.totals.sharedTheyOwe, model.totals.sharedIOwe);
  y = drawFacingBar(ctx, W, y + 8, labels.transfersSection, model.totals.received, model.totals.sent);

  ctx.strokeStyle = HAIRLINE;
  ctx.beginPath(); ctx.moveTo(PAD, y + 4); ctx.lineTo(W - PAD, y + 4); ctx.stroke();
  y = drawFacingBar(ctx, W, y + 24, labels.monthTotal, model.totals.mine, model.totals.theirs);

  // Dato social como píldora, anclada sobre el pie: si se deja fluir queda un
  // vacío enorme entre las barras y el borde inferior.
  const pillY = Math.max(y + 24, Math.min(y + 90, h - 148));
  ctx.font = font(700, 12);
  const pillW = Math.min(ctx.measureText(labels.socialStat).width + 34, W - PAD * 2);
  ctx.fillStyle = PANEL;
  rr(ctx, (W - pillW) / 2, pillY, pillW, 36, 18); ctx.fill();
  ctx.strokeStyle = HAIRLINE; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.fillText(clip(ctx, labels.socialStat, pillW - 26), W / 2, pillY + 23);
  ctx.textAlign = 'left';

  // El pie repetiría el dato social que ya está en la píldora, a 62px de distancia.
  drawFooter(ctx, W, h - 70, model, labels, logo, false);
}

/** Alto exacto del lienzo: sin esto sobraba un hueco muerto antes del pie. */
function sheetHeight(entryCount: number, withHeader: boolean): number {
  // Medido sobre el dibujo real: la cabecera termina en 303 y las barras en 486.
  const head = withHeader ? 303 : 112;
  const bars = withHeader ? 183 : 0;
  const rows = entryCount * 40 + 30;
  const foot = 112;   // la raya del pie necesita aire tras la última fila
  return Math.round(head + bars + rows + foot);
}

function drawSheet(
  ctx: CanvasRenderingContext2D, model: FriendReportModel, labels: FriendReportImageLabels,
  logo: HTMLImageElement | null, entries: FriendReportEntry[], page: number, totalPages: number, h: number,
) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, h);
  drawTopBand(ctx, W);
  drawBrandRow(ctx, W, 22, labels.period);

  let y: number;
  if (page === 1) {
    const afterPeople = drawPeople(ctx, W, 58, model, labels, 32);
    y = drawVerdict(ctx, W, afterPeople + 18, model, labels, false);
  } else {
    // En las páginas siguientes el veredicto viaja en una franja compacta, para
    // que cada imagen se entienda suelta si alguien reenvía solo una.
    ctx.fillStyle = PANEL;
    rr(ctx, PAD, 50, W - PAD * 2, 46, 14); ctx.fill();
    // El hueco para el veredicto se mide contra el importe real: con cifras de
    // nueve dígitos la reserva fija de 130px dejaba que se montaran.
    ctx.font = font(800, 17, true);
    const amountText = fmtMoney(model.net);
    const amountW = ctx.measureText(amountText).width;
    ctx.fillStyle = model.net === 0 ? INK : model.net > 0 ? MINE : THEIRS;
    ctx.textAlign = 'right';
    ctx.fillText(amountText, W - PAD - 16, 79);

    ctx.font = font(700, 12);
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText(clip(ctx, labels.verdict, W - PAD * 2 - 32 - amountW - 12), PAD + 16, 79);
    y = 112;

    // Sin la leyenda, una página reenviada suelta no dice de quién es cada lado.
    y = drawLegend(ctx, W, y + 6, labels) + 4;
  }

  if (page === 1) {
    y = drawLegend(ctx, W, y + 10, labels);
    y = drawFacingBar(ctx, W, y + 14, labels.sharedSection, model.totals.sharedTheyOwe, model.totals.sharedIOwe);
    y = drawFacingBar(ctx, W, y + 6, labels.transfersSection, model.totals.received, model.totals.sent);
    ctx.strokeStyle = HAIRLINE;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    y = drawFacingBar(ctx, W, y + 20, labels.monthTotal, model.totals.mine, model.totals.theirs);
  }

  // Título del detalle
  ctx.textAlign = 'center';
  ctx.font = font(800, 9);
  ctx.letterSpacing = '1.4px';
  ctx.fillStyle = INK_DIM;
  // En las páginas de continuación el título habla de las filas que se ven, no del total.
  ctx.fillText(
    (page === 1 ? labels.movementsTitle : labels.movementsContinued(entries.length)).toUpperCase(),
    W / 2, y + 14,
  );
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
  y += 30;

  // Eje central
  const axisTop = y;
  const axisBottom = y + entries.length * 40 - 6;
  if (entries.length > 0) {
    ctx.strokeStyle = GRAPHIC;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2, axisTop);
    ctx.lineTo(W / 2, axisBottom);
    ctx.stroke();
  }

  for (const entry of entries) y = drawEntryRow(ctx, W, y, entry, labels);

  if (totalPages > 1) {
    ctx.font = font(600, 9.5);
    ctx.fillStyle = INK_DIM;
    ctx.textAlign = 'center';
    ctx.fillText(labels.pageLabel(page, totalPages), W / 2, Math.min(axisBottom + 26, h - 78));
    ctx.textAlign = 'left';
  }

  drawFooter(ctx, W, h - 64, model, labels, logo);
}

// ── API ────────────────────────────────────────────────────────────────────

/**
 * Devuelve una imagen por página. `chat` y `story` son siempre una sola; `sheet`
 * se parte cuando hay más movimientos de los que caben sin encoger la letra.
 */
export async function generateFriendReportImage(
  model: FriendReportModel,
  labels: FriendReportImageLabels,
  options: FriendReportImageOptions,
): Promise<FriendReportImageResult[]> {
  await ensureFonts();
  const logo = options.logoUri ? await loadImg(options.logoUri) : null;
  const { format } = options;

  const pages: { entries: FriendReportEntry[]; height: number }[] = [];
  if (format === 'sheet') {
    const chunks: FriendReportEntry[][] = [];
    for (let i = 0; i < model.entries.length; i += ROWS_PER_PAGE) {
      chunks.push(model.entries.slice(i, i + ROWS_PER_PAGE));
    }
    if (chunks.length === 0) chunks.push([]);
    chunks.forEach((entries, i) => pages.push({ entries, height: sheetHeight(entries.length, i === 0) }));
  } else {
    pages.push({ entries: [], height: FORMAT_HEIGHT[format]! });
  }

  const results: FriendReportImageResult[] = [];
  for (let i = 0; i < pages.length; i++) {
    const { entries, height } = pages[i];
    const canvas = document.createElement('canvas');
    canvas.width = W * SCALE;
    canvas.height = height * SCALE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d context unavailable');
    ctx.scale(SCALE, SCALE);
    ctx.textBaseline = 'alphabetic';

    if (format === 'chat') drawChat(ctx, model, labels, logo);
    else if (format === 'story') drawStory(ctx, model, labels, logo);
    else drawSheet(ctx, model, labels, logo, entries, i + 1, pages.length, height);

    results.push({
      blob: await canvasToBlob(canvas),
      width: canvas.width,
      height: canvas.height,
      page: i + 1,
      totalPages: pages.length,
      format,
    });
  }
  return results;
}

/** Dimensiones de salida de cada formato, para poder anunciarlas en la interfaz. */
export function formatDimensions(format: ReportFormat, entryCount = 7): { w: number; h: number; ratio: string } {
  const w = W * SCALE;
  if (format === 'chat') return { w, h: FORMAT_HEIGHT.chat! * SCALE, ratio: '1:1' };
  if (format === 'story') return { w, h: FORMAT_HEIGHT.story! * SCALE, ratio: '9:16' };
  const rows = Math.min(entryCount, ROWS_PER_PAGE);
  const h = sheetHeight(rows, true) * SCALE;
  return { w, h, ratio: `1:${(h / w).toFixed(1).replace('.', ',')}` };
}
