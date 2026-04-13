// utils/generateFriendReportPDF.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction } from '../types/transaction';

export interface FriendReportData {
  myName: string;
  friendName: string;
  month: number;   // 0-indexed
  year: number;
  sentToFriend: Transaction[];
  receivedFromFriend: Transaction[];
  logoUri?: string;
}

export interface FriendReportLabels {
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
}

// Paleta fija — siempre modo claro
const C = {
  primary:   [0, 172, 193] as [number, number, number],
  secondary: [0, 137, 123] as [number, number, number],
  expense:   [229, 57, 53] as [number, number, number],
  textDark:  [26, 26, 46]  as [number, number, number],
  textGray:  [107, 114, 128] as [number, number, number],
  surface:   [248, 250, 251] as [number, number, number],
  white:     [255, 255, 255] as [number, number, number],
};

function formatCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Math.abs(n));
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

async function fetchImageBase64(uri: string): Promise<string | null> {
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateFriendReportPDF(
  data: FriendReportData,
  labels: FriendReportLabels,
): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;

  // Load logo (best-effort)
  const logoBase64 = data.logoUri ? await fetchImageBase64(data.logoUri) : null;

  // ── HEADER BAND ──────────────────────────────────────────────────────────
  doc.setFillColor(C.primary[0], C.primary[1], C.primary[2]);
  doc.rect(0, 0, pageW, 40, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(C.white[0], C.white[1], C.white[2]);
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 6, 14, 14);
    doc.text('SPENDIA', margin + 18, 17);
  } else {
    doc.text('SPENDIA', margin, 17);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(labels.title, pageW - margin, 17, { align: 'right' });

  doc.setFontSize(8.5);
  doc.text(data.myName, margin, 28);
  doc.text(labels.generatedOn, pageW - margin, 28, { align: 'right' });
  doc.text(labels.period, margin, 35);

  // ── SUMMARY BOX ──────────────────────────────────────────────────────────
  let y = 50;
  const gap = 4;
  const cardW = (contentW - gap * 2) / 3;

  const totalSent = data.sentToFriend.reduce((s, t) => s + t.amount, 0);
  const totalReceived = data.receivedFromFriend.reduce((s, t) => s + t.amount, 0);
  const net = totalReceived - totalSent; // positivo = me deben, negativo = les debo

  const summaryCards = [
    { label: labels.totalSent,     value: formatCOP(totalSent),     color: C.expense },
    { label: labels.totalReceived, value: formatCOP(totalReceived), color: C.secondary },
    {
      label: labels.netBalance,
      value: formatCOP(net),
      color: net >= 0 ? C.secondary : C.expense,
    },
  ];

  summaryCards.forEach((card, i) => {
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

  // Net balance label (iOwe / theyOwe)
  const balanceLabel = net >= 0 ? labels.theyOwe : labels.iOwe;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(net >= 0 ? C.secondary[0] : C.expense[0], net >= 0 ? C.secondary[1] : C.expense[1], net >= 0 ? C.secondary[2] : C.expense[2]);
  doc.text(balanceLabel, margin + 2 * (cardW + gap) + cardW / 2, y + 27, { align: 'center' });

  y += 36;

  // ── SECCIÓN ENVIADO ───────────────────────────────────────────────────────
  const drawSectionHeader = (label: string, yPos: number, color: [number, number, number]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(label, margin, yPos);
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, yPos + 1.5, pageW - margin, yPos + 1.5);
  };

  const drawFooter = (pageNumber: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(C.textGray[0], C.textGray[1], C.textGray[2]);
    doc.text(labels.footer, pageW / 2, pageH - 7, { align: 'center', maxWidth: contentW });
    doc.text(`Pág. ${pageNumber}`, pageW - margin, pageH - 7, { align: 'right' });
  };

  drawSectionHeader(labels.sentSection, y, C.expense);
  y += 6;

  if (data.sentToFriend.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(C.textGray[0], C.textGray[1], C.textGray[2]);
    doc.text(labels.noTransactions, margin, y + 6);
    y += 14;
  } else {
    autoTable(doc, {
      startY: y,
      head: [[labels.dateCol, labels.descCol, labels.amountCol]],
      body: data.sentToFriend.map((t) => [
        formatShortDate(t.date),
        t.description,
        `−${formatCOP(t.amount)}`,
      ]),
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2.5,
        textColor: C.textDark,
        overflow: 'ellipsize',
      },
      headStyles: {
        fillColor: C.expense,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: C.surface },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 120 },
        2: { cellWidth: 36, halign: 'right' },
      },
      margin: { left: margin, right: margin },
      didDrawPage: (hookData: any) => {
        drawFooter(hookData.pageNumber);
      },
    });
    y = ((doc as any).lastAutoTable?.finalY ?? y) + 12;
  }

  // ── SECCIÓN RECIBIDO ──────────────────────────────────────────────────────
  if (y > pageH - 60) {
    doc.addPage();
    y = 20;
  }

  drawSectionHeader(labels.receivedSection, y, C.secondary);
  y += 6;

  if (data.receivedFromFriend.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(C.textGray[0], C.textGray[1], C.textGray[2]);
    doc.text(labels.noTransactions, margin, y + 6);
    y += 14;
  } else {
    autoTable(doc, {
      startY: y,
      head: [[labels.dateCol, labels.descCol, labels.amountCol]],
      body: data.receivedFromFriend.map((t) => [
        formatShortDate(t.date),
        t.description,
        `+${formatCOP(t.amount)}`,
      ]),
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2.5,
        textColor: C.textDark,
        overflow: 'ellipsize',
      },
      headStyles: {
        fillColor: C.secondary,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: C.surface },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 120 },
        2: { cellWidth: 36, halign: 'right' },
      },
      margin: { left: margin, right: margin },
      didDrawPage: (hookData: any) => {
        drawFooter(hookData.pageNumber);
      },
    });
  }

  // Footer on last page (if no autoTable drew it)
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(p);
  }

  return doc.output('blob') as Blob;
}
