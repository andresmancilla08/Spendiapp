# Auditoría visual y de calidad — 2026-08-01 (v2.45.3)

Alcance: contraste de color con las 31 paletas en claro y oscuro, home, detalle de
movimiento, tab bars y safe areas de la PWA iOS. Medición real, no impresión: script de
contraste sobre `config/palettes.ts` (320 combinaciones token × fondo × modo).

## 1. El hallazgo de fondo: en modo claro los tokens de acento no sirven como texto

| Token (modo claro, sobre `surface`) | Paletas por debajo de 4.5:1 | Peor caso |
|---|---|---|
| `tertiary` | 31/31 | 1.11:1 (`mochaPastel`) |
| `primary` | 27/31 | 1.34:1 (`mochaPastel`) |
| `info` | 27/31 | 1.34:1 |
| `secondary` | 26/31 | 1.19:1 |
| `success` | 31/31 | 1.74:1 (`forestPastel`) |

En modo oscuro el problema no existe (mínimo medido 5.52:1). El defecto es sistémico: la
paleta está pensada para FONDOS (botón de marca + `onPrimary` blanco), y se reutiliza como
color de TEXTO en ~150 puntos de la app.

**Corrección adoptada:** `utils/contrast.accentInk(colors, tone, bg)` — usa el token de la
paleta si llega a 4.5:1 sobre ese fondo; si no, baja a la variante `*Dark` y, en último
término, a `textSecondary`. Mantiene el color de marca donde se puede y garantiza lectura
donde no. Se añadió el token `warningDark` (no existía) para que el dorado Premium siga
siendo dorado.

### Aplicado en esta versión
- `components/premium/InsightBanner.tsx:27` — kicker "Tu mes en una frase" (1.08–1.98:1 → 4.60–7.58:1).
- `app/(tabs)/history.tsx:943` etiqueta de filtros (9px), `:356` badge fijo, `:853` ver categoría, `:816` resumen.
- `app/(tabs)/profile.tsx:71` badge Premium, `:659-661` chip de usuario.
- `app/cards.tsx:107,126` badges de tarjeta.
- `app/(tabs)/tools.tsx:104` métrica de tesela.
- `app/(tabs)/budget.tsx:413` chip "añadir límite".
- `app/(tabs)/index.tsx:620,691` enlaces "Ver todo".

### Pendiente (mismo patrón, no bloqueante)
Texto pequeño con token crudo, por orden de gravedad:
`app/upgrade.tsx:151` · `app/add-transaction.tsx:1182,1189,903` y su gemelo
`components/AddTransactionModal.tsx:1105,1112` · `app/expense-group-detail.tsx:441,283,444`
· `app/friends.tsx:323` · `app/category-detail.tsx:102` · `components/ConsentModal.tsx:109,128`
· `app/notifications.tsx:202` · `app/(auth)/login.tsx:146,150` ·
`app/(onboarding)/select-cards.tsx:144` · `components/CardFormSheet.tsx:245` ·
`app/friend-report.tsx:487,449,469` · `app/edit-transaction.tsx:391,402,908` ·
`components/EditTransactionSheet.tsx:215` · `app/payment-qr.tsx:231` ·
`components/CardEditSheet.tsx:191` · `components/CategoryFormModal.tsx:408` ·
`components/WhatsNew.tsx:145` · `components/LanguageSelector.tsx:72` ·
`components/BalanceCard.tsx:533` · `app/(auth)/forgot-pin-otp.tsx:270` ·
`app/(auth)/register.tsx:236,243` · `app/expense-groups.tsx:365` · `app/goals.tsx:486`.

Iconos <20px y textos ≥18px con el mismo patrón: ~60 puntos más (umbral 3:1, fallan solo en
las paletas pastel). Cifras grandes tipo `amountInput` (40px) y `PinInput` se dejan a
propósito con el color de marca: son el acento de la pantalla y el fondo es liso.

## 2. Corregido fuera del color

| # | Archivo | Defecto | Corrección |
|---|---|---|---|
| 🔴 | `app/(tabs)/index.tsx:83-99` | `timeAgo()` devolvía "Hoy/Ayer/Hace N min" en español fijo → en EN e IT salía español | Usa `notifications.timeAgo` (+4 claves nuevas en es/en/it) |
| 🔴 | `app/(tabs)/index.tsx:123` | "Cuota n/total" hardcodeado | `t('history.installmentChip')` |
| 🔴 | `app/transaction-detail.tsx:738` | La cifra héroe dependía de `adjustsFontSizeToFit`, que no funciona en web → importes largos truncados | Escalado por longitud (patrón de `BalanceCard`) |
| 🔴 | `app/transaction-detail.tsx:282` | Duplicar fallaba en silencio | Toast de error (`history.edit.duplicateError`) |
| 🟠 | `app/transaction-detail.tsx:1137` | "Solicitar eliminación" se deshabilitaba sin señal visual | `btnDisabled` |
| 🟠 | `app/transaction-detail.tsx` (pantalla) | Botón a ancho completo: `flex:1` + `height:52` no aplicaban fuera de una fila | Envuelto en `btnRow` |
| 🟠 | `app/transaction-detail.tsx:1189` | Icono de borrar en fijos era un cuadrado (`stop-circle`) | Siempre `trash-outline` |
| 🟠 | `components/AppTabBar.tsx`, `PremiumTabBar.tsx` | `role="button"` sin estado → el lector no anunciaba la pestaña activa | `role="tab"` + `accessibilityState` + label |
| 🟠 | `components/PremiumTabBar.tsx:51` | Latido infinito del icono activo ignorando reduce-motion | Cortocircuito con `reduceMotion` |
| 🟠 | `app/(tabs)/index.tsx:731` | FAB solo icono sin etiqueta accesible | `accessibilityRole` + `accessibilityLabel` |
| 🟠 | `app/(tabs)/index.tsx:616,690` | Enlaces "Ver todo" de ~18px de alto | `hitSlop` de 12 |
| 🟡 | `components/premium/InsightBanner.tsx` | Kicker sin `numberOfLines`: EN/IT desbordaban a 320px | `numberOfLines={1}` + `flexShrink` |

## 3. PWA iOS

- **Franja bajo la tab bar en pantallas pequeñas:** `#root` medía `100dvh`, que en standalone
  se queda corto (excluye el inset del home indicator en algunos modelos) y dejaba ver el
  canvas del navegador. Ahora `position: fixed; inset: 0` — no depende de esa medida.
- **Zona segura superior:** se pintaba con `colors.primaryDark` (color de marca). Ahora es
  neutra: blanca en claro, negra en oscuro. Funciona igual en las 31 paletas.

## 4. Pendiente de decisión (no aplicado)

- **Emoji como icono de UI** en `app/(tabs)/index.tsx:65-74` (`CATEGORY_META`),
  `:429-446` (`InsightItem.icon`), `:698,708` (estados error/vacío) y
  `app/transaction-detail.tsx:53-62`. La regla del proyecto pide `AppIcon` (@tabler). Es un
  cambio de identidad visible en toda la app: requiere luz verde y un mapeo categoría → icono.
- **Errores de Firestore mostrados en crudo** (`app/(tabs)/index.tsx:695-704`): cualquier
  `err.code` se presenta como "Configura Firestore"; además los agregados siguen mostrando $0
  como si el dato fuera bueno. Falta ramificar offline / permisos / genérico.
- **Pull-to-refresh que miente** (`:274`): apaga el spinner con un `setTimeout` de 1200ms en
  vez de seguir el `loading` real del snapshot.
- **`onPrimary` blanco sobre el cian de marca** (2.30:1 en oscuro, 2.74:1 en claro): afecta a
  todo botón primario y al FAB. Ya anotado en `docs/contexto/decisiones.md`; cambiarlo es un
  cambio de marca.

## 5. Gates ejecutados

```
node scripts/check-i18n-keys.js   → 879 claves usadas OK · paridad 1304 en es/en/it
npx tsx utils/detailInk.test.ts   → 1088 pares texto/fondo sobre el mínimo (32 paletas × 2 modos)
npx tsx utils/{sharedCalc,detailFacts,chartTrend,txRelation,sharedCategory}.test.ts → OK
node --stack-size=20000 node_modules/typescript/bin/tsc --noEmit → sin errores nuevos
npm run export → build limpio
```

`tsc` deja 3 errores preexistentes ajenos a esta tanda: `JSX` namespace en
`AddTransactionModal.tsx:70` y `CategoryFormModal.tsx:53`, y
`getReactNativePersistence` en `config/firebase.ts:2`.
