# Sistema de Amigos — Parte 1: Perfil Público, Amigos y Notificaciones

**Fecha:** 2026-04-08
**App:** Spendiapp
**Stack:** React Native (Expo Router) + Firebase Firestore + i18n (es/en/it)
**Scope:** Parte 1 de 2. La Parte 2 cubrirá gastos/ingresos compartidos entre amigos.

---

## Objetivo

Permitir que usuarios de Spendiapp se encuentren entre sí mediante un `userName` único y auto-generado, envíen solicitudes de amistad, las acepten o rechacen, y vean su lista de amigos. El sistema de notificaciones creado aquí servirá de infraestructura reutilizable para futuras funcionalidades.

---

## Modelo de Datos

### `/users/{uid}` — Perfil público (colección existente, se extiende)

```ts
{
  uid: string
  displayName: string
  userName: string        // único, auto-generado al registrarse, inmutable
  photoURL: string | null
  createdAt: Timestamp
}
```

### `/friendships/{docId}` — Relaciones de amistad (nueva colección)

```ts
{
  fromId: string          // UID de quien envió la solicitud
  toId: string            // UID de quien la recibe
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### `/notifications/{docId}` — Notificaciones genéricas (nueva colección)

```ts
{
  toUserId: string
  type: 'friend_request' | 'friend_accepted'   // extensible
  data: {
    fromUserId: string
    fromUserName: string
    fromDisplayName: string
    friendshipId: string
  }
  read: boolean
  createdAt: Timestamp
}
```

---

## Generación de userName

Algoritmo aplicado sobre `displayName` al momento del registro:

1. Normalizar a ASCII (eliminar tildes y caracteres especiales)
2. Split en array de palabras
3. Reglas de partición:
   - 1 palabra: `PrimerNombre` → userName = `PrimerNombre`
   - 2 palabras: `[nombre, apellido1]` → `NApellido1`
   - 3 palabras: `[nombre1, nombre2, apellido1]` → `N1N2Apellido1`
   - 4+ palabras: `[nombre1, nombre2, apellido1, apellido2]` → `N1N2Apellido1A2`
4. Iniciales de nombres en mayúscula, primer apellido completo capitalizado, inicial del segundo apellido en mayúscula
5. Si el userName ya existe en Firestore: agregar sufijo numérico (`2`, `3`…)
6. El userName es inmutable una vez asignado

**Ejemplos:**
- `"Andrés Mancilla"` → `AMancilla`
- `"Andrés David Mancilla"` → `ADMancilla`
- `"Andrés David Mancilla Oliver"` → `ADMancillaO`
- `"María López"` → `MLopez`

---

## Reglas Firestore

```
/users/{userId}
  - read: cualquier usuario autenticado (necesario para buscar por userName)
  - write: solo request.auth.uid == userId

/friendships/{docId}
  - read: request.auth.uid == fromId OR toId
  - create: request.auth.uid == request.resource.data.fromId
  - update: request.auth.uid == resource.data.toId  // solo destinatario acepta/rechaza
  - delete: request.auth.uid == fromId OR toId

/notifications/{docId}
  - read, update: request.auth.uid == resource.data.toUserId
  - create: request.auth != null  // cualquier autenticado puede notificar a otro
```

---

## Pantallas Nuevas

### `app/friends.tsx`
- **Header:** título "Mis amigos" + botón buscar
- **Tab 1 — Amigos:** lista de usuarios con status `accepted`, mostrando avatar, displayName, userName
- **Tab 2 — Solicitudes:** sub-tabs entrantes (botones Aceptar / Rechazar) y salientes (botón Cancelar)
- **Búsqueda:** input para buscar por userName exacto; resultado muestra el perfil con botón "Enviar solicitud" (o estado si ya hay una relación)

### `app/notifications.tsx`
- Lista cronológica inversa de notificaciones del usuario autenticado
- Cada ítem muestra: tipo (ícono), texto descriptivo, tiempo relativo, punto de no-leída
- Acción de "Marcar todas como leídas"
- Al tocar una notif de `friend_request`: navega a la pestaña de Solicitudes en `/friends`

---

## Cambios en Pantallas Existentes

### `profile.tsx`
- Mostrar `userName` en la tarjeta de perfil (debajo del email), con ícono de arroba
- Agregar fila "Mis amigos" (`people-outline`) en la sección **Cuenta**, que navega a `/friends`

### `AppHeader.tsx`
- Nueva prop opcional `showNotifications: boolean`
- Cuando `true`: muestra ícono de campana a la derecha; si hay notificaciones no leídas, muestra badge numérico (máx "9+")
- Navega a `/notifications` al presionar

### `app/(tabs)/_layout.tsx`
- Pasar `showNotifications={true}` al AppHeader en las tabs principales (index, history, budget)

---

## Hooks Nuevos

| Hook | Responsabilidad |
|---|---|
| `hooks/useUserProfile.ts` | Leer y crear/actualizar perfil en `/users/{uid}` |
| `hooks/useFriends.ts` | Queries de friendships: lista de amigos, solicitudes entrantes/salientes, buscar usuario por userName, enviar/aceptar/rechazar/cancelar |
| `hooks/useNotifications.ts` | Query de notificaciones propias, marcar como leída(s), conteo de no leídas |

---

## Flujo de Usuario

```
1. Al registrarse → se genera userName y se crea doc en /users/{uid}
2. A abre /friends → busca userName de B → toca "Enviar solicitud"
   → crea /friendships/{id} {status: pending}
   → crea /notifications/{id} {toUserId: B, type: friend_request}
3. B ve badge en campana (header) → abre /notifications → toca la notif
   → navega a /friends tab Solicitudes → acepta
   → friendship.status = 'accepted'
   → crea /notifications/{id} {toUserId: A, type: friend_accepted}
4. A y B se ven mutuamente en su lista de Mis amigos
```

---

## i18n

Nuevas claves en `locales/es.json`, `en.json`, `it.json` bajo namespaces:
- `friends.*` — todas las cadenas de la pantalla de amigos
- `notifications.*` — todas las cadenas de la pantalla de notificaciones
- `profile.userName` — etiqueta del userName en la tarjeta de perfil
- `profile.friends` — label del ítem de menú "Mis amigos"

---

## Archivos a Modificar / Crear

| Archivo | Acción |
|---|---|
| `firestore.rules` | Actualizar con nuevas reglas |
| `types/friend.ts` | Nuevo — tipos `Friendship`, `NotificationDoc`, `UserProfile` |
| `hooks/useUserProfile.ts` | Nuevo |
| `hooks/useFriends.ts` | Nuevo |
| `hooks/useNotifications.ts` | Nuevo |
| `hooks/useAuth.ts` | Modificar `registerWithEmailAndPin` para crear doc en `/users/{uid}` con userName |
| `hooks/useGoogleSignIn.ts` | Modificar para crear doc en `/users/{uid}` con userName si no existe |
| `app/friends.tsx` | Nuevo |
| `app/notifications.tsx` | Nuevo |
| `components/AppHeader.tsx` | Agregar prop `showNotifications` + badge |
| `app/(tabs)/_layout.tsx` | Pasar `showNotifications` al header |
| `app/(tabs)/profile.tsx` | Agregar userName en tarjeta + fila "Mis amigos" |
| `locales/es.json` | Agregar claves `friends.*`, `notifications.*`, `profile.userName`, `profile.friends` |
| `locales/en.json` | Ídem |
| `locales/it.json` | Ídem |
| `app.json` | Bump versión minor |

---

## Decisiones Tomadas

- **userName inmutable:** evita que usuarios causen conflictos cambiándolo
- **No Cloud Functions:** toda la lógica en cliente + reglas Firestore; simplifica el stack actual
- **Notificaciones en top-level collection:** más flexible para futuras notificaciones del sistema (recordatorios, alertas de gastos, etc.)
- **Friendships bidireccionales en un solo doc:** más eficiente que dos docs espejo; se consulta con `where fromId==uid OR toId==uid`
- **userName generado al registrarse:** garantiza que todo usuario autenticado ya tenga userName, sin flujo adicional de configuración
