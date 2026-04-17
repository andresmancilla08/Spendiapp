// utils/generateAnnualReportImage.ts
import { ReportData } from '../hooks/useReportGenerator';

export interface AnnualReportImageLabels {
  extractTitle: string;
  generatedOn: string;
  income: string;
  expenses: string;
  balance: string;
  byCategory: string;
  categoryCol: string;
  transactionsCol: string;
  totalCol: string;
  movementsTitle: string;
  dateCol: string;
  descriptionCol: string;
  categoryLabel: string;
  amountCol: string;
  footer: string;
}

export interface AnnualReportImageResult {
  blob: Blob;
  width: number;
  height: number;
  page: number;
  totalPages: number;
}

// ── Layout config ──────────────────────────────────────────────────────────
const MAX_ROWS_PER_PAGE = 10;

// ── Visual constants ───────────────────────────────────────────────────────
const SCALE = 2;
const W     = 900;
const PAD   = 36;
const FONT  = '"Inter","SF Pro Display","Helvetica Neue",Helvetica,Arial,sans-serif';
const CW    = W - PAD * 2; // content width = 828

const CYAN_DARK  = '#006978';
const CYAN_MID   = '#00ACC1';
const CYAN_LIGHT = '#26C6DA';
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
const H_HDR   = 210;
const H_MINI  = 60;
const H_BAL   = 116;
const H_SCARD = 112;
const H_SHDR  = 56;
const H_CHDR  = 36;
const H_ROW   = 52;
const H_SFOOT = 52;
const H_FOOT  = 68;
const GAP     = 20;

// Column widths
const CAT_COLS = [440, 160, 228] as const;   // name | count | total
const MOV_COLS = [100, 280, 220, 228] as const; // date | desc | cat | amount

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
function sectionHeight(rowCount: number): number {
  return H_SHDR + H_CHDR + Math.max(rowCount, 1) * H_ROW + H_SFOOT;
}

// ── Background ─────────────────────────────────────────────────────────────
function drawBackground(ctx: CanvasRenderingContext2D, h: number) {
  ctx.fillStyle = GRAY_50;
  ctx.fillRect(0, 0, W, h);
  ctx.fillStyle = rgba(CYAN_MID, 0.06);
  for (let x = 24; x < W; x += 28)
    for (let y = 24; y < h; y += 28) {
      ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
    }
}

// ── Footer ─────────────────────────────────────────────────────────────────
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

// ── Mini header (continuation pages) ───────────────────────────────────────
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
  ctx.font = `600 11px ${FONT}`;
  ctx.fillStyle = rgba(WHITE, 0.80);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(`${clip(ctx, title, 220)} · ${page}/${totalPages}`, W - PAD, H_MINI / 2);
}

// ── Full header (page 1) ────────────────────────────────────────────────────
function drawFullHeader(
  ctx: CanvasRenderingContext2D,
  logoImg: HTMLImageElement | null,
  data: ReportData,
  labels: AnnualReportImageLabels,
) {
  ctx.fillStyle = vGrad(ctx, 0, H_HDR, CYAN_DARK, CYAN_LIGHT);
  ctx.fillRect(0, 0, W, H_HDR);

  // Decorative circles
  for (const [cx, cy, r, a] of [
    [W - 60, -60, 160, 0.07], [W + 20, H_HDR * 0.7, 100, 0.05],
    [-30, H_HDR + 30, 80, 0.05], [W * 0.4, H_HDR * 1.1, 60, 0.04],
  ] as [number, number, number, number][]) {
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  }

  // Shimmer overlay
  const shim = ctx.createLinearGradient(0, 0, W, 0);
  shim.addColorStop(0, 'rgba(255,255,255,0)');
  shim.addColorStop(0.5, 'rgba(255,255,255,0.09)');
  shim.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shim; ctx.fillRect(0, 0, W, H_HDR);

  // Logo / SPENDIA wordmark
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

  // Extract title pill (top-right)
  ctx.font = `600 10.5px ${FONT}`;
  const pw = Math.min(ctx.measureText(labels.extractTitle).width + 28, 200);
  ctx.fillStyle = rgba(WHITE, 0.18);
  rr(ctx, W - PAD - pw, ly + 6, pw, 26, 13); ctx.fill();
  ctx.fillStyle = WHITE; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(clip(ctx, labels.extractTitle, pw - 14), W - PAD - 7, ly + 19);

  // Separator line
  ctx.strokeStyle = rgba(WHITE, 0.22); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, ly + LG + 14); ctx.lineTo(W - PAD, ly + LG + 14); ctx.stroke();

  // User avatar + name
  const avY = ly + LG + 38;
  const AVR = 34;
  const avCY = avY + AVR;

  const g = ctx.createRadialGradient(PAD + AVR - AVR * 0.25, avCY - AVR * 0.25, 0, PAD + AVR, avCY, AVR);
  g.addColorStop(0, rgba(WHITE, 0.48)); g.addColorStop(1, rgba(WHITE, 0.18));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(PAD + AVR, avCY, AVR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(WHITE, 0.40); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(PAD + AVR, avCY, AVR, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = WHITE; ctx.font = `800 ${Math.round(AVR * 0.82)}px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(data.userName.charAt(0).toUpperCase(), PAD + AVR, avCY + 1.5);

  ctx.fillStyle = WHITE; ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(data.userName, PAD + AVR * 2 + 14, avCY - 9);
  ctx.fillStyle = rgba(WHITE, 0.65); ctx.font = `400 11px ${FONT}`;
  ctx.fillText(labels.generatedOn, PAD + AVR * 2 + 14, avCY + 9);

  // Year big number (decorative bottom-right)
  ctx.fillStyle = rgba(WHITE, 0.12);
  ctx.font = `800 56px ${FONT}`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(data.year), W - PAD, H_HDR - 18);
}

// ── Balance hero card ───────────────────────────────────────────────────────
function drawBalanceHero(
  ctx: CanvasRenderingContext2D,
  y: number,
  balance: number,
  totalIncome: number,
  totalExpenses: number,
  labels: AnnualReportImageLabels,
) {
  const cx = PAD, cw = CW;
  const balCol = balance >= 0 ? EMERALD : RED;

  shadow(ctx, 22, 0.11, 8);
  ctx.fillStyle = WHITE; rr(ctx, cx, y, cw, H_BAL, 22); ctx.fill();
  noShadow(ctx);
  ctx.fillStyle = rgba(balCol, 0.04); rr(ctx, cx, y, cw, H_BAL, 22); ctx.fill();

  // Left accent bar
  ctx.fillStyle = vGrad(ctx, y, y + H_BAL, balCol, rgba(balCol, 0.55));
  rr(ctx, cx, y, 8, H_BAL, 4); ctx.fill();

  const bx = cx + 26;

  // Label
  ctx.fillStyle = GRAY_400; ctx.font = `600 10px ${FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(labels.balance.toUpperCase(), bx, y + 18);

  // Income/expense micro indicators
  ctx.fillStyle = EMERALD; ctx.font = `600 11.5px ${FONT}`; ctx.textBaseline = 'top';
  ctx.fillText(`↑ ${fmtCOP(totalIncome)}`, bx, y + 38);
  ctx.fillStyle = RED;
  ctx.fillText(`↓ ${fmtCOP(totalExpenses)}`, bx + 220, y + 38);

  // Balance amount (large, bottom)
  ctx.fillStyle = balCol; ctx.font = `800 38px ${FONT}`; ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${balance >= 0 ? '+' : '−'}${fmtCOP(balance)}`, bx, y + H_BAL - 22);

  // Icon circle (right)
  const ix = W - PAD - 52, iy = y + H_BAL / 2, ir = 30;
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
  ctx.fillText(balance >= 0 ? '↑' : '↓', ix, iy + 2);
}

// ── Summary cards ───────────────────────────────────────────────────────────
function drawSummaryCards(
  ctx: CanvasRenderingContext2D,
  y: number,
  totalIncome: number,
  totalExpenses: number,
  balance: number,
  labels: AnnualReportImageLabels,
  incomeCount: number,
  expenseCount: number,
  totalCount: number,
) {
  const balCol = balance >= 0 ? EMERALD : RED;
  const gapC = 14;
  const cardW = (CW - gapC * 2) / 3;

  const summaries = [
    { label: labels.income,   value: fmtCOP(totalIncome),   color: EMERALD, icon: '↑', sub: `${incomeCount} mov.` },
    { label: labels.expenses, value: fmtCOP(totalExpenses), color: RED,     icon: '↓', sub: `${expenseCount} mov.` },
    { label: labels.balance,  value: fmtCOP(balance),       color: balCol,  icon: balance >= 0 ? '↑' : '↓', sub: `${totalCount} mov.` },
  ];

  summaries.forEach((card, i) => {
    const cx = PAD + i * (cardW + gapC), cy = y;

    shadow(ctx, 16, 0.09, 5);
    ctx.fillStyle = WHITE; rr(ctx, cx, cy, cardW, H_SCARD, 20); ctx.fill();
    noShadow(ctx);
    ctx.fillStyle = rgba(card.color, 0.06); rr(ctx, cx, cy, cardW, H_SCARD, 20); ctx.fill();

    // Clip inner elements to card rounded boundary
    ctx.save();
    rr(ctx, cx, cy, cardW, H_SCARD, 20); ctx.clip();

    // Top colored bar
    ctx.fillStyle = hGrad(ctx, cx, cy, cardW, card.color, rgba(card.color, 0.70));
    rrTop(ctx, cx, cy, cardW, 5, 20); ctx.fill();
    ctx.fillStyle = hGrad(ctx, cx, cy, cardW, card.color, rgba(card.color, 0.70));
    ctx.fillRect(cx, cy + 2, cardW, 3);

    // Icon circle
    const icR = 22, icX = cx + cardW - icR - 14, icY = cy + H_SCARD / 2;
    const icBg = ctx.createRadialGradient(icX, icY, 0, icX, icY, icR);
    icBg.addColorStop(0, rgba(card.color, 0.28)); icBg.addColorStop(1, rgba(card.color, 0.08));
    ctx.fillStyle = icBg;
    ctx.beginPath(); ctx.arc(icX, icY, icR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(card.color, 0.25); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(icX, icY, icR, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = card.color; ctx.font = `800 15px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(card.icon, icX, icY + 1.5);

    // Label
    ctx.fillStyle = GRAY_400; ctx.font = `600 10px ${FONT}`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(card.label.toUpperCase(), cx + 16, cy + 18);

    // Value
    ctx.fillStyle = GRAY_900; ctx.font = `800 18px ${FONT}`; ctx.textBaseline = 'middle';
    ctx.fillText(clip(ctx, card.value, icX - cx - icR - 20), cx + 16, cy + H_SCARD * 0.53);

    // Sub pill
    ctx.font = `700 10px ${FONT}`;
    const sW = ctx.measureText(card.sub).width + 18;
    ctx.fillStyle = rgba(card.color, 0.14); rr(ctx, cx + 16, cy + H_SCARD - 34, sW, 22, 11); ctx.fill();
    ctx.fillStyle = card.color; ctx.textBaseline = 'middle';
    ctx.fillText(card.sub, cx + 25, cy + H_SCARD - 23);
    // End clip — draw card stroke on top
    ctx.restore();
    ctx.strokeStyle = rgba(card.color, 0.20); ctx.lineWidth = 1;
    rr(ctx, cx, cy, cardW, H_SCARD, 20); ctx.stroke();
  });
}

// ── Categories section card ─────────────────────────────────────────────────
function drawCategoriesSection(
  ctx: CanvasRenderingContext2D,
  y: number,
  rows: { name: string; count: number; total: number; type: 'expense' | 'income'; }[],
  labels: AnnualReportImageLabels,
  isCont = false,
) {
  const nRows = Math.max(rows.length, 1);
  const cardH = sectionHeight(nRows);
  const cx = PAD, cw = CW;

  // Card
  shadow(ctx, 20, 0.10, 7);
  ctx.fillStyle = WHITE; rr(ctx, cx, y, cw, cardH, 22); ctx.fill();
  noShadow(ctx);

  // Clip all inner elements to card rounded boundary
  ctx.save();
  rr(ctx, cx, y, cw, cardH, 22); ctx.clip();

  // Header gradient
  ctx.fillStyle = hGrad(ctx, cx, y, cw, CYAN_MID, rgba(CYAN_DARK, 0.78));
  rrTop(ctx, cx, y, cw, H_SHDR, 22); ctx.fill();
  ctx.fillStyle = hGrad(ctx, cx, y, cw, CYAN_MID, rgba(CYAN_DARK, 0.78));
  ctx.fillRect(cx, y + 20, cw, H_SHDR - 20);
  const hs = ctx.createLinearGradient(cx, y, cx + cw, y);
  hs.addColorStop(0, 'rgba(255,255,255,0)');
  hs.addColorStop(0.4, 'rgba(255,255,255,0.10)');
  hs.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hs; rrTop(ctx, cx, y, cw, H_SHDR, 22); ctx.fill();
  ctx.fillStyle = hs; ctx.fillRect(cx, y + 20, cw, H_SHDR - 20);

  // Icon circle
  ctx.fillStyle = rgba(WHITE, 0.22);
  ctx.beginPath(); ctx.arc(cx + 30, y + H_SHDR / 2, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = WHITE; ctx.font = `800 16px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('≡', cx + 30, y + H_SHDR / 2 + 1.5);

  // Label + count pill
  ctx.fillStyle = WHITE; ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(isCont ? `${labels.byCategory} (cont.)` : labels.byCategory, cx + 60, y + H_SHDR / 2);
  ctx.font = `700 11px ${FONT}`;
  const cntTxt = `${rows.length}`;
  const cntW = ctx.measureText(cntTxt).width + 22;
  ctx.fillStyle = rgba(WHITE, 0.22);
  rr(ctx, cx + cw - cntW - 10, y + (H_SHDR - 26) / 2, cntW, 26, 13); ctx.fill();
  ctx.fillStyle = WHITE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(cntTxt, cx + cw - cntW / 2 - 10, y + H_SHDR / 2);

  let ry = y + H_SHDR;

  // Column header
  ctx.fillStyle = GRAY_100; ctx.fillRect(cx, ry, cw, H_CHDR);
  ctx.strokeStyle = GRAY_200; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(cx, ry + H_CHDR); ctx.lineTo(cx + cw, ry + H_CHDR); ctx.stroke();
  ctx.fillStyle = rgba(CYAN_MID, 0.85); ctx.font = `700 9.5px ${FONT}`;
  const chY = ry + H_CHDR / 2;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(labels.categoryCol.toUpperCase(), cx + 18, chY);
  ctx.textAlign = 'center';
  ctx.fillText(labels.transactionsCol.toUpperCase(), cx + CAT_COLS[0] + CAT_COLS[1] / 2, chY);
  ctx.textAlign = 'right';
  ctx.fillText(labels.totalCol.toUpperCase(), cx + cw - 18, chY);
  ctx.textAlign = 'left';
  ry += H_CHDR;

  // Data rows
  if (rows.length === 0) {
    ctx.fillStyle = GRAY_50; ctx.fillRect(cx, ry, cw, H_ROW);
    ctx.fillStyle = GRAY_400; ctx.font = `400 13px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('—', cx + cw / 2, ry + H_ROW / 2);
    ctx.textAlign = 'left'; ry += H_ROW;
  } else {
    rows.forEach((row, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? WHITE : GRAY_50;
      ctx.fillRect(cx, ry, cw, H_ROW);

      // Accent micro-bar
      ctx.fillStyle = rgba(CYAN_MID, 0.30);
      ctx.fillRect(cx, ry + 10, 3, H_ROW - 20);

      // Category name
      ctx.fillStyle = GRAY_900; ctx.font = `500 13px ${FONT}`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(clip(ctx, row.name, CAT_COLS[0] - 30), cx + 18, ry + H_ROW / 2);

      // Count
      ctx.fillStyle = GRAY_600; ctx.font = `600 12px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(row.count), cx + CAT_COLS[0] + CAT_COLS[1] / 2, ry + H_ROW / 2);

      // Amount pill
      const amtColor = row.type === 'expense' ? RED : EMERALD;
      const amtTxt = `${row.type === 'expense' ? '−' : '+'}${fmtCOP(row.total)}`;
      ctx.font = `700 12.5px ${FONT}`;
      const amtW = ctx.measureText(amtTxt).width;
      const pW = amtW + 26, pH = 30;
      const amtX = cx + CAT_COLS[0] + CAT_COLS[1];
      const pX = amtX + CAT_COLS[2] - pW - 12, pY = ry + (H_ROW - pH) / 2;
      const pBg = ctx.createLinearGradient(pX, pY, pX + pW, pY + pH);
      pBg.addColorStop(0, rgba(amtColor, 0.18)); pBg.addColorStop(1, rgba(amtColor, 0.08));
      ctx.fillStyle = pBg; rr(ctx, pX, pY, pW, pH, 15); ctx.fill();
      ctx.strokeStyle = rgba(amtColor, 0.28); ctx.lineWidth = 0.8;
      rr(ctx, pX, pY, pW, pH, 15); ctx.stroke();
      ctx.fillStyle = amtColor; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(amtTxt, cx + cw - 25, ry + H_ROW / 2);
      ctx.textAlign = 'left';

      ctx.strokeStyle = GRAY_200; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(cx + 16, ry + H_ROW); ctx.lineTo(cx + cw - 16, ry + H_ROW); ctx.stroke();
      ry += H_ROW;
    });
  }

  // Footer totals
  const totExp = rows.filter(r => r.type === 'expense').reduce((s, r) => s + r.total, 0);
  const totInc = rows.filter(r => r.type === 'income').reduce((s, r) => s + r.total, 0);

  ctx.fillStyle = rgba(CYAN_MID, 0.07);
  rrBot(ctx, cx, ry, cw, H_SFOOT, 22); ctx.fill();
  ctx.strokeStyle = rgba(CYAN_MID, 0.18); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx + 16, ry); ctx.lineTo(cx + cw - 16, ry); ctx.stroke();

  const fY = ry + H_SFOOT / 2;
  ctx.fillStyle = GRAY_600; ctx.font = `600 12px ${FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`${rows.length} ${labels.categoryCol.toLowerCase()}s`, cx + 20, fY);

  ctx.textAlign = 'right'; ctx.font = `800 14px ${FONT}`;
  if (totInc > 0 && totExp > 0) {
    ctx.fillStyle = EMERALD;
    ctx.fillText(`+${fmtCOP(totInc)}`, cx + cw - 160, fY);
    ctx.fillStyle = RED;
    ctx.fillText(`−${fmtCOP(totExp)}`, cx + cw - 20, fY);
  } else if (totInc > 0) {
    ctx.fillStyle = EMERALD;
    ctx.fillText(`+${fmtCOP(totInc)}`, cx + cw - 20, fY);
  } else if (totExp > 0) {
    ctx.fillStyle = RED;
    ctx.fillText(`−${fmtCOP(totExp)}`, cx + cw - 20, fY);
  }
  ctx.textAlign = 'left';

  // End clip — draw card stroke on top
  ctx.restore();
  ctx.strokeStyle = rgba(CYAN_MID, 0.15); ctx.lineWidth = 1;
  rr(ctx, cx, y, cw, cardH, 22); ctx.stroke();
}

// ── Movements section card ──────────────────────────────────────────────────
function drawMovementsSection(
  ctx: CanvasRenderingContext2D,
  y: number,
  txs: { date: Date; description: string; categoryName: string; amount: number; type: 'expense' | 'income'; }[],
  totalTxCount: number,
  labels: AnnualReportImageLabels,
  isCont: boolean,
) {
  const nRows = Math.max(txs.length, 1);
  const cardH = sectionHeight(nRows);
  const cx = PAD, cw = CW;

  shadow(ctx, 20, 0.10, 7);
  ctx.fillStyle = WHITE; rr(ctx, cx, y, cw, cardH, 22); ctx.fill();
  noShadow(ctx);

  // Clip all inner elements to card rounded boundary
  ctx.save();
  rr(ctx, cx, y, cw, cardH, 22); ctx.clip();

  // Header (darker cyan)
  ctx.fillStyle = hGrad(ctx, cx, y, cw, CYAN_DARK, rgba('#005060', 0.90));
  rrTop(ctx, cx, y, cw, H_SHDR, 22); ctx.fill();
  ctx.fillStyle = hGrad(ctx, cx, y, cw, CYAN_DARK, rgba('#005060', 0.90));
  ctx.fillRect(cx, y + 20, cw, H_SHDR - 20);
  const hs = ctx.createLinearGradient(cx, y, cx + cw, y);
  hs.addColorStop(0, 'rgba(255,255,255,0)');
  hs.addColorStop(0.4, 'rgba(255,255,255,0.10)');
  hs.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hs; rrTop(ctx, cx, y, cw, H_SHDR, 22); ctx.fill();
  ctx.fillStyle = hs; ctx.fillRect(cx, y + 20, cw, H_SHDR - 20);

  // Icon circle
  ctx.fillStyle = rgba(WHITE, 0.22);
  ctx.beginPath(); ctx.arc(cx + 30, y + H_SHDR / 2, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = WHITE; ctx.font = `800 15px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('↕', cx + 30, y + H_SHDR / 2 + 1.5);

  // Label + count pill
  ctx.fillStyle = WHITE; ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(isCont ? `${labels.movementsTitle} (cont.)` : labels.movementsTitle, cx + 60, y + H_SHDR / 2);
  ctx.font = `700 11px ${FONT}`;
  const cntTxt = `${totalTxCount}`;
  const cntW = ctx.measureText(cntTxt).width + 22;
  ctx.fillStyle = rgba(WHITE, 0.22);
  rr(ctx, cx + cw - cntW - 10, y + (H_SHDR - 26) / 2, cntW, 26, 13); ctx.fill();
  ctx.fillStyle = WHITE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(cntTxt, cx + cw - cntW / 2 - 10, y + H_SHDR / 2);

  let ry = y + H_SHDR;

  // Column header
  ctx.fillStyle = GRAY_100; ctx.fillRect(cx, ry, cw, H_CHDR);
  ctx.strokeStyle = GRAY_200; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(cx, ry + H_CHDR); ctx.lineTo(cx + cw, ry + H_CHDR); ctx.stroke();
  ctx.fillStyle = rgba(CYAN_DARK, 0.85); ctx.font = `700 9.5px ${FONT}`;
  const chY = ry + H_CHDR / 2;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(labels.dateCol.toUpperCase(), cx + 18, chY);
  ctx.fillText(labels.descriptionCol.toUpperCase(), cx + MOV_COLS[0] + 12, chY);
  ctx.fillText(labels.categoryLabel.toUpperCase(), cx + MOV_COLS[0] + MOV_COLS[1] + 12, chY);
  ctx.textAlign = 'right';
  ctx.fillText(labels.amountCol.toUpperCase(), cx + cw - 18, chY);
  ctx.textAlign = 'left';
  ry += H_CHDR;

  // Data rows
  if (txs.length === 0) {
    ctx.fillStyle = GRAY_50; ctx.fillRect(cx, ry, cw, H_ROW);
    ctx.fillStyle = GRAY_400; ctx.font = `400 13px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('—', cx + cw / 2, ry + H_ROW / 2);
    ctx.textAlign = 'left'; ry += H_ROW;
  } else {
    txs.forEach((tx, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? WHITE : GRAY_50;
      ctx.fillRect(cx, ry, cw, H_ROW);

      // Accent micro-bar (colored by type)
      const accentCol = tx.type === 'expense' ? RED : EMERALD;
      ctx.fillStyle = rgba(accentCol, 0.30);
      ctx.fillRect(cx, ry + 10, 3, H_ROW - 20);

      // Date chip
      const chipW = 78, chipH = 28;
      const chipX = cx + 10, chipY = ry + (H_ROW - chipH) / 2;
      ctx.fillStyle = rgba(CYAN_MID, 0.10);
      rr(ctx, chipX, chipY, chipW, chipH, 8); ctx.fill();
      ctx.fillStyle = GRAY_600; ctx.font = `600 11px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(fmtDate(tx.date), chipX + chipW / 2, ry + H_ROW / 2);

      // Description
      ctx.fillStyle = GRAY_900; ctx.font = `500 13px ${FONT}`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(clip(ctx, tx.description, MOV_COLS[1] - 20), cx + MOV_COLS[0] + 8, ry + H_ROW / 2);

      // Category
      ctx.fillStyle = GRAY_600; ctx.font = `400 12px ${FONT}`;
      ctx.fillText(clip(ctx, tx.categoryName, MOV_COLS[2] - 20), cx + MOV_COLS[0] + MOV_COLS[1] + 8, ry + H_ROW / 2);

      // Amount pill
      const amtTxt = `${tx.type === 'expense' ? '−' : '+'}${fmtCOP(tx.amount)}`;
      ctx.font = `700 12.5px ${FONT}`;
      const amtW = ctx.measureText(amtTxt).width;
      const pW = amtW + 26, pH = 30;
      const pX = cx + cw - pW - 12, pY = ry + (H_ROW - pH) / 2;
      const pBg = ctx.createLinearGradient(pX, pY, pX + pW, pY + pH);
      pBg.addColorStop(0, rgba(accentCol, 0.18)); pBg.addColorStop(1, rgba(accentCol, 0.08));
      ctx.fillStyle = pBg; rr(ctx, pX, pY, pW, pH, 15); ctx.fill();
      ctx.strokeStyle = rgba(accentCol, 0.28); ctx.lineWidth = 0.8;
      rr(ctx, pX, pY, pW, pH, 15); ctx.stroke();
      ctx.fillStyle = accentCol; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(amtTxt, cx + cw - 25, ry + H_ROW / 2);
      ctx.textAlign = 'left';

      ctx.strokeStyle = GRAY_200; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(cx + 16, ry + H_ROW); ctx.lineTo(cx + cw - 16, ry + H_ROW); ctx.stroke();
      ry += H_ROW;
    });
  }

  // Footer totals
  const totExp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totInc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  ctx.fillStyle = rgba(CYAN_DARK, 0.07);
  rrBot(ctx, cx, ry, cw, H_SFOOT, 22); ctx.fill();
  ctx.strokeStyle = rgba(CYAN_DARK, 0.18); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx + 16, ry); ctx.lineTo(cx + cw - 16, ry); ctx.stroke();

  const fY = ry + H_SFOOT / 2;
  ctx.fillStyle = GRAY_600; ctx.font = `600 13px ${FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`${txs.length} movimientos`, cx + 20, fY);
  ctx.textAlign = 'right'; ctx.font = `800 14px ${FONT}`;
  if (totInc > 0 && totExp > 0) {
    ctx.fillStyle = EMERALD;
    ctx.fillText(`+${fmtCOP(totInc)}`, cx + cw - 160, fY);
    ctx.fillStyle = RED;
    ctx.fillText(`−${fmtCOP(totExp)}`, cx + cw - 20, fY);
  } else if (totInc > 0) {
    ctx.fillStyle = EMERALD;
    ctx.fillText(`+${fmtCOP(totInc)}`, cx + cw - 20, fY);
  } else if (totExp > 0) {
    ctx.fillStyle = RED;
    ctx.fillText(`−${fmtCOP(totExp)}`, cx + cw - 20, fY);
  }
  ctx.textAlign = 'left';

  // End clip — draw card stroke on top
  ctx.restore();
  ctx.strokeStyle = rgba(CYAN_DARK, 0.15); ctx.lineWidth = 1;
  rr(ctx, cx, y, cw, cardH, 22); ctx.stroke();
}

// ── Main export ────────────────────────────────────────────────────────────
export async function generateAnnualReportImage(
  data: ReportData,
  labels: AnnualReportImageLabels,
  logoUri?: string,
): Promise<AnnualReportImageResult[]> {
  const logoImg = logoUri ? await loadImg(logoUri) : null;

  const incomeCount  = data.transactions.filter(t => t.type === 'income').length;
  const expenseCount = data.transactions.filter(t => t.type === 'expense').length;

  function chunkArr<T>(arr: T[]): T[][] {
    if (arr.length === 0) return [[]];
    const pages: T[][] = [];
    for (let i = 0; i < arr.length; i += MAX_ROWS_PER_PAGE)
      pages.push(arr.slice(i, i + MAX_ROWS_PER_PAGE));
    return pages;
  }

  const txChunks  = chunkArr(data.transactions);
  const totalPages = 1 + txChunks.length;
  const results: AnnualReportImageResult[] = [];

  // ── Page 1: header + balance hero + summary cards + categories ────────────
  const catSectionH = sectionHeight(data.byCategory.length);
  const page1H = H_HDR + GAP + H_BAL + GAP + H_SCARD + GAP + catSectionH + GAP + H_FOOT;

  {
    const canvas = document.createElement('canvas');
    canvas.width  = W * SCALE;
    canvas.height = page1H * SCALE;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(SCALE, SCALE);

    drawBackground(ctx, page1H);
    drawFullHeader(ctx, logoImg, data, labels);

    let y = H_HDR + GAP;
    drawBalanceHero(ctx, y, data.balance, data.totalIncome, data.totalExpenses, labels);
    y += H_BAL + GAP;

    drawSummaryCards(ctx, y, data.totalIncome, data.totalExpenses, data.balance, labels, incomeCount, expenseCount, data.transactions.length);
    y += H_SCARD + GAP;

    drawCategoriesSection(ctx, y, data.byCategory, labels, false);
    y += catSectionH + GAP;

    drawFooter(ctx, y, labels.footer, logoImg);

    results.push({ blob: await canvasToBlob(canvas), width: W, height: page1H, page: 1, totalPages });
  }

  // ── Pages 2+: movements (chunked) ─────────────────────────────────────────
  for (let pi = 0; pi < txChunks.length; pi++) {
    const chunk = txChunks[pi];
    const movH  = sectionHeight(Math.max(chunk.length, 1));
    const pageH = H_MINI + GAP + movH + GAP + H_FOOT;
    const pageNo = pi + 2;

    const canvas = document.createElement('canvas');
    canvas.width  = W * SCALE;
    canvas.height = pageH * SCALE;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(SCALE, SCALE);

    drawBackground(ctx, pageH);
    drawMiniHeader(ctx, logoImg, pageNo, totalPages, labels.movementsTitle);

    const y = H_MINI + GAP;
    drawMovementsSection(ctx, y, chunk, data.transactions.length, labels, pi > 0);

    drawFooter(ctx, y + movH + GAP, labels.footer, logoImg);

    results.push({ blob: await canvasToBlob(canvas), width: W, height: pageH, page: pageNo, totalPages });
  }

  return results;
}
