// hooks/useReportGenerator.ts
import {
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Category } from '../types/category';
import { resolveCategory } from '../constants/categories';

export interface CategorySummary {
  categoryId: string;
  name: string;
  count: number;
  total: number;
  type: 'expense' | 'income';
}

export interface ReportTransaction {
  date: Date;
  description: string;
  categoryName: string;
  amount: number;
  type: 'expense' | 'income';
}

export interface ReportData {
  userName: string;
  year: number;
  generatedAt: Date;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  byCategory: CategorySummary[];
  transactions: ReportTransaction[];
}

/** Devuelve la lista de años disponibles (más reciente primero) basada en la
 *  transacción más antigua del usuario. */
export async function getAvailableYears(userId: string): Promise<number[]> {
  const snap = await getDocs(
    query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('date', 'asc'),
      limit(1),
    ),
  );

  const currentYear = new Date().getFullYear();
  const earliestYear = snap.empty
    ? currentYear - 1
    : (snap.docs[0].data().date as Timestamp).toDate().getFullYear();

  const years: number[] = [];
  for (let y = currentYear; y >= earliestYear; y--) {
    years.push(y);
  }
  return years;
}

/** Genera los datos del reporte para el año indicado.
 *  Incluye transacciones reales + copias virtuales de fijos activos en cada mes. */
export async function generateReportData(
  userId: string,
  userName: string,
  year: number,
  customCategories: Category[],
): Promise<ReportData> {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  // Query 1: todas las transacciones con date en el año (reales + fijas originadas este año)
  const yearSnap = await getDocs(
    query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(startOfYear)),
      where('date', '<=', Timestamp.fromDate(endOfYear)),
      orderBy('date', 'asc'),
    ),
  );

  // Query 2: todas las fijas (sin filtro de fecha) para generar copias virtuales
  const fixedSnap = await getDocs(
    query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('isFixed', '==', true),
    ),
  );

  interface RawTx {
    date: Date;
    description: string;
    amount: number;
    type: 'expense' | 'income';
    category: string;
    isShared: boolean;
    sharedAmount?: number;
    isInstallment: boolean;
    installmentNumber?: number;
    installmentTotal?: number;
  }

  const all: RawTx[] = [];

  // Mapear transacciones del año
  yearSnap.docs.forEach((doc) => {
    const d = doc.data();
    all.push({
      date: (d.date as Timestamp).toDate(),
      description: d.description,
      amount: d.amount,
      type: d.type,
      category: d.category,
      isShared: d.isShared ?? false,
      sharedAmount: d.sharedAmount,
      isInstallment: d.isInstallment ?? false,
      installmentNumber: d.installmentNumber,
      installmentTotal: d.installmentTotal,
    });
  });

  // Generar copias virtuales de fijos para meses del año donde la original es anterior
  fixedSnap.docs.forEach((doc) => {
    const d = doc.data();
    const originalDate: Date = (d.date as Timestamp).toDate();
    const cancelledFrom: Date | null = d.fixedCancelledFrom
      ? (d.fixedCancelledFrom as Timestamp).toDate()
      : null;

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const originalMonthStart = new Date(
        originalDate.getFullYear(),
        originalDate.getMonth(),
        1,
      );

      // Solo generar si la original fue creada ANTES de este mes
      if (monthStart <= originalMonthStart) continue;

      // No generar si fue cancelada a partir de este mes
      if (cancelledFrom) {
        const cancelMonthStart = new Date(
          cancelledFrom.getFullYear(),
          cancelledFrom.getMonth(),
          1,
        );
        if (monthStart >= cancelMonthStart) continue;
      }

      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const day = Math.min(originalDate.getDate(), daysInMonth);

      all.push({
        date: new Date(year, month, day),
        description: d.description,
        amount: d.amount,
        type: d.type,
        category: d.category,
        isShared: false,
        isInstallment: false,
      });
    }
  });

  // Ordenar cronológicamente
  all.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calcular totales
  const effectiveAmount = (tx: RawTx) =>
    tx.isShared && tx.sharedAmount !== undefined ? tx.sharedAmount : tx.amount;

  const totalIncome = all
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + effectiveAmount(t), 0);

  const totalExpenses = all
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + effectiveAmount(t), 0);

  // Desglose por categoría
  const catMap = new Map<string, CategorySummary>();
  all.forEach((t) => {
    const { name } = resolveCategory(t.category, customCategories);
    const existing = catMap.get(t.category);
    const amt = effectiveAmount(t);
    if (existing) {
      existing.count++;
      existing.total += amt;
    } else {
      catMap.set(t.category, {
        categoryId: t.category,
        name,
        count: 1,
        total: amt,
        type: t.type,
      });
    }
  });

  const byCategory = Array.from(catMap.values()).sort((a, b) => b.total - a.total);

  // Mapear a ReportTransaction
  const transactions: ReportTransaction[] = all.map((t) => {
    const { name } = resolveCategory(t.category, customCategories);
    const desc =
      t.isInstallment && t.installmentNumber && t.installmentTotal
        ? `${t.description} (${t.installmentNumber}/${t.installmentTotal})`
        : t.description;
    return {
      date: t.date,
      description: desc,
      categoryName: name,
      amount: effectiveAmount(t),
      type: t.type,
    };
  });

  return {
    userName,
    year,
    generatedAt: new Date(),
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    byCategory,
    transactions,
  };
}
