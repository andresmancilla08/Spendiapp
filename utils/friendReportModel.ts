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
import { effectiveAmount, installmentPortion } from './sharedCalc';

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

const pctOf = (tx: Transaction, uid: string): number | undefined =>
  tx.sharedParticipants?.find((p) => p.uid === uid)?.percentage;

/**
 * Lo que le corresponde a `friendUid` de un gasto compartido que pagué yo.
 *
 * Ojo con las cuotas: `useSharedTransactions` NO guarda el total del grupo en mi
 * documento, guarda MI cuota ya amortizada sobre mi porcentaje. Aplicarle el
 * porcentaje del amigo daría la mitad de la mitad —en un 50/50 de un millón a
 * diez cuotas, 25.000 en vez de 50.000—, así que hay que reescalar por el mío.
 */
function friendPortion(tx: Transaction, friendUid: string, myUid: string): number {
  if (isFullClaim(tx)) return tx.amount;
  const friendPct = pctOf(tx, friendUid);
  // Sin porcentaje del amigo no hay nada que calcular: `sharedAmount` es la parte
  // del DUEÑO del documento, publicarla como deuda ajena sería inventarse una cifra.
  if (friendPct == null) return 0;

  if (tx.isInstallment) {
    // Mi porcentaje puede faltar en el doc; se deduce del resto de participantes.
    const others = (tx.sharedParticipants ?? [])
      .filter((p) => p.uid !== myUid)
      .reduce((acc, p) => acc + p.percentage, 0);
    const myPct = pctOf(tx, myUid) ?? (others > 0 && others < 100 ? 100 - others : undefined);
    // Si voy al 0% mis cuotas son de cero y no escalan: `installmentPortion` reconstruye
    // la del amigo desde el total del grupo guardado en el doc.
    return installmentPortion(tx, friendPct, myPct);
  }
  return Math.round((tx.amount * friendPct) / 100);
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

  // La otra persona pagó: lo que aparece aquí es MI parte. `effectiveAmount` ya
  // sabe que en cuotas manda `amount` y en el resto `sharedAmount` (su gemelo
  // redondeado por división plana introduce error en la última cuota).
  for (const tx of input.sharedIOwe) {
    const participants = tx.sharedParticipants?.length;
    const myPart = isFullClaim(tx) ? tx.amount : effectiveAmount(tx);
    // Al 0% el gasto se comparte solo como trazabilidad —queda en el historial y en la
    // ficha del movimiento— pero entre los dos no hay dinero: fuera del saldo.
    if (myPart === 0) continue;
    entries.push({
      id: tx.id, date: tx.date, description: tx.description,
      amount: myPart, side: 'them', kind: 'shared_i_owe', category: tx.category,
      // El porcentaje se lee del reparto guardado, no se deduce dividiendo
      // importes: con cuotas esa división daba ~100% en todas las filas.
      percentage: isFullClaim(tx) ? undefined : pctOf(tx, input.myUid),
      participants,
    });
  }

  // Pagué yo: lo que aparece es la parte de la otra persona.
  for (const tx of input.sharedTheyOwe) {
    const participants = tx.sharedParticipants?.length;
    const theirPart = friendPortion(tx, friendUid, input.myUid);
    if (theirPart === 0) continue; // su 0%: se lo comparto para que lo vea, no porque me deba
    entries.push({
      id: tx.id, date: tx.date, description: tx.description,
      amount: theirPart, side: 'me', kind: 'shared_they_owe', category: tx.category,
      percentage: isFullClaim(tx) ? undefined : pctOf(tx, friendUid),
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
