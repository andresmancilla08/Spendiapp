# Auditoría — Pantalla de Personalización

**Fecha:** 2026-08-15  
**Archivos:** `app/personalization.tsx` · `components/PersonalizationCanvas.tsx`

---

## 1. Inventario de controles por capítulo

### COLOR (2 controles)
| # | Control | Tipo | Valores |
|---|---------|------|---------|
| 1 | **Looks** (tira de presets) | Scroll horizontal de tarjetas | N looks predefinidos + "A medida" |
| 2 | **Paleta de color** | PaletteGrid | N paletas |

### FONDO (5 controles)
| # | Control | Tipo | Valores |
|---|---------|------|---------|
| 3 | **Modo a editar** | SegmentedControl | Claro / Oscuro |
| 4 | **Intensidad del fondo** | SegmentedControl | Sutil / Normal / Intenso |
| 5 | **Desenfoque** | SegmentedControl | (valores de BACKGROUND_BLUR_VALUES) |
| 6 | **Forma del degradado** | SegmentedControl | Plano / Lineal / Radial |
| 7 | **Efecto de fondo** | BackgroundCarousel | 14 efectos + "Ninguno" |

### DATOS (4 controles, uno condicional)
| # | Control | Tipo | Valores |
|---|---------|------|---------|
| 8 | **Tipo de gráfico** | Grid de tarjetas | 6: Línea / Área / Barras / Puntos / Escalonado / Lollipop |
| 9 | **Estilo de animación** | Grid de tarjetas | N estilos (CHART_ANIM_VALUES) |
| 10 | **Velocidad de animación** | SegmentedControl | Lento / Normal / Rápido — *aparece solo si animStyle ≠ none* |
| 11 | **Acento del gráfico** | Fila de swatches SVG | Hasta 9, deduplicados por color |

### DETALLE (4 controles + sección informativa)
| # | Control | Tipo | Valores |
|---|---------|------|---------|
| 12 | **Grosor de iconos** | SegmentedControl | Fino / Regular / Negrita |
| 13 | **Brillo de tarjeta** | Switch | On / Off |
| 14 | **Ahorro de batería** | Switch | On / Off |
| 15 | **Confetti de racha** | Switch | On / Off |
| — | Roadmap | Informativo (lista) | No es control |

**Total: 15 controles interactivos** en 4 capítulos.

---

## 2. ¿Es demasiado? Veredicto

**Sí, en dos capítulos concretos.** El capítulo Color está bien calibrado. El capítulo Detalle también. El problema está en **Fondo** y en **Datos**, donde la granularidad supera lo que el usuario medio distinguiría en uso real.

### Controles que sobran — nombrarlos directamente

---

**IMPORTANTE · `backgroundIntensity` (Intensidad del fondo)**

*Problema:* Los 14 efectos del carrusel ya tienen una "intensidad intrínseca" —un aurora densa no es lo mismo que una niebla. Añadir encima un dial de sutil/normal/intenso que afecta a todos los efectos por igual crea una redundancia opaca: el usuario no sabe qué está modulando, solo ve que algo cambia un poco. Además, si el efecto elegido es `none`, el control desaparece, lo que revela que su significado depende de otro control. Esto es un síntoma de acoplamiento.

*Arreglo:* Eliminar. Si en el futuro un efecto concreto necesita intensidad propia, añadirla como propiedad de ese efecto, no como control global.

---

**IMPORTANTE · `batterySaver` (Ahorro de batería)**

*Problema:* El comentario en el código lo explica: "Detener el movimiento decorativo solo se podía haciendo para TODO el teléfono desde los ajustes del sistema." Esto era el justificante de existencia. Sin embargo, hoy la regla de animación del CLAUDE.md dice que el movimiento decorativo ya no se anima desde JS, y `useProMotion` ya respeta el flag de reduce-motion del sistema. ¿Qué hace exactamente `batterySaver` que no cubra ya el ajuste de sistema? Si la respuesta es "lo mismo pero dentro de la app", es un duplicado. Si hace algo diferente, no está documentado de forma que el usuario lo entienda.

*Arreglo:* Auditar qué código lee `batterySaver` hoy. Si es redundante con `reduceMotion` del sistema, eliminar. Si tiene efecto propio, renombrarlo con una descripción de qué hace ("Pausar animaciones decorativas") y separarlo conceptualmente de "ahorro".

---

**MENOR · Los tres variantes "Dinámico" del acento del gráfico (`signed`, `signedLine`, `signedFill`)**

*Problema:* "Dinámico", "Línea dinámica" y "Contenido dinámico" son tres swatches que la mayoría de usuarios no distinguirá en producción. El swatch SVG con anillo/disco partido es inteligente en diseño, pero requiere que el usuario entienda la metáfora de "canal de línea" vs "canal de contenido". Para un usuario de una app de finanzas personales, esto es demasiado fino.

*Arreglo:* Colapsar los tres en uno solo: "Dinámico" (equivalente al `signed` actual, que es el más legible). Las variantes `signedLine` y `signedFill` pueden quedar como easter egg interno o eliminarse. Esto reduce los swatches de hasta 9 a 6-7, que es un número manejable.

---

**MENOR · `chartSpeed` (Velocidad de animación)**

*Problema:* Ya es condicional (solo aparece si `animStyle !== 'none'`), lo cual es correcto. Pero combinado con el tipo de gráfico, el estilo de animación y el acento, el capítulo Datos suma 4 controles solo para el gráfico del balance, que ocupa un espacio pequeño en el Home. La velocidad es el ajuste de menor impacto percibido.

*Arreglo:* Conservar pero bajar la jerarquía visual: sin label de sección propia, como un control secundario debajo del selector de estilo de animación. O fusionar los valores de velocidad dentro de las tarjetas de animación (tarjeta "Elástico lento" vs "Elástico rápido").

---

## 3. Qué falta o qué agruparía mejor

**IMPORTANTE · Modo claro/oscuro como tabs, no como control inline**

El selector "Claro / Oscuro" dentro del capítulo Fondo (control #3) es un control de contexto, no un ajuste. Su función es decidir qué modo estás editando, no configurar el aspecto. Visualmente está al mismo nivel que los demás ajustes, lo que genera confusión: el usuario puede pensar que está cambiando el modo del teléfono.

*Arreglo:* Moverlo a la parte superior del capítulo Fondo, separado del bloque de controles, con un label explícito como "Estás editando el modo:" o como un pill badge junto al título del capítulo.

**MENOR · Sin agrupación visual entre controles del capítulo Fondo**

Intensidad → Desenfoque → Degradado → Carrusel son cuatro conceptos distintos (uno afecta al efecto, otro al cristal, otro al gradiente base). No hay separación visual entre ellos más allá del label de sección en uppercase. Un separador o un leve agrupamiento (intensidad + desenfoque juntos bajo "Efecto"; degradado + carrusel bajo "Base") reduciría la carga cognitiva.

**MENOR · El roadmap en Detalle ocupa espacio premium**

La lista de "próximamente" al final del capítulo Detalle es marketing interno dentro de una pantalla de ajustes. No es un control, no es un estado, no da feedback. Un usuario que llega a Detalle buscando un ajuste específico tiene que scrollear por ella.

*Arreglo:* Mover a un banner colapsable al final, o a la propia pantalla de perfil. En Detalle, que la pantalla termine con el último switch.

---

## 4. El BackgroundCarousel — análisis detallado

### Lo que funciona
- **Tamaño de tarjeta (62%, ratio 1:1.72):** Correcto. Deja las vecinas asomando (~19% de cada lado), señal clara de scroll horizontal. El ratio casi-teléfono es coherente con lo que se quiere mostrar.
- **Check de seleccionado:** Posición top-right, badge circular con checkmark, visible sobre cualquier fondo. Correcto.
- **Label bajo la tarjeta:** Cambia de color (primary si activo). Correcto.
- **Snap behavior:** Bien resuelto con el doble de `onMomentumScrollEnd` + `onScrollEndDrag` para cubrir gestos cortos.
- **Aplicación al deslizar:** El fondo se aplica al detenerse en una tarjeta. La app entera refleja el resultado. Esto es el comportamiento correcto.

### Problemas

**IMPORTANTE · 14+1 puntos de paginación son ilegibles como navegación**

Con 15 dots (14 efectos + none), la barra de puntos tiene 6px × 15 + 6px de gap × 14 = ~174px. En un móvil de 375px de ancho, ocupa casi la mitad del ancho. El punto activo (16px) se distingue, pero no dice "estás en el 8 de 15". El usuario no sabe cuántos fondos quedan hacia la derecha.

*Arreglo:* Reemplazar los dots por un contador textual discreto: `"8 / 15"` en `textTertiary`, fontSize 11, centrado debajo del carrusel. Más información, menos ruido visual.

**MENOR · El label de la tarjeta activa no aporta información nueva**

El nombre del efecto (ej. "Aurora") ya está implícito en el fondo que se ve. El label solo tiene valor cuando la tarjeta está desenfocada (no activa). En la tarjeta activa, el label es redundante con el check badge.

*Arreglo:* Ninguno urgente. Si se implementara la maqueta (ver sección 5), el label quedaría más justificado para fondos similares entre sí.

**MENOR · Sin feedback háptico al cambiar de tarjeta**

El carrusel aplica el fondo al detenerse, pero no hay ninguna confirmación táctil. En iOS, `Haptics.selectionAsync()` en el momento de `onSelect` costaría una línea y haría la interacción más sólida.

---

## 5. Propuesta del dueño: maqueta del Home en cada tarjeta del carrusel

### La pregunta es si vale la pena

**Recomendación: no implementar la maqueta completa. Implementar una versión mínima orientada a legibilidad.**

### Por qué no la maqueta completa

El canvas que ya existe en la parte superior de la pantalla ya cumple exactamente esa función: muestra el resultado completo (saludo + saldo + gráfico + tarjeta) con el fondo activo mientras el usuario desliza el carrusel. Si cada tarjeta del carrusel también mostrara esa maqueta, habría dos representaciones del mismo resultado visible simultáneamente. Ruido, no valor.

Además: `PersonalizationCanvas` renderiza `BackgroundEffect` + `LinearGradient` + `Sparkline` + `ProSheen`. Multiplicar eso por 14 tarjetas del carrusel —incluso si solo 3 son visibles a la vez— es un gasto de render que va contra las reglas de animación del proyecto.

### Qué sí tiene sentido incluir en cada tarjeta

El argumento real de la propuesta es válido en su núcleo: el usuario necesita saber **si su contenido se leerá bien sobre ese fondo**, no solo si el fondo le gusta en abstracto. El lienzo superior responde esa pregunta para el fondo activo, pero no para los fondos que aún no ha elegido.

La solución más eficiente: añadir **2 elementos de legibilidad** dentro de cada tarjeta, sin maqueta completa:

1. **Un número de saldo ficticio** (ej. `$4.286`) en `themed.textPrimary`, fontFamily ExtraBold, en la parte superior de la tarjeta, simulando el balance real. Esto muestra si el texto se lee sobre ese fondo.
2. **Una línea fina de sparkline** en `themed.primary`, 20px de alto, en la parte inferior. Esto muestra si el color de acento sobrevive sobre el fondo.

Estos dos elementos son estáticos (sin animación), baratos de renderizar, y responden la pregunta de legibilidad sin duplicar el canvas completo. La tarjeta quedaría: fondo real → scrim → efecto → texto de saldo (top) → sparkline estática (bottom).

### Si se implementara esta versión mínima: qué debe tener la maqueta parcial

- El texto del saldo debe usar los colores del **modo que se está editando** (`themed.textPrimary`), no los del tema activo de la app. Ya existe este patrón en el código (`const themed = isDark ? activePalette.colors.dark : activePalette.colors.light`).
- La sparkline debe ser estática: array fijo de 5 valores, sin animación, sin `animate={true}`.
- Nada más. Sin avatar, sin greeting, sin tarjeta de categoría, sin labels.
- Altura del área de contenido: ~30% inferior y ~15% superior de la tarjeta. El centro lo ocupa el efecto de fondo, que es lo que se está eligiendo.

---

## 6. Jerarquía, espaciado y carga cognitiva

**CRÍTICO · El capítulo Datos tiene la mayor carga cognitiva y el menor impacto percibido**

6 tipos de gráfico × N estilos de animación × 3 velocidades × hasta 9 acentos = decenas de combinaciones para personalizar una sparkline de 44px de alto en el Home. El canvas del capítulo Datos (focus='chart') muestra el gráfico ampliado a 68px, lo cual ayuda, pero la proporción de controles vs tamaño del elemento personalizado es la más desequilibrada de la pantalla.

*Arreglo a corto plazo:* Eliminar `signedLine` y `signedFill` de los acentos (ya resuelve 2 swatches). Revisar cuántos `chartAnimStyle` hay en `CHART_ANIM_VALUES` y si todos son perceptiblemente distintos. Si alguno es casi idéntico a otro, eliminar.

**IMPORTANTE · La pantalla no tiene un estado de "primera visita" o "recién llegado"**

Un usuario premium que entra por primera vez ve el canvas + el segmented control de capítulos y no sabe por dónde empezar. Los Looks en el capítulo Color son el punto de entrada más correcto (un preset completo en un toque), pero no hay ninguna señal que los priorice sobre los controles individuales.

*Arreglo:* Abrir siempre en el capítulo Color, que ya es el comportamiento actual (`useState<Chapter>('color')`). Está bien. Pero considerar un microcopy debajo del PageTitle que diga "Empieza eligiendo un look completo o ajusta cada detalle" para orientar.

**MENOR · La barra de capítulos es siempre visible (fixed), pero el canvas no**

El canvas es lo más valioso de la pantalla (muestra el resultado en vivo) y desaparece al scrollear. La barra compacta (`PersonalizationCanvasBar`) lo suple parcialmente, pero solo muestra el saldo y un botón de expandir. En el capítulo Fondo, al estar los controles de intensidad y desenfoque antes del carrusel, el usuario tiene que scrollear hacia abajo para ver los efectos, lo que hace desaparecer el canvas y activa la barra compacta. El flujo natural (ver → ajustar → ver resultado) se interrumpe.

*Arreglo:* En el capítulo Fondo, mover los controles de intensidad y desenfoque DESPUÉS del carrusel, no antes. El usuario elegiría primero el efecto (lo más importante) y luego lo afinaría. Esto también reduce el scroll necesario para llegar al carrusel.

---

## Resumen ejecutivo

| Prioridad | Hallazgo | Acción |
|-----------|----------|--------|
| IMPORTANTE | `backgroundIntensity` es opaco y redundante | Eliminar |
| IMPORTANTE | `batterySaver` puede ser duplicado de reduce-motion del sistema | Auditar y eliminar si confirma |
| IMPORTANTE | Selector Claro/Oscuro perdido entre controles de ajuste | Moverlo como contexto separado al top del capítulo |
| IMPORTANTE | Intensidad y desenfoque antes del carrusel interrumpen el flujo | Moverlos después del carrusel |
| IMPORTANTE | 14 dots de paginación: ilegibles como orientación | Reemplazar por contador "8 / 15" |
| MENOR | `signedLine` y `signedFill` en acento del gráfico: nadie lo cambia dos veces | Eliminar ambos, dejar solo `signed` |
| MENOR | Roadmap en Detalle ocupa espacio de ajustes | Mover a perfil o colapsar |
| MENOR | `chartSpeed` sin jerarquía secundaria | Bajar nivel visual |
| MENOR | Sin háptico al cambiar fondo | `Haptics.selectionAsync()` en `onSelect` |
| — | **Maqueta en tarjetas del carrusel** | NO completa. Sí: saldo estático + sparkline fija como indicadores de legibilidad |
