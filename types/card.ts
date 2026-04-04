export type CardType = 'debit' | 'credit';

export interface Card {
  id: string;
  userId: string;
  bankId: string;
  bankName: string;
  type: CardType;
  lastFour: string; // exactamente 4 dígitos
  createdAt: Date;
}
