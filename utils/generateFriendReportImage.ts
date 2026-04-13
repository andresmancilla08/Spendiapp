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
  balanceTitle: string; // e.g. "Carlos te debe" | "Le debes a Carlos" | "Están al día"
}

export interface FriendReportImageResult {
  blob: Blob;
  width: number;
  height: number;
}

// ── Config ────────────────────────────────────────────────────────────────────
const SCALE  = 2;
const W      = 880;
const PAD    = 40;
const FONT   = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const PRIMARY   = '#00ACC1';
const PRIMARY_D = '#0097A7';
const SECONDARY = '#00897B';
const EXPENSE   = '#E53935';
const BG        = '#FFFFFF';
const SURFACE   = '#F4F6F8';
const SURFACE2  = '#EDF0F2';
const BORDER    = '#E0E5E9';
const TEXT_DARK = '#18202A';
const TEXT_MID  = '#4B5563';
const TEXT_GRAY = '#9CA3AF';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(Math.abs(n));
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function clipText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

function rRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function avatar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  initial: string, bgColor: string, textColor: string,
) {
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.font = `bold ${r}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, cx, cy + 1);
}

function shadow(ctx: CanvasRenderingContext2D, blur = 16, opacity = 0.08) {
  ctx.shadowColor = `rgba(0,0,0,${opacity})`;
  ctx.shadowBlur  = blur * SCALE;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4 * SCALE;
}

function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor   = 'transparent';
  ctx.shadowBlur    = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function loadHTMLImage(uri: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.crossOrigin = 'anonymous';
    img.src = uri;
  });
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateFriendReportImage(
  data: FriendReportImageData,
  labels: FriendReportImageLabels,
): Promise<FriendReportImageResult> {

  // Layout constants
  const HEADER_H     = 152;
  const BALANCE_H    = 104;
  const SUMMARY_H    = 100;
  const ROW_H        = 44;
  const SEC_LABEL_H  = 42;
  const COL_HDR_H    = 34;
  const SEC_GAP      = 28;
  const FOOTER_H     = 60;
  const INNER_PAD    = 24; // inside card panels

  const sentN = Math.max(data.sentToFriend.length, 1);
  const recvN = Math.max(data.receivedFromFriend.length, 1);

  const H =
    HEADER_H +
    INNER_PAD + BALANCE_H +
    INNER_PAD + SUMMARY_H +
    SEC_GAP + SEC_LABEL_H + COL_HDR_H + sentN * ROW_H +
    SEC_GAP + SEC_LABEL_H + COL_HDR_H + recvN * ROW_H +
    SEC_GAP + FOOTER_H;

  // Load logo (best-effort — drawing continues even if it fails)
  const logoImg = data.logoUri ? await loadHTMLImage(data.logoUri) : null;

  const canvas = document.createElement('canvas');
  canvas.width  = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = SURFACE;
  ctx.fillRect(0, 0, W, H);

  // ── Header (primary gradient feel via two rects) ────────────────────────────
  ctx.fillStyle = PRIMARY_D;
  ctx.fillRect(0, 0, W, HEADER_H);
  // Lighter horizontal stripe top
  ctx.fillStyle = PRIMARY;
  ctx.fillRect(0, 0, W, HEADER_H - 20);
  // Diagonal accent
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.moveTo(W * 0.55, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, HEADER_H);
  ctx.lineTo(W * 0.35, HEADER_H);
  ctx.closePath();
  ctx.fill();

  // Logo + SPENDIA wordmark
  const LOGO_SIZE = 34;
  const LOGO_Y    = 13;
  if (logoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(PAD + LOGO_SIZE / 2, LOGO_Y + LOGO_SIZE / 2, LOGO_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImg, PAD, LOGO_Y, LOGO_SIZE, LOGO_SIZE);
    ctx.restore();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPENDIA', PAD + LOGO_SIZE + 10, 30);
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPENDIA', PAD, 30);
  }

  // Pill label top-right
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  rRect(ctx, W - PAD - 140, 16, 140, 28, 14);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(labels.title, W - PAD - 10, 30);

  // Divider line
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, 52);
  ctx.lineTo(W - PAD, 52);
  ctx.stroke();

  // Avatars + names row
  const AVR = 26;
  const avY = 52 + (HEADER_H - 52) / 2;

  // My avatar
  avatar(ctx, PAD + AVR, avY, AVR, data.myName.charAt(0).toUpperCase(),
    'rgba(255,255,255,0.25)', '#FFFFFF');
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold 14px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(data.myName, PAD + AVR * 2 + 10, avY - 7);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = `11px ${FONT}`;
  ctx.fillText(labels.generatedOn, PAD + AVR * 2 + 10, avY + 10);

  // Arrow between avatars
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `18px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('⇄', W / 2, avY);

  // Friend avatar (right-aligned)
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(labels.period, W - PAD - AVR * 2 - 10, avY + 10);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold 14px ${FONT}`;
  ctx.fillText(data.friendName, W - PAD - AVR * 2 - 10, avY - 7);
  avatar(ctx, W - PAD - AVR, avY, AVR, data.friendName.charAt(0).toUpperCase(),
    'rgba(255,255,255,0.25)', '#FFFFFF');

  // ── Balance callout ─────────────────────────────────────────────────────────
  const totalSent     = data.sentToFriend.reduce((s, t) => s + t.amount, 0);
  const totalReceived = data.receivedFromFriend.reduce((s, t) => s + t.amount, 0);
  const net = totalReceived - totalSent;

  const balColor  = net === 0 ? PRIMARY : net > 0 ? SECONDARY : EXPENSE;
  const balBg     = net === 0 ? `${PRIMARY}12`   : net > 0 ? `${SECONDARY}12`   : `${EXPENSE}10`;
  const balBorder = net === 0 ? `${PRIMARY}30`   : net > 0 ? `${SECONDARY}30`   : `${EXPENSE}25`;

  let y = HEADER_H + INNER_PAD;
  shadow(ctx, 12, 0.07);
  ctx.fillStyle = BG;
  rRect(ctx, PAD, y, W - PAD * 2, BALANCE_H, 16);
  ctx.fill();
  clearShadow(ctx);

  // Left accent bar
  ctx.fillStyle = balColor;
  ctx.fillRect(PAD, y, 5, BALANCE_H);
  // Round left corners of accent
  rRect(ctx, PAD, y, 5, BALANCE_H, 3);
  ctx.fill();

  // Balance content
  const balX = PAD + 28;
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(labels.netBalance.toUpperCase(), balX, y + 22);

  ctx.fillStyle = balColor;
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText(labels.balanceTitle, balX, y + 46);

  ctx.font = `bold 32px ${FONT}`;
  ctx.fillText(fmtCOP(net), balX, y + 80);

  // Direction icon (right side)
  const iconX = W - PAD - 64;
  const iconY = y + BALANCE_H / 2;
  ctx.fillStyle = balBg;
  ctx.beginPath();
  ctx.arc(iconX, iconY, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = balBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(iconX, iconY, 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = balColor;
  ctx.font = `bold 22px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(net === 0 ? '✓' : net > 0 ? '↓' : '↑', iconX, iconY + 1);

  // ── Summary cards ───────────────────────────────────────────────────────────
  y = HEADER_H + INNER_PAD + BALANCE_H + INNER_PAD;
  const gap  = 12;
  const cW   = (W - PAD * 2 - gap * 2) / 3;
  const cH   = SUMMARY_H - 8;

  const cards = [
    { label: labels.totalSent,     value: fmtCOP(totalSent),     color: EXPENSE,   icon: '↑' },
    { label: labels.totalReceived, value: fmtCOP(totalReceived), color: SECONDARY, icon: '↓' },
    { label: labels.netBalance,    value: fmtCOP(net),           color: balColor,  icon: net === 0 ? '=' : net > 0 ? '↓' : '↑' },
  ];

  cards.forEach((card, i) => {
    const cx = PAD + i * (cW + gap);
    shadow(ctx, 8, 0.06);
    ctx.fillStyle = BG;
    rRect(ctx, cx, y, cW, cH, 12);
    ctx.fill();
    clearShadow(ctx);

    // Top accent strip
    ctx.fillStyle = card.color;
    ctx.fillRect(cx, y, cW, 3);
    // Round top of accent
    ctx.beginPath();
    ctx.moveTo(cx + 12, y);
    ctx.arcTo(cx,      y, cx,      y + 12, 12);
    ctx.lineTo(cx,     y + 3);
    ctx.lineTo(cx + cW - 12, y);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + cW - 12, y);
    ctx.arcTo(cx + cW, y, cx + cW, y + 12, 12);
    ctx.lineTo(cx + cW, y + 3);
    ctx.lineTo(cx + cW - 12, y);
    ctx.fill();

    ctx.fillStyle = TEXT_GRAY;
    ctx.font = `9px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(card.label.toUpperCase(), cx + 14, y + 16);

    ctx.fillStyle = card.color;
    ctx.font = `bold 14px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(card.value, cx + 14, y + cH / 2 + 8);

    // Mini icon circle
    ctx.fillStyle = `${card.color}18`;
    ctx.beginPath();
    ctx.arc(cx + cW - 22, y + cH / 2, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = card.color;
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.icon, cx + cW - 22, y + cH / 2 + 1);
  });

  y += SUMMARY_H + SEC_GAP - 8;

  // ── Section drawer ──────────────────────────────────────────────────────────
  const drawSection = (
    sLabel: string,
    txs: Transaction[],
    color: string,
    isExpense: boolean,
    dateCol: string,
    descCol: string,
    amtCol: string,
  ) => {
    // Section header bar
    ctx.fillStyle = BG;
    ctx.fillRect(PAD, y, W - PAD * 2, SEC_LABEL_H);
    // Left accent
    ctx.fillStyle = color;
    ctx.fillRect(PAD, y, 4, SEC_LABEL_H);

    ctx.fillStyle = color;
    ctx.font = `bold 12px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(sLabel, PAD + 16, y + SEC_LABEL_H / 2);

    // Item count badge
    if (txs.length > 0) {
      const countLabel = `${txs.length}`;
      const countW = ctx.measureText(countLabel).width + 16;
      ctx.fillStyle = `${color}18`;
      rRect(ctx, W - PAD - countW - 4, y + (SEC_LABEL_H - 22) / 2, countW + 4, 22, 11);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.font = `bold 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(countLabel, W - PAD - countW / 2 - 2, y + SEC_LABEL_H / 2);
    }
    y += SEC_LABEL_H;

    // Column headers
    ctx.fillStyle = `${color}E8`; // slight transparency
    ctx.fillRect(PAD, y, W - PAD * 2, COL_HDR_H);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 10px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(dateCol.toUpperCase(), PAD + 14, y + COL_HDR_H / 2);
    ctx.fillText(descCol.toUpperCase(), PAD + 100, y + COL_HDR_H / 2);
    ctx.textAlign = 'right';
    ctx.fillText(amtCol.toUpperCase(), W - PAD - 14, y + COL_HDR_H / 2);
    ctx.textAlign = 'left';
    y += COL_HDR_H;

    if (txs.length === 0) {
      ctx.fillStyle = SURFACE;
      ctx.fillRect(PAD, y, W - PAD * 2, ROW_H);
      ctx.fillStyle = TEXT_GRAY;
      ctx.font = `12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels.noTransactions, W / 2, y + ROW_H / 2);
      ctx.textAlign = 'left';
      y += ROW_H;
    } else {
      txs.forEach((tx, idx) => {
        const rowBg = idx % 2 === 0 ? BG : SURFACE;
        ctx.fillStyle = rowBg;
        ctx.fillRect(PAD, y, W - PAD * 2, ROW_H);

        // Date
        ctx.fillStyle = TEXT_GRAY;
        ctx.font = `10px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(fmtDate(tx.date), PAD + 14, y + ROW_H / 2);

        // Description
        ctx.fillStyle = TEXT_DARK;
        ctx.font = `13px ${FONT}`;
        const maxDescW = W - PAD * 2 - 100 - 130 - 28;
        ctx.fillText(clipText(ctx, tx.description, maxDescW), PAD + 100, y + ROW_H / 2);

        // Amount pill
        const amtText = `${isExpense ? '−' : '+'}${fmtCOP(tx.amount)}`;
        const amtW = ctx.measureText(amtText).width;
        ctx.fillStyle = `${color}14`;
        rRect(ctx, W - PAD - amtW - 24, y + (ROW_H - 24) / 2, amtW + 24, 24, 12);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.font = `bold 11px ${FONT}`;
        ctx.textAlign = 'right';
        ctx.fillText(amtText, W - PAD - 12, y + ROW_H / 2);
        ctx.textAlign = 'left';

        // Row divider
        ctx.strokeStyle = BORDER;
        ctx.lineWidth   = 0.5;
        ctx.beginPath();
        ctx.moveTo(PAD + 14, y + ROW_H);
        ctx.lineTo(W - PAD - 14, y + ROW_H);
        ctx.stroke();

        y += ROW_H;
      });
    }

    // Bottom border of section
    ctx.strokeStyle = BORDER;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();

    y += SEC_GAP;
  };

  drawSection(labels.sentSection,     data.sentToFriend,      EXPENSE,   true,  labels.dateCol, labels.descCol, labels.amountCol);
  drawSection(labels.receivedSection, data.receivedFromFriend, SECONDARY, false, labels.dateCol, labels.descCol, labels.amountCol);

  // ── Footer ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = BG;
  ctx.fillRect(0, H - FOOTER_H, W, FOOTER_H);
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, H - FOOTER_H);
  ctx.lineTo(W - PAD, H - FOOTER_H);
  ctx.stroke();

  // Footer logo or dot
  const FOOT_LOGO = 20;
  const footMidY  = H - FOOTER_H / 2;
  if (logoImg) {
    ctx.drawImage(logoImg, PAD, footMidY - FOOT_LOGO / 2, FOOT_LOGO, FOOT_LOGO);
  } else {
    ctx.fillStyle = PRIMARY;
    ctx.beginPath();
    ctx.arc(PAD + 4, footMidY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `10px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(labels.footer, PAD + (logoImg ? FOOT_LOGO + 8 : 12), footMidY);

  ctx.fillStyle = TEXT_GRAY;
  ctx.textAlign = 'right';
  ctx.fillText(labels.generatedOn, W - PAD, H - FOOTER_H / 2);

  // ── Export ──────────────────────────────────────────────────────────────────
  return new Promise<FriendReportImageResult>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve({ blob, width: W, height: H });
      else reject(new Error('canvas.toBlob failed'));
    }, 'image/png');
  });
}
