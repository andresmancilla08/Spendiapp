// utils/generateAnnualPDF.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportData } from '../hooks/useReportGenerator';

export interface PdfLabels {
  extractTitle: string;       // e.g. "Extracto Anual 2025"
  generatedOn: string;        // e.g. "Generado el 10 de abril de 2026"
  income: string;             // "Ingresos"
  expenses: string;           // "Gastos"
  balance: string;            // "Balance"
  byCategory: string;         // "DESGLOSE POR CATEGORÍA"
  categoryCol: string;        // "Categoría"
  transactionsCol: string;    // "Transacciones"
  totalCol: string;           // "Total"
  movementsTitle: string;     // "MOVIMIENTOS 2025"
  dateCol: string;            // "Fecha"
  descriptionCol: string;     // "Descripción"
  amountCol: string;          // "Monto"
  footer: string;             // footer text
}

// Paleta (siempre modo claro en PDF)
const C = {
  primary:   [0, 172, 193] as [number, number, number],
  income:    [0, 137, 123] as [number, number, number],
  expense:   [229, 57, 53] as [number, number, number],
  textDark:  [26, 26, 46]  as [number, number, number],
  textGray:  [107, 114, 128] as [number, number, number],
  surface:   [248, 250, 251] as [number, number, number],
  white:     [255, 255, 255] as [number, number, number],
};

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
  });
}

export function generateAnnualPDF(data: ReportData, labels: PdfLabels): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;

  // ── HEADER BAND ──────────────────────────────────────────────────────────
  doc.setFillColor(C.primary[0], C.primary[1], C.primary[2]);
  doc.rect(0, 0, pageW, 40, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(C.white[0], C.white[1], C.white[2]);
  doc.text('SPENDIA', margin, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(labels.extractTitle, margin, 27);

  doc.setFontSize(8.5);
  doc.text(data.userName, margin, 35);
  doc.text(labels.generatedOn, pageW - margin, 35, {
    align: 'right',
  });

  // ── SUMMARY CARDS ────────────────────────────────────────────────────────
  let y = 50;
  const gap = 4;
  const cardW = (contentW - gap * 2) / 3;

  const cards = [
    { label: labels.income,    value: formatCOP(data.totalIncome),    color: C.income },
    { label: labels.expenses,  value: formatCOP(data.totalExpenses),  color: C.expense },
    {
      label: labels.balance,
      value: formatCOP(data.balance),
      color: data.balance >= 0 ? C.income : C.expense,
    },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + gap);
    doc.setFillColor(C.surface[0], C.surface[1], C.surface[2]);
    doc.roundedRect(x, y, cardW, 25, 2, 2, 'F');
    doc.setFillColor(card.color[0], card.color[1], card.color[2]);
    doc.rect(x, y, cardW, 3, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(C.textGray[0], C.textGray[1], C.textGray[2]);
    doc.text(card.label, x + cardW / 2, y + 10, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(C.textDark[0], C.textDark[1], C.textDark[2]);
    doc.text(card.value, x + cardW / 2, y + 19, { align: 'center' });
  });

  y += 33;

  // ── CATEGORÍAS ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(C.primary[0], C.primary[1], C.primary[2]);
  doc.text(labels.byCategory, margin, y);
  doc.setDrawColor(C.primary[0], C.primary[1], C.primary[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [[labels.categoryCol, labels.transactionsCol, labels.totalCol]],
    body: data.byCategory.map((c) => [
      c.name,
      String(c.count),
      `${c.type === 'expense' ? '-' : '+'}${formatCOP(c.total)}`,
    ]),
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      textColor: C.textDark,
    },
    headStyles: {
      fillColor: C.primary,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: C.surface },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 50, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  y = ((doc as any).lastAutoTable?.finalY ?? y) + 12;

  if (y > pageH - 70) {
    doc.addPage();
    y = 20;
  }

  // ── MOVIMIENTOS ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(C.primary[0], C.primary[1], C.primary[2]);
  doc.text(labels.movementsTitle, margin, y);
  doc.setDrawColor(C.primary[0], C.primary[1], C.primary[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [[labels.dateCol, labels.descriptionCol, labels.categoryCol, labels.amountCol]],
    body: data.transactions.map((t) => [
      formatShortDate(t.date),
      t.description,
      t.categoryName,
      `${t.type === 'expense' ? '-' : '+'}${formatCOP(t.amount)}`,
    ]),
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: C.textDark,
      overflow: 'ellipsize',
    },
    headStyles: {
      fillColor: C.primary,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: C.surface },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 72 },
      2: { cellWidth: 48 },
      3: { cellWidth: 38, halign: 'right' },
    },
    margin: { left: margin, right: margin },
    didDrawPage: (hookData: any) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(C.textGray[0], C.textGray[1], C.textGray[2]);
      doc.text(
        labels.footer,
        pageW / 2,
        pageH - 7,
        { align: 'center', maxWidth: contentW },
      );
      doc.text(
        `Pág. ${hookData.pageNumber}`,
        pageW - margin,
        pageH - 7,
        { align: 'right' },
      );
    },
  });

  return doc.output('blob') as Blob;
}
