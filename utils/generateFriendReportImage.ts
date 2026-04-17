// utils/generateFriendReportImage.ts
import { Transaction } from '../types/transaction';

export interface FriendReportImageData {
  myName: string;
  friendName: string;
  month: number;
  year: number;
  sentToFriend: Transaction[];
  receivedFromFriend: Transaction[];
  logoUri?: string;
}

export interface FriendReportImageLabels {
  title: string;
  generatedOn: string;
  period: string;
  sentSection: string;
  receivedSection: string;
  totalSent: string;
  totalReceived: string;
  netBalance: string;
  dateCol: string;
  descCol: string;
  amountCol: string;
  footer: string;
  noTransactions: string;
  iOwe: string;
  theyOwe: string;
  balanceTitle: string;
}

export interface FriendReportImageResult {
  blob: Blob;
  width: number;
  height: number;
  page: number;       // 1-based
  totalPages: number;
}

// ── Layout config ──────────────────────────────────────────────────────────
/** Max transaction rows rendered per section per page. */
const MAX_ROWS_PER_PAGE = 8;

// ── Visual constants ───────────────────────────────────────────────────────
const SCALE = 2;
const W     = 900;
const PAD   = 36;
const FONT  = '"Inter","SF Pro Display","Helvetica Neue",Helvetica,Arial,sans-serif';

const CYAN_DARK  = '#006978';
const CYAN_MID   = '#00ACC1';
const CYAN_LIGHT = '#26C6DA';
const GREEN      = '#00897B';
const RED        = '#EF4444';
const EMERALD    = '#10B981';
const WHITE      = '#FFFFFF';
const GRAY_50    = '#F8FAFC';
const GRAY_100   = '#F1F5F9';
const GRAY_200   = '#E2E8F0';
const GRAY_400   = '#94A3B8';
const GRAY_600   = '#475569';
const GRAY_900   = '#0F172A';

// Heights
const H_HDR   = 210;   // full header (page 1 only)
const H_MINI  = 60;    // mini branding strip (continuation pages)
const H_BAL   = 116;
const H_SCARD = 112;
const H_SHDR  = 56;
const H_CHDR  = 36;
const H_ROW   = 52;
const H_SFOOT = 52;
const H_FOOT  = 68;
const GAP     = 20;

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Math.abs(n));

const fmtDate = (d: Date) =>
  d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function clip(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function rrTop(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
function rrBot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y); ctx.closePath();
}
function shadow(ctx: CanvasRenderingContext2D, blur: number, alpha: number, dy = 6) {
  ctx.shadowColor = `rgba(0,0,0,${alpha})`;
  ctx.shadowBlur  = blur * SCALE;
  ctx.shadowOffsetY = dy * SCALE;
  ctx.shadowOffsetX = 0;
}
function noShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
}
function loadImg(uri: string): Promise<HTMLImageElement | null> {
  return new Promise(res => {
    const img = new window.Image();
    img.onload  = () => res(img);
    img.onerror = () => res(null);
    img.crossOrigin = 'anonymous';
    img.src = uri;
  });
}
function hGrad(ctx: CanvasRenderingContext2D, x: number, _y: number, w: number, c1: string, c2: string) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  return g;
}
function vGrad(ctx: CanvasRenderingContext2D, y0: number, y1: number, c1: string, c2: string) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  return g;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
  );
}

// ── Section chunk height ───────────────────────────────────────────────────
function sectionHeight(rowCount: number) {
  return H_SHDR + H_CHDR + Math.max(rowCount, 1) * H_ROW + H_SFOOT;
}

// ── Drawing primitives shared across pages ─────────────────────────────────
function drawBackground(ctx: CanvasRenderingContext2D, h: number) {
  ctx.fillStyle = GRAY_50;
  ctx.fillRect(0, 0, W, h);
  ctx.fillStyle = rgba(CYAN_MID, 0.06);
  for (let x = 24; x < W; x += 28)
    for (let y = 24; y < h; y += 28) {
      ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
    }
}

function drawFooter(ctx: CanvasRenderingContext2D, y: number, footer: string, logoImg: HTMLImageElement | null) {
  ctx.fillStyle = vGrad(ctx, y, y + H_FOOT, WHITE, GRAY_100);
  ctx.fillRect(0, y, W, H_FOOT);
  ctx.strokeStyle = GRAY_200; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  const fmY = y + H_FOOT / 2;
  const FLG = 24;
  if (logoImg) {
    ctx.save();
    ctx.beginPath(); ctx.arc(PAD + FLG / 2, fmY, FLG / 2, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(logoImg, PAD, fmY - FLG / 2, FLG, FLG);
    ctx.restore();
  } else {
    const dg = ctx.createRadialGradient(PAD + 5, fmY - 2, 0, PAD + 5, fmY, 6);
    dg.addColorStop(0, CYAN_LIGHT); dg.addColorStop(1, CYAN_MID);
    ctx.fillStyle = dg;
    ctx.beginPath(); ctx.arc(PAD + 5, fmY, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = GRAY_600;
  ctx.font = `400 10.5px ${FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(footer, PAD + (logoImg ? FLG + 10 : 14), fmY);
  ctx.fillStyle = GRAY_400;
  ctx.font = `500 10.5px ${FONT}`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText('spendiapp.vercel.app', W - PAD, fmY);
}

function drawSectionCard(
  ctx: CanvasRenderingContext2D,
  y: number,
  sLabel: string,
  txs: Transaction[],
  accent: string,
  isExpense: boolean,
  total: number,
  labels: FriendReportImageLabels,
  isContinuation = false,
): void {
  const rows  = Math.max(txs.length, 1);
  const cardH = sectionHeight(rows);
  const cx    = PAD, cw = W - PAD * 2;

  // Card shadow + bg
  shadow(ctx, 20, 0.10, 7);
  ctx.fillStyle = WHITE;
  rr(ctx, cx, y, cw, cardH, 22); ctx.fill();
  noShadow(ctx);

  // Clip all inner elements to card rounded boundary
  ctx.save();
  rr(ctx, cx, y, cw, cardH, 22);
  ctx.clip();

  // Header gradient (rounded top)
  ctx.fillStyle = hGrad(ctx, cx, y, cw, accent, rgba(accent, 0.78));
  rrTop(ctx, cx, y, cw, H_SHDR, 22); ctx.fill();
  ctx.fillStyle = hGrad(ctx, cx, y, cw, accent, rgba(accent, 0.78));
  ctx.fillRect(cx, y + 20, cw, H_SHDR - 20);
  // Shimmer
  const hs = ctx.createLinearGradient(cx, y, cx + cw, y);
  hs.addColorStop(0, 'rgba(255,255,255,0)');
  hs.addColorStop(0.4, 'rgba(255,255,255,0.10)');
  hs.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hs;
  rrTop(ctx, cx, y, cw, H_SHDR, 22); ctx.fill();
  ctx.fillStyle = hs; ctx.fillRect(cx, y + 20, cw, H_SHDR - 20);

  // Icon circle
  ctx.fillStyle = rgba(WHITE, 0.22);
  ctx.beginPath(); ctx.arc(cx + 30, y + H_SHDR / 2, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.font = `800 16px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(isExpense ? '↑' : '↓', cx + 30, y + H_SHDR / 2 + 1.5);

  // Label (+ "continuación" tag)
  ctx.fillStyle = WHITE;
  ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const labelText = isContinuation ? `${sLabel} (cont.)` : sLabel;
  ctx.fillText(labelText, cx + 60, y + H_SHDR / 2);

  // Count pill
  ctx.font = `700 11px ${FONT}`;
  const cntTxt = `${txs.length}`;
  const cntW   = ctx.measureText(cntTxt).width + 22;
  ctx.fillStyle = rgba(WHITE, 0.22);
  rr(ctx, cx + cw - cntW - 10, y + (H_SHDR - 26) / 2, cntW, 26, 13); ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(cntTxt, cx + cw - cntW / 2 - 10, y + H_SHDR / 2);

  let ry = y + H_SHDR;

  // Column header
  ctx.fillStyle = GRAY_100;
  ctx.fillRect(cx, ry, cw, H_CHDR);
  ctx.strokeStyle = GRAY_200; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(cx, ry + H_CHDR); ctx.lineTo(cx + cw, ry + H_CHDR); ctx.stroke();
  ctx.fillStyle = rgba(accent, 0.85);
  ctx.font = `700 9.5px ${FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const chY = ry + H_CHDR / 2;
  ctx.fillText(labels.dateCol.toUpperCase(), cx + 18, chY);
  ctx.fillText(labels.descCol.toUpperCase(), cx + 98, chY);
  ctx.textAlign = 'right';
  ctx.fillText(labels.amountCol.toUpperCase(), cx + cw - 18, chY);
  ctx.textAlign = 'left';
  ry += H_CHDR;

  // Rows
  if (txs.length === 0) {
    ctx.fillStyle = GRAY_50; ctx.fillRect(cx, ry, cw, H_ROW);
    ctx.fillStyle = GRAY_400; ctx.font = `400 13px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(labels.noTransactions, cx + cw / 2, ry + H_ROW / 2);
    ctx.textAlign = 'left';
    ry += H_ROW;
  } else {
    txs.forEach((tx, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? WHITE : GRAY_50;
      ctx.fillRect(cx, ry, cw, H_ROW);
      // Accent micro-bar
      ctx.fillStyle = rgba(accent, 0.30);
      ctx.fillRect(cx, ry + 10, 3, H_ROW - 20);
      // Date chip
      const chipW = 72, chipH = 28;
      const chipX = cx + 14, chipY = ry + (H_ROW - chipH) / 2;
      ctx.fillStyle = rgba(accent, 0.10);
      rr(ctx, chipX, chipY, chipW, chipH, 8); ctx.fill();
      ctx.fillStyle = GRAY_600; ctx.font = `600 11px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(fmtDate(tx.date), chipX + chipW / 2, ry + H_ROW / 2);
      // Description
      ctx.fillStyle = GRAY_900; ctx.font = `500 13px ${FONT}`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(clip(ctx, tx.description, cw - 100 - 170 - 20), cx + 100, ry + H_ROW / 2);
      // Amount pill
      const sign   = isExpense ? '−' : '+';
      const amtTxt = `${sign}${fmtCOP(tx.amount)}`;
      ctx.font = `700 12.5px ${FONT}`;
      const amtW = ctx.measureText(amtTxt).width;
      const pW = amtW + 26, pH = 30;
      const pX = cx + cw - pW - 12, pY = ry + (H_ROW - pH) / 2;
      const pBg = ctx.createLinearGradient(pX, pY, pX + pW, pY + pH);
      pBg.addColorStop(0, rgba(accent, 0.18)); pBg.addColorStop(1, rgba(accent, 0.08));
      ctx.fillStyle = pBg; rr(ctx, pX, pY, pW, pH, 15); ctx.fill();
      ctx.strokeStyle = rgba(accent, 0.28); ctx.lineWidth = 0.8;
      rr(ctx, pX, pY, pW, pH, 15); ctx.stroke();
      ctx.fillStyle = accent; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(amtTxt, cx + cw - 25, ry + H_ROW / 2);
      ctx.textAlign = 'left';
      ctx.strokeStyle = GRAY_200; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(cx + 16, ry + H_ROW); ctx.lineTo(cx + cw - 16, ry + H_ROW); ctx.stroke();
      ry += H_ROW;
    });
  }

  // Footer totals
  ctx.fillStyle = rgba(accent, 0.07);
  rrBot(ctx, cx, ry, cw, H_SFOOT, 22); ctx.fill();
  ctx.strokeStyle = rgba(accent, 0.18); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx + 16, ry); ctx.lineTo(cx + cw - 16, ry); ctx.stroke();
  const fY = ry + H_SFOOT / 2;
  ctx.fillStyle = GRAY_600; ctx.font = `600 13px ${FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(isExpense ? labels.totalSent : labels.totalReceived, cx + 20, fY);
  ctx.fillStyle = accent; ctx.font = `800 18px ${FONT}`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(`${isExpense ? '−' : '+'}${fmtCOP(total)}`, cx + cw - 20, fY);
  ctx.textAlign = 'left';

  // End clip — draw card stroke on top
  ctx.restore();
  ctx.strokeStyle = rgba(accent, 0.15); ctx.lineWidth = 1;
  rr(ctx, cx, y, cw, cardH, 22); ctx.stroke();
}

// ── Mini branding header (continuation pages) ──────────────────────────────
function drawMiniHeader(
  ctx: CanvasRenderingContext2D,
  logoImg: HTMLImageElement | null,
  page: number,
  totalPages: number,
  title: string,
) {
  ctx.fillStyle = vGrad(ctx, 0, H_MINI, CYAN_DARK, CYAN_MID);
  ctx.fillRect(0, 0, W, H_MINI);
  const LG = 32, lx = PAD, ly = (H_MINI - LG) / 2;
  if (logoImg) {
    ctx.save();
    ctx.beginPath(); ctx.arc(lx + LG / 2, ly + LG / 2, LG / 2, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(logoImg, lx, ly, LG, LG);
    ctx.restore();
  }
  ctx.fillStyle = WHITE;
  ctx.font = `800 18px ${FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('SPENDIA', lx + (logoImg ? LG + 10 : 0), H_MINI / 2);
  // Page indicator
  ctx.font = `600 11px ${FONT}`;
  const pageLabel = `${clip(ctx, title, 200)} · ${page}/${totalPages}`;
  ctx.fillStyle = rgba(WHITE, 0.80);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(pageLabel, W - PAD, H_MINI / 2);
}

// ── Full header (page 1) ────────────────────────────────────────────────────
function drawFullHeader(
  ctx: CanvasRenderingContext2D,
  logoImg: HTMLImageElement | null,
  data: FriendReportImageData,
  labels: FriendReportImageLabels,
) {
  ctx.fillStyle = vGrad(ctx, 0, H_HDR, CYAN_DARK, CYAN_LIGHT);
  ctx.fillRect(0, 0, W, H_HDR);
  for (const [cx, cy, r, a] of [
    [W - 60, -60, 160, 0.07], [W + 20, H_HDR * 0.7, 100, 0.05],
    [-30, H_HDR + 30, 80, 0.05], [W * 0.4, H_HDR * 1.1, 60, 0.04],
  ] as [number, number, number, number][]) {
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  }
  const shim = ctx.createLinearGradient(0, 0, W, 0);
  shim.addColorStop(0, 'rgba(255,255,255,0)');
  shim.addColorStop(0.5, 'rgba(255,255,255,0.09)');
  shim.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shim; ctx.fillRect(0, 0, W, H_HDR);

  const LG = 40, lx = PAD, ly = 22;
  if (logoImg) {
    ctx.save();
    ctx.beginPath(); ctx.arc(lx + LG / 2, ly + LG / 2, LG / 2, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(logoImg, lx, ly, LG, LG);
    ctx.restore();
  }
  ctx.fillStyle = WHITE; ctx.font = `800 21px ${FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('SPENDIA', lx + (logoImg ? LG + 10 : 0), ly + LG / 2);

  ctx.font = `600 10.5px ${FONT}`;
  const pw = Math.min(ctx.measureText(labels.title).width + 28, 190);
  ctx.fillStyle = rgba(WHITE, 0.18);
  rr(ctx, W - PAD - pw, ly + 6, pw, 26, 13); ctx.fill();
  ctx.fillStyle = WHITE; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(clip(ctx, labels.title, pw - 14), W - PAD - 7, ly + 19);

  ctx.strokeStyle = rgba(WHITE, 0.22); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, ly + LG + 14); ctx.lineTo(W - PAD, ly + LG + 14); ctx.stroke();

  const avY = ly + LG + 38, AVR = 34, avCY = avY + AVR;

  function drawAv(cx: number, cy: number, initial: string) {
    const g = ctx.createRadialGradient(cx - AVR * 0.25, cy - AVR * 0.25, 0, cx, cy, AVR);
    g.addColorStop(0, rgba(WHITE, 0.48)); g.addColorStop(1, rgba(WHITE, 0.18));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, AVR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(WHITE, 0.40); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, AVR, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = WHITE; ctx.font = `800 ${Math.round(AVR * 0.82)}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(initial, cx, cy + 1.5);
  }

  drawAv(PAD + AVR, avCY, data.myName.charAt(0).toUpperCase());
  ctx.fillStyle = WHITE; ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(data.myName, PAD + AVR * 2 + 14, avCY - 9);
  ctx.fillStyle = rgba(WHITE, 0.65); ctx.font = `400 11px ${FONT}`;
  ctx.fillText(labels.generatedOn, PAD + AVR * 2 + 14, avCY + 9);

  ctx.fillStyle = rgba(WHITE, 0.20);
  rr(ctx, W / 2 - 24, avCY - 20, 48, 40, 20); ctx.fill();
  ctx.fillStyle = rgba(WHITE, 0.95); ctx.font = `800 19px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('⇄', W / 2, avCY + 1);

  drawAv(W - PAD - AVR, avCY, data.friendName.charAt(0).toUpperCase());
  ctx.fillStyle = WHITE; ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(data.friendName, W - PAD - AVR * 2 - 14, avCY - 9);
  ctx.fillStyle = rgba(WHITE, 0.65); ctx.font = `400 11px ${FONT}`;
  ctx.fillText(labels.period, W - PAD - AVR * 2 - 14, avCY + 9);
}

// ── Main export ────────────────────────────────────────────────────────────
export async function generateFriendReportImage(
  data: FriendReportImageData,
  labels: FriendReportImageLabels,
): Promise<FriendReportImageResult[]> {

  const totalSent     = data.sentToFriend.reduce((s, t) => s + t.amount, 0);
  const totalReceived = data.receivedFromFriend.reduce((s, t) => s + t.amount, 0);
  const net           = totalReceived - totalSent;
  const balCol        = net === 0 ? EMERALD : net > 0 ? GREEN : RED;

  const logoImg = data.logoUri ? await loadImg(data.logoUri) : null;

  // ── Chunk transactions into pages ─────────────────────────────────────────
  function chunk<T>(arr: T[]): T[][] {
    if (arr.length === 0) return [[]];
    const pages: T[][] = [];
    for (let i = 0; i < arr.length; i += MAX_ROWS_PER_PAGE)
      pages.push(arr.slice(i, i + MAX_ROWS_PER_PAGE));
    return pages;
  }

  const sentChunks = chunk(data.sentToFriend);
  const recvChunks = chunk(data.receivedFromFriend);

  // Build page layout: page 1 gets full header + balance + summary + first chunks;
  // extra pages get mini header + overflow chunks
  interface PageSpec {
    isFirst: boolean;
    sentChunk: Transaction[] | null;   // null = skip section
    recvChunk: Transaction[] | null;
    sentIsCont: boolean;
    recvIsCont: boolean;
  }

  const pageSpecs: PageSpec[] = [];
  const maxChunks = Math.max(sentChunks.length, recvChunks.length);

  for (let i = 0; i < maxChunks; i++) {
    pageSpecs.push({
      isFirst:    i === 0,
      sentChunk:  sentChunks[i] ?? null,
      recvChunk:  recvChunks[i] ?? null,
      sentIsCont: i > 0,
      recvIsCont: i > 0,
    });
  }

  const totalPages = pageSpecs.length;

  // ── Render each page ───────────────────────────────────────────────────────
  const results: FriendReportImageResult[] = [];

  for (let pi = 0; pi < pageSpecs.length; pi++) {
    const spec   = pageSpecs[pi];
    const pageNo = pi + 1;

    // Calculate height
    const topH = spec.isFirst ? H_HDR : H_MINI;
    let contentH = topH + GAP;

    if (spec.isFirst) {
      contentH += H_BAL + GAP + H_SCARD + GAP;
    }
    if (spec.sentChunk !== null) {
      contentH += sectionHeight(Math.max(spec.sentChunk.length, 1)) + GAP;
    }
    if (spec.recvChunk !== null) {
      contentH += sectionHeight(Math.max(spec.recvChunk.length, 1)) + GAP;
    }
    contentH += H_FOOT;

    const H = contentH;
    const canvas = document.createElement('canvas');
    canvas.width  = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(SCALE, SCALE);

    drawBackground(ctx, H);

    if (spec.isFirst) {
      drawFullHeader(ctx, logoImg, data, labels);
    } else {
      drawMiniHeader(ctx, logoImg, pageNo, totalPages, labels.title);
    }

    let y = topH + GAP;

    // Balance + summary only on page 1
    if (spec.isFirst) {
      // Balance hero card
      shadow(ctx, 22, 0.11, 8);
      ctx.fillStyle = WHITE; rr(ctx, PAD, y, W - PAD * 2, H_BAL, 22); ctx.fill();
      noShadow(ctx);
      ctx.fillStyle = rgba(balCol, 0.04); rr(ctx, PAD, y, W - PAD * 2, H_BAL, 22); ctx.fill();
      ctx.fillStyle = vGrad(ctx, y, y + H_BAL, balCol, rgba(balCol, 0.55));
      rr(ctx, PAD, y, 8, H_BAL, 4); ctx.fill();
      const bx = PAD + 26;
      ctx.fillStyle = GRAY_400; ctx.font = `600 10px ${FONT}`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(labels.netBalance.toUpperCase(), bx, y + 18);
      ctx.fillStyle = GRAY_600; ctx.font = `500 12.5px ${FONT}`; ctx.textBaseline = 'top';
      ctx.fillText(labels.balanceTitle, bx, y + 36);
      ctx.fillStyle = balCol; ctx.font = `800 40px ${FONT}`; ctx.textBaseline = 'alphabetic';
      ctx.fillText(fmtCOP(net), bx, y + H_BAL - 20);
      const ix = W - PAD - 52, iy = y + H_BAL / 2, ir = 30;
      // No external glow — just the circle itself
      shadow(ctx, 12, 0.14, 4);
      const iBg = ctx.createRadialGradient(ix, iy - 10, 0, ix, iy, ir);
      iBg.addColorStop(0, rgba(balCol, 0.30)); iBg.addColorStop(1, rgba(balCol, 0.12));
      ctx.fillStyle = iBg;
      ctx.beginPath(); ctx.arc(ix, iy, ir, 0, Math.PI * 2); ctx.fill();
      noShadow(ctx);
      ctx.strokeStyle = rgba(balCol, 0.40); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(ix, iy, ir, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = balCol; ctx.font = `800 26px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(net === 0 ? '✓' : net > 0 ? '↓' : '↑', ix, iy + 2);

      y += H_BAL + GAP;

      // Summary cards (3)
      const gapC = 14;
      const cW   = (W - PAD * 2 - gapC * 2) / 3;
      const summaries = [
        { label: labels.totalSent,     value: fmtCOP(totalSent),     color: RED,    icon: '↑', sub: `${data.sentToFriend.length} mov.` },
        { label: labels.totalReceived, value: fmtCOP(totalReceived), color: GREEN,  icon: '↓', sub: `${data.receivedFromFriend.length} mov.` },
        { label: labels.netBalance,    value: fmtCOP(net),           color: balCol, icon: net === 0 ? '=' : net > 0 ? '↓' : '↑',
          sub: net === 0 ? 'Al día ✓' : net > 0 ? labels.theyOwe : labels.iOwe },
      ];
      summaries.forEach((card, i) => {
        const cx = PAD + i * (cW + gapC), cy = y;
        shadow(ctx, 16, 0.09, 5);
        ctx.fillStyle = WHITE; rr(ctx, cx, cy, cW, H_SCARD, 20); ctx.fill();
        noShadow(ctx);
        ctx.fillStyle = rgba(card.color, 0.06); rr(ctx, cx, cy, cW, H_SCARD, 20); ctx.fill();
        // Clip inner elements to card rounded boundary
        ctx.save();
        rr(ctx, cx, cy, cW, H_SCARD, 20); ctx.clip();
        ctx.fillStyle = hGrad(ctx, cx, cy, cW, card.color, rgba(card.color, 0.70));
        rrTop(ctx, cx, cy, cW, 5, 20); ctx.fill();
        ctx.fillStyle = hGrad(ctx, cx, cy, cW, card.color, rgba(card.color, 0.70));
        ctx.fillRect(cx, cy + 2, cW, 3);
        // Icon circle — fully inside card: radius 22, right-aligned with 14px margin
        const icR = 22, icX = cx + cW - icR - 14, icY = cy + H_SCARD / 2;
        const icBg = ctx.createRadialGradient(icX, icY, 0, icX, icY, icR);
        icBg.addColorStop(0, rgba(card.color, 0.28)); icBg.addColorStop(1, rgba(card.color, 0.08));
        ctx.fillStyle = icBg;
        ctx.beginPath(); ctx.arc(icX, icY, icR, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = rgba(card.color, 0.25); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(icX, icY, icR, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = card.color; ctx.font = `800 15px ${FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(card.icon, icX, icY + 1.5);
        ctx.fillStyle = GRAY_400; ctx.font = `600 10px ${FONT}`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(card.label.toUpperCase(), cx + 16, cy + 18);
        ctx.fillStyle = GRAY_900; ctx.font = `800 18px ${FONT}`; ctx.textBaseline = 'middle';
        ctx.fillText(clip(ctx, card.value, icX - cx - icR - 20), cx + 16, cy + H_SCARD * 0.53);
        ctx.font = `700 10px ${FONT}`;
        const sW = ctx.measureText(card.sub).width + 18;
        ctx.fillStyle = rgba(card.color, 0.14); rr(ctx, cx + 16, cy + H_SCARD - 34, sW, 22, 11); ctx.fill();
        ctx.fillStyle = card.color; ctx.textBaseline = 'middle';
        ctx.fillText(card.sub, cx + 25, cy + H_SCARD - 23);
        // End clip — draw card stroke on top
        ctx.restore();
        ctx.strokeStyle = rgba(card.color, 0.20); ctx.lineWidth = 1;
        rr(ctx, cx, cy, cW, H_SCARD, 20); ctx.stroke();
      });

      y += H_SCARD + GAP;
    }

    // Section cards for this page
    if (spec.sentChunk !== null) {
      drawSectionCard(ctx, y, labels.sentSection, spec.sentChunk, RED, true, totalSent, labels, spec.sentIsCont);
      y += sectionHeight(Math.max(spec.sentChunk.length, 1)) + GAP;
    }
    if (spec.recvChunk !== null) {
      drawSectionCard(ctx, y, labels.receivedSection, spec.recvChunk, GREEN, false, totalReceived, labels, spec.recvIsCont);
      y += sectionHeight(Math.max(spec.recvChunk.length, 1)) + GAP;
    }

    drawFooter(ctx, y, labels.footer, logoImg);

    const blob = await canvasToBlob(canvas);
    results.push({ blob, width: W, height: H, page: pageNo, totalPages });
  }

  return results;
}
