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
| 1b | **Fondos nuevos**: `orbs`, `topography`, `spotlight` (13 efectos + "sin fondo"). La pantalla los lista sola porque lee `BACKGROUND_STYLE_VALUES` | ✅ hecho |
| 1c | **Tipos de gráfico**: `stepped` y `lollipop` en `Sparkline` y en el selector (6 tipos) | ✅ hecho |
| 1d | **Forma del degradado** (`linear` / `diagonal` / `radial` / `flat`) en `AppBackground`, con sync a Firestore. `diagonal` = lo que ya pintaba | ✅ hecho |
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
| `cardSheen` | `components/ProSheen.tsx`, montado desde `ProCardFx` y `BalanceCard` | ⬜ por revisar en `history` y en la tarjeta de saldo no premium |
| `chartType`, `chartAnimStyle`, `chartSpeed`, `chartAccent` | `components/BalanceCard.tsx` (el único gráfico de serie de la app) | ✅ revisado: **no hay hueco**. Ver la corrección de abajo |

### Corrección de la auditoría (2026-08-03, tras leer el código)

Dos de los tres 🔴 iniciales eran **falsos positivos del grep**, y aplicarlos habría
sido un error:

- **El anillo de `budget.tsx` NO debe seguir a `chartAccent`.** Su color sale de
  `progressColor(percent, success, error)`: es un semáforo — verde si vas bien, rojo si
  te pasaste. Ahí el color ES el estado, no decoración. Lo que sí era un hex quemado es
  su carril (`trackColor = '#E5E7EB'`), ahora obligatorio y tomado de la paleta.
- **`premium/CategoryBars` tampoco.** Recibe un color POR CATEGORÍA (comida, transporte…):
  son series distintas, no una sola serie a la que aplicar un acento. Sus tokens
  (`border`, `textPrimary`, `textTertiary`) ya eran correctos.

Regla que queda escrita: **un color semántico (estado, categoría, marca de banco) no se
sustituye por el acento del usuario.** La personalización manda en lo decorativo y en las
superficies; no pisa el significado.

### Barrido de hardcodes — cerrado (2026-08-03)

| Archivo | Antes | Ahora | Qué se hizo |
|---|---|---|---|
| `app/upgrade.tsx` | 23 | 3 | Hero con el degradado de la paleta; los 6 colores de beneficio rotan por `primary/warning/success/secondary/tertiary/info`; el oro sale de `warning` con su tono claro **calculado** (`mixHex`). Los 3 restantes son la marca de WhatsApp (`#25D366`/`#128C7E`) |
| `app/premium-welcome.tsx` | 22 | 4 | Rampa de oro derivada de `warning` (4 pasos con `mixHex`); iconos de feature por la paleta; el check verde a `success`. Los 4 restantes son `#FFFFFF`/`#000000` **dentro** de `mixHex` |
| `app/payment-qr.tsx` | 31 | 3 | Hero, plan anual, badges de estado y CTA a `primary`/`success`/`error`/`warning`. Los 3 restantes están dentro de `mixHex` |
| `app/add-transaction.tsx` | 14 | 0 | Los `#FFFFFF` de pills y chips seleccionados pasan a `colors.onPrimary`; fuera los fallbacks `?? '#EF4444'` |
| `app/edit-transaction.tsx` | 13 | 0 | Igual que el anterior |
| `components/SharedExpenseSection.tsx` | 7 | 0 | El naranja de "participante externo" (`#FFA726`) es ESTADO → `colors.warning`; su fondo con `mixHex` |
| `app/(tabs)/history.tsx` | 15 | 15 | **A propósito**: 8 son colores semánticos de categoría, el resto es blanco sobre relleno saturado y un scrim negro puro. Anotados en el código para que no parezcan olvidos |
| `app/(tabs)/index.tsx` | 28 | 11 | Los 9 `bg`/`darkBg` fijos a `surfaceSecondary`; el ámbar del semáforo a `colors.warning`. Los 11 restantes son los colores semánticos de categoría |
| `app/(tabs)/budget.tsx` | 3 | 0 | El ámbar del semáforo entra por parámetro desde la paleta; los dos carriles `#E5E7EB` fuera y `trackColor` obligatorio en anillo y barra |

Criterio para el barrido: un hex solo se queda si **no** representa marca ni estado
(logos de banco reales, negro/blanco puros de una tinta medida, colores semánticos de
categoría). Todo lo demás pasa a token de la paleta y, si es tinta sobre color, se
mide con `readableTint` / `inkOnFill` — nunca a ojo.

### Bug de sincronización corregido (2026-08-03)

`app/_layout.tsx` validaba el `chartType` remoto contra una lista escrita a mano
(`['line','bars','area','dots']`), así que cualquier tipo nuevo llegado de Firestore se
descartaba en silencio y parecía que la elección no se guardaba. Ahora valida contra
`CHART_TYPE_VALUES`. Mismo patrón que ya había mordido a `chartAccent`.
**Regla:** las listas de validación se importan del contexto, nunca se copian.

## Fase 4 · Verificación

- Gate de contraste ampliado a las pantallas tocadas en la fase 3.
- Captura de cada capítulo en 320 / 390 / 768 px, en claro y oscuro, con 3 paletas distintas.
- `npm run typecheck` (los 2 errores de `CategoryFormModal` y `config/firebase.ts` son preexistentes).
