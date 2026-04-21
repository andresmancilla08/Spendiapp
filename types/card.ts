export type CardType = 'debit' | 'credit';

export interface Card {
  id: string;
  userId: string;
  bankId: string;
  bankName: string;
  type: CardType;
  nickname: string;
  isDefault: boolean;
  createdAt: Date;
}
