# Marcar como pagado en historial — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir marcar gastos del historial como pagados/no pagados con toggle inline, reordenando los pagados al final de cada grupo de día y aplicando un estilo visual pastel terciario.

**Architecture:** Se agrega el campo `isPaid?: boolean` al tipo `Transaction` y a Firestore. El toggle vive dentro de `TransactionRow` y solo aparece en gastos (`type === 'expense'`). El sorting se aplica en `groupByDay`. El update a Firestore se maneja con `handleTogglePaid` en `HistoryScreen` y se propaga hacia abajo via props.

**Tech Stack:** React Native + Expo SDK 55 + TypeScript + Firestore JS SDK (compat) + react-i18next + Ionicons + Animated API (useNativeDriver: true para scale, false para color)

---

## File Map

| Archivo | Cambio |
|---|---|
| `types/transaction.ts` | Agregar `isPaid?: boolean` |
| `locales/es.json` | Claves `history.toasts.markedPaid` y `markedUnpaid` |
| `locales/en.json` | Ídem en inglés |
| `locales/it.json` | Ídem en italiano |
| `app/(tabs)/history.tsx` | Toggle en `TransactionRow`, sort en `groupByDay`, `handleTogglePaid` + `paidLoadingId` en `HistoryScreen` |

---

## Task 1: Agregar `isPaid` al tipo Transaction y a los locales

**Files:**
- Modify: `types/transaction.ts`
- Modify: `locales/es.json`
- Modify: `locales/en.json`
- Modify: `locales/it.json`

- [ ] **Step 1: Agregar el campo `isPaid` al tipo Transaction**

En `types/transaction.ts`, agregar la línea después de `isInstallment?: boolean;`:

```ts
export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: Date;
  createdAt: Date;
  isFixed?: boolean;
  isVirtualFixed?: boolean;
  cardId?: string;
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  isInstallment?: boolean;
  isPaid?: boolean;
}
```

- [ ] **Step 2: Agregar claves i18n en `locales/es.json`**

Dentro de `"history" > "toasts"`, agregar dos claves nuevas:

```json
"toasts": {
  "saved": "Cambios guardados",
  "deleted": "Transacción eliminada",
  "duplicated": "Transacción duplicada",
  "markedPaid": "Marcado como pagado",
  "markedUnpaid": "Desmarcado como pagado"
}
```

- [ ] **Step 3: Agregar claves i18n en `locales/en.json`**

Dentro de `"history" > "toasts"`:

```json
"toasts": {
  "saved": "Changes saved",
  "deleted": "Transaction deleted",
  "duplicated": "Transaction duplicated",
  "markedPaid": "Marked as paid",
  "markedUnpaid": "Unmarked as paid"
}
```

- [ ] **Step 4: Agregar claves i18n en `locales/it.json`**

Dentro de `"history" > "toasts"` (verificar los valores existentes y agregar al final):

```json
"toasts": {
  "saved": "Modifiche salvate",
  "deleted": "Transazione eliminata",
  "duplicated": "Transazione duplicata",
  "markedPaid": "Contrassegnato come pagato",
  "markedUnpaid": "Deselezionato come pagato"
}
```

- [ ] **Step 5: Commit**

```bash
git add types/transaction.ts locales/es.json locales/en.json locales/it.json
git commit -m "feat: add isPaid field to Transaction type and i18n keys"
```

---

## Task 2: Sorting de items en `groupByDay`

**Files:**
- Modify: `app/(tabs)/history.tsx` — función `groupByDay` (línea ~83)

- [ ] **Step 1: Actualizar `groupByDay` para ordenar pagados al final**

Reemplazar la función `groupByDay` existente con esta versión que ordena dentro de cada grupo:

```ts
function groupByDay(transactions: Transaction[], weekdays: string[]): DayGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = localDateKey(tx.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return Array.from(map.entries()).map(([key, items]) => {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const weekday = weekdays[date.getDay()];
    // Unpaid (income + unpaid expenses) primero, paid expenses al final
    const sorted = [
      ...items.filter(tx => tx.type === 'income' || !tx.isPaid),
      ...items.filter(tx => tx.type === 'expense' && tx.isPaid === true),
    ];
    return { dateKey: key, label: `${weekday} ${d}`, items: sorted };
  });
}
```

- [ ] **Step 2: Verificar en browser que el orden cambia al marcar (prueba manual)**

```
npx expo start → w → abrir historial → marcar un gasto → verificar que baja al final del día
```

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/history.tsx
git commit -m "feat: sort paid expenses to bottom of each day group"
```

---

## Task 3: Toggle animado en `TransactionRow`

**Files:**
- Modify: `app/(tabs)/history.tsx` — componente `TransactionRow` (línea ~987)

- [ ] **Step 1: Agregar props nuevas a `TransactionRowProps`**

Reemplazar la interfaz `TransactionRowProps`:

```ts
interface TransactionRowProps {
  item: Transaction;
  isLast: boolean;
  onPress: (tx: Transaction) => void;
  onLongPress: (tx: Transaction) => void;
  cardsMap: Record<string, { bankName: string; lastFour: string; type: string }>;
  onTogglePaid?: (tx: Transaction) => void;
  paidLoading?: boolean;
}
```

- [ ] **Step 2: Reemplazar el componente `TransactionRow` completo**

Reemplazar la función `TransactionRow` con esta versión que incluye el toggle animado:

```ts
function TransactionRow({ item, isLast, onPress, onLongPress, cardsMap, onTogglePaid, paidLoading }: TransactionRowProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const cat = CATEGORY_META[item.category] ?? CATEGORY_META.other;
  const CATEGORY_LABELS: Record<string, string> = {
    food: t('categories.names.food'),
    transport: t('categories.names.transport'),
    health: t('categories.names.health'),
    entertainment: t('categories.names.entertainment'),
    shopping: t('categories.names.shopping'),
    home: t('categories.names.home'),
    salary: t('categories.names.salary'),
    other: t('categories.names.other'),
  };
  const isExpense = item.type === 'expense';
  const isPaid = item.isPaid === true;
  const card = item.cardId ? cardsMap[item.cardId] : null;
  const descLabel = item.isInstallment
    ? `${item.description} (${t('history.installmentChip', { n: item.installmentNumber, total: item.installmentTotal })})`
    : item.description;

  // Animación del checkmark (scale spring)
  const checkScale = useRef(new Animated.Value(isPaid ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: isPaid ? 1 : 0,
      useNativeDriver: true,
      bounciness: 12,
      speed: 20,
    }).start();
  }, [isPaid, checkScale]);

  const rowBg = isPaid ? colors.tertiaryLight : 'transparent';
  const amountColor = isExpense
    ? (isPaid ? colors.tertiaryDark : colors.error)
    : colors.secondary;
  const descOpacity = isPaid ? 0.65 : 1;

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      delayLongPress={350}
      activeOpacity={0.7}
      style={[
        styles.txRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
        { backgroundColor: rowBg },
      ]}
    >
      {/* Toggle pagado — solo gastos */}
      {isExpense && (
        <TouchableOpacity
          onPress={() => onTogglePaid?.(item)}
          disabled={paidLoading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
          style={styles.paidToggle}
        >
          <View
            style={[
              styles.paidCircle,
              isPaid
                ? { backgroundColor: colors.tertiaryDark, borderColor: colors.tertiaryDark }
                : { backgroundColor: 'transparent', borderColor: colors.border },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
            </Animated.View>
          </View>
        </TouchableOpacity>
      )}

      {/* Ícono categoría */}
      <View style={[
        styles.txIconWrap,
        { backgroundColor: colors.backgroundSecondary, opacity: descOpacity },
      ]}>
        <Text style={styles.txIconText}>{cat.icon}</Text>
      </View>

      {/* Meta */}
      <View style={[styles.txMeta, { opacity: descOpacity }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={[styles.txTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {descLabel}
          </Text>
          {item.isFixed && (
            <View style={[styles.fixedBadge, { backgroundColor: colors.primaryLight ?? `${colors.primary}22` }]}>
              <Text style={[styles.fixedBadgeText, { color: colors.primary }]}>{t('history.fixedBadge')}</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          <Text style={[styles.txTime, { color: colors.textTertiary }]}>
            {CATEGORY_LABELS[item.category] ?? item.category}
          </Text>
          {card && (
            <View style={[styles.txCardChip, {
              backgroundColor: card.type === 'credit'
                ? `${colors.primary}18`
                : `${colors.tertiary}18`,
            }]}>
              <Text style={[styles.txCardChipText, {
                color: card.type === 'credit'
                  ? colors.primary
                  : colors.tertiary,
              }]}>
                {`${card.bankName} ••${card.lastFour}`}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Monto */}
      <Text style={[styles.txAmount, { color: amountColor, opacity: descOpacity }]}>
        {isExpense ? `−${formatCurrency(item.amount)}` : `+${formatCurrency(item.amount)}`}
      </Text>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 3: Agregar estilos `paidToggle` y `paidCircle` al `StyleSheet`**

Dentro del `StyleSheet.create({...})` al final del archivo, agregar:

```ts
paidToggle: {
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 8,
  width: 28,
  height: 28,
},
paidCircle: {
  width: 22,
  height: 22,
  borderRadius: 11,
  borderWidth: 1.5,
  justifyContent: 'center',
  alignItems: 'center',
},
```

- [ ] **Step 4: Verificar en browser que el toggle renderiza y anima**

```
npx expo start → w → historial → verificar círculo a la izquierda de gastos → tap → ver animación spring
```

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/history.tsx
git commit -m "feat: add animated paid toggle to TransactionRow"
```

---

## Task 4: Lógica `handleTogglePaid` en `HistoryScreen`

**Files:**
- Modify: `app/(tabs)/history.tsx` — función `HistoryScreen` (línea ~1062)

- [ ] **Step 1: Agregar estado `paidLoadingId`**

Dentro de `HistoryScreen`, después de la línea `const [detailVisible, setDetailVisible] = useState(false);`, agregar:

```ts
const [paidLoadingId, setPaidLoadingId] = useState<string | null>(null);
```

- [ ] **Step 2: Agregar la función `handleTogglePaid`**

Después de `handleActionDone`, agregar:

```ts
const handleTogglePaid = useCallback(async (tx: Transaction) => {
  const actualId = getActualId(tx);
  setPaidLoadingId(actualId);
  try {
    const newValue = !tx.isPaid;
    await updateDoc(doc(db, 'transactions', actualId), { isPaid: newValue });
    setRefreshKey((k) => k + 1);
    showToast(
      newValue ? t('history.toasts.markedPaid') : t('history.toasts.markedUnpaid'),
      newValue ? 'success' : 'info'
    );
  } catch {
    showToast(t('errors.genericError'), 'error');
  } finally {
    setPaidLoadingId(null);
  }
}, [showToast, t]);
```

- [ ] **Step 3: Pasar las props a `TransactionRow` en el render**

Dentro del bloque `groups.map(...)`, actualizar el render de `TransactionRow`:

```tsx
<TransactionRow
  key={tx.id}
  item={tx}
  isLast={i === group.items.length - 1}
  onPress={handleTapTx}
  onLongPress={handleLongPress}
  cardsMap={cardsMap}
  onTogglePaid={handleTogglePaid}
  paidLoading={paidLoadingId === getActualId(tx)}
/>
```

- [ ] **Step 4: Verificar flujo completo en browser**

```
npx expo start → w → historial → tap toggle en un gasto → 
verificar: toast aparece, gasto baja al final del grupo de día, 
background cambia a tertiaryLight, monto cambia de rojo a tertiaryDark
```

- [ ] **Step 5: Verificar toggle de vuelta (desmarcar)**

```
tap toggle en un gasto pagado → 
verificar: toast "Desmarcado", gasto sube al grupo de no pagados, 
background vuelve a transparent, monto vuelve a rojo
```

- [ ] **Step 6: Verificar con gastos fijos virtuales**

```
Si hay gastos fijos (isVirtualFixed), tap toggle → verificar que el doc real se actualiza 
(no el id virtual) y el estado persiste al cambiar de mes y volver
```

- [ ] **Step 7: Commit final**

```bash
git add app/(tabs)/history.tsx
git commit -m "feat: implement handleTogglePaid with Firestore update and toast"
```

---

## Task 5: Deploy y verificación final

- [ ] **Step 1: Build web**

```bash
npx expo export --platform web
```

Verificar que no hay errores de TypeScript ni warnings en build.

- [ ] **Step 2: Push a main (auto-deploy Vercel)**

```bash
git push origin main
```

- [ ] **Step 3: Verificar en Vercel (`spendiapp-uhgv.vercel.app`)**

Abrir historial → marcar gastos → verificar visual + persistencia (recargar página → gastos siguen marcados).

---

## Notas de implementación

- `colors.tertiaryLight` y `colors.tertiaryDark` ya existen en `config/colors.ts` para light y dark mode — no hay que definirlos.
- El campo `isPaid` no se agrega a `AddTransactionModal` — solo se gestiona desde el historial.
- Al duplicar una transacción, `isPaid` no se hereda (el `addDoc` existente no lo incluye — no necesita cambios).
- La clave de error genérico es `errors.genericError` (ya existe en los 3 locales).
