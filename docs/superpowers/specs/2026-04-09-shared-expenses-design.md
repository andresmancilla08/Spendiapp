# Gastos Compartidos — Fase 2: Sistema de Transacciones Compartidas entre Amigos

**Fecha:** 2026-04-09
**App:** Spendiapp
**Stack:** React Native (Expo Router) + Firebase Firestore + i18n (es/en/it)
**Scope:** Fase 2 del sistema de amigos. Permite compartir gastos/ingresos entre usuarios con cálculo automático de cuotas y tasas por persona.

---

## Objetivo

Permitir que un usuario marque cualquier transacción como "compartida" con uno o más amigos de Spendia. El sistema calcula automáticamente el monto proporcional para cada participante (considerando tasa de interés y cuotas), crea documentos espejo en la cuenta de cada participante, y mantiene sincronización ante ediciones y eliminaciones.

---

## Modelo de Datos

### Extensión de `/transactions/{uid}/transactions/{docId}`

Se añaden campos opcionales a las transacciones existentes. Una transacción sin `isShared` funciona exactamente igual que antes.

```ts
{
  // Campos existentes (sin cambios)
  id: string
  description: string
  amount: number
  type: 'expense' | 'income'
  category: string
  date: Timestamp
  isInstallment: boolean
  installmentNumber?: number
  installmentTotal?: number
  installmentGroupId?: string
  interestRate?: number
  cardId?: string           // SOLO presente en el doc del owner, nunca en espejos
  isFixed?: boolean
  isPaid?: boolean

  // Campos nuevos (solo presentes si isShared === true)
  isShared?: boolean
  sharedId?: string          // ID del doc en /sharedTransactions — igual para todos los espejos
  sharedOwnerUid?: string    // UID de quien creó el gasto original
  sharedOwnerUserName?: string
  sharedParticipants?: SharedParticipant[]
  sharedAmount?: number      // Monto calculado para ESTE usuario específico
  // cardId omitido en docs espejo (privacidad)
}

interface SharedParticipant {
  uid: string
  userName: string
  displayName: string
  percentage: number         // 0-100, suma total debe ser 100
}
```

### Cálculo del monto por participante

```
montoBase = amount + (amount * interestRate / 100)   // si hay tasa
montoPorPersona = montoBase * (percentage / 100)
cuotaMensual = montoPorPersona / installmentTotal    // si hay cuotas
```

Para transacciones de pago único: `sharedAmount = montoBase * (percentage / 100)`

### Nueva colección `/sharedTransactions/{sharedId}`

Documento de coordinación. No contiene datos financieros — solo sirve para saber qué docs espejo existen y poder propagarles cambios o eliminaciones.

```ts
{
  sharedId: string           // == doc ID (nanoid o Firestore auto-ID)
  ownerUid: string
  createdAt: Timestamp
  mirrorRefs: MirrorRef[]
}

interface MirrorRef {
  uid: string
  transactionId: string      // ID del doc espejo en /transactions/{uid}/transactions/
  installmentGroupId?: string // si es cuotas, para poder borrar todo el grupo
}

// Campo adicional para reglas Firestore (array plano de UIDs — Firestore no puede
// hacer contains sobre arrays de objetos anidados):
participantUids: string[]    // [ownerUid, participante1Uid, participante2Uid, ...]
```

---

## Flujo de Creación

1. Usuario activa toggle "Compartir este gasto" en el formulario
2. Selecciona amigos del listado (multi-select)
3. Por defecto: partes iguales. Opción de personalizar porcentajes (deben sumar 100%)
4. Preview en tiempo real del monto por persona antes de guardar
5. Al guardar:
   a. Se crea el doc de la transacción del owner (con `cardId`, `isShared: true`, `sharedId`)
   b. Se genera un `sharedId` único
   c. Por cada participante, se crean los docs espejo en su colección (sin `cardId`)
      - Si es cuotas: se crean N docs espejo (uno por mes), igual que la lógica actual de installments
   d. Se crea el doc `/sharedTransactions/{sharedId}` con los `mirrorRefs`
   e. Se envía notificación a cada participante: `shared_transaction_added`

---

## Flujo de Edición

Al editar una transacción compartida (monto, tasa, cuotas, descripción, categoría):
1. Se recalculan los montos por persona
2. Se actualizan los docs espejo via batch write (leyendo `mirrorRefs`)
3. Se envía notificación a cada participante: `shared_transaction_updated`
4. `cardId` nunca se propaga a los espejos

---

## Flujo de Eliminación

Cualquier participante (incluyendo el owner) puede eliminar:
1. Dialog de confirmación: *"Este gasto compartido se eliminará para todos los participantes. ¿Continuar?"*
2. Al confirmar:
   a. Se lee `/sharedTransactions/{sharedId}` para obtener `mirrorRefs`
   b. Batch delete de todos los docs espejo
   c. Delete del doc del owner
   d. Delete del doc `/sharedTransactions/{sharedId}`
   e. Notificación a todos los participantes: `shared_transaction_deleted`

---

## Nueva Transacción — Pantalla Completa

El `AddTransactionModal` actual se migra a `app/add-transaction.tsx` como pantalla completa (igual que el patrón de WhatsNew — ocupa toda la pantalla con navegación propia).

- El FAB del home navega a `router.push('/add-transaction')`
- La pantalla usa `AppHeader` con botón de cierre (✕) en lugar de back
- Todo el contenido actual del modal se preserva intacto
- La sección de "Compartir" se añade al final del formulario, antes del botón guardar

---

## UI — Formulario de Gasto Compartido

Al final del formulario de nueva/editar transacción:

```
┌─────────────────────────────────────┐
│  [toggle] Compartir este gasto      │
└─────────────────────────────────────┘

[Cuando toggle está activo:]
┌─────────────────────────────────────┐
│  Con quién                          │
│  [Avatar] @AMancilla   [✓ selected] │
│  [Avatar] @JLopez      [  ]        │
│  ...                                │
├─────────────────────────────────────┤
│  División                           │
│  ● Partes iguales                   │
│  ○ Porcentajes personalizados       │
│                                     │
│  [Si personalizados:]               │
│  @AMancilla  [  50  ]%              │
│  @JLopez     [  50  ]%  ← suma 100 │
├─────────────────────────────────────┤
│  Preview                            │
│  Tú: $150/mes × 4 cuotas           │
│  @AMancilla: $150/mes × 4 cuotas   │
└─────────────────────────────────────┘
```

---

## UI — Historial

Las transacciones compartidas aparecen mezcladas con las propias. Se añade un chip bajo la descripción:

- Owner ve: `👥 Compartido con @AMancilla` (o `@AMancilla y 2 más` si son 3+)
- Participante ve: `👥 Compartido por @Owner`
- El monto mostrado es el `sharedAmount` calculado para ese usuario

---

## Notificaciones

Nuevos tipos en `NotificationDoc.type`:

| Tipo | Texto |
|------|-------|
| `shared_transaction_added` | `@Owner compartió un gasto contigo: [descripción] · $[monto]/mes` |
| `shared_transaction_updated` | `@Owner actualizó un gasto compartido: [descripción]` |
| `shared_transaction_deleted` | `@Owner eliminó el gasto compartido: [descripción]` |

---

## Reglas Firestore

```
/sharedTransactions/{sharedId}
  - read:   request.auth.uid in resource.data.participantUids
  - create: request.auth != null
            && request.auth.uid == request.resource.data.ownerUid
  - update: request.auth.uid in resource.data.participantUids
  - delete: request.auth.uid in resource.data.participantUids
```

Las reglas de `/transactions/{uid}/transactions` no cambian — cada usuario solo accede a su propia subcolección.

---

## Hooks Nuevos / Modificados

| Hook/Util | Cambio |
|-----------|--------|
| `hooks/useSharedTransactions.ts` | Nuevo — `createSharedTransaction`, `updateSharedTransaction`, `deleteSharedTransaction` |
| `utils/sharedCalc.ts` | Nuevo — `calcSharedAmount(amount, rate, installments, percentage)` |
| `hooks/useTransactions.ts` | Sin cambios — los espejos se leen exactamente igual que transacciones normales |
| `hooks/useNotifications.ts` | Añadir los 3 nuevos tipos de notificación |

---

## Pantallas / Componentes Nuevos o Modificados

| Archivo | Acción |
|---------|--------|
| `app/add-transaction.tsx` | Nuevo — migración del modal actual a pantalla completa |
| `components/AddTransactionModal.tsx` | Eliminar o deprecar |
| `components/SharedExpenseSection.tsx` | Nuevo — sección de compartir dentro del formulario |
| `components/SharedExpenseChip.tsx` | Nuevo — chip visual en historial |
| `app/(tabs)/history.tsx` | Mostrar chip en cada transacción compartida |
| `app/(tabs)/index.tsx` | FAB apunta a `/add-transaction` |
| `types/transaction.ts` | Añadir campos `isShared`, `sharedId`, etc. |
| `types/friend.ts` | Añadir `NotificationType` nuevos |
| `locales/es.json` | Claves `sharedExpense.*` |
| `locales/en.json` | Ídem |
| `locales/it.json` | Ídem |

---

## Decisiones Tomadas

- **Documentos espejo:** cada usuario tiene su propio doc en su colección — sin joins, compatible con el hook `useTransactions` actual
- **cardId privado:** nunca se copia en los espejos; el amigo ve el gasto sin datos bancarios
- **Cualquiera puede eliminar para todos:** con dialog de confirmación explícito
- **Edición propaga automáticamente:** sin notificación de aceptación — el gasto se actualiza en silencio + notificación informativa
- **Sin Cloud Functions:** toda la lógica en cliente con batch writes; viable para grupos pequeños (amigos)
- **Porcentajes:** deben sumar exactamente 100%; la UI valida en tiempo real antes de habilitar guardar. Para partes iguales con N personas, el último participante absorbe el residuo de redondeo (ej: 3 personas → 33.33% + 33.33% + 33.34%)
- **Migración a pantalla completa:** el formulario crece con la sección de compartir — una pantalla dedicada es más ergonómica y escalable
