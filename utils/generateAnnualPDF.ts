// utils/generateAnnualPDF.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportData } from '../hooks/useReportGenerator';

export interface PdfLabels {
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
  amountCol: string;
  footer: string;
}

// ── Palette ────────────────────────────────────────────────────────────────
type RGB = [number, number, number];

const C = {
  cyanDark:  [0,   104, 120]  as RGB,
  cyanMid:   [0,   172, 193]  as RGB,
  cyanLight: [38,  198, 218]  as RGB,
  green:     [0,   137, 123]  as RGB,
  red:       [239, 68,  68]   as RGB,
  emerald:   [16,  185, 129]  as RGB,
  textDark:  [15,  23,  42]   as RGB,
  textMid:   [71,  85,  105]  as RGB,
  textGray:  [148, 163, 184]  as RGB,
  surface:   [248, 250, 252]  as RGB,
  surface2:  [241, 245, 249]  as RGB,
  border:    [226, 232, 240]  as RGB,
  white:     [255, 255, 255]  as RGB,
};

// ── Helpers ────────────────────────────────────────────────────────────────
function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function fill(doc: jsPDF, c: RGB)   { doc.setFillColor(c[0], c[1], c[2]); }
function stroke(doc: jsPDF, c: RGB) { doc.setDrawColor(c[0], c[1], c[2]); }
function text(doc: jsPDF, c: RGB)   { doc.setTextColor(c[0], c[1], c[2]); }

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Simulate vertical gradient with N stacked rects */
function vGradRect(doc: jsPDF, x: number, y: number, w: number, h: number, c1: RGB, c2: RGB, steps = 12) {
  const sh = h / steps;
  for (let i = 0; i < steps; i++) {
    const c = lerpRGB(c1, c2, i / (steps - 1));
    doc.setFillColor(c[0], c[1], c[2]);
    doc.rect(x, y + i * sh, w, sh + 0.3, 'F');
  }
}

/** Filled rounded rect */
function rRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, c: RGB) {
  fill(doc, c);
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

/** Stroked rounded rect */
function rRectS(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, c: RGB, lw = 0.3) {
  stroke(doc, c);
  doc.setLineWidth(lw);
  doc.roundedRect(x, y, w, h, r, r, 'S');
}

/** Run fn with a given opacity; silently skip if GState not available */
function withOpacity(doc: jsPDF, opacity: number, fn: () => void) {
  try {
    (doc as any).setGState(new (doc as any).GState({ opacity }));
    fn();
    (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));
  } catch { /* decorative — skip if unsupported */ }
}

/** Icon circle (simulated radial gradient — two nested circles + icon) */
function iconCircle(doc: jsPDF, cx: number, cy: number, r: number, color: RGB, icon: string, iconFs = 8) {
  fill(doc, lerpRGB(C.white, color, 0.22));
  doc.circle(cx, cy, r, 'F');
  stroke(doc, lerpRGB(C.white, color, 0.38));
  doc.setLineWidth(0.4);
  doc.circle(cx, cy, r, 'S');
  fill(doc, lerpRGB(C.white, color, 0.38));
  doc.circle(cx, cy, r * 0.62, 'F');
  text(doc, color);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(iconFs);
  doc.text(icon, cx, cy + iconFs * 0.34, { align: 'center' });
}

// ── Section header ─────────────────────────────────────────────────────────
function drawSectionHeader(
  doc: jsPDF,
  y: number, pageW: number, margin: number,
  label: string,
  color: RGB,
  subColor: RGB,
): number {
  const cw = pageW - margin * 2;
  const bh = 13;

  vGradRect(doc, margin, y, cw, bh, color, subColor, 8);

  // Shimmer highlight (decorative white rect)
  withOpacity(doc, 0.09, () => {
    fill(doc, C.white);
    doc.rect(margin + cw * 0.25, y, cw * 0.30, bh, 'F');
  });

  // Icon circle (white on colored bg)
  const icX = margin + 10;
  const icY = y + bh / 2;
  withOpacity(doc, 0.22, () => {
    fill(doc, C.white);
    doc.circle(icX, icY, 4, 'F');
  });
  text(doc, C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text('▶', icX, icY + 2, { align: 'center' });

  // Title
  text(doc, C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(label, margin + 20, y + bh / 2 + 3.2);

  return y + bh + 2;
}

// ── Balance hero card ───────────────────────────────────────────────────────
function drawBalanceHero(
  doc: jsPDF,
  y: number, pageW: number, margin: number,
  balance: number,
  balanceLabel: string,
): number {
  const cw       = pageW - margin * 2;
  const cardH    = 24;
  const balColor = balance >= 0 ? C.emerald : C.red;

  rRect(doc, margin, y, cw, cardH, 4, C.white);
  rRect(doc, margin, y, cw, cardH, 4, lerpRGB(C.white, balColor, 0.05));
  rRectS(doc, margin, y, cw, cardH, 4, lerpRGB(C.white, balColor, 0.20), 0.4);

  // Left accent bar
  vGradRect(doc, margin, y, 5, cardH, balColor, lerpRGB(balColor, C.white, 0.30), 6);
  fill(doc, balColor);
  doc.roundedRect(margin, y, 5, cardH, 3, 3, 'F');

  const tx = margin + 10;

  text(doc, C.textGray);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(balanceLabel.toUpperCase(), tx, y + 7);

  text(doc, balColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`${balance >= 0 ? '+' : '−'}${formatCOP(balance)}`, tx, y + 19);

  iconCircle(doc, margin + cw - 14, y + cardH / 2, 9, balColor, balance >= 0 ? '+' : '−', 8);

  return y + cardH + 6;
}

// ── Mini header for continuation pages ─────────────────────────────────────
function drawMiniHeader(doc: jsPDF, pageNum: number, title: string) {
  const pW  = doc.internal.pageSize.getWidth();
  const m   = 14;
  const mhH = 18;

  vGradRect(doc, 0, 0, pW, mhH, C.cyanDark, C.cyanMid, 6);

  text(doc, C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SPENDIA', m, mhH * 0.63);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  withOpacity(doc, 0.80, () => {
    text(doc, C.white);
    doc.text(`${title} · ${pageNum}`, pW - m, mhH * 0.63, { align: 'right' });
  });
}

// ── Footer bar ──────────────────────────────────────────────────────────────
function drawFooterBar(doc: jsPDF, pageNum: number, footer: string) {
  const pW = doc.internal.pageSize.getWidth();
  const pH = doc.internal.pageSize.getHeight();
  const m  = 14;

  fill(doc, C.surface2);
  doc.rect(0, pH - 12, pW, 12, 'F');
  stroke(doc, C.border);
  doc.setLineWidth(0.3);
  doc.line(m, pH - 12, pW - m, pH - 12);

  text(doc, C.textGray);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(footer, m, pH - 4.5, { align: 'left', maxWidth: pW - m * 2 - 32 });

  // URL right of footer text
  doc.setFontSize(6);
  doc.text('spendiapp.vercel.app', pW - m - 12, pH - 4.5, { align: 'right' });

  // Page pill
  rRect(doc, pW - m - 10, pH - 10, 10, 7, 1.5, C.cyanMid);
  text(doc, C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text(`${pageNum}`, pW - m - 5, pH - 5.2, { align: 'center' });
}

// ── Main ────────────────────────────────────────────────────────────────────
export function generateAnnualPDF(data: ReportData, labels: PdfLabels): Blob {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();
  const margin = 14;
  const cW     = pageW - margin * 2;

  // ── HEADER ─────────────────────────────────────────────────────────────
  const HDR_H = 46;
  vGradRect(doc, 0, 0, pageW, HDR_H, C.cyanDark, C.cyanLight, 14);

  // Decorative circles (like friend report image)
  withOpacity(doc, 0.07, () => { fill(doc, C.white); doc.circle(pageW - 20, -18, 50, 'F'); });
  withOpacity(doc, 0.05, () => { fill(doc, C.white); doc.circle(pageW + 6, HDR_H * 0.65, 32, 'F'); });
  withOpacity(doc, 0.05, () => { fill(doc, C.white); doc.circle(-8, HDR_H + 10, 26, 'F'); });
  withOpacity(doc, 0.04, () => { fill(doc, C.white); doc.circle(pageW * 0.4, HDR_H * 1.1, 20, 'F'); });

  // Diagonal accent (white triangle top-right)
  try {
    fill(doc, C.white);
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.07 }));
    (doc as any).triangle(pageW * 0.55, 0, pageW, 0, pageW, HDR_H, 'F');
    (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));
  } catch { /* skip */ }

  // Shimmer overlay
  withOpacity(doc, 0.09, () => {
    fill(doc, C.white);
    doc.rect(pageW * 0.30, 0, pageW * 0.40, HDR_H, 'F');
  });

  // SPENDIA wordmark
  text(doc, C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('SPENDIA', margin, 17);

  // Extract title pill (top-right)
  const pillTxt  = labels.extractTitle;
  doc.setFontSize(8.5);
  const pillTxtW = doc.getTextWidth(pillTxt);
  const pillX    = pageW - margin - pillTxtW - 10;
  rRect(doc, pillX - 2, 8, pillTxtW + 12, 8, 2, C.white);
  text(doc, C.cyanDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(pillTxt, pillX + 4, 13.5);

  // Separator line
  try {
    doc.setDrawColor(255, 255, 255);
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.25 }));
    doc.setLineWidth(0.25);
    doc.line(margin, 21, pageW - margin, 21);
    (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));
  } catch {
    doc.setDrawColor(200, 235, 240);
    doc.setLineWidth(0.25);
    doc.line(margin, 21, pageW - margin, 21);
  }

  // User name
  text(doc, C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(data.userName, margin, 28);

  // Generated on (right-aligned)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(labels.generatedOn, pageW - margin, 28, { align: 'right' });

  // Year big number (decorative, right side)
  try {
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.12 }));
    text(doc, C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.text(String(data.year ?? new Date().getFullYear()), pageW - margin, 42, { align: 'right' });
    (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));
  } catch {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(100, 200, 215);
    doc.text(String(data.year ?? new Date().getFullYear()), pageW - margin, 42, { align: 'right' });
  }

  // ── BALANCE HERO CARD ───────────────────────────────────────────────────
  let y = HDR_H + 6;
  y = drawBalanceHero(doc, y, pageW, margin, data.balance, labels.balance);

  // ── SUMMARY CARDS ───────────────────────────────────────────────────────
  const gapC  = 4;
  const cardW = (cW - gapC * 2) / 3;
  const cardH = 34;
  const balColor = data.balance >= 0 ? C.emerald : C.red;

  const incomeCount  = data.transactions.filter(t => t.type === 'income').length;
  const expenseCount = data.transactions.filter(t => t.type === 'expense').length;

  const cards = [
    { label: labels.income,   value: formatCOP(data.totalIncome),   color: C.emerald, icon: '+', sub: `${incomeCount} mov.` },
    { label: labels.expenses, value: formatCOP(data.totalExpenses), color: C.red,     icon: '−', sub: `${expenseCount} mov.` },
    { label: labels.balance,  value: formatCOP(data.balance),       color: balColor,  icon: data.balance >= 0 ? '+' : '−', sub: `${data.transactions.length} mov.` },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + gapC);

    // Card bg + tint + border
    rRect(doc, x, y, cardW, cardH, 3, C.white);
    rRect(doc, x, y, cardW, cardH, 3, lerpRGB(C.white, card.color, 0.06));
    rRectS(doc, x, y, cardW, cardH, 3, lerpRGB(C.white, card.color, 0.22), 0.4);

    // Top colored gradient bar
    vGradRect(doc, x, y, cardW, 4, card.color, lerpRGB(card.color, C.white, 0.25), 3);
    fill(doc, card.color);
    doc.rect(x, y + 2, cardW, 2, 'F');

    // Label
    text(doc, C.textGray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(card.label.toUpperCase(), x + 9, y + 12);

    // Value
    text(doc, C.textDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(card.value, x + 9, y + 22);

    // Sub-label pill
    const subW = doc.getTextWidth(card.sub) + 8;
    rRect(doc, x + 8, y + 25.5, subW, 5.5, 2.5, lerpRGB(C.white, card.color, 0.14));
    text(doc, card.color);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.text(card.sub, x + 12, y + 29.5);

    // Icon circle (right side)
    iconCircle(doc, x + cardW - 9, y + cardH / 2, 5.5, card.color, card.icon, 8);
  });

  y += cardH + 10;

  // ── CATEGORÍAS ──────────────────────────────────────────────────────────
  y = drawSectionHeader(doc, y, pageW, margin, labels.byCategory, C.cyanMid, C.cyanDark);

  autoTable(doc, {
    startY: y,
    head: [[labels.categoryCol, labels.transactionsCol, labels.totalCol]],
    body: data.byCategory.map((c) => [
      c.name,
      String(c.count),
      `${c.type === 'expense' ? '−' : '+'}${formatCOP(c.total)}`,
    ]),
    theme: 'plain',
    styles: {
      font:        'helvetica',
      fontSize:    8,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      textColor:   C.textDark,
      lineColor:   C.border,
      lineWidth:   0.2,
    },
    headStyles: {
      fillColor:   C.cyanMid,
      textColor:   C.white,
      fontStyle:   'bold',
      fontSize:    8,
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
    },
    alternateRowStyles: { fillColor: C.surface },
    columnStyles: {
      0: { cellWidth: 86 },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 56, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin, top: 22, bottom: 16 },
    tableLineColor: C.border,
    tableLineWidth: 0.2,
    didParseCell: (h: any) => {
      if (h.section === 'body' && h.column.index === 2) {
        const v: string = h.cell.raw as string;
        if (v.startsWith('−')) h.cell.styles.textColor = C.red;
        else if (v.startsWith('+')) h.cell.styles.textColor = C.emerald;
      }
    },
    didDrawCell: (h: any) => {
      if (h.section === 'body') {
        const { x, y: cy, width, height } = h.cell;

        if (h.column.index === 0) {
          // Accent micro-bar left edge
          fill(doc, C.cyanMid);
          doc.rect(x, cy + height * 0.25, 2.5, height * 0.5, 'F');
        }

        if (h.column.index === 2) {
          const v: string = h.cell.raw as string;
          const pillColor = v.startsWith('−') ? C.red : C.emerald;
          // Amount pill background
          rRect(doc, x + 2, cy + 2, width - 4, height - 4, 2, lerpRGB(C.white, pillColor, 0.14));
          // Re-draw text on top of pill
          text(doc, pillColor);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          const txt = (h.cell.text as string[]).join('');
          doc.text(txt, x + width - 4, cy + height / 2 + 2.5, { align: 'right' });
        }
      }
    },
    didDrawPage: (h: any) => {
      if (h.pageNumber > 1) drawMiniHeader(doc, h.pageNumber, labels.byCategory);
      drawFooterBar(doc, h.pageNumber, labels.footer);
    },
  });

  y = ((doc as any).lastAutoTable?.finalY ?? y) + 10;

  if (y > pageH - 80) { doc.addPage(); y = 18; }

  // ── MOVIMIENTOS ─────────────────────────────────────────────────────────
  y = drawSectionHeader(doc, y, pageW, margin, labels.movementsTitle, C.cyanDark, [0, 80, 95] as RGB);

  autoTable(doc, {
    startY: y,
    head: [[labels.dateCol, labels.descriptionCol, labels.categoryCol, labels.amountCol]],
    body: data.transactions.map((t) => [
      formatShortDate(t.date),
      t.description,
      t.categoryName,
      `${t.type === 'expense' ? '−' : '+'}${formatCOP(t.amount)}`,
    ]),
    theme: 'plain',
    styles: {
      font:        'helvetica',
      fontSize:    7.5,
      cellPadding: { top: 2.8, bottom: 2.8, left: 2.5, right: 2.5 },
      textColor:   C.textDark,
      overflow:    'ellipsize',
      lineColor:   C.border,
      lineWidth:   0.15,
    },
    headStyles: {
      fillColor:   C.cyanDark,
      textColor:   C.white,
      fontStyle:   'bold',
      fontSize:    7.5,
      cellPadding: { top: 4, bottom: 4, left: 2.5, right: 2.5 },
    },
    alternateRowStyles: { fillColor: C.surface },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 72 },
      2: { cellWidth: 48 },
      3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin, top: 22, bottom: 16 },
    tableLineColor: C.border,
    tableLineWidth: 0.15,
    didParseCell: (h: any) => {
      if (h.section === 'body' && h.column.index === 3) {
        const v: string = h.cell.raw as string;
        if (v.startsWith('−')) h.cell.styles.textColor = C.red;
        else if (v.startsWith('+')) h.cell.styles.textColor = C.emerald;
      }
    },
    didDrawCell: (h: any) => {
      if (h.section === 'body') {
        const { x, y: cy, width, height } = h.cell;

        if (h.column.index === 0) {
          // Date chip background
          rRect(doc, x + 1.5, cy + 1.5, width - 3, height - 3, 2, lerpRGB(C.white, C.cyanMid, 0.14));
          // Accent micro-bar (left edge of row)
          fill(doc, C.cyanDark);
          doc.rect(x, cy + height * 0.25, 2, height * 0.5, 'F');
          // Re-draw date text inside chip
          text(doc, C.textMid);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          const dateText = (h.cell.text as string[]).join('');
          doc.text(dateText, x + width / 2, cy + height / 2 + 2.2, { align: 'center' });
        }

        if (h.column.index === 3) {
          const v: string = h.cell.raw as string;
          const pillColor = v.startsWith('−') ? C.red : C.emerald;
          // Amount pill background
          rRect(doc, x + 1.5, cy + 2, width - 3, height - 4, 2, lerpRGB(C.white, pillColor, 0.14));
          // Re-draw text on top
          text(doc, pillColor);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          const txt = (h.cell.text as string[]).join('');
          doc.text(txt, x + width - 3, cy + height / 2 + 2.2, { align: 'right' });
        }
      }
    },
    didDrawPage: (h: any) => {
      if (h.pageNumber > 1) drawMiniHeader(doc, h.pageNumber, labels.movementsTitle);
      drawFooterBar(doc, h.pageNumber, labels.footer);
    },
  });

  // Footer on all pages (covers page 1 + any pages not hit by didDrawPage)
  const total = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    drawFooterBar(doc, p, labels.footer);
  }

  return doc.output('blob') as Blob;
}
