# Spec: Marcar como pagado en historial

**Fecha:** 2026-04-06  
**Estado:** Aprobado

---

## Resumen

Agregar la capacidad de marcar gastos en el historial como pagados/no pagados. Solo aplica a transacciones de tipo `expense`. Los gastos marcados como pagados se muestran al final de cada grupo de día y con un estilo visual diferenciado (background pastel terciario).

---

## Modelo de datos

### `types/transaction.ts`
Agregar campo opcional:
```ts
isPaid?: boolean;
```

### Firestore
Campo `isPaid: boolean` en el documento de la transacción. Se actualiza con `updateDoc` al hacer toggle. Las transacciones sin el campo se tratan como `isPaid = false`.

---

## Componente `TransactionRow`

### Nueva prop
```ts
onTogglePaid?: (tx: Transaction) => void;
```

### Toggle button
- Solo se renderiza si `item.type === 'expense'`
- Posición: extremo izquierdo del row, antes del ícono de categoría
- Componente: `TouchableOpacity` con `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}` (garantiza área táctil 44×44px)
- Visual unpaid: círculo 22px, borde 1.5px color `colors.border`, fondo transparente
- Visual paid: círculo 22px, fondo `colors.tertiaryDark`, `Ionicons "checkmark"` blanco tamaño 13
- Animación: `Animated.spring` en scale del checkmark (0→1 al marcar, 1→0 al desmarcar), `useNativeDriver: true`
- Deshabilitado mientras se procesa el update (prop `paidLoading`)

### Row estado pagado
- Background: `colors.tertiaryLight`
- Descripción: `colors.textSecondary` + `opacity: 0.75`
- Monto: `colors.tertiaryDark` (en lugar de `colors.error`)
- Ícono categoría: sin cambios

### Row estado no pagado (expense)
- Comportamiento visual actual sin cambios

### Ingresos (`type === 'income'`)
- Sin toggle, sin cambios visuales

---

## Sorting dentro de DayGroup

Dentro del array `items` de cada `DayGroup`, reordenar:
1. Ingresos (en su orden original por fecha)
2. Gastos no pagados (`isPaid !== true`), en su orden original
3. Gastos pagados (`isPaid === true`), en su orden original

Se aplica en `groupByDay` o en el render de `HistoryScreen` antes de pasarlos al componente.

---

## Lógica en `HistoryScreen`

### `handleTogglePaid(tx: Transaction)`
```ts
async function handleTogglePaid(tx: Transaction) {
  const newValue = !tx.isPaid;
  await updateDoc(doc(db, 'transactions', getActualId(tx)), { isPaid: newValue });
  setRefreshKey(k => k + 1);
  showToast(newValue ? t('history.toasts.markedPaid') : t('history.toasts.markedUnpaid'), 
            newValue ? 'success' : 'info');
}
```

- Se actualiza solo el documento real (usar `getActualId` para gastos fijos virtuales)
- Trigger `refreshKey` para re-fetch
- Estado `paidLoadingId: string | null` para deshabilitar el toggle del ítem en curso

---

## i18n — claves nuevas (es / en / it)

```json
"toasts": {
  "markedPaid": "Marcado como pagado",
  "markedUnpaid": "Desmarcado como pagado"
}
```

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `types/transaction.ts` | Agregar `isPaid?: boolean` |
| `app/(tabs)/history.tsx` | Toggle en `TransactionRow`, sort en `groupByDay`, `handleTogglePaid` en `HistoryScreen` |
| `locales/es.json` | Claves `history.toasts.markedPaid` y `markedUnpaid` |
| `locales/en.json` | Ídem en inglés |
| `locales/it.json` | Ídem en italiano |

---

## Consideraciones

- Las transacciones virtuales fijas (`isVirtualFixed`) usan `getActualId()` para apuntar al doc real en Firestore — consistente con el comportamiento de edición/eliminación existente.
- El campo `isPaid` no se hereda al duplicar (misma regla que `isFixed`).
- No se agrega campo `isPaid` al formulario de creación (`AddTransactionModal`) — se marca post-creación desde el historial únicamente.
- El sorting no afecta el orden de los grupos de día entre sí, solo el orden de items dentro de cada grupo.
