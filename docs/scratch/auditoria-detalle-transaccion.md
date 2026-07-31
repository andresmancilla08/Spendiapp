# Auditoría — Detalle de transacción (`app/transaction-detail.tsx`)

Fecha: 2026-07-31 · Paleta auditada: **deepWater** (default), modos dark y light
Evidencia: `docs/scratch/detalle-transaccion-opciones.html` (réplica del estado actual +
3 direcciones + síntesis, renderizadas a 390×844 y revisadas píxel a píxel).
Contrastes calculados hex→ratio (WCAG 2.1: 4.5:1 texto normal, 3:1 texto grande ≥24px/bold y gráficos).

---

## 1. Hallazgos de contraste — MEDIDOS (no opinión)

### 🔴 Bloqueantes en producción hoy (modo claro)
| Elemento | Par | Ratio | Mín. | Estado |
|---|---|---|---|---|
| Tile «Editar» | `#00ACC1` sobre `primary`+8% = `#EBF8FA` | **2,52:1** | 4,5 | 🔴 |
| Tile «Duplicar» | `#909A00` sobre `tertiary`+12% = `#F7F9E7` | **2,89:1** | 4,5 | 🔴 |
| Tile «Eliminar» | `#EF4444` sobre `errorLight` `#FEE2E2` | **3,08:1** | 4,5 | 🔴 |
| Etiquetas de fila (FECHA, CATEGORÍA…) | `#6E737C` sobre `#F5F9FA` | **4,50:1** | 4,5 | 🟠 justo en el límite |

Los tres tiles de acción son el patrón «texto de color sobre su propio tinte al 8-12%»:
en dark funciona (6,8:1 / 10,2:1) y en light **no llega en ninguno de los tres**.
Coincide además con la regla del proyecto: *todo botón con texto lleva fondo sólido*.

### 🔴 Bloqueante en AMBOS modos — `onPrimary` blanco sobre cian
| Par | Ratio | Mín. | Estado |
|---|---|---|---|
| `#FFFFFF` sobre `primary` dark `#00BCD4` | **2,30:1** | 4,5 | 🔴 |
| `#FFFFFF` sobre `primary` light `#00ACC1` | **2,74:1** | 4,5 | 🔴 |
| `#FFFFFF` sobre `primaryDark` light `#00838F` | 4,52:1 | 4,5 | 🟢 |
| Texto oscuro `#0D1A1C` sobre `#00BCD4` | ≈8,1:1 | 4,5 | 🟢 |

El cian de la marca es **demasiado claro para llevar texto blanco**. Afecta a todo botón
primario de la app y también al **FAB del home** (ícono blanco sobre cian = 2,30:1, y un
ícono necesita 3:1). Dos salidas: (a) `onPrimary` pasa a tinta oscura, (b) el fondo del
botón pasa a `primaryDark` y el texto sigue blanco. **Es un cambio visible de marca en
toda la app → decisión tuya**, no la aplico por mi cuenta.

### 🟠 Color del monto en modo claro
`expense` `#FF6B6B` sobre blanco = **2,78:1**, y para una cifra de 44-46px el mínimo es 3:1
→ **no llega ni como texto grande**. Necesita una tinta específica para claro
(`#C62828`≈5,9:1 o al menos `error` `#EF4444`=3,76:1). En dark `#FF8E8E` da 7,07:1 ✅.

### 🟠 Etiqueta de la nota en lima, en modo claro
`tertiary` `#C0CA33` sobre lima 10% = **1,70:1**; incluso `tertiaryDark` `#909A00` = 2,92:1.
La lima solo funciona como color de texto en dark (8,79:1). En light la etiqueta tiene que
ir en `textSecondary` y la lima queda solo como borde/fondo.

---

## 2. Hallazgos de jerarquía y contenido (sobre el render)

- 🔴 **Todo dato pesa lo mismo.** La pantalla es una lista `label/valor`: la fecha compite con
  las cuotas y con el reparto de un gasto compartido. No hay primer, segundo ni tercer nivel
  de lectura más allá del monto.
- 🔴 **No cuenta nada.** El detalle informa (cuánto, cuándo, qué categoría) pero nunca dice
  qué significa: ni cuánto resta de la compra a cuotas, ni cuánto pesa en el mes, ni cómo se
  reparte realmente entre las personas. El dato existe en el modelo; la vista no lo usa.
- 🟠 **Espacio muerto.** Con un gasto simple, dos tercios inferiores de la pantalla quedan
  vacíos y la barra de acciones flota lejos del contenido (ver render «ACTUAL»).
- 🟠 **Decoración > información en el hero.** Stripe superior + 2 blobs + borde interno de luz
  + glow del monto: cuatro capas decorativas alrededor de tres datos.
- 🟠 **«Duplicar» pesa igual que «Eliminar».** Tres tiles idénticos en tamaño y forma igualan
  una acción neutra con la destructiva; nada frena el toque accidental.
- 🟡 **`formatCurrency` fija `es-CO`/COP** en el archivo (línea 62) aunque la app es
  multi-idioma (es/en/it) — mismo patrón que ya se corrigió con `utils/dateLocale`.
- 🟡 **`CATEGORY_LABELS`/`CATEGORY_META` duplicados** aquí y en `app/(tabs)/index.tsx`: dos
  fuentes de verdad para iconos y colores de categoría.
- 🟡 **Cuotas sin la información que importa:** se muestra «Cuota 3 de 12» y una barra, pero
  no cuánto se ha pagado, cuánto resta ni cuándo cae la siguiente.
- 🟡 **Estados no auditados aún:** el selector de alcance («solo este mes / desde ahora / todas»)
  y la confirmación de borrado se dibujan dentro de la barra inferior, con tipografía de 12-13px
  y botones de 8px de padding vertical — por debajo del objetivo táctil de 44px.

---

## 3. Lo que sí está bien (no tocar)

- `SafeAreaView` + `insets.bottom` en la barra de acciones: correcto y necesario.
- `ScreenTransition` como raíz, según la convención del proyecto.
- La lógica de borrado por alcance (fijos/cuotas/compartidos) y los mirrors: no se toca.
- El monto héroe ya usa `effectiveAmount()` y muestra «de $total» solo cuando corresponde.

---

## 4. Estados pendientes de diseñar y renderizar (Ley 0)

Antes de declarar hecho el rediseño hay que renderizar y mirar, en dark y light:
`idle` · `loading` (borrando/duplicando) · `selector de alcance` · `confirmación de borrado` ·
`mes pasado bloqueado` · gasto **sin** tarjeta/nota/cuotas (el caso mínimo) · nombres largos
(i18n 2× y 320px de ancho).
