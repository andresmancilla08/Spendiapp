export type CardType = 'debit' | 'credit';

/** De dónde salió la tasa que guarda la tarjeta. Cambia lo que la UI puede prometer. */
export type TeaSource =
  /** La escribió el usuario en Tarjetas. */
  | 'manual'
  /** Se aprendió de una compra a cuotas registrada con esa tarjeta. */
  | 'learned';

export interface Card {
  id: string;
  userId: string;
  bankId: string;
  bankName: string;
  type: CardType;
  nickname: string;
  isDefault: boolean;
  createdAt: Date;
  cutoffDay?: number; // Día de corte de tarjeta crédito (1-28)
  /**
   * Tasa Efectiva Anual de ESTA tarjeta, en % (ej: 25.52).
   *
   * No es la tasa de usura ni una referencia: es la que el usuario declaró o la
   * que se aprendió de una compra suya. Nunca se rellena con un valor por
   * defecto — sin dato, el campo no existe y la UI dice que no lo sabe. Poner
   * ahí el techo legal haría que la app afirmara «tu banco te cobra 25,52 %»
   * sobre una cifra que no tiene nada que ver con su banco.
   */
  tea?: number;
  /** Cuándo se fijó `tea`. Sin esto no se puede decir si el dato sigue vigente. */
  teaUpdatedAt?: Date;
  teaSource?: TeaSource;
}

/** A partir de aquí una tasa guardada se considera vieja y la UI lo advierte. */
export const TEA_STALE_MONTHS = 6;

/** Meses transcurridos desde que se fijó la tasa. null si nunca se fijó. */
export function teaAgeInMonths(card: Pick<Card, 'tea' | 'teaUpdatedAt'>, now = new Date()): number | null {
  if (card.tea == null || !card.teaUpdatedAt) return null;
  const d = card.teaUpdatedAt;
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

/** ¿La tasa guardada lleva demasiado tiempo sin revisarse? */
export function isTeaStale(card: Pick<Card, 'tea' | 'teaUpdatedAt'>, now = new Date()): boolean {
  const age = teaAgeInMonths(card, now);
  return age != null && age >= TEA_STALE_MONTHS;
}
