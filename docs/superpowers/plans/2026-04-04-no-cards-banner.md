# No-Cards Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar un banner informativo en el home cuando el usuario no tiene tarjetas registradas, con CTA para ir a agregar tarjetas. No es bloqueante.

**Architecture:** Modificación puntual en `app/(tabs)/index.tsx`. El archivo ya importa `useCards` y tiene `cards` disponible. Solo hay que añadir el banner en el JSX y sus estilos.

**Tech Stack:** React Native 0.83 + Expo SDK 55, TypeScript, expo-router

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Modificar | `app/(tabs)/index.tsx` |

---

## Tarea 1 — Agregar banner en `app/(tabs)/index.tsx`

**Archivos:**
- Modificar: `app/(tabs)/index.tsx`

**Contexto:** El archivo ya tiene `const { cards, loading: cardsLoading } = useCards(user?.uid ?? '')` (o similar — si solo tiene `cards` sin `loading`, añade `loading: cardsLoading`). El banner se inserta en el `ScrollView` debajo de las tarjetas de balance y antes de las transacciones recientes. El archivo ya importa `router` de `expo-router` e `Ionicons` de `@expo/vector-icons`.

- [ ] **Paso 1: Asegurarse de que `loading` se desestructura de `useCards`**

Localizar la línea con `useCards` en `HomeScreen`. Si dice:

```tsx
const { cards } = useCards(user?.uid ?? '');
```

Reemplazar con:

```tsx
const { cards, loading: cardsLoading } = useCards(user?.uid ?? '');
```

Si ya tiene `loading` con otro nombre, usar ese nombre en el siguiente paso.

- [ ] **Paso 2: Agregar `cardsMap` en `HomeScreen` si no existe**

Si ya existe `cardsMap` en el archivo, omitir este paso.

```tsx
const cardsMap = Object.fromEntries(cards.map((c) => [c.id, c]));
```

- [ ] **Paso 3: Insertar el banner en el JSX**

Dentro del `ScrollView` del `HomeScreen`, localizar el bloque de transacciones recientes (busca el comentario `{/* Recientes */}` o similar). Insertar JUSTO ANTES de ese bloque:

```tsx
{/* Banner sin tarjetas */}
{cards.length === 0 && !cardsLoading && (
  <TouchableOpacity
    style={[
      styles.noCardsBanner,
      { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary },
    ]}
    onPress={() => router.push('/(onboarding)/select-cards')}
    activeOpacity={0.8}
  >
    <Ionicons name="card-outline" size={24} color={colors.primary} />
    <View style={{ flex: 1 }}>
      <Text style={[styles.noCardsBannerTitle, { color: colors.textPrimary }]}>
        Conecta tus tarjetas
      </Text>
      <Text style={[styles.noCardsBannerSub, { color: colors.textSecondary }]}>
        Lleva un control preciso de gastos por tarjeta de crédito o débito.
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
  </TouchableOpacity>
)}
```

- [ ] **Paso 4: Agregar estilos en `StyleSheet.create`**

Al final del objeto de estilos:

```tsx
  noCardsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 3,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  noCardsBannerTitle: { fontSize: 14, fontFamily: Fonts.semiBold, marginBottom: 2 },
  noCardsBannerSub: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 17 },
```

- [ ] **Paso 5: Commit**

```bash
cd ~/Documents/Github/Spendiapp
git add "app/(tabs)/index.tsx"
git commit -m "feat: add no-cards banner in home screen"
```
