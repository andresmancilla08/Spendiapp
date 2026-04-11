# Metas (Savings Goals) — Design Spec
**Fecha:** 2026-04-11  
**Proyecto:** Spendiapp  
**Estado:** Aprobado

---

## Resumen

Módulo de metas de ahorro. El usuario crea metas con nombre, emoji y monto objetivo, agrega contribuciones hasta cumplirlas. Recordatorio mensual el día 3 vía Cloud Function → colección `notifications`.

---

## 1. Arquitectura y Navegación

```
Tab bar (4 tabs): Home | Presupuesto | Historial | Herramientas
                                                        ↓
                                          app/(tabs)/tools.tsx  (hub)
                                          └── Card "Metas" → app/goals.tsx
                                          └── [futuras herramientas — placeholders]

app/goals.tsx
├── Tab "Activas"     → metas en progreso
└── Tab "Completadas" → metas alcanzadas (status === 'completed')
```

**Archivos nuevos:**
- `app/(tabs)/tools.tsx` — pantalla hub Herramientas
- `app/goals.tsx` — pantalla metas con 2 tabs internos
- `hooks/useGoals.ts` — CRUD + onSnapshot Firestore
- `types/goal.ts` — tipo Goal
- `functions/src/goalsReminder.ts` — Cloud Function scheduled

**Archivos modificados:**
- `app/(tabs)/_layout.tsx` — agregar tab `tools`
- `components/AppTabBar.tsx` — agregar config para tab `tools`
- `types/friend.ts` — agregar `goal_monthly_reminder` a NotificationType
- `app/notifications.tsx` — agregar ícono y color para `goal_monthly_reminder`
- `locales/es.json`, `en.json`, `it.json` — secciones `goals` y `tools`

---

## 2. Modelo de Datos (Firestore)

### Colección `goals`

```typescript
interface Goal {
  id: string;
  userId: string;
  name: string;           // "Viaje a Europa"
  emoji: string;          // "✈️"
  targetAmount: number;   // 5000000 (COP)
  savedAmount: number;    // acumulado de contribuciones
  status: 'active' | 'completed';
  createdAt: Timestamp;
  completedAt?: Timestamp; // seteado al alcanzar targetAmount
}
```

**ID del documento:** auto-generado por Firestore (`addDoc`)  
**Índice requerido:** `userId` + `status` (compuesto, para query filtrada)

### Operaciones del hook `useGoals(userId)`

| Función | Descripción |
|---|---|
| `addGoal(name, emoji, targetAmount)` | Crea doc con savedAmount=0, status='active' |
| `addContribution(goalId, amount)` | `savedAmount += amount`; si savedAmount ≥ targetAmount → status='completed', completedAt=now |
| `deleteGoal(goalId)` | Elimina el doc |
| `useGoals` retorna | `{ goals, loading, addGoal, addContribution, deleteGoal }` |

Listener `onSnapshot` filtra por `userId`, ordena por `createdAt desc`.

---

## 3. Pantallas

### 3.1 `app/(tabs)/tools.tsx` — Hub Herramientas

- AppHeader + PageTitle ("Herramientas")
- Grid/lista de cards de herramientas
- Card Metas: emoji 🎯, título, descripción corta → `router.push('/goals')`
- Placeholders visuales para futuras herramientas (opacados)
- ScreenTransition wrapper

### 3.2 `app/goals.tsx` — Pantalla Metas

**Header:** AppHeader con back + PageTitle  
**Tabs internos:** "Activas" | "Completadas"  

**Lista Activas:**
- Cada card: emoji + nombre + progress bar + monto guardado / objetivo + % completado
- FAB "+" o botón primario para crear nueva meta
- Tap en card → AppDialog para agregar contribución (input monto)
- Long press → AppDialog de confirmación para eliminar

**Lista Completadas:**
- Misma card pero con check verde + fecha de completado
- Sin opción de agregar contribución
- Long press → eliminar

**Estado vacío:** ilustración + texto motivacional

---

## 4. Diálogos (AppDialog)

| Dialog | Tipo | Campos |
|---|---|---|
| Crear meta | `info` | Emoji picker simple (input texto), nombre, monto objetivo |
| Agregar contribución | `info` | Monto a agregar, muestra progreso actual |
| Eliminar meta | `warning` | Confirmación con nombre en bold |
| Meta completada | `success` | Celebración al alcanzar el 100% |

---

## 5. Cloud Function — Recordatorio Mensual

**Archivo:** `functions/src/goalsReminder.ts`  
**Schedule:** `every month on day 3 at 09:00` (Colombia timezone: America/Bogota)  
**Cron:** `0 9 3 * *`

**Lógica:**
1. Query `goals` donde `status == 'active'`
2. Agrupar por `userId` (evitar múltiples notifs por usuario)
3. Por cada userId con ≥1 meta activa → `addDoc` en `notifications`:

```typescript
{
  toUserId: string,
  type: 'goal_monthly_reminder',
  read: false,
  createdAt: Timestamp.now(),
  data: { count: number }  // número de metas activas
}
```

---

## 6. Notificaciones

**Tipo nuevo:** `goal_monthly_reminder` en `NotificationType`  
**Ícono:** `flag-outline` (Ionicons)  
**Color:** `primary`  
**Texto i18n:** `notifications.goal_monthly_reminder` → "Recuerda agregar a tus {{count}} metas activas este mes 🎯"

---

## 7. i18n — Claves nuevas

### Sección `goals`
```json
{
  "title": "Mis Metas",
  "pageDesc": "Ahorra paso a paso hacia tus sueños",
  "activeTab": "Activas",
  "completedTab": "Completadas",
  "createTitle": "Nueva meta",
  "nameLabel": "Nombre de la meta",
  "namePlaceholder": "Ej: Viaje a Europa",
  "emojiLabel": "Emoji",
  "emojiPlaceholder": "✈️",
  "targetLabel": "Monto objetivo",
  "targetPlaceholder": "$ 0",
  "addContribution": "Agregar ahorro",
  "contributionLabel": "¿Cuánto vas a agregar?",
  "deleteTitle": "Eliminar meta",
  "deleteDesc": "¿Seguro que quieres eliminar",
  "deleteDescAfter": "? Esta acción no se puede deshacer.",
  "completedTitle": "¡Meta cumplida!",
  "completedDesc": "Lograste tu meta",
  "emptyActive": "Aún no tienes metas activas",
  "emptyActiveSub": "Crea tu primera meta y empieza a ahorrar",
  "emptyCompleted": "Aún no has completado ninguna meta",
  "emptyCompletedSub": "¡Sigue adelante, pronto lo lograrás!",
  "saved": "guardado",
  "of": "de",
  "createButton": "Crear meta",
  "saveButton": "Guardar",
  "cancelButton": "Cancelar",
  "deleteButton": "Eliminar",
  "addButton": "Agregar",
  "toasts": {
    "created": "Meta creada",
    "deleted": "Meta eliminada",
    "contributed": "¡Ahorro registrado!",
    "completed": "¡Felicitaciones, meta cumplida!",
    "error": "Ocurrió un error"
  }
}
```

### Sección `tools`
```json
{
  "title": "Herramientas",
  "pageDesc": "Funcionalidades para potenciar tus finanzas",
  "goalsCard": {
    "title": "Metas de ahorro",
    "description": "Ahorra para lo que más importa"
  }
}
```

### Notificación (en sección `notifications`)
```json
{
  "goal_monthly_reminder": "Recuerda agregar a tus {{count}} metas activas este mes 🎯"
}
```

---

## 8. Restricciones técnicas

- PWA only — sin push nativo, recordatorio vía Firestore notifications
- Todo texto vía `t()` — sin strings hardcodeados
- `ScreenTransition` wrapper obligatorio en todas las pantallas
- Colores via `useTheme()`, fuentes via `Fonts.*`
- AppDialog para todos los modales (nunca Alert nativo)
- Datos bold en AppDialog descriptions via ReactNode `<Text fontFamily={Fonts.bold}>`
- Firestore rules deben cubrir colección `goals` (solo el propio usuario puede leer/escribir)

---

## 9. Firestore Security Rules (adición)

```
match /goals/{goalId} {
  allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
  allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
}
```
