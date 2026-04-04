# Banner "Sin tarjetas" en Home — Diseño

> **Para agentes:** Usar `superpowers:subagent-driven-development` para implementar este plan tarea por tarea.

**Objetivo:** Cuando el usuario autenticado no tiene ninguna tarjeta registrada, mostrar un banner informativo en el home que invite a agregar tarjetas. No es bloqueante — el usuario puede ignorarlo y seguir usando la app normalmente (sus transacciones sin tarjeta son válidas).

**Arquitectura:** Modificación pequeña en `app/(tabs)/index.tsx`. El banner usa `useCards` ya disponible en el archivo. Se oculta automáticamente cuando `cards.length > 0`. No hay pantallas ni rutas nuevas.

**Tech Stack:** React Native, expo-router, Zustand (useCards ya existe)

---

## UI del banner

Aparece debajo de las tarjetas de balance (income/expense) y antes de las transacciones recientes.

```
┌──────────────────────────────────────────────────────┐
│  💳  Conecta tus tarjetas                            │
│      Lleva un control preciso de gastos por          │
│      tarjeta de crédito o débito.                    │
│                            [Agregar tarjeta →]       │
└──────────────────────────────────────────────────────┘
```

- Fondo: `colors.primaryLight`
- Borde izquierdo de 3px: `colors.primary`
- Ícono Ionicons `card-outline` (24px, color primary)
- Título: `"Conecta tus tarjetas"` — Fonts.semiBold 14px, `colors.textPrimary`
- Subtítulo: `"Lleva un control preciso de gastos por tarjeta de crédito o débito."` — Fonts.regular 12px, `colors.textSecondary`
- Botón CTA: `"Agregar tarjeta →"` — Fonts.semiBold 13px, `colors.primary`, `onPress={() => router.push('/(onboarding)/select-cards')}`

## Comportamiento

- Condición de visibilidad: `cards.length === 0 && !cardsLoading`
- **No es dismissible** — desaparece solo cuando el usuario agrega al menos 1 tarjeta (el hook `useCards` actualiza en tiempo real)
- Se renderiza en el mismo `ScrollView` del home, no como overlay

## Cambio en `app/(tabs)/index.tsx`

El archivo ya importa `useCards` y tiene `cardsMap`. Solo necesita:
1. Desestructurar `loading as cardsLoading` de `useCards`
2. Renderizar el banner condicionalmente en el JSX

```tsx
// Ya existe en el archivo:
const { cards } = useCards(user?.uid ?? '');

// Añadir loading:
const { cards, loading: cardsLoading } = useCards(user?.uid ?? '');

// Banner en JSX (antes de las transacciones recientes):
{cards.length === 0 && !cardsLoading && (
  <TouchableOpacity
    style={[styles.noCardsBanner, { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary }]}
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

## Estilos nuevos

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

---

## Lo que NO entra en este spec

- Dismiss manual del banner
- Banner en otras pantallas (historial, presupuesto)
- Lógica diferente según tipo de usuario
