# Auditoría de Personalización — Spendia

## 1. El espacio de configuración

### Ajustes expuestos en la pantalla (15)

| #  | Ajuste                  | Valores | Tipo            |
|----|-------------------------|---------|-----------------|
| 1  | Paleta de color         | 48      | Selector        |
| 2  | Fondo modo claro        | 14      | Carrusel        |
| 3  | Fondo modo oscuro       | 14      | Carrusel        |
| 4  | Intensidad del fondo    | 3       | Segmentado      |
| 5  | Desenfoque modo claro   | 4       | Segmentado      |
| 6  | Desenfoque modo oscuro  | 4       | Segmentado      |
| 7  | Estilo del degradado    | 4       | Segmentado      |
| 8  | Tipo de gráfico         | 6       | Tarjetas        |
| 9  | Animación del gráfico   | 3       | Tarjetas        |
| 10 | Velocidad de animación  | 3       | Segmentado      |
| 11 | Acento del gráfico      | 9       | Swatches        |
| 12 | Grosor de íconos        | 3       | Segmentado      |
| 13 | Brillo en tarjetas      | 2       | Switch          |
| 14 | Ahorro de batería       | 2       | Switch          |
| 15 | Confeti de racha        | 2       | Switch          |

### Ajuste fantasma (persistido y sincronizado, pero sin control en la UI)

| Ajuste              | Valores | Nota                                          |
|---------------------|---------|-----------------------------------------------|
| `backgroundSpeed`   | 3       | Los efectos ya no se mueven. El comentario en `personalization.tsx:849` lo confirma. El estado, la clave de AsyncStorage y la sincronización a Firestore siguen vivos. |

### Combinaciones posibles

48 × 14 × 14 × 3 × 4 × 4 × 4 × 6 × 3 × 3 × 9 × 3 × 2 × 2 × 2 = **~21.000 millones**

Si incluimos el modo del tema (light/dark/system), que cambia el resultado visible: **~63.000 millones**.

Los 6 Looks predefinen combinaciones de 6 ajustes (paleta, fondo×2, degradado, tipo de gráfico, acento). Los otros 9 ajustes quedan libres. Un Look cubre 6 combinaciones de 63.000 millones.

### Campos sincronizados a Firestore

14 campos en `updateUserPersonalization` + 1 campo aparte (`paletteId` vía `updateUserColorPalette`) + 18 claves de AsyncStorage. Cada cambio dispara un debounce de 800ms que escribe todo el bloque.

---

## 2. Veredicto directo

**Sí, es demasiado.** No por la cantidad de opciones en sí, sino por la relación coste-beneficio:

- El trabajo de Spendia es que la gente controle su dinero. La personalización visual es un atractivo premium legítimo, pero no es la propuesta de valor. Cada minuto que un usuario pasa decidiendo entre "desenfoque suave" y "desenfoque medio" es un minuto que no está registrando un gasto.

- Los Looks ya resuelven el 80% de la necesidad ("quiero que mi app se vea bien") con un toque. Eso hace que los controles finos sean redundantes para la mayoría. Existen para el ~5% que quiere tunear todo, pero cuestan como si fueran para el 100%.

- El espacio combinatorio hace que el QA visual sea ficción. Con 21.000 millones de estados, no se puede verificar que el texto sea legible, que el gráfico contraste con el fondo, o que el blur no tape contenido. Se prueban los defaults y los Looks, y el resto es suerte.

- Cada ajuste es un campo más en Firestore, una migración potencial, un edge case en cada componente visual. El código ya tiene lógica de migración (`pulse` → `draw`), campos legados (`BG_STYLE_KEY`), y un fantasma (`backgroundSpeed`). Esto solo crece.

La personalización está bien como concepto premium. Lo que sobra son las capas de control que casi nadie usará y que multiplican el coste de mantener todo lo demás.

---

## 3. La lista de recortes

Ordenados de menor a mayor resistencia del usuario (lo que menos se extrañaría primero):

### 3.1. `backgroundSpeed` — ELIMINAR (fantasma)

- **Qué se pierde:** Nada. No tiene control en la UI. Los efectos ya no se mueven.
- **Qué se gana:** Eliminar estado, 1 clave AsyncStorage, 1 campo Firestore, 1 constante, 1 tipo, el objeto `BACKGROUND_SPEED_FACTOR`, y las dependencias en el `useEffect` de sync. Código muerto limpio.

### 3.2. `chartSpeed` (velocidad de animación del gráfico) — ELIMINAR

- **Qué se pierde:** La posibilidad de ajustar la velocidad de una animación que se reproduce una vez al entrar a Home. El 99% de los usuarios nunca va a notar la diferencia entre 4.2s y 6.5s.
- **Qué se gana:** -1 ajuste, -1 clave AsyncStorage, -1 campo Firestore, -1 control segmentado condicional. Se fija en `normal` (el middle ground).
- **Espacio eliminado:** ×3 → ~7.000 millones de combinaciones menos.

### 3.3. `chartAnimStyle` (draw / tide / none) — ELIMINAR

- **Qué se pierde:** La elección entre dos estilos de animación de entrada del gráfico y la opción de desactivarla. `draw` es el default y es bueno. `tide` es apenas distinguible. `none` ya lo cubre `batterySaver` (que apaga todo el movimiento decorativo).
- **Qué se gana:** -3 tarjetas con vista previa animada, -1 campo Firestore. Simplifica el componente `ChartAnimCard` y las props de `Sparkline`.
- **Espacio eliminado:** ×3 adicional.

### 3.4. `backgroundIntensity` (intensidad del efecto) — ELIMINAR

- **Qué se pierde:** Control sobre la opacidad del efecto de fondo.
- **Qué se gana:** El blur ya controla cuánto protagonismo tiene el fondo. Tener blur (4 niveles) + intensidad (3 niveles) = dos mandos para lo mismo. Uno sobra. El blur es más intuitivo ("cuánto desenfoque") que la intensidad ("cuánta opacidad"), y además es el que evita que el fondo compita con el contenido (el problema real). Se fija en `default`.
- **Espacio eliminado:** ×3 adicional.

### 3.5. Desenfoque separado por modo (unificar `backgroundBlurLight` + `backgroundBlurDark` en uno) — SIMPLIFICAR

- **Qué se pierde:** La posibilidad de tener blur diferente en claro y oscuro. Un caso de uso de nicho extremo: casi nadie configura dos fondos distintos Y además quiere blur distinto para cada uno.
- **Qué se gana:** -1 campo Firestore, -1 clave AsyncStorage, la UI de blur se simplifica (ya no depende de `bgTarget`). Un solo valor de blur compartido.
- **Espacio eliminado:** ×4 (de 4×4=16 combinaciones a 4).

### 3.6. `iconStroke` (grosor de íconos) — ELIMINAR

- **Qué se pierde:** La elección entre iconos finos, normales y gruesos. Un ajuste cosmético que requiere mirar de cerca para notar la diferencia.
- **Qué se gana:** -1 tipo, -1 campo, se elimina la prop `strokeWidth` customizable en `AppIcon` y cualquier componente que la lea.
- **Espacio eliminado:** ×3 adicional.

### 3.7. `streakConfetti` — ELIMINAR (absorber en `batterySaver`)

- **Qué se pierde:** Un toggle dedicado para el confeti de racha. Es un efecto que ocurre una vez al día como mucho.
- **Qué se gana:** Si el usuario no quiere animaciones, ya tiene `batterySaver`. Un toggle para un efecto tan puntual no justifica un campo persistido y sincronizado. Si `batterySaver` está activo, no hay confeti. Si no, hay confeti. Sin más.
- **Espacio eliminado:** ×2 adicional.

### Resumen del recorte

| Antes | Después recorte | Reducción |
|-------|----------------|-----------|
| 15 ajustes + 1 fantasma | 8 ajustes | -53% de ajustes |
| ~21.000 millones combinaciones | ~5.4 millones | -99.97% |
| 18 claves AsyncStorage | 11 | -39% |
| 15 campos Firestore | 9 | -40% |

Los 8 ajustes que quedan:

1. **Paleta** (48) — identidad
2. **Fondo claro** (14) — impacto visual enorme
3. **Fondo oscuro** (14) — igual
4. **Desenfoque** (4) — funcional, evita que el fondo tape el contenido
5. **Degradado** (4) — visible, impactante
6. **Tipo de gráfico** (6) — cómo ves TUS datos
7. **Acento del gráfico** (9) — color de tus datos
8. **Brillo en tarjetas** (2) — toggle premium sencillo
9. **Ahorro de batería** (2) — utilidad funcional (absorbe confeti)

*(Son 9 si contamos batterySaver como ajuste funcional, no cosmético.)*

48 × 14 × 14 × 4 × 4 × 6 × 9 × 2 × 2 = **~5.4 millones**

Sigue siendo un espacio enorme, pero ya cabe en la realidad del QA: los Looks cubren las combinaciones que importan y el resto tiene pocas dimensiones libres.

---

## 4. Riesgos de quitar — qué NO tocar

El fondo configurable (efecto + paleta + degradado) es el gancho premium. Es lo que hace que la app se sienta "tuya". **No se toca:**

- **Paleta de color** — es la identidad. 48 es mucho, pero cada una tiene su público (las neon son para un perfil distinto a las pastel). Reducir paletas es una decisión de producto, no de simplificación técnica.
- **Efecto de fondo por modo** — tener uno para claro y otro para oscuro es diferenciador real. Un usuario que usa modo oscuro de noche ve literalmente una app distinta. Esto vende premium.
- **Estilo de degradado** — afecta a toda la pantalla. Alto impacto visual, bajo coste de UI (4 opciones en un segmentado).
- **Tipo de gráfico** — esto no es cosmético, es cómo el usuario lee sus datos. Algunos prefieren barras, otros líneas. Toca la función core de la app.
- **Card sheen** — toggle sencillo, bajo coste, sensación premium inmediata.

**Regla general:** si el usuario lo nota sin buscarlo, se queda. Si hay que mirar de cerca o comparar A/B para ver la diferencia (`iconStroke`, `chartSpeed`, `chartAnimStyle`), sobra.

---

## 5. Coste de mantenimiento y lo que se simplifica

### Lo que cuesta hoy

- **18 claves AsyncStorage** leídas en paralelo al arrancar (`ThemeContext.tsx:186-203`). Cada clave es un `getItem` + validación + migración potencial. Ya hay migración activa de `pulse` → `draw` y de `BG_STYLE_KEY` legado → `light/dark`.
- **15 campos sincronizados a Firestore** con debounce de 800ms. El `useEffect` de sync tiene 15 dependencias (`personalization.tsx:747`). Cada campo añadido es una dependencia más en ese array.
- **Cada ajuste multiplica la matriz de pruebas de CADA componente visual.** Un cambio en `BalanceCard` hay que verificar con 6 tipos de gráfico × 9 acentos × 2 modos = 108 combinaciones. Nadie lo hace.
- **`PersonalizationScreen` tiene 1088 líneas** — es una de las pantallas más largas de la app, y su única función es configurar variables cosméticas.

### Lo que se simplifica con los recortes

1. **ThemeContext se reduce ~30%.** Menos estados, menos setters, menos claves de storage, menos líneas en el `Promise.all` de carga.
2. **El `useEffect` de sync pasa de 15 a 9 dependencias.** Menos escrituras a Firestore, menos tráfico de red en cada toque casual.
3. **Migraciones eliminadas.** `backgroundSpeed` y su clave se van; no hay que migrarlos nunca más.
4. **La pantalla pierde ~200 líneas** (controles de `chartSpeed`, `chartAnimStyle`, `iconStroke`, `intensity`, el segmentado de blur doble, y `streakConfetti`).
5. **QA visual pasa de inmanejable a difícil.** De 21.000 millones a 5.4 millones. Sigue siendo mucho, pero los Looks cubren los caminos felices y los controles restantes son independientes entre sí (cambiar el tipo de gráfico no afecta al fondo).
6. **Menos edge cases en componentes.** `AppIcon` ya no necesita `strokeWidth` dinámico. `Sparkline` ya no recibe `animStyle` variable (siempre `draw`). `AuroraBackground` ya no recibe `intensity` variable.
7. **El código fantasma (`backgroundSpeed`) se va.** Estado, tipo, constante `BACKGROUND_SPEED_FACTOR`, campo Firestore, clave AsyncStorage — todo dead code que hoy engaña a quien lee el contexto.

### Coste de NO hacer nada

Cada nueva paleta o efecto de fondo multiplica un espacio que ya es inmanejable. Si se añaden 4 paletas más (52 total), el espacio sube a ~23.000 millones. Si se añade un ajuste más con 3 opciones (digamos "estilo de tarjeta"), sube a ~63.000 millones. La deuda crece exponencialmente y el valor marginal de cada nuevo ajuste decrece.

---

## Conclusión

Spendia tiene un sistema de personalización que podría justificarse en una app de wallpapers, pero que está injertado en una app de finanzas. Los Looks ya ofrecen la salida rápida que necesita el 95% de los usuarios. El trabajo pendiente es podar los controles finos que solo sirven al 5% restante y que cuestan como si fueran el core del producto.

Los 7 recortes propuestos eliminan el 53% de los ajustes y el 99.97% del espacio combinatorio sin tocar nada de lo que vende premium.
