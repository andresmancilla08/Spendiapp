# Friends System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la primera parte del sistema de amigos: perfiles públicos con userName auto-generado, solicitudes de amistad con aceptación/rechazo, lista de amigos, y módulo de notificaciones genérico con campana en el header.

**Architecture:** Tres colecciones Firestore nuevas/extendidas (`users`, `friendships`, `notifications`). Toda la lógica en el cliente con reglas Firestore robustas. Sin Cloud Functions. Dos pantallas nuevas (`/friends`, `/notifications`) y un componente `NotificationBell` reutilizable.

**Tech Stack:** React Native (Expo Router), Firebase Firestore, Zustand, react-i18next, Ionicons, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-08-friends-system-design.md`

---

## File Map

| Archivo | Acción |
|---|---|
| `types/friend.ts` | CREAR — tipos compartidos del feature |
| `utils/generateUserName.ts` | CREAR — algoritmo de generación de userName |
| `firestore.rules` | MODIFICAR — nuevas reglas para users, friendships, notifications |
| `locales/es.json` | MODIFICAR — claves friends.* y notifications.* |
| `locales/en.json` | MODIFICAR — ídem en inglés |
| `locales/it.json` | MODIFICAR — ídem en italiano |
| `hooks/useUserProfile.ts` | CREAR — CRUD de perfil en /users/{uid} |
| `hooks/useFriends.ts` | CREAR — queries y acciones de friendships |
| `hooks/useNotifications.ts` | CREAR — queries y acciones de notifications |
| `app/_layout.tsx` | MODIFICAR — crear perfil en onAuthStateChanged |
| `components/NotificationBell.tsx` | CREAR — campana reutilizable con badge |
| `components/AppHeader.tsx` | MODIFICAR — prop showNotifications |
| `app/(tabs)/index.tsx` | MODIFICAR — campana en header de home |
| `app/(tabs)/profile.tsx` | MODIFICAR — userName en tarjeta + ítem Mis amigos |
| `app/friends.tsx` | CREAR — pantalla de amigos y solicitudes |
| `app/notifications.tsx` | CREAR — pantalla de notificaciones |
| `app.json` | MODIFICAR — bump versión a 1.4.0 |

---

## Task 1: Tipos compartidos

**Files:**
- Create: `types/friend.ts`

- [ ] **Step 1: Crear el archivo de tipos**

```ts
// types/friend.ts
import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  userName: string;
  photoURL: string | null;
  createdAt: Timestamp;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

export interface Friendship {
  id: string;
  fromId: string;
  toId: string;
  status: FriendshipStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type NotificationType = 'friend_request' | 'friend_accepted';

export interface NotificationData {
  fromUserId: string;
  fromUserName: string;
  fromDisplayName: string;
  friendshipId: string;
}

export interface NotificationDoc {
  id: string;
  toUserId: string;
  type: NotificationType;
  data: NotificationData;
  read: boolean;
  createdAt: Timestamp;
}
```

- [ ] **Step 2: Commit**

```bash
git add types/friend.ts
git commit -m "feat: tipos UserProfile, Friendship, NotificationDoc"
```

---

## Task 2: Utilidad generateUserName

**Files:**
- Create: `utils/generateUserName.ts`

- [ ] **Step 1: Crear la utilidad**

```ts
// utils/generateUserName.ts

function capitalize(word: string): string {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Genera un userName a partir de displayName.
 * Reglas:
 *   1 palabra  → "Nombre"
 *   2 palabras → inicialNombre + Apellido1          e.g. "MLopez"
 *   3 palabras → inicialN1 + inicialN2 + Apellido1  e.g. "MJLopez"
 *   4+ palabras→ inicialN1 + inicialN2 + Apellido1 + inicialApellido2  e.g. "ADMancillaO"
 *
 * Normaliza tildes/caracteres especiales antes de generar.
 */
export function generateUserName(displayName: string): string {
  const normalized = displayName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length === 0) return 'Usuario';

  if (words.length === 1) {
    return capitalize(words[0]);
  }

  let names: string[];
  let lastNames: string[];

  if (words.length === 2) {
    names = [words[0]];
    lastNames = [words[1]];
  } else if (words.length === 3) {
    names = [words[0], words[1]];
    lastNames = [words[2]];
  } else {
    // 4+ palabras: primeros 2 son nombres, últimos 2 son apellidos
    names = [words[0], words[1]];
    lastNames = [words[words.length - 2], words[words.length - 1]];
  }

  const initials = names.map((n) => n.charAt(0).toUpperCase()).join('');
  const apellido1 = capitalize(lastNames[0]);
  const apellido2Initial = lastNames.length > 1 ? lastNames[1].charAt(0).toUpperCase() : '';

  return `${initials}${apellido1}${apellido2Initial}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add utils/generateUserName.ts
git commit -m "feat: utilidad generateUserName con normalización de tildes"
```

---

## Task 3: Actualizar reglas Firestore

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Reemplazar el contenido completo de `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /transactions/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    match /cards/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    match /budgets/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    match /categories/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Perfil público: cualquier auth puede leer (búsqueda por userName),
    // solo el propio usuario puede escribir
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Friendships: leer/eliminar si eres fromId o toId
    // Crear solo si eres el remitente (fromId)
    // Actualizar solo si eres el destinatario (toId) — aceptar/rechazar
    match /friendships/{docId} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.fromId ||
         request.auth.uid == resource.data.toId);
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.fromId;
      allow update: if request.auth != null &&
        request.auth.uid == resource.data.toId;
      allow delete: if request.auth != null &&
        (request.auth.uid == resource.data.fromId ||
         request.auth.uid == resource.data.toId);
    }

    // Notificaciones: leer/actualizar solo el destinatario
    // Cualquier usuario autenticado puede crear (necesario para notificar a otro usuario)
    match /notifications/{docId} {
      allow read, update: if request.auth != null &&
        request.auth.uid == resource.data.toUserId;
      allow create: if request.auth != null;
    }

  }
}
```

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "feat: reglas Firestore para users públicos, friendships y notifications"
```

---

## Task 4: Claves i18n

**Files:**
- Modify: `locales/es.json`
- Modify: `locales/en.json`
- Modify: `locales/it.json`

- [ ] **Step 1: Agregar claves en `locales/es.json`** — añadir antes del cierre `}` del JSON, después de la clave `"pwaInstall"`:

```json
  "friends": {
    "title": "Mis amigos",
    "tabs": {
      "friends": "Amigos",
      "requests": "Solicitudes"
    },
    "search": {
      "placeholder": "Buscar por @usuario",
      "button": "Buscar",
      "notFound": "No encontramos a @{{userName}}",
      "notFoundSub": "Verifica el nombre de usuario",
      "alreadyFriends": "Ya son amigos",
      "requestPending": "Solicitud pendiente",
      "youSent": "Enviaste una solicitud",
      "sendRequest": "Enviar solicitud"
    },
    "list": {
      "empty": "Aún no tienes amigos en Spendia",
      "emptySub": "Busca por @usuario para agregar amigos",
      "count_one": "{{count}} amigo",
      "count_other": "{{count}} amigos"
    },
    "requests": {
      "incoming": "ENTRANTES",
      "outgoing": "ENVIADAS",
      "noIncoming": "Sin solicitudes entrantes",
      "noOutgoing": "No enviaste solicitudes",
      "accept": "Aceptar",
      "reject": "Rechazar",
      "cancel": "Cancelar"
    },
    "remove": {
      "button": "Eliminar amigo",
      "dialogTitle": "¿Eliminar amigo?",
      "dialogDescBefore": "¿Seguro que quieres eliminar a ",
      "dialogDescAfter": " de tus amigos?",
      "confirm": "Sí, eliminar",
      "success": "Amigo eliminado"
    },
    "toasts": {
      "requestSent": "Solicitud enviada a @{{userName}}",
      "requestCancelled": "Solicitud cancelada",
      "accepted": "¡Ahora son amigos!",
      "rejected": "Solicitud rechazada",
      "removed": "Amigo eliminado",
      "error": "Ocurrió un error. Intenta de nuevo."
    }
  },
  "notifications": {
    "title": "Notificaciones",
    "empty": "Sin notificaciones",
    "emptySub": "Aquí aparecerán tus notificaciones",
    "markAllRead": "Marcar todo como leído",
    "friend_request": "{{name}} te envió una solicitud de amistad",
    "friend_accepted": "{{name}} aceptó tu solicitud de amistad",
    "timeAgo": {
      "justNow": "Ahora mismo",
      "minutesAgo": "Hace {{n}} min",
      "hoursAgo": "Hace {{n}} h",
      "daysAgo": "Hace {{n}} d"
    }
  }
```

También agregar dentro de `"profile"`, después de `"providerEmail"`:

```json
    "userName": "@{{userName}}",
    "friends": {
      "section": "SOCIAL",
      "label": "Mis amigos"
    }
```

- [ ] **Step 2: Agregar claves en `locales/en.json`** — misma estructura, valores en inglés:

```json
  "friends": {
    "title": "My friends",
    "tabs": {
      "friends": "Friends",
      "requests": "Requests"
    },
    "search": {
      "placeholder": "Search by @username",
      "button": "Search",
      "notFound": "@{{userName}} not found",
      "notFoundSub": "Check the username and try again",
      "alreadyFriends": "Already friends",
      "requestPending": "Request pending",
      "youSent": "You sent a request",
      "sendRequest": "Send request"
    },
    "list": {
      "empty": "You don't have any friends on Spendia yet",
      "emptySub": "Search by @username to add friends",
      "count_one": "{{count}} friend",
      "count_other": "{{count}} friends"
    },
    "requests": {
      "incoming": "INCOMING",
      "outgoing": "SENT",
      "noIncoming": "No incoming requests",
      "noOutgoing": "You haven't sent any requests",
      "accept": "Accept",
      "reject": "Decline",
      "cancel": "Cancel"
    },
    "remove": {
      "button": "Remove friend",
      "dialogTitle": "Remove friend?",
      "dialogDescBefore": "Are you sure you want to remove ",
      "dialogDescAfter": " from your friends?",
      "confirm": "Yes, remove",
      "success": "Friend removed"
    },
    "toasts": {
      "requestSent": "Request sent to @{{userName}}",
      "requestCancelled": "Request cancelled",
      "accepted": "You're now friends!",
      "rejected": "Request declined",
      "removed": "Friend removed",
      "error": "Something went wrong. Try again."
    }
  },
  "notifications": {
    "title": "Notifications",
    "empty": "No notifications yet",
    "emptySub": "Your notifications will appear here",
    "markAllRead": "Mark all as read",
    "friend_request": "{{name}} sent you a friend request",
    "friend_accepted": "{{name}} accepted your friend request",
    "timeAgo": {
      "justNow": "Just now",
      "minutesAgo": "{{n}} min ago",
      "hoursAgo": "{{n}}h ago",
      "daysAgo": "{{n}}d ago"
    }
  }
```

También en `"profile"`:
```json
    "userName": "@{{userName}}",
    "friends": {
      "section": "SOCIAL",
      "label": "My friends"
    }
```

- [ ] **Step 3: Agregar claves en `locales/it.json`** — misma estructura, valores en italiano:

```json
  "friends": {
    "title": "I miei amici",
    "tabs": {
      "friends": "Amici",
      "requests": "Richieste"
    },
    "search": {
      "placeholder": "Cerca per @utente",
      "button": "Cerca",
      "notFound": "@{{userName}} non trovato",
      "notFoundSub": "Controlla il nome utente e riprova",
      "alreadyFriends": "Siete già amici",
      "requestPending": "Richiesta in attesa",
      "youSent": "Hai inviato una richiesta",
      "sendRequest": "Invia richiesta"
    },
    "list": {
      "empty": "Non hai ancora amici su Spendia",
      "emptySub": "Cerca per @utente per aggiungere amici",
      "count_one": "{{count}} amico",
      "count_other": "{{count}} amici"
    },
    "requests": {
      "incoming": "IN ARRIVO",
      "outgoing": "INVIATE",
      "noIncoming": "Nessuna richiesta in arrivo",
      "noOutgoing": "Non hai inviato richieste",
      "accept": "Accetta",
      "reject": "Rifiuta",
      "cancel": "Annulla"
    },
    "remove": {
      "button": "Rimuovi amico",
      "dialogTitle": "Rimuovere amico?",
      "dialogDescBefore": "Sei sicuro di voler rimuovere ",
      "dialogDescAfter": " dai tuoi amici?",
      "confirm": "Sì, rimuovi",
      "success": "Amico rimosso"
    },
    "toasts": {
      "requestSent": "Richiesta inviata a @{{userName}}",
      "requestCancelled": "Richiesta annullata",
      "accepted": "Siete amici ora!",
      "rejected": "Richiesta rifiutata",
      "removed": "Amico rimosso",
      "error": "Si è verificato un errore. Riprova."
    }
  },
  "notifications": {
    "title": "Notifiche",
    "empty": "Nessuna notifica",
    "emptySub": "Le tue notifiche appariranno qui",
    "markAllRead": "Segna tutto come letto",
    "friend_request": "{{name}} ti ha inviato una richiesta di amicizia",
    "friend_accepted": "{{name}} ha accettato la tua richiesta di amicizia",
    "timeAgo": {
      "justNow": "Adesso",
      "minutesAgo": "{{n}} min fa",
      "hoursAgo": "{{n}}h fa",
      "daysAgo": "{{n}}g fa"
    }
  }
```

También en `"profile"`:
```json
    "userName": "@{{userName}}",
    "friends": {
      "section": "SOCIAL",
      "label": "I miei amici"
    }
```

- [ ] **Step 4: Commit**

```bash
git add locales/es.json locales/en.json locales/it.json
git commit -m "feat: claves i18n para sistema de amigos y notificaciones"
```

---

## Task 5: Hook useUserProfile

**Files:**
- Create: `hooks/useUserProfile.ts`

- [ ] **Step 1: Crear el hook**

```ts
// hooks/useUserProfile.ts
import {
  doc, getDoc, setDoc, query, collection, where, getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile } from '../types/friend';
import { generateUserName } from '../utils/generateUserName';

/** Crea el perfil en Firestore si no existe. Idempotente. */
export async function createUserProfile(
  uid: string,
  displayName: string,
  photoURL: string | null,
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const existing = await getDoc(userRef);
  if (existing.exists()) return;

  const userName = await generateUniqueUserName(displayName);
  await setDoc(userRef, {
    uid,
    displayName,
    userName,
    photoURL,
    createdAt: serverTimestamp(),
  });
}

async function generateUniqueUserName(displayName: string): Promise<string> {
  const base = generateUserName(displayName);
  if (!(await userNameExists(base))) return base;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}${i}`;
    if (!(await userNameExists(candidate))) return candidate;
  }
  return `${base}${Date.now()}`;
}

async function userNameExists(userName: string): Promise<boolean> {
  const q = query(collection(db, 'users'), where('userName', '==', userName));
  const snap = await getDocs(q);
  return !snap.empty;
}

/** Obtiene el perfil de un usuario por UID. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

/** Busca un perfil por userName exacto (case-sensitive). */
export async function searchUserByUserName(userName: string): Promise<UserProfile | null> {
  const q = query(collection(db, 'users'), where('userName', '==', userName));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as UserProfile;
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useUserProfile.ts
git commit -m "feat: hook useUserProfile — crear, leer y buscar perfiles"
```

---

## Task 6: Crear perfil en auth state change

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Importar `createUserProfile` en `app/_layout.tsx`**

Agregar al bloque de imports existente:

```ts
import { createUserProfile } from '../hooks/useUserProfile';
```

- [ ] **Step 2: Modificar el `onAuthStateChanged` callback en `app/_layout.tsx`**

Reemplazar:

```ts
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((authUser) => {
      setUser(authUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);
```

Con:

```ts
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((authUser) => {
      if (authUser) {
        // Crear perfil Firestore si no existe (idempotente)
        createUserProfile(
          authUser.uid,
          authUser.displayName ?? authUser.email ?? 'Usuario',
          authUser.photoURL,
        ).catch(() => {
          // Fallo silencioso — el perfil se creará en el siguiente login
        });
      }
      setUser(authUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);
```

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: crear perfil Firestore automáticamente en onAuthStateChanged"
```

---

## Task 7: Hook useFriends

**Files:**
- Create: `hooks/useFriends.ts`

- [ ] **Step 1: Crear el hook**

```ts
// hooks/useFriends.ts
import { useEffect, useRef, useState } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Friendship } from '../types/friend';

/** Escucha en tiempo real todas las friendships del usuario (from o to). */
export function useFriends(uid: string) {
  const fromRef = useRef<Record<string, Friendship>>({});
  const toRef = useRef<Record<string, Friendship>>({});
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const merge = () => {
      setFriendships(Object.values({ ...fromRef.current, ...toRef.current }));
    };

    const q1 = query(collection(db, 'friendships'), where('fromId', '==', uid));
    const q2 = query(collection(db, 'friendships'), where('toId', '==', uid));

    const unsub1 = onSnapshot(q1, (snap) => {
      fromRef.current = {};
      snap.docs.forEach((d) => {
        fromRef.current[d.id] = { id: d.id, ...d.data() } as Friendship;
      });
      merge();
      setLoading(false);
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      toRef.current = {};
      snap.docs.forEach((d) => {
        toRef.current[d.id] = { id: d.id, ...d.data() } as Friendship;
      });
      merge();
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [uid]);

  const acceptedFriends = friendships.filter((f) => f.status === 'accepted');
  const incomingRequests = friendships.filter(
    (f) => f.status === 'pending' && f.toId === uid,
  );
  const outgoingRequests = friendships.filter(
    (f) => f.status === 'pending' && f.fromId === uid,
  );

  return { acceptedFriends, incomingRequests, outgoingRequests, loading };
}

/** Envía una solicitud de amistad y crea la notificación para el destinatario. */
export async function sendFriendRequest(
  fromId: string,
  toId: string,
  fromProfile: { userName: string; displayName: string },
): Promise<void> {
  const ref = await addDoc(collection(db, 'friendships'), {
    fromId,
    toId,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'notifications'), {
    toUserId: toId,
    type: 'friend_request',
    data: {
      fromUserId: fromId,
      fromUserName: fromProfile.userName,
      fromDisplayName: fromProfile.displayName,
      friendshipId: ref.id,
    },
    read: false,
    createdAt: serverTimestamp(),
  });
}

/** Acepta una solicitud: actualiza status y notifica al remitente. */
export async function acceptFriendRequest(
  friendshipId: string,
  acceptorId: string,
  acceptorProfile: { userName: string; displayName: string },
  requestorId: string,
): Promise<void> {
  await updateDoc(doc(db, 'friendships', friendshipId), {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'notifications'), {
    toUserId: requestorId,
    type: 'friend_accepted',
    data: {
      fromUserId: acceptorId,
      fromUserName: acceptorProfile.userName,
      fromDisplayName: acceptorProfile.displayName,
      friendshipId,
    },
    read: false,
    createdAt: serverTimestamp(),
  });
}

/** Rechaza la solicitud (status → rejected). */
export async function rejectFriendRequest(friendshipId: string): Promise<void> {
  await updateDoc(doc(db, 'friendships', friendshipId), {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  });
}

/** Cancela una solicitud saliente (elimina el doc). */
export async function cancelFriendRequest(friendshipId: string): Promise<void> {
  await deleteDoc(doc(db, 'friendships', friendshipId));
}

/** Elimina una amistad aceptada. */
export async function removeFriend(friendshipId: string): Promise<void> {
  await deleteDoc(doc(db, 'friendships', friendshipId));
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useFriends.ts
git commit -m "feat: hook useFriends — escuchar, enviar, aceptar, rechazar, eliminar"
```

---

## Task 8: Hook useNotifications

**Files:**
- Create: `hooks/useNotifications.ts`

- [ ] **Step 1: Crear el hook**

```ts
// hooks/useNotifications.ts
import { useEffect, useState } from 'react';
import {
  collection, query, where, onSnapshot, updateDoc, doc,
  orderBy, writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { NotificationDoc } from '../types/friend';

export function useNotifications(uid: string) {
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', uid),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotificationDoc),
      );
      setLoading(false);
    });

    return unsub;
  }, [uid]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (notifId: string): Promise<void> => {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  };

  const markAllAsRead = async (): Promise<void> => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useNotifications.ts
git commit -m "feat: hook useNotifications — escuchar, contar no leídas, marcar leídas"
```

---

## Task 9: Componente NotificationBell + AppHeader

**Files:**
- Create: `components/NotificationBell.tsx`
- Modify: `components/AppHeader.tsx`

- [ ] **Step 1: Crear `components/NotificationBell.tsx`**

Este componente es reutilizable — se usa en AppHeader y en el home screen.

```tsx
// components/NotificationBell.tsx
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationBellProps {
  uid: string;
}

export default function NotificationBell({ uid }: NotificationBellProps) {
  const { colors } = useTheme();
  const { unreadCount } = useNotifications(uid);

  return (
    <TouchableOpacity
      onPress={() => router.push('/notifications')}
      activeOpacity={0.7}
      style={styles.button}
    >
      <Ionicons name="notifications-outline" size={22} color={colors.primary} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <Text style={styles.badgeText}>
            {unreadCount > 9 ? '9+' : String(unreadCount)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 16,
  },
});
```

- [ ] **Step 2: Actualizar `components/AppHeader.tsx`**

Reemplazar el archivo completo con:

```tsx
// components/AppHeader.tsx
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import NotificationBell from './NotificationBell';

interface AppHeaderProps {
  showBack?: boolean;
  onBack?: () => void;
  showNotifications?: boolean;
}

export default function AppHeader({
  showBack = true,
  onBack,
  showNotifications = false,
}: AppHeaderProps) {
  const { colors } = useTheme();
  const { user } = useAuthStore();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  return (
    <View style={[styles.header, { backgroundColor: 'transparent' }]}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.right}>
        {showNotifications && user?.uid && (
          <NotificationBell uid={user.uid} />
        )}
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  left: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  logo: {
    width: 44,
    height: 44,
  },
});
```

- [ ] **Step 3: Activar campana en `app/(tabs)/budget.tsx`**

Buscar `<AppHeader showBack={false} />` y reemplazar con:

```tsx
<AppHeader showBack={false} showNotifications />
```

- [ ] **Step 4: Commit**

```bash
git add components/NotificationBell.tsx components/AppHeader.tsx app/(tabs)/budget.tsx
git commit -m "feat: NotificationBell con badge y prop showNotifications en AppHeader"
```

---

## Task 10: Campana de notificaciones en home screen

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Agregar import de NotificationBell en `app/(tabs)/index.tsx`**

Agregar al bloque de imports:

```ts
import NotificationBell from '../../components/NotificationBell';
```

- [ ] **Step 2: Modificar el header de home en `app/(tabs)/index.tsx`**

Buscar este bloque:

```tsx
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Spendia</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
```

Reemplazar con:

```tsx
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Spendia</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {user?.uid && <NotificationBell uid={user.uid} />}
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
```

Y agregar el cierre del nuevo `<View>` después del `</TouchableOpacity>` del avatar:

```tsx
          </TouchableOpacity>
        </View>
```

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: campana de notificaciones en header del home"
```

---

## Task 11: Actualizar pantalla de perfil

**Files:**
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Agregar import de `useUserProfile` en `profile.tsx`**

Agregar al bloque de imports:

```ts
import { getUserProfile } from '../../hooks/useUserProfile';
```

- [ ] **Step 2: Agregar estado y carga del userName en `ProfileScreen`**

Agregar junto a los otros useState al inicio de `ProfileScreen`:

```ts
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    if (user?.uid) {
      getUserProfile(user.uid).then((profile) => {
        if (profile) setUserName(profile.userName);
      });
    }
  }, [user?.uid]);
```

- [ ] **Step 3: Mostrar `@userName` en la tarjeta de perfil**

Buscar este bloque en el JSX:

```tsx
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
```

Reemplazar con:

```tsx
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
          {userName ? (
            <Text style={[styles.profileUserName, { color: colors.textTertiary }]}>
              {t('profile.userName', { userName })}
            </Text>
          ) : null}
```

- [ ] **Step 4: Agregar estilo `profileUserName`**

En el objeto `StyleSheet.create`, agregar:

```ts
  profileUserName: { fontSize: 12, fontFamily: Fonts.medium, marginTop: 2 },
```

- [ ] **Step 5: Agregar sección SOCIAL con ítem "Mis amigos"**

Buscar en el JSX de `ProfileScreen` el inicio de la sección CUENTA:

```tsx
        {/* CUENTA */}
        <SectionTitle label={t('profile.sections.account')} />
```

Agregar ANTES de esa sección:

```tsx
        {/* SOCIAL */}
        <SectionTitle label={t('profile.friends.section')} />
        <View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
          <OptionItem
            icon="people-outline"
            label={t('profile.friends.label')}
            onPress={() => router.push('/friends')}
          />
        </View>
```

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/profile.tsx
git commit -m "feat: userName y sección Mis amigos en pantalla de perfil"
```

---

## Task 12: Pantalla de amigos

**Files:**
- Create: `app/friends.tsx`

- [ ] **Step 1: Crear `app/friends.tsx`**

```tsx
// app/friends.tsx
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import {
  useFriends, sendFriendRequest, acceptFriendRequest,
  rejectFriendRequest, cancelFriendRequest, removeFriend,
} from '../hooks/useFriends';
import { getUserProfile, searchUserByUserName } from '../hooks/useUserProfile';
import { UserProfile, Friendship } from '../types/friend';
import AppHeader from '../components/AppHeader';
import ScreenBackground from '../components/ScreenBackground';
import AppDialog from '../components/AppDialog';
import { Fonts } from '../config/fonts';

type Tab = 'friends' | 'requests';

export default function FriendsScreen() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const uid = user?.uid ?? '';

  const { acceptedFriends, incomingRequests, outgoingRequests, loading } = useFriends(uid);

  const [tab, setTab] = useState<Tab>('friends');
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<UserProfile | null | 'not_found'>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Estado para perfil propio (necesario para crear solicitudes)
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  useState(() => {
    if (uid) getUserProfile(uid).then(setMyProfile);
  });

  // Dialog eliminar amigo
  const [removeDialog, setRemoveDialog] = useState<{ visible: boolean; friendship: Friendship | null }>({
    visible: false, friendship: null,
  });

  // Cache de perfiles para mostrar datos de amigos
  const [profileCache, setProfileCache] = useState<Record<string, UserProfile>>({});

  const loadProfile = useCallback(async (targetUid: string) => {
    if (profileCache[targetUid]) return;
    const profile = await getUserProfile(targetUid);
    if (profile) {
      setProfileCache((prev) => ({ ...prev, [targetUid]: profile }));
    }
  }, [profileCache]);

  // Cargar perfiles de amigos y solicitudes
  useState(() => {
    [...acceptedFriends, ...incomingRequests, ...outgoingRequests].forEach((f) => {
      const otherUid = f.fromId === uid ? f.toId : f.fromId;
      loadProfile(otherUid);
    });
  });

  const handleSearch = async () => {
    const trimmed = searchText.trim();
    if (!trimmed) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const found = await searchUserByUserName(trimmed);
      setSearchResult(found ?? 'not_found');
    } catch {
      setSearchResult('not_found');
    } finally {
      setSearching(false);
    }
  };

  const getFriendshipStatus = (targetUid: string) => {
    const all = [...acceptedFriends, ...incomingRequests, ...outgoingRequests];
    return all.find((f) => f.fromId === targetUid || f.toId === targetUid) ?? null;
  };

  const handleSendRequest = async (target: UserProfile) => {
    if (!myProfile) return;
    setActionLoading(target.uid);
    try {
      await sendFriendRequest(uid, target.uid, {
        userName: myProfile.userName,
        displayName: myProfile.displayName,
      });
      showToast(t('friends.toasts.requestSent', { userName: target.userName }), 'success');
      setSearchResult(null);
      setSearchText('');
    } catch {
      showToast(t('friends.toasts.error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (f: Friendship) => {
    if (!myProfile) return;
    setActionLoading(f.id);
    try {
      await acceptFriendRequest(f.id, uid, {
        userName: myProfile.userName,
        displayName: myProfile.displayName,
      }, f.fromId);
      showToast(t('friends.toasts.accepted'), 'success');
    } catch {
      showToast(t('friends.toasts.error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (f: Friendship) => {
    setActionLoading(f.id);
    try {
      await rejectFriendRequest(f.id);
      showToast(t('friends.toasts.rejected'), 'info');
    } catch {
      showToast(t('friends.toasts.error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (f: Friendship) => {
    setActionLoading(f.id);
    try {
      await cancelFriendRequest(f.id);
      showToast(t('friends.toasts.requestCancelled'), 'info');
    } catch {
      showToast(t('friends.toasts.error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFriend = async () => {
    if (!removeDialog.friendship) return;
    setActionLoading(removeDialog.friendship.id);
    setRemoveDialog({ visible: false, friendship: null });
    try {
      await removeFriend(removeDialog.friendship.id);
      showToast(t('friends.toasts.removed'), 'success');
    } catch {
      showToast(t('friends.toasts.error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const requestBadge = incomingRequests.length > 0 ? ` (${incomingRequests.length})` : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground>
        <AppHeader showBack showNotifications={false} />

        {/* Tabs */}
        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          {(['friends', 'requests'] as Tab[]).map((t_) => (
            <TouchableOpacity
              key={t_}
              style={[styles.tab, tab === t_ && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(t_)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, { color: tab === t_ ? colors.primary : colors.textSecondary }]}>
                {t_ === 'friends'
                  ? t('friends.tabs.friends')
                  : `${t('friends.tabs.requests')}${requestBadge}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Buscador */}
          <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder={t('friends.search.placeholder')}
              placeholderTextColor={colors.textTertiary}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searching
              ? <ActivityIndicator size="small" color={colors.primary} />
              : (
                <TouchableOpacity onPress={handleSearch} activeOpacity={0.7}>
                  <Text style={[styles.searchBtn, { color: colors.primary }]}>{t('friends.search.button')}</Text>
                </TouchableOpacity>
              )}
          </View>

          {/* Resultado de búsqueda */}
          {searchResult && (
            <View style={[styles.searchResultCard, { backgroundColor: colors.surface }]}>
              {searchResult === 'not_found' ? (
                <View style={styles.notFoundRow}>
                  <Ionicons name="person-remove-outline" size={20} color={colors.textTertiary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notFoundText, { color: colors.textPrimary }]}>
                      {t('friends.search.notFound', { userName: searchText.trim() })}
                    </Text>
                    <Text style={[styles.notFoundSub, { color: colors.textTertiary }]}>
                      {t('friends.search.notFoundSub')}
                    </Text>
                  </View>
                </View>
              ) : searchResult.uid === uid ? null : (() => {
                const existing = getFriendshipStatus(searchResult.uid);
                const isAccepted = existing?.status === 'accepted';
                const isPending = existing?.status === 'pending';
                const iSent = isPending && existing?.fromId === uid;
                return (
                  <View style={styles.profileRow}>
                    <View style={[styles.avatarSmall, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="person" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.friendName, { color: colors.textPrimary }]}>{searchResult.displayName}</Text>
                      <Text style={[styles.friendUserName, { color: colors.textTertiary }]}>@{searchResult.userName}</Text>
                    </View>
                    {isAccepted ? (
                      <Text style={[styles.statusChip, { color: colors.success }]}>{t('friends.search.alreadyFriends')}</Text>
                    ) : iSent ? (
                      <Text style={[styles.statusChip, { color: colors.textTertiary }]}>{t('friends.search.youSent')}</Text>
                    ) : isPending ? (
                      <Text style={[styles.statusChip, { color: colors.textTertiary }]}>{t('friends.search.requestPending')}</Text>
                    ) : (
                      <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleSendRequest(searchResult as UserProfile)}
                        activeOpacity={0.8}
                        disabled={actionLoading === searchResult.uid}
                      >
                        {actionLoading === searchResult.uid
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={styles.addBtnText}>{t('friends.search.sendRequest')}</Text>}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}
            </View>
          )}

          {/* Contenido según tab */}
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : tab === 'friends' ? (
            <FriendsTab
              friends={acceptedFriends}
              uid={uid}
              profileCache={profileCache}
              actionLoading={actionLoading}
              onRemove={(f) => setRemoveDialog({ visible: true, friendship: f })}
              colors={colors}
              t={t}
            />
          ) : (
            <RequestsTab
              incoming={incomingRequests}
              outgoing={outgoingRequests}
              uid={uid}
              profileCache={profileCache}
              actionLoading={actionLoading}
              onAccept={handleAccept}
              onReject={handleReject}
              onCancel={handleCancel}
              colors={colors}
              t={t}
            />
          )}
        </ScrollView>

        {/* Dialog eliminar amigo */}
        <AppDialog
          visible={removeDialog.visible}
          type="warning"
          title={t('friends.remove.dialogTitle')}
          description={
            removeDialog.friendship
              ? `${t('friends.remove.dialogDescBefore')}@${
                  profileCache[
                    removeDialog.friendship.fromId === uid
                      ? removeDialog.friendship.toId
                      : removeDialog.friendship.fromId
                  ]?.userName ?? '...'
                }${t('friends.remove.dialogDescAfter')}`
              : ''
          }
          primaryLabel={t('friends.remove.confirm')}
          secondaryLabel={t('common.cancel')}
          onPrimary={handleRemoveFriend}
          onSecondary={() => setRemoveDialog({ visible: false, friendship: null })}
        />
      </ScreenBackground>
    </SafeAreaView>
  );
}

// ── Sub-componentes ─────────────────────────────────────────────────────────

function FriendsTab({ friends, uid, profileCache, actionLoading, onRemove, colors, t }: any) {
  if (friends.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyText, { color: colors.textPrimary }]}>{t('friends.list.empty')}</Text>
        <Text style={[styles.emptySub, { color: colors.textTertiary }]}>{t('friends.list.emptySub')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
      {friends.map((f: Friendship, i: number) => {
        const otherUid = f.fromId === uid ? f.toId : f.fromId;
        const profile = profileCache[otherUid];
        return (
          <View
            key={f.id}
            style={[
              styles.friendRow,
              i < friends.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
          >
            <View style={[styles.avatarSmall, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="person" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.friendName, { color: colors.textPrimary }]}>
                {profile?.displayName ?? '...'}
              </Text>
              <Text style={[styles.friendUserName, { color: colors.textTertiary }]}>
                @{profile?.userName ?? '...'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => onRemove(f)}
              activeOpacity={0.7}
              disabled={actionLoading === f.id}
              style={styles.removeBtn}
            >
              <Ionicons name="person-remove-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

function RequestsTab({ incoming, outgoing, uid, profileCache, actionLoading, onAccept, onReject, onCancel, colors, t }: any) {
  return (
    <>
      {/* Entrantes */}
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t('friends.requests.incoming')}</Text>
      {incoming.length === 0 ? (
        <Text style={[styles.emptyInline, { color: colors.textTertiary }]}>{t('friends.requests.noIncoming')}</Text>
      ) : (
        <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
          {incoming.map((f: Friendship, i: number) => {
            const profile = profileCache[f.fromId];
            return (
              <View
                key={f.id}
                style={[
                  styles.friendRow,
                  i < incoming.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <View style={[styles.avatarSmall, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="person" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.friendName, { color: colors.textPrimary }]}>{profile?.displayName ?? '...'}</Text>
                  <Text style={[styles.friendUserName, { color: colors.textTertiary }]}>@{profile?.userName ?? '...'}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, { borderColor: colors.error }]}
                    onPress={() => onReject(f)}
                    activeOpacity={0.8}
                    disabled={!!actionLoading}
                  >
                    <Text style={[styles.rejectBtnText, { color: colors.error }]}>{t('friends.requests.reject')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                    onPress={() => onAccept(f)}
                    activeOpacity={0.8}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === f.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.acceptBtnText}>{t('friends.requests.accept')}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Enviadas */}
      <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: 16 }]}>{t('friends.requests.outgoing')}</Text>
      {outgoing.length === 0 ? (
        <Text style={[styles.emptyInline, { color: colors.textTertiary }]}>{t('friends.requests.noOutgoing')}</Text>
      ) : (
        <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
          {outgoing.map((f: Friendship, i: number) => {
            const profile = profileCache[f.toId];
            return (
              <View
                key={f.id}
                style={[
                  styles.friendRow,
                  i < outgoing.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <View style={[styles.avatarSmall, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="person" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.friendName, { color: colors.textPrimary }]}>{profile?.displayName ?? '...'}</Text>
                  <Text style={[styles.friendUserName, { color: colors.textTertiary }]}> @{profile?.userName ?? '...'}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => onCancel(f)}
                  activeOpacity={0.8}
                  disabled={!!actionLoading}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t('friends.requests.cancel')}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: Platform.OS === 'web' ? 120 : 40 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 14, fontFamily: Fonts.semiBold },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: Fonts.regular, padding: 0 },
  searchBtn: { fontSize: 14, fontFamily: Fonts.semiBold },
  searchResultCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  notFoundRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  notFoundText: { fontSize: 14, fontFamily: Fonts.medium },
  notFoundSub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  friendName: { fontSize: 14, fontFamily: Fonts.medium },
  friendUserName: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 1 },
  statusChip: { fontSize: 12, fontFamily: Fonts.medium },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#fff', fontSize: 13, fontFamily: Fonts.semiBold },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 15, fontFamily: Fonts.semiBold, textAlign: 'center' },
  emptySub: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center' },
  listCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  removeBtn: { padding: 6 },
  requestActions: { flexDirection: 'row', gap: 8 },
  rejectBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5 },
  rejectBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },
  acceptBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  acceptBtnText: { color: '#fff', fontSize: 12, fontFamily: Fonts.semiBold },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5 },
  cancelBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },
  sectionLabel: { fontSize: 11, fontFamily: Fonts.bold, marginBottom: 8, marginLeft: 2 },
  emptyInline: { fontSize: 13, fontFamily: Fonts.regular, marginBottom: 8, marginLeft: 2 },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/friends.tsx
git commit -m "feat: pantalla de amigos con búsqueda, solicitudes y lista"
```

---

## Task 13: Pantalla de notificaciones

**Files:**
- Create: `app/notifications.tsx`

- [ ] **Step 1: Crear `app/notifications.tsx`**

```tsx
// app/notifications.tsx
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Timestamp } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationDoc, NotificationType } from '../types/friend';
import AppHeader from '../components/AppHeader';
import ScreenBackground from '../components/ScreenBackground';
import { Fonts } from '../config/fonts';

function timeAgoLabel(createdAt: Timestamp | undefined, t: any): string {
  if (!createdAt) return '';
  const date = createdAt.toDate();
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('notifications.timeAgo.justNow');
  if (diffMin < 60) return t('notifications.timeAgo.minutesAgo', { n: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t('notifications.timeAgo.hoursAgo', { n: diffH });
  return t('notifications.timeAgo.daysAgo', { n: Math.floor(diffH / 24) });
}

const NOTIF_ICONS: Record<NotificationType, React.ComponentProps<typeof Ionicons>['name']> = {
  friend_request: 'person-add-outline',
  friend_accepted: 'people-outline',
};

function NotifItem({
  notif, onPress, colors, t,
}: { notif: NotificationDoc; onPress: () => void; colors: any; t: any }) {
  const icon = NOTIF_ICONS[notif.type] ?? 'notifications-outline';
  const text = t(`notifications.${notif.type}`, { name: notif.data.fromDisplayName });

  return (
    <TouchableOpacity
      style={[
        styles.notifRow,
        !notif.read && { backgroundColor: colors.primaryLight + '40' },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.notifIcon, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.notifText, { color: colors.textPrimary }]} numberOfLines={2}>
          {text}
        </Text>
        <Text style={[styles.notifTime, { color: colors.textTertiary }]}>
          {timeAgoLabel(notif.createdAt, t)}
        </Text>
      </View>
      {!notif.read && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const uid = user?.uid ?? '';
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(uid);

  const handleNotifPress = async (notif: NotificationDoc) => {
    if (!notif.read) await markAsRead(notif.id);
    // Navegación futura: ir a /friends tab solicitudes si es friend_request
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground>
        <AppHeader showBack />

        {/* Header row */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('notifications.title')}</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} activeOpacity={0.8}>
              <Text style={[styles.markAllText, { color: colors.primary }]}>{t('notifications.markAllRead')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textPrimary }]}>{t('notifications.empty')}</Text>
              <Text style={[styles.emptySub, { color: colors.textTertiary }]}>{t('notifications.emptySub')}</Text>
            </View>
          ) : (
            <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
              {notifications.map((n, i) => (
                <View
                  key={n.id}
                  style={i < notifications.length - 1
                    ? { borderBottomWidth: 1, borderBottomColor: colors.border }
                    : undefined}
                >
                  <NotifItem notif={n} onPress={() => handleNotifPress(n)} colors={colors} t={t} />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  titleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  title: { fontSize: 20, fontFamily: Fonts.bold },
  markAllText: { fontSize: 13, fontFamily: Fonts.medium },
  scroll: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'web' ? 120 : 40 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 15, fontFamily: Fonts.semiBold },
  emptySub: { fontSize: 13, fontFamily: Fonts.regular },
  listCard: { borderRadius: 20, overflow: 'hidden' },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  notifIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  notifText: { fontSize: 13, fontFamily: Fonts.medium, lineHeight: 18 },
  notifTime: { fontSize: 11, fontFamily: Fonts.regular },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/notifications.tsx
git commit -m "feat: pantalla de notificaciones con badge de no leídas"
```

---

## Task 14: Bump versión y commit final

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Actualizar versión en `app.json`**

Cambiar:
```json
"version": "1.3.0",
```
por:
```json
"version": "1.4.0",
```

- [ ] **Step 2: Commit final**

```bash
git add app.json
git commit -m "chore: bump versión 1.4.0 — sistema de amigos y notificaciones (parte 1)"
```

---

## Self-Review

### Spec coverage check

| Requisito spec | Tarea |
|---|---|
| userName auto-generado al registrarse | Task 2 (generateUserName) + Task 6 (_layout.tsx) |
| Formato iniciales + apellido | Task 2 |
| userName único, con sufijo si colisión | Task 5 (generateUniqueUserName) |
| userName inmutable | No hay UI de edición — solo se crea, nunca se actualiza |
| /users/{uid} público para búsqueda | Task 3 (firestore.rules) |
| /friendships rules | Task 3 |
| /notifications rules | Task 3 |
| createUserProfile idempotente | Task 5 |
| Buscar usuario por userName | Task 5 (searchUserByUserName) |
| useFriends — lista aceptados | Task 7 |
| useFriends — solicitudes entrantes/salientes | Task 7 |
| sendFriendRequest + notificación | Task 7 |
| acceptFriendRequest + notificación | Task 7 |
| rejectFriendRequest | Task 7 |
| cancelFriendRequest | Task 7 |
| removeFriend | Task 7 |
| useNotifications — tiempo real | Task 8 |
| useNotifications — markAsRead / markAllAsRead | Task 8 |
| Campana con badge en header | Task 9 |
| Campana en home screen | Task 10 |
| userName en tarjeta perfil | Task 11 |
| Ítem "Mis amigos" en perfil | Task 11 |
| Pantalla /friends — búsqueda | Task 12 |
| Pantalla /friends — tabs amigos/solicitudes | Task 12 |
| Pantalla /notifications | Task 13 |
| i18n es/en/it | Task 4 |
| Bump versión | Task 14 |

### Decisiones de consistencia
- `NotificationBell` recibe `uid` como prop — consistente en AppHeader (Task 9) y home screen (Task 10)
- `sendFriendRequest` y `acceptFriendRequest` en `useFriends.ts` reciben `{ userName, displayName }` del perfil propio — cargado con `getUserProfile(uid)` en friends.tsx
- Todos los toasts usan `useToast` del contexto existente
- `AppDialog` para confirm de eliminar amigo — consistente con el resto de la app
