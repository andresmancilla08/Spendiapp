# Budget MVP + Home Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el módulo de presupuesto MVP con donut chart + progress bars por categoría, y rediseñar el header del home con saludo contextual y subtítulo dinámico inteligente.

**Architecture:** Budget usa una nueva colección Firestore `budgets` con hook reactivo `useBudgets`. La pantalla combina `useBudgets` + `useTransactions` para calcular gastos reales vs límites. El header del home reemplaza el bloque greeting estático con lógica de hora del día y estado financiero del mes.

**Tech Stack:** React Native Web, Expo SDK 55, TypeScript, Firestore, react-native-svg 15.15.3, react-i18next

---

## File Map

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `types/budget.ts` | CREAR | Tipo `Budget` |
| `hooks/useBudgets.ts` | CREAR | CRUD Firestore + listener reactivo |
| `locales/es.json` | MODIFICAR | Claves `budget.*` completas |
| `locales/en.json` | MODIFICAR | Claves `budget.*` completas |
| `locales/it.json` | MODIFICAR | Claves `budget.*` completas |
| `app/(tabs)/budget.tsx` | MODIFICAR | Pantalla completa |
| `app/(tabs)/index.tsx` | MODIFICAR | Solo bloque greeting (líneas 190-196 + estilos greeting) |

---

## Task 1: Tipo Budget + Hook useBudgets + i18n

**Files:**
- Create: `types/budget.ts`
- Create: `hooks/useBudgets.ts`
- Modify: `locales/es.json` (sección `budget`)
- Modify: `locales/en.json` (sección `budget`)
- Modify: `locales/it.json` (sección `budget`)

- [ ] **Paso 1: Crear `types/budget.ts`**

```typescript
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
```

- [ ] **Paso 2: Crear `hooks/useBudgets.ts`**

```typescript
import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Budget } from '../types/budget';

interface UseBudgetsResult {
  budgets: Budget[];
  loading: boolean;
  error: string | null;
  addOrUpdateBudget: (
    categoryId: string,
    categoryName: string,
    categoryIcon: string,
    limitAmount: number
  ) => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
}

export function useBudgets(
  userId: string,
  year: number,
  month: number
): UseBudgetsResult {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBudgets([]);
    setLoading(true);
  }, [userId, year, month]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'budgets'),
      where('userId', '==', userId),
      where('year', '==', year),
      where('month', '==', month)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setBudgets(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              userId: data.userId,
              categoryId: data.categoryId,
              categoryName: data.categoryName,
              categoryIcon: data.categoryIcon,
              limitAmount: data.limitAmount,
              month: data.month,
              year: data.year,
              createdAt:
                data.createdAt instanceof Timestamp
                  ? data.createdAt.toDate()
                  : new Date(data.createdAt),
            } as Budget;
          })
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.code ?? 'unknown');
        setLoading(false);
      }
    );

    return unsub;
  }, [userId, year, month]);

  const addOrUpdateBudget = async (
    categoryId: string,
    categoryName: string,
    categoryIcon: string,
    limitAmount: number
  ) => {
    // Check if a budget already exists for this category+month+year
    const q = query(
      collection(db, 'budgets'),
      where('userId', '==', userId),
      where('categoryId', '==', categoryId),
      where('year', '==', year),
      where('month', '==', month)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(doc(db, 'budgets', snap.docs[0].id), {
        limitAmount,
        categoryName,
        categoryIcon,
      });
    } else {
      await addDoc(collection(db, 'budgets'), {
        userId,
        categoryId,
        categoryName,
        categoryIcon,
        limitAmount,
        month,
        year,
        createdAt: Timestamp.now(),
      });
    }
  };

  const deleteBudget = async (budgetId: string) => {
    await deleteDoc(doc(db, 'budgets', budgetId));
  };

  return { budgets, loading, error, addOrUpdateBudget, deleteBudget };
}
```

- [ ] **Paso 3: Actualizar `locales/es.json` — reemplazar la sección `"budget"` completa**

```json
"budget": {
  "title": "Presupuesto",
  "monthlyBudget": "Presupuesto del mes",
  "totalSpent": "Gastado",
  "totalLimit": "Límite total",
  "available": "Disponible",
  "spentLabel": "gastado",
  "limitExceeded": "¡Límite superado!",
  "nobudgets": {
    "title": "Sin presupuestos",
    "sub": "Define cuánto quieres gastar por categoría"
  },
  "addLimit": "Definir límite",
  "editLimit": "Editar límite",
  "unlimitedSection": "SIN LÍMITE DEFINIDO",
  "dialog": {
    "addTitle": "Nuevo presupuesto",
    "editTitle": "Editar presupuesto",
    "deleteTitle": "Eliminar presupuesto",
    "deleteDesc": "¿Eliminar el presupuesto de {{category}}?",
    "limitLabel": "Límite mensual (COP)",
    "limitPlaceholder": "Ej: 500000",
    "save": "Guardar",
    "delete": "Eliminar",
    "cancel": "Cancelar"
  }
}
```

- [ ] **Paso 4: Actualizar `locales/en.json` — reemplazar la sección `"budget"` completa**

```json
"budget": {
  "title": "Budget",
  "monthlyBudget": "Monthly budget",
  "totalSpent": "Spent",
  "totalLimit": "Total limit",
  "available": "Available",
  "spentLabel": "spent",
  "limitExceeded": "Limit exceeded!",
  "nobudgets": {
    "title": "No budgets yet",
    "sub": "Define how much you want to spend per category"
  },
  "addLimit": "Set limit",
  "editLimit": "Edit limit",
  "unlimitedSection": "NO LIMIT SET",
  "dialog": {
    "addTitle": "New budget",
    "editTitle": "Edit budget",
    "deleteTitle": "Delete budget",
    "deleteDesc": "Delete the budget for {{category}}?",
    "limitLabel": "Monthly limit (COP)",
    "limitPlaceholder": "e.g. 500000",
    "save": "Save",
    "delete": "Delete",
    "cancel": "Cancel"
  }
}
```

- [ ] **Paso 5: Actualizar `locales/it.json` — reemplazar la sección `"budget"` completa**

```json
"budget": {
  "title": "Budget",
  "monthlyBudget": "Budget mensile",
  "totalSpent": "Speso",
  "totalLimit": "Limite totale",
  "available": "Disponibile",
  "spentLabel": "speso",
  "limitExceeded": "Limite superato!",
  "nobudgets": {
    "title": "Nessun budget",
    "sub": "Definisci quanto vuoi spendere per categoria"
  },
  "addLimit": "Imposta limite",
  "editLimit": "Modifica limite",
  "unlimitedSection": "SENZA LIMITE",
  "dialog": {
    "addTitle": "Nuovo budget",
    "editTitle": "Modifica budget",
    "deleteTitle": "Elimina budget",
    "deleteDesc": "Eliminare il budget per {{category}}?",
    "limitLabel": "Limite mensile (COP)",
    "limitPlaceholder": "es. 500000",
    "save": "Salva",
    "delete": "Elimina",
    "cancel": "Annulla"
  }
}
```

- [ ] **Paso 6: Commit**

```bash
git add types/budget.ts hooks/useBudgets.ts locales/es.json locales/en.json locales/it.json
git commit -m "feat: budget data layer — type, hook, i18n"
```

---

## Task 2: Pantalla Budget completa

**Files:**
- Modify: `app/(tabs)/budget.tsx` (reemplazar completamente)

Esta pantalla usa `useBudgets` + `useTransactions` para mostrar progreso real por categoría. Incluye:
- Selector de mes
- Donut chart SVG (total gastado vs total presupuestado)
- Lista de presupuestos con barras de progreso animadas
- Sección de categorías sin límite
- AppDialog para agregar/editar/eliminar presupuestos

- [ ] **Paso 1: Reemplazar `app/(tabs)/budget.tsx` completo**

```typescript
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import Svg, { Circle } from 'react-native-svg';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../context/ThemeContext';
import { useBudgets } from '../../hooks/useBudgets';
import { useTransactions } from '../../hooks/useTransactions';
import { Budget } from '../../types/budget';
import AppDialog from '../../components/AppDialog';
import { AppHeader } from '../../components/AppHeader';
import { Fonts } from '../../config/fonts';

// ─── Category metadata (same as home screen) ───────────────────────────────
const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  food:          { icon: '🍽️', color: '#EF4444' },
  transport:     { icon: '🚗', color: '#F59E0B' },
  health:        { icon: '💊', color: '#10B981' },
  entertainment: { icon: '🎉', color: '#8B5CF6' },
  shopping:      { icon: '🛍️', color: '#EC4899' },
  home:          { icon: '🏡', color: '#00897B' },
  salary:        { icon: '💰', color: '#00ACC1' },
  other:         { icon: '📌', color: '#737879' },
};

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Comida', icon: '🍽️' },
  { id: 'transport', name: 'Transporte', icon: '🚗' },
  { id: 'health', name: 'Salud', icon: '💊' },
  { id: 'entertainment', name: 'Entretenimiento', icon: '🎉' },
  { id: 'shopping', name: 'Compras', icon: '🛍️' },
  { id: 'home', name: 'Hogar', icon: '🏡' },
  { id: 'other', name: 'Otro', icon: '📌' },
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n);
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────
function DonutChart({
  percent,
  color,
  size = 140,
}: {
  percent: number;
  color: string;
  size?: number;
}) {
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(percent, 100);
  const strokeDashoffset =
    circumference - (clampedPercent / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      {/* Track */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#E5E7EB"
        strokeWidth={12}
        fill="none"
      />
      {/* Progress */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={12}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.min(percent, 100);
  return (
    <View style={progressStyles.track}>
      <View
        style={[progressStyles.fill, { width: `${clamped}%` as any, backgroundColor: color }]}
      />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    marginTop: 6,
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
});

// ─── Progress color helper ────────────────────────────────────────────────────
function progressColor(percent: number, successColor: string, errorColor: string): string {
  if (percent >= 100) return errorColor;
  if (percent >= 85) return errorColor + 'CC';
  if (percent >= 60) return '#F59E0B';
  return successColor;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function BudgetScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuthStore();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const { budgets, loading, addOrUpdateBudget, deleteBudget } = useBudgets(
    user?.uid ?? '',
    year,
    month
  );
  const { transactions } = useTransactions(user?.uid ?? '', year, month);

  // Gasto real por categoría en el mes
  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type === 'expense') {
        map[tx.category] = (map[tx.category] ?? 0) + tx.amount;
      }
    }
    return map;
  }, [transactions]);

  // Totales del presupuesto
  const totalLimit = budgets.reduce((s, b) => s + b.limitAmount, 0);
  const totalSpent = budgets.reduce(
    (s, b) => s + (spentByCategory[b.categoryId] ?? 0),
    0
  );
  const overallPercent = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
  const donutColor = progressColor(overallPercent, colors.success, colors.error);

  // Categorías sin presupuesto definido
  const budgetedIds = new Set(budgets.map((b) => b.categoryId));
  const unlimitedCategories = DEFAULT_EXPENSE_CATEGORIES.filter(
    (c) => !budgetedIds.has(c.id)
  );

  // Dialog state
  type DialogMode = 'add' | 'edit' | 'delete' | null;
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    name: string;
    icon: string;
  } | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Month navigator
  const goToPrevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const goToNextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    if (isCurrentMonth) return;
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const MONTH_NAMES = [
    t('history.months.0'), t('history.months.1'), t('history.months.2'),
    t('history.months.3'), t('history.months.4'), t('history.months.5'),
    t('history.months.6'), t('history.months.7'), t('history.months.8'),
    t('history.months.9'), t('history.months.10'), t('history.months.11'),
  ];

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const openAdd = (cat: { id: string; name: string; icon: string }) => {
    setSelectedCategory(cat);
    setLimitInput('');
    setDialogMode('add');
  };

  const openEdit = (b: Budget) => {
    setSelectedBudget(b);
    setLimitInput(String(b.limitAmount));
    setDialogMode('edit');
  };

  const openDelete = (b: Budget) => {
    setSelectedBudget(b);
    setDialogMode('delete');
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedBudget(null);
    setSelectedCategory(null);
    setLimitInput('');
  };

  const handleSave = async () => {
    const amount = parseInt(limitInput.replace(/\D/g, ''), 10);
    if (!amount || amount <= 0) return;
    setSaving(true);
    try {
      if (dialogMode === 'add' && selectedCategory) {
        await addOrUpdateBudget(
          selectedCategory.id,
          selectedCategory.name,
          selectedCategory.icon,
          amount
        );
      } else if (dialogMode === 'edit' && selectedBudget) {
        await addOrUpdateBudget(
          selectedBudget.categoryId,
          selectedBudget.categoryName,
          selectedBudget.categoryIcon,
          amount
        );
      }
    } finally {
      setSaving(false);
      closeDialog();
    }
  };

  const handleDelete = async () => {
    if (!selectedBudget) return;
    setSaving(true);
    try {
      await deleteBudget(selectedBudget.id);
    } finally {
      setSaving(false);
      closeDialog();
    }
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.backgroundSecondary }]}
    >
      <AppHeader showBack={false} />

      {/* Month selector */}
      <View style={[styles.monthRow, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.monthBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <TouchableOpacity
          onPress={goToNextMonth}
          style={[styles.monthBtn, isCurrentMonth && styles.disabledBtn]}
          disabled={isCurrentMonth}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isCurrentMonth ? colors.textTertiary : colors.primary}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Empty state */}
          {budgets.length === 0 && unlimitedCategories.length > 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <Text style={styles.emptyEmoji}>💰</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {t('budget.nobudgets.title')}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                {t('budget.nobudgets.sub')}
              </Text>
            </View>
          )}

          {/* Summary donut */}
          {budgets.length > 0 && (
            <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
              <View style={styles.donutWrapper}>
                <DonutChart percent={overallPercent} color={donutColor} size={140} />
                <View style={styles.donutCenter}>
                  <Text style={[styles.donutPercent, { color: donutColor }]}>
                    {Math.round(overallPercent)}%
                  </Text>
                  <Text style={[styles.donutLabel, { color: colors.textSecondary }]}>
                    {t('budget.spentLabel')}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryStats}>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {t('budget.totalSpent')}
                  </Text>
                  <Text style={[styles.statValue, { color: donutColor }]}>
                    {formatCurrency(totalSpent)}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {t('budget.totalLimit')}
                  </Text>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {formatCurrency(totalLimit)}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {t('budget.available')}
                  </Text>
                  <Text
                    style={[
                      styles.statValue,
                      { color: totalLimit - totalSpent >= 0 ? colors.success : colors.error },
                    ]}
                  >
                    {formatCurrency(Math.max(totalLimit - totalSpent, 0))}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Budget rows */}
          {budgets.map((b) => {
            const spent = spentByCategory[b.categoryId] ?? 0;
            const pct = b.limitAmount > 0 ? (spent / b.limitAmount) * 100 : 0;
            const color = progressColor(pct, colors.success, colors.error);
            const meta = CATEGORY_META[b.categoryId];
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.budgetRow, { backgroundColor: colors.surface }]}
                onPress={() => openEdit(b)}
                onLongPress={() => openDelete(b)}
                activeOpacity={0.7}
              >
                <View style={styles.budgetRowTop}>
                  <View style={styles.catInfo}>
                    <Text style={styles.catIcon}>{b.categoryIcon}</Text>
                    <Text style={[styles.catName, { color: colors.textPrimary }]}>
                      {b.categoryName}
                    </Text>
                  </View>
                  <View style={styles.amountInfo}>
                    <Text style={[styles.spentAmt, { color: color }]}>
                      {formatCurrency(spent)}
                    </Text>
                    <Text style={[styles.limitAmt, { color: colors.textTertiary }]}>
                      {' / '}{formatCurrency(b.limitAmount)}
                    </Text>
                  </View>
                </View>
                <ProgressBar percent={pct} color={color} />
                <Text style={[styles.pctLabel, { color: color }]}>
                  {pct >= 100
                    ? t('budget.limitExceeded')
                    : `${Math.round(pct)}% ${t('budget.spentLabel')}`}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Unlimited categories */}
          {unlimitedCategories.length > 0 && (
            <View style={styles.unlimitedSection}>
              <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>
                {t('budget.unlimitedSection')}
              </Text>
              {unlimitedCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.unlimitedRow, { backgroundColor: colors.surface }]}
                  onPress={() => openAdd(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                  <Text style={[styles.catName, { color: colors.textSecondary }]}>
                    {cat.name}
                  </Text>
                  <View style={[styles.addChip, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <Text style={[styles.addChipText, { color: colors.primary }]}>
                      {t('budget.addLimit')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Dialog: Add / Edit */}
      {(dialogMode === 'add' || dialogMode === 'edit') && (
        <AppDialog
          visible
          type="info"
          title={
            dialogMode === 'add'
              ? t('budget.dialog.addTitle')
              : t('budget.dialog.editTitle')
          }
          description={
            <View>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 14, marginBottom: 8, color: '#666' }}>
                {t('budget.dialog.limitLabel')}
              </Text>
              <TextInput
                value={limitInput}
                onChangeText={(v) => setLimitInput(v.replace(/\D/g, ''))}
                placeholder={t('budget.dialog.limitPlaceholder')}
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  padding: 10,
                  fontFamily: Fonts.regular,
                  fontSize: 16,
                }}
              />
            </View>
          }
          primaryLabel={t('budget.dialog.save')}
          secondaryLabel={t('budget.dialog.cancel')}
          onPrimary={handleSave}
          onSecondary={closeDialog}
          loading={saving}
        />
      )}

      {/* Dialog: Delete */}
      {dialogMode === 'delete' && selectedBudget && (
        <AppDialog
          visible
          type="warning"
          title={t('budget.dialog.deleteTitle')}
          description={t('budget.dialog.deleteDesc', {
            category: selectedBudget.categoryName,
          })}
          primaryLabel={t('budget.dialog.delete')}
          secondaryLabel={t('budget.dialog.cancel')}
          onPrimary={handleDelete}
          onSecondary={closeDialog}
          loading={saving}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingTop: 12 },

  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 12,
  },
  monthBtn: { padding: 4 },
  disabledBtn: { opacity: 0.3 },
  monthLabel: { fontSize: 15, fontFamily: Fonts.semiBold },

  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.bold, marginBottom: 6, textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 20 },

  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  donutWrapper: { position: 'relative', width: 140, height: 140 },
  donutCenter: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutPercent: { fontSize: 26, fontFamily: Fonts.bold },
  donutLabel: { fontSize: 11, fontFamily: Fonts.regular, marginTop: 2 },
  summaryStats: { flex: 1 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  statLabel: { fontSize: 12, fontFamily: Fonts.regular },
  statValue: { fontSize: 13, fontFamily: Fonts.semiBold },
  divider: { height: 1, marginVertical: 2 },

  budgetRow: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  budgetRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catIcon: { fontSize: 22 },
  catName: { fontSize: 14, fontFamily: Fonts.medium },
  amountInfo: { flexDirection: 'row', alignItems: 'baseline' },
  spentAmt: { fontSize: 14, fontFamily: Fonts.bold },
  limitAmt: { fontSize: 12, fontFamily: Fonts.regular },
  pctLabel: { fontSize: 11, fontFamily: Fonts.medium, marginTop: 4 },

  unlimitedSection: { marginTop: 8 },
  sectionHeader: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  unlimitedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
  },
  addChip: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  addChipText: { fontSize: 12, fontFamily: Fonts.medium },
});
```

- [ ] **Paso 2: Commit**

```bash
git add app/\(tabs\)/budget.tsx
git commit -m "feat: budget screen MVP — donut chart, progress bars, CRUD"
```

---

## Task 3: Home Header — Saludo dinámico

**Files:**
- Modify: `app/(tabs)/index.tsx` (solo bloque greeting + estilos greeting)
- Modify: `locales/es.json` (claves `home.greeting*`)
- Modify: `locales/en.json` (claves `home.greeting*`)
- Modify: `locales/it.json` (claves `home.greeting*`)

- [ ] **Paso 1: Actualizar claves `home` en `locales/es.json`**

Reemplazar las líneas `"greeting"` y `"progressTitle"` con:

```json
"greetingMorning": "Buenos días, {{name}} ☀️",
"greetingAfternoon": "Buenas tardes, {{name}}",
"greetingEvening": "Buenas noches, {{name}} 🌙",
"greetingNight": "Que descanses, {{name}} 🌙",
"subtitleSpentToday": "Hoy gastaste {{amount}}",
"subtitleWarning": "Cuidado con los gastos este mes",
"subtitleGood": "¡Vas muy bien este mes!",
"subtitleStart": "Comienza a registrar tus gastos",
"subtitleDefault": "Resumen del mes",
"pillSpent": "{{percent}}% gastado"
```

Eliminar: `"greeting"` y `"progressTitle"`.

- [ ] **Paso 2: Actualizar claves `home` en `locales/en.json`**

```json
"greetingMorning": "Good morning, {{name}} ☀️",
"greetingAfternoon": "Good afternoon, {{name}}",
"greetingEvening": "Good evening, {{name}} 🌙",
"greetingNight": "Good night, {{name}} 🌙",
"subtitleSpentToday": "Today you spent {{amount}}",
"subtitleWarning": "Watch your spending this month",
"subtitleGood": "You're doing great this month!",
"subtitleStart": "Start recording your expenses",
"subtitleDefault": "Monthly summary",
"pillSpent": "{{percent}}% spent"
```

Eliminar: `"greeting"` y `"progressTitle"`.

- [ ] **Paso 3: Actualizar claves `home` en `locales/it.json`**

```json
"greetingMorning": "Buongiorno, {{name}} ☀️",
"greetingAfternoon": "Buon pomeriggio, {{name}}",
"greetingEvening": "Buona sera, {{name}} 🌙",
"greetingNight": "Buona notte, {{name}} 🌙",
"subtitleSpentToday": "Oggi hai speso {{amount}}",
"subtitleWarning": "Attenzione alle spese questo mese",
"subtitleGood": "Stai andando alla grande!",
"subtitleStart": "Inizia a registrare le tue spese",
"subtitleDefault": "Riepilogo del mese",
"pillSpent": "{{percent}}% speso"
```

Eliminar: `"greeting"` y `"progressTitle"`.

- [ ] **Paso 4: Modificar `app/(tabs)/index.tsx` — reemplazar el bloque greeting**

Agregar estas funciones helpers **justo antes del `return`** (después de `const recent = ...`):

```typescript
  // Greeting logic
  const hour = new Date().getHours();
  const greetingKey =
    hour >= 6 && hour < 12 ? 'home.greetingMorning'
    : hour >= 12 && hour < 18 ? 'home.greetingAfternoon'
    : hour >= 18 && hour < 22 ? 'home.greetingEvening'
    : 'home.greetingNight';

  // Today's expense
  const today = new Date();
  const todaySpent = transactions
    .filter((tx) => {
      if (tx.type !== 'expense') return false;
      const d = tx.date instanceof Date ? tx.date : new Date(tx.date);
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  const expenseRatio = totalIncome > 0 ? totalExpenses / totalIncome : 0;

  const subtitleKey =
    todaySpent > 0 ? null // uses subtitleSpentToday with amount
    : transactions.length === 0 ? 'home.subtitleStart'
    : expenseRatio >= 0.8 ? 'home.subtitleWarning'
    : expenseRatio < 0.4 && totalIncome > 0 ? 'home.subtitleGood'
    : 'home.subtitleDefault';

  const pillVisible = totalIncome > 0 && totalExpenses > 0;
  const pillPercent = Math.round(expenseRatio * 100);
  const pillColor =
    pillPercent >= 85 ? colors.error
    : pillPercent >= 60 ? '#F59E0B'
    : colors.success;
  const pillIcon: 'trending-down' | 'alert-circle' | 'warning' =
    pillPercent >= 85 ? 'warning'
    : pillPercent >= 60 ? 'alert-circle'
    : 'trending-down';
```

Reemplazar el bloque JSX del greeting (líneas ~190-196):

```tsx
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={[styles.greetingHi, { color: colors.textPrimary }]}>
            {t(greetingKey, { name: firstName })}
          </Text>
          <View style={styles.greetingSubRow}>
            <Text style={[styles.greetingSubtitle, { color: colors.textSecondary }]}>
              {subtitleKey
                ? t(subtitleKey)
                : t('home.subtitleSpentToday', { amount: formatCurrency(todaySpent) })}
            </Text>
            {pillVisible && (
              <View style={[styles.pill, { backgroundColor: pillColor + '20' }]}>
                <Ionicons name={pillIcon} size={11} color={pillColor} />
                <Text style={[styles.pillText, { color: pillColor }]}>
                  {t('home.pillSpent', { percent: pillPercent })}
                </Text>
              </View>
            )}
          </View>
        </View>
```

- [ ] **Paso 5: Actualizar estilos greeting en `app/(tabs)/index.tsx`**

Reemplazar en `StyleSheet.create(...)` el bloque de estilos `greeting`, `greetingHi`, `greetingTitle`:

```typescript
  greeting: { marginBottom: 20 },
  greetingHi: { fontSize: 22, fontFamily: Fonts.bold, marginBottom: 4 },
  greetingSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  greetingSubtitle: { fontSize: 13, fontFamily: Fonts.regular },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillText: { fontSize: 11, fontFamily: Fonts.semiBold },
```

Eliminar: `greetingTitle` del StyleSheet.

- [ ] **Paso 6: Commit**

```bash
git add app/\(tabs\)/index.tsx locales/es.json locales/en.json locales/it.json
git commit -m "feat: home header — contextual greeting + smart subtitle + status pill"
```
