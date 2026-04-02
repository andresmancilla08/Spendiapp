export type CategoryType = 'expense' | 'income' | 'both';

export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string;
  type: CategoryType;
  isDefault: boolean;
  createdAt: Date;
}
