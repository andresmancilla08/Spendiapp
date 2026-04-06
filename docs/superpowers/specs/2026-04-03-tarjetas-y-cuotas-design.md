# Tarjetas de Pago y Cuotas con Interés — Diseño

> **Para agentes:** Usar `superpowers:subagent-driven-development` para implementar este plan tarea por tarea.

**Objetivo:** Permitir al usuario registrar sus tarjetas/cuentas colombianas, asociarlas a transacciones, y calcular automáticamente cuotas mensuales con o sin interés (TEA), creando una transacción real en Firestore por cada cuota en el mes que corresponde.

**Arquitectura:** Colección Firestore `cards` (mismo patrón que `transactions`). Campos opcionales en `Transaction` para cuotas. Utilidad de cálculo financiero pura. Onboarding post-registro para configuración inicial de tarjetas.

**Tech Stack:** React Native + Expo, Firebase Firestore, TypeScript, Zustand, expo-router

---

## Archivos nuevos

| Archivo | Responsabilidad |
|---------|----------------|
| `types/card.ts` | Tipo `Card` |
| `config/banks.ts` | Lista estática de bancos colombianos |
| `hooks/useCards.ts` | CRUD Firestore para tarjetas del usuario |
| `utils/installmentCalc.ts` | Cálculo de cuotas (sin interés y con TEA) |
| `app/(onboarding)/_layout.tsx` | Layout del grupo onboarding |
| `app/(onboarding)/select-cards.tsx` | Pantalla de selección inicial de tarjetas |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `types/transaction.ts` | Añadir campos opcionales de tarjeta y cuotas |
| `app/(auth)/register.tsx` | Redirigir a onboarding en vez de home |
| `app/(tabs)/profile.tsx` | Nueva sección "Mis tarjetas" |
| Formulario de transacciones | Campo de tarjeta + campos de cuotas condicionales |

> El formulario de transacciones se identifica durante la implementación — puede ser un modal o pantalla separada.

---

## Modelo de datos

### `types/card.ts`

```ts
export type CardType = 'debit' | 'credit';

export interface Card {
  id: string;
  userId: string;
  bankId: string;       // 'bancolombia', 'davivienda', etc.
  bankName: string;     // 'Bancolombia', 'Davivienda', etc.
  type: CardType;
  lastFour: string;     // exactamente 4 dígitos numéricos
  createdAt: Date;
}
```

### `types/transaction.ts` — campos añadidos (opcionales, no rompen datos existentes)

```ts
cardId?: string;              // ID de la tarjeta usada
installmentGroupId?: string;  // UUID compartido entre todas las cuotas de una compra
installmentNumber?: number;   // 1-based (1, 2, 3...)
installmentTotal?: number;    // total de cuotas del grupo (ej: 6)
isInstallment?: boolean;      // true si pertenece a un grupo de cuotas
```

### `config/banks.ts` — lista estática

```ts
export interface Bank {
  id: string;
  name: string;
  category: 'traditional' | 'digital' | 'other';
}

export const COLOMBIAN_BANKS: Bank[] = [
  { id: 'bancolombia',    name: 'Bancolombia',           category: 'traditional' },
  { id: 'davivienda',     name: 'Davivienda',            category: 'traditional' },
  { id: 'bbva',           name: 'BBVA',                  category: 'traditional' },
  { id: 'bogota',         name: 'Banco de Bogotá',       category: 'traditional' },
  { id: 'colpatria',      name: 'Scotiabank Colpatria',  category: 'traditional' },
  { id: 'itau',           name: 'Itaú',                  category: 'traditional' },
  { id: 'occidente',      name: 'Banco de Occidente',    category: 'traditional' },
  { id: 'popular',        name: 'Banco Popular',         category: 'traditional' },
  { id: 'avvillas',       name: 'AV Villas',             category: 'traditional' },
  { id: 'cajasocial',     name: 'Banco Caja Social',     category: 'traditional' },
  { id: 'nequi',          name: 'Nequi',                 category: 'digital'     },
  { id: 'daviplata',      name: 'Daviplata',             category: 'digital'     },
  { id: 'nubank',         name: 'Nubank',                category: 'digital'     },
  { id: 'lulo',           name: 'Lulo Bank',             category: 'digital'     },
  { id: 'rappipay',       name: 'RappiPay',              category: 'digital'     },
  { id: 'movii',          name: 'Movii',                 category: 'digital'     },
  { id: 'efectivo',       name: 'Efectivo',              category: 'other'       },
];
```

---

## Módulo 1 — Tarjetas (CRUD)

### `hooks/useCards.ts`

Exporta:
- `useCards(userId)` — suscripción en tiempo real a las tarjetas del usuario (onSnapshot), retorna `{ cards, loading, error }`
- `addCard(userId, bankId, bankName, type, lastFour): Promise<string>` — crea documento en `cards/`, retorna el nuevo `cardId`
- `deleteCard(cardId): Promise<void>` — elimina el documento

Colección Firestore: `cards/{cardId}`
Índice requerido: `userId ASC, createdAt DESC`

### Display de tarjeta

Formato visual en toda la app: `{bankName} •••• {lastFour}` + badge `[Crédito]` o `[Débito]`

---

## Módulo 2 — Onboarding post-registro

### Flujo

```
register.tsx (dialog éxito)
  → "Continuar" → router.replace('/(onboarding)/select-cards')
                                    ↓
                        select-cards.tsx
                   (seleccionar tarjetas)
                       ↓           ↓
                   "Listo"     "Omitir"
                       ↓           ↓
                  router.replace('/(tabs)/')
```

### `app/(onboarding)/select-cards.tsx`

**UI:**
- Header con título "¿Qué tarjetas tienes?" y subtítulo explicativo
- Lista de bancos agrupada: primero "Bancos tradicionales", luego "Billeteras digitales", luego "Otros"
- Cada banco muestra su nombre. Al tocar → se expande un panel inline con:
  - Chips: `[Débito]` / `[Crédito]` (selección única, requerido)
  - TextInput numérico: "Últimos 4 dígitos" (required, maxLength 4)
  - Botón "Agregar" → crea la Card en Firestore y muestra un badge de confirmación
  - Si ya tiene una tarjeta de ese banco, puede agregar otra (distinto tipo o distintos últimos 4)
- Tarjetas ya agregadas aparecen como chips debajo del nombre del banco con opción de eliminar
- Footer fijo con botones: "Omitir por ahora" (secundario) y "Listo" (primario, habilitado siempre)

**Comportamiento:**
- `setJustRegistered(false)` se llama al navegar fuera (en `handleGoHome` de register.tsx ya no va a `/(tabs)/` sino a `/(onboarding)/select-cards`)
- No hay validación mínima — el usuario puede omitir sin agregar ninguna tarjeta

---

## Módulo 3 — Gestión de tarjetas en Perfil

### `app/(tabs)/profile.tsx` — nueva sección

Después de la sección de datos personales, antes del botón de cerrar sesión:

**Sección "Mis tarjetas":**
- Título de sección con botón `+`
- Lista de tarjetas: `{bankName} •••• {lastFour}` + badge tipo
- Botón de eliminar en cada tarjeta → AppDialog de confirmación (`type: 'warning'`)
- Botón `+` → AppDialog con:
  - Picker de banco (lista scrolleable)
  - Chips Débito / Crédito
  - TextInput últimos 4 dígitos (numérico, maxLength 4)
  - Validación: los 4 campos son obligatorios antes de habilitar "Agregar"

---

## Módulo 4 — Cálculo de cuotas

### `utils/installmentCalc.ts`

```ts
/**
 * Retorna un array de n montos (en pesos colombianos, sin decimales).
 * La diferencia de redondeo va a la última cuota.
 *
 * @param amount  - Monto total de la compra
 * @param n       - Número de cuotas (≥ 1)
 * @param tea     - Tasa Efectiva Anual en porcentaje (ej: 26.4) o null para cuotas sin interés
 */
export function calculateInstallments(
  amount: number,
  n: number,
  tea: number | null
): number[] {
  if (n === 1) return [amount];

  if (!tea || tea === 0) {
    // Sin interés: división exacta, la última cuota absorbe el residuo de redondeo
    const base = Math.floor(amount / n);
    const last = amount - base * (n - 1);
    return [...Array(n - 1).fill(base), last];
  }

  // Con interés: amortización francesa (cuota fija mensual)
  // Tasa mensual equivalente a la TEA
  const r = Math.pow(1 + tea / 100, 1 / 12) - 1;
  // PMT = monto * r / (1 - (1+r)^-n)
  const pmt = (amount * r) / (1 - Math.pow(1 + r, -n));
  const rounded = Math.round(pmt);
  // Las primeras (n-1) cuotas son el PMT redondeado.
  // La última absorbe el residuo acumulado de redondeo.
  const installments = Array(n - 1).fill(rounded);
  const lastInstallment = Math.round(pmt * n) - rounded * (n - 1);
  installments.push(lastInstallment);
  return installments;
}

/**
 * Calcula la fecha de cada cuota a partir de una fecha inicial.
 * Si el día no existe en el mes destino, se ajusta al último día del mes.
 */
export function calculateInstallmentDates(startDate: Date, n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    // Ajustar si el día se desbordó (ej: 31 ene + 1 mes = 3 mar → 28 feb)
    if (d.getDate() !== startDate.getDate()) {
      d.setDate(0); // retrocede al último día del mes anterior
    }
    return d;
  });
}
```

---

## Módulo 5 — Formulario de transacciones

> El formulario vive en `components/AddTransactionModal.tsx` — es un bottom sheet modal con ScrollView interno. Los campos nuevos se añaden dentro del mismo ScrollView, después del selector de categoría.

### Campos nuevos (condicionales)

```
[Campo existentes: tipo, monto, categoría, descripción, fecha]

─── Nuevo: Método de pago ───
Selector de tarjeta (opcional)
  → Si el usuario no tiene tarjetas: texto "Agrega tarjetas en tu perfil"
  → Lista de sus tarjetas: "Bancolombia •••• 4521 [Crédito]"
  → Opción "Sin tarjeta"

─── Aparece SOLO si tarjeta seleccionada = Crédito ───
"¿Cuántas cuotas?" — picker numérico 1–36 (default: 1)

─── Aparece SOLO si cuotas > 1 ───
Toggle "¿Con interés?"
  → ON: campo "TEA %" (decimal, ej: 26.4)
  → OFF: sin campo adicional (cuotas iguales)
```

### Al guardar una transacción con cuotas (n > 1)

1. Generar `installmentGroupId` = UUID v4
2. Llamar `calculateInstallments(amount, n, tea)` → array de montos
3. Llamar `calculateInstallmentDates(date, n)` → array de fechas
4. Crear `n` documentos en Firestore, cada uno con:
   - Todos los campos base de la transacción (userId, type, category, description, createdAt)
   - `amount`: monto de esa cuota
   - `date`: fecha de esa cuota
   - `cardId`: ID de la tarjeta seleccionada
   - `installmentGroupId`: UUID compartido
   - `installmentNumber`: i + 1
   - `installmentTotal`: n
   - `isInstallment`: true
5. Usar `writeBatch` de Firestore para que todas se creen atómicamente

### Al guardar una transacción con 1 cuota o débito

- Crear 1 documento normal
- Agregar solo `cardId` (si se seleccionó tarjeta)
- No agregar campos de cuotas

---

## Módulo 6 — Display en historial y home

### Lista de transacciones

Cada transacción con `isInstallment: true` muestra:
- Descripción: `"{description} (Cuota {installmentNumber}/{installmentTotal})"`
- Chip de tarjeta debajo: `Bancolombia •••• 4521`
- El monto mostrado es el de ESA cuota (ya correcto en Firestore)

Transacciones normales con `cardId` pero sin cuotas:
- Chip de tarjeta sin texto adicional

### Balance mensual

Sin cambios en `useTransactions.ts` — ya suma/resta por `amount` del mes. Como cada cuota es un documento con su `date` en el mes correcto, el balance es exacto automáticamente.

---

## Reglas de validación

| Campo | Regla |
|-------|-------|
| `lastFour` | Exactamente 4 dígitos numéricos |
| `n` (cuotas) | Entero 1–36 |
| `tea` | Decimal positivo, max 200 (porcentaje anual) |
| Tarjeta crédito + cuotas > 1 | TEA requerida solo si toggle "Con interés" está ON |
| Tarjeta débito | Campos de cuotas ocultos y no enviados |

---

## Reglas de Firestore

```
// cards
match /cards/{cardId} {
  allow read, write: if request.auth.uid == resource.data.userId;
  allow create: if request.auth.uid == request.resource.data.userId;
}
```

Las transacciones de cuotas usan las mismas reglas que `transactions` existentes.

---

## Lo que NO entra en este spec

- Edición de cuotas ya creadas (solo se pueden crear y eliminar)
- Eliminación de grupo de cuotas completo desde el historial (se elimina cuota por cuota)
- Estadísticas por tarjeta (próximo sprint)
- Notificaciones de próximas cuotas (próximo sprint)
