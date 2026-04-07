export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  limitAmount: number;
  month: number;
  year: number;
  createdAt: Date;
}
