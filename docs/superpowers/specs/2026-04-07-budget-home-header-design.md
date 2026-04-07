# Spec: Budget MVP + Home Header Redesign
**Fecha:** 2026-04-07
**Estado:** Aprobado

---

## 1. Home Header — Rediseño

### Problema
El saludo estático "Hola, {{name}}" + "Tu progreso de hoy" no aporta valor real al usuario. Es decorativo, no informativo.

### Solución
Reemplazar el bloque de saludo por uno dinámico e inteligente.

### Componentes

#### Saludo contextual por hora
- 6:00–11:59 → "Buenos días, {{name}} ☀️"
- 12:00–17:59 → "Buenas tardes, {{name}}"
- 18:00–21:59 → "Buenas noches, {{name}} 🌙"
- 22:00–5:59 → "Que descanses, {{name}} 🌙"

Lógica: `new Date().getHours()` al montar el componente (no reactivo).

#### Subtítulo dinámico
Prioridad descendente:
1. Si `totalExpenses` del día actual > 0 → `"Hoy gastaste {{amount}}"`
2. Si `totalExpenses / totalIncome >= 0.8` → `"Cuidado con los gastos este mes"`
3. Si `totalExpenses / totalIncome < 0.4` y `totalIncome > 0` → `"¡Vas muy bien este mes!"`
4. Si no hay transacciones del mes → `"Comienza a registrar tus gastos"`
5. Fallback → `"Resumen del mes"`

El gasto "de hoy" se calcula filtrando `transactions` donde `date` sea el día actual.

#### Status Pill
Chip pequeño con ícono + color según ratio `totalExpenses / totalIncome`:
- 0–59%: verde (`colors.success`) + ícono `trending-down`
- 60–84%: amarillo (`#F59E0B`) + ícono `alert-circle`
- 85–100%+: rojo (`colors.error`) + ícono `warning`
- Sin ingresos: gris, sin pill

El pill muestra el porcentaje: "34% gastado"

### Archivos modificados
- `app/(tabs)/index.tsx` — bloque de saludo (líneas ~189-197)
- `locales/es.json`, `en.json`, `it.json` — claves `home.greeting*`, `home.subtitle*`, `home.pill*`

### NO cambiar
- El resto del home (balance card, income/expenses, actividad reciente, FAB, biometric offer)
- Estilos existentes fuera del bloque de saludo

---

## 2. Budget MVP

### Objetivo
Módulo funcional que permita al usuario definir límites de gasto por categoría y visualizar en tiempo real cuánto ha gastado vs su presupuesto.

### Modelo de datos

**Colección Firestore:** `budgets`
```
{
  id: string               // auto-generado
  userId: string
  categoryId: string       // ID de categoría (default o custom)
  categoryName: string     // Denormalizado para display rápido
  categoryIcon: string     // Emoji, denormalizado
  limitAmount: number      // Límite mensual en COP
  month: number            // 0–11
  year: number
  createdAt: Date
}
```

Un documento por (userId + categoryId + month + year). Si el usuario duplica, se actualiza.

### Hook: `hooks/useBudgets.ts`

```typescript
export function useBudgets(userId: string, year: number, month: number): {
  budgets: Budget[]
  loading: boolean
  error: string | null
  addOrUpdateBudget: (categoryId: string, categoryName: string, categoryIcon: string, limitAmount: number) => Promise<void>
  deleteBudget: (budgetId: string) => Promise<void>
}
```

- Escucha en tiempo real con `onSnapshot`
- Filtra por `userId`, `year`, `month`
- `addOrUpdateBudget`: si ya existe un doc para ese categoryId+month+year, lo actualiza (usa query + update); si no, crea uno nuevo

### Tipo: `types/budget.ts`
```typescript
export interface Budget {
  id: string
  userId: string
  categoryId: string
  categoryName: string
  categoryIcon: string
  limitAmount: number
  month: number
  year: number
  createdAt: Date
}
```

### Pantalla: `app/(tabs)/budget.tsx`

#### Layout (de arriba a abajo):

1. **AppHeader** — título "Presupuesto", `showBack={false}`

2. **Selector de mes** — misma lógica que `history.tsx`:
   - Flechas `<` `>` para navegar meses
   - Label "Enero 2026" centrado
   - No permite meses futuros

3. **Card resumen** (solo si hay al menos 1 presupuesto):
   - Donut chart SVG simple (usando `react-native-svg` si disponible, o fallback con View/border-radius circular)
   - Centro del donut: porcentaje grande + "gastado"
   - Debajo: "Gastado: $X de $Y" y "Disponible: $Z"
   - Color del donut: verde/amarillo/rojo según %

4. **Lista de presupuestos** — FlatList o ScrollView:
   Cada ítem:
   - Fila superior: `[emoji] [Nombre categoría]` + `[$gastado / $límite]`
   - Barra de progreso animada (Animated.View width %) con color dinámico
   - Texto bajo barra: "X% usado" o "¡Límite superado!" si > 100%
   - Toque en el ítem → AppDialog para editar/eliminar

5. **Sección "Sin presupuesto"** (categorías de gasto sin límite definido):
   - Header colapsable "CATEGORÍAS SIN LÍMITE"
   - Lista de chips de categoría con botón "+"
   - Al tocar "+": AppDialog con input de monto para definir límite

6. **FAB "+"** — abre un selector de categoría para agregar un nuevo presupuesto

#### Cálculo de gastos por categoría:
- Usar `useTransactions(userId, year, month)` existente
- Filtrar `transactions` donde `type === 'expense'` y `category === budget.categoryId`
- Sumar `amount` → `spentAmount`
- `percentage = spentAmount / budget.limitAmount * 100`

#### Colores de progreso:
- 0–59%: `colors.success`
- 60–84%: `#F59E0B` (warning amber)
- 85–99%: `colors.error` con opacidad 0.7
- 100%+: `colors.error` sólido

### i18n — nuevas claves en `budget`
```json
{
  "title": "Presupuesto",
  "monthlyBudget": "Presupuesto mensual",
  "totalSpent": "Gastado",
  "totalLimit": "Límite total",
  "available": "Disponible",
  "spent": "gastado",
  "limitExceeded": "¡Límite superado!",
  "nobudgets": {
    "title": "Sin presupuestos",
    "sub": "Define cuánto quieres gastar por categoría"
  },
  "addLimit": "Definir límite",
  "editLimit": "Editar límite",
  "deleteLimit": "Eliminar presupuesto",
  "limitLabel": "Límite mensual (COP)",
  "limitPlaceholder": "Ej: 500000",
  "unlimitedSection": "CATEGORÍAS SIN LÍMITE",
  "dialog": {
    "addTitle": "Nuevo presupuesto",
    "editTitle": "Editar presupuesto",
    "deleteTitle": "Eliminar presupuesto",
    "deleteDesc": "¿Eliminar el presupuesto de {{category}}?",
    "save": "Guardar",
    "delete": "Eliminar"
  },
  "alerts": {
    "nearLimit": "{{category}} está al {{percent}}%",
    "exceeded": "{{category}} superó el límite"
  }
}
```

### Archivos a crear/modificar
- **CREAR** `types/budget.ts`
- **CREAR** `hooks/useBudgets.ts`
- **MODIFICAR** `app/(tabs)/budget.tsx` — implementación completa
- **MODIFICAR** `locales/es.json`, `en.json`, `it.json` — sección `budget`

---

## Orden de implementación
1. `types/budget.ts` + `hooks/useBudgets.ts` + i18n budget
2. `app/(tabs)/budget.tsx`
3. Home header (index.tsx + i18n)
