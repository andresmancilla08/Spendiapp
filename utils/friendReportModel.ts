/**
 * Modelo del reporte entre dos amigos — SIN React y SIN Canvas.
 *
 * Existe para que la pantalla (`app/friend-report.tsx`) y el generador de imagen
 * (`utils/generateFriendReportImage.ts`) partan del MISMO cálculo. Antes cada uno
 * repetía la aritmética del reparto por porcentajes y la clasificación de los
 * movimientos, y bastaba tocar uno para que el documento dijera algo distinto de
 * lo que el usuario acababa de ver en pantalla.
 *
 * Regla del signo: `side` dice a quién favorece el movimiento.
 *   'me'    → suma a lo que me deben (recibí, o pagué yo algo compartido)
 *   'them'  → suma a lo que debo (envié, o pagó la otra persona)
 * `net > 0` significa que la otra persona me debe.
 */
import type { Transaction } from '../types/transaction';

export type EntryKind = 'sent' | 'received' | 'shared_i_owe' | 'shared_they_owe';

export interface FriendReportEntry {
  id: string;
  date: Date;
  description: string;
  /** Lo que vale este movimiento para el saldo entre los dos, siempre positivo. */
  amount: number;
  side: 'me' | 'them';
  kind: EntryKind;
  /** Categoría de la transacción, para el detalle. */
  category?: string;
  /** Porcentaje que le tocó a la otra persona en un gasto compartido. */
  percentage?: number;
  /** Cuánta gente participó en el gasto (2 = solo ustedes dos). */
  participants?: number;
}

export interface FriendReportTotals {
  sent: number;
  received: number;
  sharedIOwe: number;
  sharedTheyOwe: number;
  /** Todo lo que juega a mi favor: recibido + compartidos que ellos deben. */
  mine: number;
  /** Todo lo que juega en mi contra: enviado + compartidos que yo debo. */
  theirs: number;
}

export interface FriendReportModel {
  myName: string;
  friendName: string;
  friendUserName?: string;
  month: number;
  year: number;
  entries: FriendReportEntry[];
  totals: FriendReportTotals;
  /** > 0 → la otra persona me debe. < 0 → yo le debo. 0 → saldados. */
  net: number;
  /** Movimientos que puso cada uno, para el dato social del pie. */
  paidByMe: number;
  movementCount: number;
  /** Volumen total movido entre los dos (sin signo). */
  volume: number;
}

export interface BuildFriendReportInput {
  myName: string;
  myUid: string;
  friendName: string;
  friendUserName?: string;
  friendUid: string;
  month: number;
  year: number;
  sentToFriend: Transaction[];
  receivedFromFriend: Transaction[];
  sharedIOwe: Transaction[];
  sharedTheyOwe: Transaction[];
}

/**
 * Un `income_claim` (o cualquier transacción de tipo ingreso) se reclama entera:
 * nunca se divide por el porcentaje. Es la regla que ya aplicaban por separado la
 * pantalla y el generador, y la causa de la mitad de sus discrepancias.
 */
function isFullClaim(tx: Transaction): boolean {
  return tx.sharedType === 'income_claim' || tx.type === 'income';
}

/** Lo que le corresponde a `friendUid` de un gasto compartido. */
function friendPortion(tx: Transaction, friendUid: string): number {
  if (isFullClaim(tx)) return tx.amount;
  const participant = tx.sharedParticipants?.find((p) => p.uid === friendUid);
  if (participant) return Math.round((tx.amount * participant.percentage) / 100);
  return tx.sharedAmount ?? 0;
}

export function buildFriendReport(input: BuildFriendReportInput): FriendReportModel {
  const { friendUid } = input;
  const entries: FriendReportEntry[] = [];

  for (const tx of input.sentToFriend) {
    entries.push({
      id: tx.id, date: tx.date, description: tx.description,
      amount: tx.amount, side: 'them', kind: 'sent', category: tx.category,
    });
  }

  for (const tx of input.receivedFromFriend) {
    entries.push({
      id: tx.id, date: tx.date, description: tx.description,
      amount: tx.amount, side: 'me', kind: 'received', category: tx.category,
    });
  }

  // La otra persona pagó: lo que aparece aquí es MI parte.
  for (const tx of input.sharedIOwe) {
    const participants = tx.sharedParticipants?.length;
    const myPart = isFullClaim(tx) ? tx.amount : (tx.sharedAmount ?? tx.amount);
    entries.push({
      id: tx.id, date: tx.date, description: tx.description,
      amount: myPart, side: 'them', kind: 'shared_i_owe', category: tx.category,
      percentage: participants && !isFullClaim(tx) && tx.amount > 0
        ? Math.round((myPart / tx.amount) * 100)
        : undefined,
      participants,
    });
  }

  // Pagué yo: lo que aparece es la parte de la otra persona.
  for (const tx of input.sharedTheyOwe) {
    const participants = tx.sharedParticipants?.length;
    const theirPart = friendPortion(tx, friendUid);
    entries.push({
      id: tx.id, date: tx.date, description: tx.description,
      amount: theirPart, side: 'me', kind: 'shared_they_owe', category: tx.category,
      percentage: !isFullClaim(tx)
        ? tx.sharedParticipants?.find((p) => p.uid === friendUid)?.percentage
        : undefined,
      participants,
    });
  }

  entries.sort((a, b) => b.date.getTime() - a.date.getTime());

  const sum = (kind: EntryKind) =>
    entries.filter((e) => e.kind === kind).reduce((acc, e) => acc + e.amount, 0);

  const totals: FriendReportTotals = {
    sent: sum('sent'),
    received: sum('received'),
    sharedIOwe: sum('shared_i_owe'),
    sharedTheyOwe: sum('shared_they_owe'),
    mine: 0,
    theirs: 0,
  };
  totals.mine = totals.received + totals.sharedTheyOwe;
  totals.theirs = totals.sent + totals.sharedIOwe;

  // Quién puso el dinero: los que pagué yo son los que la otra persona me debe
  // más los que le envié.
  const paidByMe = entries.filter(
    (e) => e.kind === 'shared_they_owe' || e.kind === 'sent',
  ).length;

  return {
    myName: input.myName,
    friendName: input.friendName,
    friendUserName: input.friendUserName,
    month: input.month,
    year: input.year,
    entries,
    totals,
    net: totals.mine - totals.theirs,
    paidByMe,
    movementCount: entries.length,
    volume: entries.reduce((acc, e) => acc + e.amount, 0),
  };
}

/** Iniciales para los avatares, sin depender de que haya apellido. */
export function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '·';
}

/**
 * Cuánto se inclina la balanza, de -1 (todo a mi favor) a 1 (todo a favor de la
 * otra persona). Se usa igual en la pantalla y en el documento para que el ángulo
 * sea el mismo en los dos sitios.
 */
export function scaleTilt(totals: FriendReportTotals): number {
  const total = totals.mine + totals.theirs;
  if (total <= 0) return 0;
  return (totals.theirs - totals.mine) / total;
}
