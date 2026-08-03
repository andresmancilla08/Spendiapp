# Personalización · plan de implementación y cobertura

Dirección aprobada: **A1 afinada** (lienzo vivo + cuatro capítulos). Mockups en
`docs/personalizacion-propuestas.html` y `docs/personalizacion-A-afinada.html`.
Catálogo de paletas en `docs/paletas.html`.

Orden de trabajo: **catálogo → pantalla → cobertura**. Se hace así para no construir
la pantalla dos veces: primero existen las opciones, luego la UI que las muestra, y
al final se cierra que se apliquen en toda la app.

---

## Fase 1 · Catálogo de opciones

| # | Qué | Estado |
|---|-----|--------|
| 1a | **8 paletas nuevas** (`citrus`, `neon`, `wine`, `arctic`, `jade`, `sandstone`, `graphite`, `moss`) con grupo propio "Carácter" en `PaletteGrid`, nombres en es/en/it | ✅ hecho |
| 1b | **Fondos nuevos** (hoy 10 + "sin fondo"): `orbs`, `topography`, `spotlight` — un componente por efecto, registro en `BackgroundStyle` + `BACKGROUND_STYLE_VALUES` + i18n | ⬜ pendiente |
| 1c | **Tipos de gráfico nuevos** (hoy line/bars/area/dots): `stepped`, `lollipop` — en `Sparkline` y en las tarjetas de tipo | ⬜ pendiente |
| 1d | **Estilo de gradiente** como preferencia nueva (`linear` / `radial` / `diagonal` / `plano`), consumida por `AppBackground` | ⬜ pendiente |
| 1e | Variantes pastel de las 8 nuevas (llegaría a 48 paletas) | ⬜ opcional |

Gates que cubren esta fase (los tres pasan hoy con 40 paletas):

```
npx tsx utils/goalsContrast.test.ts    # 1040 pares · tarjeta y hoja de Metas
npx tsx utils/reportPalette.test.ts    # 40 paletas × 2 modos + documento del reporte
npx tsx utils/detailInk.test.ts        # 1360 pares · detalle de movimiento
```

## Fase 2 · La pantalla (dirección A1)

| # | Qué | Estado |
|---|-----|--------|
| 2a | `components/PersonalizationCanvas.tsx` — el lienzo vivo: maqueta del Home (saldo, gráfico, tarjeta con brillo, fondo animado) con `focus` adaptativo: `all` 292 px en Color, `bg` / `chart` / `card` a 196 px en los demás. Al encogerse **cambia lo que muestra, no recorta** | ⬜ |
| 2b | Cuatro capítulos con chips (Color · Fondo · Datos · Detalle) en lugar de los 7 acordeones | ⬜ |
| 2c | Tira de **Looks** dentro de Color (paleta + fondo + gráfico de un toque) y estado "A medida" al tocar cualquier ajuste fino | ⬜ |
| 2d | Colapso del lienzo a barra de 64 px al hacer scroll | ⬜ |
| 2e | Motion: cambio de capítulo 150 ms `cubic-bezier(.23,1,.32,1)`; el lienzo no se reanima al cambiar de capítulo | ⬜ |

Reutiliza sin reescribir: `BackgroundEffect`, `Sparkline`, la réplica de tarjeta de
`CardEffectPreview`, `PaletteGrid`. Baja de 10 efectos animados simultáneos a 1.

## Fase 3 · Cobertura — que la personalización llegue a TODA la app

Auditoría del 2026-08-03. Preferencias y dónde se consumen hoy:

| Preferencia | Se aplica en | Hueco |
|---|---|---|
| `paletteId` / `colors` | global vía `ThemeContext` | ver hardcodes abajo |
| `backgroundStyle` (+intensidad, velocidad) | `AppBackground` (global) | ✅ sin huecos conocidos |
| `iconStroke` | `AppIcon` lee el contexto | ✅ global |
| `streakConfetti` | `app/(tabs)/index.tsx` | ✅ |
| `cardSheen` | solo `components/ProSheen.tsx` | ⚠️ falta en `premium/CategoryBars`, en las tarjetas de `history` y en la tarjeta de saldo no premium |
| `chartType`, `chartAnimStyle`, `chartSpeed`, `chartAccent` | solo `components/BalanceCard.tsx` | 🔴 **el anillo de `app/(tabs)/budget.tsx` y las barras de `premium/CategoryBars` ignoran las 4**; el reporte anual y el detalle de categoría tampoco las usan |

Hardcodes de color que rompen la paleta (por gravedad):

| Archivo | Qué | Gravedad |
|---|---|---|
| `app/upgrade.tsx` | ~23 hex: gradientes cian/dorados de marca. El muro de pago se ve igual en las 40 paletas | 🔴 |
| `app/premium-welcome.tsx` | ~22 hex, mismo caso | 🔴 |
| `app/(tabs)/index.tsx` | `CATEGORY_META`: `bg: '#F3F4F6'` y `darkBg: '#252830'` por categoría — los fondos de icono no siguen la paleta (los colores semánticos por categoría sí pueden quedarse) | 🟠 |
| `app/payment-qr.tsx` | ~31 hex | 🟠 |
| `app/(tabs)/history.tsx` | ~15 hex | 🟠 |
| `app/add-transaction.tsx`, `app/edit-transaction.tsx` | ~14 y ~13 hex | 🟠 |
| `components/SharedExpenseSection.tsx` | 7 hex | 🟡 |
| resto (`CardFormSheet`, `CardEditSheet`, `CategoryFormModal`, `BankLogo`, `AnnouncementBanner`, `login`, `biometric-lock`, `select-cards`) | 3-4 hex cada uno | 🟡 |

Criterio para el barrido: un hex solo se queda si **no** representa marca ni estado
(logos de banco reales, negro/blanco puros de una tinta medida, colores semánticos de
categoría). Todo lo demás pasa a token de la paleta y, si es tinta sobre color, se
mide con `readableTint` / `inkOnFill` — nunca a ojo.

## Fase 4 · Verificación

- Gate de contraste ampliado a las pantallas tocadas en la fase 3.
- Captura de cada capítulo en 320 / 390 / 768 px, en claro y oscuro, con 3 paletas distintas.
- `npm run typecheck` (los 2 errores de `CategoryFormModal` y `config/firebase.ts` son preexistentes).
