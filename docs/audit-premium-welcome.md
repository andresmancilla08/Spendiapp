# Auditoría — `app/premium-welcome.tsx`

**Fecha:** 2026-08-17
**Alcance:** las 406 líneas de `app/premium-welcome.tsx`, más sus dependencias de token (`config/palettes.ts`, `config/colors.ts`, `config/fonts.ts`, `utils/contrast.ts`, `components/AppIcon.tsx`) y su punto de invocación (`app/_layout.tsx:218-226`).
**Método:** lectura completa del código + cálculo numérico de contraste con la misma matemática WCAG que ya vive en `utils/contrast.ts`. Sin captura en dispositivo: todo ratio de este documento está computado, no estimado a ojo.
**Skills aplicadas:** `ui-ux-pro-max` (accesibilidad, jerarquía, tipografía, animación), `impeccable` (`critique` + `audit.native`).

> ⚠️ DEGRADED: single-context — las dos evaluaciones de `critique` (A: revisión de diseño, B: evidencia determinista) se ejecutaron en el mismo contexto. No hay navegador ni `detect.mjs` aplicable a React Native.

---

## 0. Veredicto en una línea

No se ve horrible por falta de esfuerzo. Se ve horrible **por exceso**: seis focos visuales compitiendo, cuatro pesos tipográficos, seis radios distintos, tres bucles de animación infinitos y un degradado dorado que hace que **el texto blanco de la mitad de la pantalla esté entre 1,33:1 y 2,33:1** — es decir, técnicamente ilegible. La pantalla más importante de la conversión es la única del proyecto que no llama a `utils/contrast.ts` para nada útil: importa ese módulo (línea 16) y usa **exclusivamente `mixHex`**, la única función que *crea* el problema, ignorando `readableOn`, `readableTint` y `accentInk`, escritas precisamente para evitarlo.

### Marcadores

| # | Dimensión (impeccable · audit.native) | Nota | Hallazgo clave |
|---|---|---|---|
| 1 | Accesibilidad | **0/4** | Título, subtítulo, estrella y CTA por debajo de 2,4:1. `lineHeight` fijo se solapa con Dynamic Type. Sin Reduce Motion. |
| 2 | Rendimiento | **1/4** | Tres `Animated.loop` perpetuos; dos sin `stop()` en el cleanup. Viola la regla 1 de `CLAUDE.md`. |
| 3 | Apariencia y theming | **1/4** | 9 blancos hardcodeados. El oro es `FIXED_DARK`: **idéntico en las 30 paletas**, justo lo que el comentario de la línea 30-32 dice haber arreglado. |
| 4 | Conformidad de plataforma | **2/4** | Sombras que se comportan al revés en iOS y Android. Sin `accessibilityRole`. Sin salida salvo el CTA. |
| 5 | Adaptabilidad | **1/4** | El footer no respeta el `maxWidth: 640` del contenido. Gotera de 20 px arriba vs 16 px abajo. |
| | **Total** | **5/20** | **Crítico — problemas fundamentales** |

| # | Heurística de Nielsen | Nota | Problema |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | El estado sí se comunica ("tu cuenta está activa"), pero en lenguaje de operadora telefónica. |
| 2 | Correspondencia con el mundo real | 1 | Cinco *checks* verdes que no marcan nada que el usuario haya hecho. Un check es "completado", no "incluido". |
| 3 | Control y libertad | 1 | Sin cerrar, sin saltar, sin volver. Un único camino, tras 1,48 s de espera obligatoria. |
| 4 | Consistencia y estándares | 1 | 6 radios, 5 tamaños de fuente sin escala, 4 pesos, 5 colores de icono que en 7 de 30 paletas no son 5. |
| 5 | Prevención de errores | 2 | `FEATURE_ICONS[i]` y `featureAnims[i]` sin módulo ni guarda: una traducción con 6 features rompe la pantalla. |
| 6 | Reconocer antes que recordar | 2 | Los nombres de función son etiquetas internas ("Reporte con amigo"), no beneficios. |
| 7 | Flexibilidad y eficiencia | n/a | Superficie de un solo uso. |
| 8 | Estética y diseño minimalista | 0 | Es el fallo central. Todo grita a la vez, así que nada destaca. |
| 9 | Recuperación de errores | 2 | `updateDoc(...).catch(() => {})` — el fallo se traga en silencio (línea 150). |
| 10 | Ayuda y documentación | n/a | No aplica. |
| | **Total** | **12/32** | **Aceptable-bajo — hace falta trabajo significativo** |

---

## 1. Diagnóstico brutal: por qué se ve mal

### 1.1 El dorado no es de marca, y encima es el mismo en las 30 paletas

El comentario de las líneas 30-32 dice:

```ts
/** Tonos de la paleta ACTIVA: antes eran cinco hex fijos y la bienvenida a Premium
 *  se veia igual con las 40 paletas. */
```

Y el de las 39-41:

```ts
// Rampa de oro derivada de `warning`, no cuatro hex de marca: funciona igual en
// las 40 paletas.
```

**Las dos afirmaciones son falsas para el 70 % de la pantalla.** `warning` no es un token de paleta: vive en `FIXED_DARK` (`config/palettes.ts:36-42`, `warning: '#FBBF24'`) y en `FIXED_LIGHT` (`:27-34`, `warning: '#F59E0B'`). Es literalmente **el mismo hex en las 30 paletas**. La rampa del héroe (línea 44-46), el `starCircle` (línea 203) y el CTA (línea 277) son idénticos con `deepWater`, con `lavender`, con `forest` y con `infrared`. Lo único que sí varía son los cinco iconitos de 20 px de la tarjeta inferior — el 4 % del área pintada.

Resultado real, y esto es lo que el usuario está viendo: **una app de 30 paletas donde la pantalla de recompensa es siempre ámbar de alerta.** Sobre un fondo violeta (`lavender` dark: `background #0F0B1E`, `surface #1E1430`) el ámbar `#FBBF24` es una colisión de complementarios sin ningún tono intermedio que los cosa. No hay armonía porque no hay relación: uno es un token semántico de *advertencia* y el otro es la identidad del usuario.

Y `warning` significa advertencia. Se está usando el color de "cuidado" para decir "enhorabuena".

### 1.2 La saturación: la rampa no tiene a dónde ir

```ts
goldRamp = [mixHex(gold,'#000',0.55), mixHex(gold,'#000',0.35), mixHex(gold,'#000',0.15), gold]
//        = #715610 → #A37C17 → #D5A21F → #FBBF24   (dark)
```

Cuatro paradas del **mismo tono** (H≈43°) variando solo en luminosidad. Eso no es un degradado, es una rampa de brillo: no aporta profundidad, aporta *banding*. Y el recorrido es de `{x:0,y:0}` a `{x:1,y:1}`, así que en modo oscuro la esquina inferior derecha —justo donde caen el título y el subtítulo— es la **más brillante** de las cuatro paradas. El texto blanco se pone deliberadamente encima del punto de máxima luminosidad.

En modo claro la rampa se invierte (línea 46) y termina en `goldLight = #FACA79`, un melocotón pálido. El subtítulo blanco al 85 % sobre `#FACA79` da **1,43:1**. No es "poco contraste": es texto blanco sobre fondo casi blanco.

Encima, el bloque ocupa aproximadamente **310 px de alto** (36 + 26 badge + 12 + 80 estrella + 12 + ~72 título a dos líneas + 12 + ~21 subtítulo + 40) sobre un área de scroll de ~740 px en un iPhone estándar: **el 42 % de la pantalla es un rectángulo de un solo color**. En un iPhone SE (667 pt) la tarjeta de funciones ya no cabe entera.

### 1.3 Los checks verdes no pertenecen a nada

`colors.success` en cinco filas idénticas (línea 249, `IconCircleCheckFilled` a 22 px). Tres problemas apilados:

- **Semántico.** Un check marca algo *completado por el usuario* o *seleccionado*. Aquí no se ha completado nada: son nombres de funciones. Cinco checks en columna leen como una lista de tareas o como la columna "Plan Pro" de una tabla comparativa de precios. Nada más frío que una tabla de precios en el momento del *unboxing*.
- **Cromático.** En `lavender` `success = #4ADE80`, un verde lima brillante que **no aparece en ningún otro sitio de esa paleta** (`primary #C084FC`, `secondary #A78BFA`, `tertiary #E879F9`). Y da **10,06:1** sobre la superficie: es el elemento de **mayor contraste de toda la tarjeta**, por encima del propio texto de la función. El ojo aterriza cinco veces seguidas en el elemento que aporta **cero información**, porque los cinco son idénticos.
- **Redundante.** Elimina la columna entera y no se pierde ni un bit. Es peso visual puro.

### 1.4 Cinco colores de icono que no son cinco, ni son una paleta

```ts
const featureColors = (c: AppColors) => [c.primary, c.warning, c.success, c.tertiary, c.secondary];
```

Cinco *tokens semánticos distintos* usados como *paleta categórica*. Eso ya es un error de sistema: `warning` y `success` tienen significado, y aquí se les asigna arbitrariamente a "Reporte con amigo" y "Gastos grupales". Pero además, medido sobre las 30 paletas:

- **En 7 de 30 paletas no salen 5 colores distintos.** Incluyendo la paleta por defecto: en `deepWater` dark `secondary === success === #00A896`, así que las filas 3 y 5 tienen **el mismo icono de color** — y el check verde de las cinco filas es *también* `#00A896`, exactamente el mismo color. Tres elementos, un color, ninguna relación.
- En `sunset` dark, `primary === #FBBF24 === warning`: la fila 1 y la fila 2 comparten color, **y ambas comparten color con todo el degradado del héroe**.
- En `forest`, `mint` y `aurora`, `success === primary`.

Y aun cuando salen cinco, cinco *hues* a plena saturación en columna, en chips de 44 px al 12,5 % de opacidad, es exactamente el arcoíris que `dataviz` prohíbe: color sin codificar nada. Los cinco chips no significan cinco categorías; significan "aquí hubo un diseñador que quería que se viera alegre".

Los iconos, además, están mal elegidos: `wallet-outline` → `IconWallet` para "Presupuesto inteligente" (una cartera no es un presupuesto), `document-text-outline` → `IconFileText` para "Reporte con amigo" (un documento genérico), y **`color-palette-outline` → `IconPalette` junto a `contrast-outline` → `IconContrast`**: dos iconos de apariencia, casi gemelos a 20 px, en filas consecutivas para dos funciones que son la misma cosa.

### 1.5 La jerarquía: seis focos, ningún foco

Contando lo que reclama atención en el primer viewport:

1. El badge en mayúsculas con `letterSpacing: 2.5` (línea 339).
2. La estrella de 72 px con `shadowOpacity: 0.55` + `elevation: 12`, **latiendo** en bucle a 1,08× (línea 80).
3. Dos halos concéntricos **respirando** en bucle (línea 84-85).
4. El título de 30 px con sombra de texto.
5. Los cinco chips de color.
6. Los cinco checks verdes de 10:1 de contraste.
7. El CTA con **shimmer en bucle infinito** (línea 136-143).

Siete. Cuando todo grita, la pantalla no tiene punto de entrada: el ojo rebota. Y el elemento que debería mandar —el mensaje— es el que menos se lee, porque está en blanco sobre ámbar.

El `heroTitleAccent` (líneas 370-373) confirma que la jerarquía es decorativa y no funcional: la única diferencia entre "Tu cuenta está" y "**activa.**" es `Fonts.bold` (Montserrat 700) → `Fonts.extraBold` (800). A 30 px eso es una diferencia de grosor de trazo del orden del 2 %: **invisible**. El copy se parte en dos claves i18n (`title1`/`title2`) para producir un énfasis que nadie percibe.

### 1.6 La tipografía no tiene escala

Cinco tamaños: **10** (badge, L338), **14** (subtítulo, L375), **15** (feature, L388), **17** (CTA, L402), **30** (título, L363).

Los saltos son 1,40× → 1,07× → 1,13× → 1,76×. 14, 15 y 17 son tres tamaños que el ojo lee como *el mismo tamaño mal ajustado*, no como tres niveles. Y hay **un solo salto real** (17→30) para separar cinco niveles de información. Cuatro pesos (400/600/700/800) sobre cinco elementos de texto: más pesos que niveles.

El badge a **10 px** con `letterSpacing: 2.5` está por debajo de cualquier mínimo de legibilidad (`ui-ux-pro-max`: 16 px mínimo en móvil para cuerpo; 10 px de versalitas trackeadas es el suelo absoluto), y lleva dentro un `AppIcon name="star" size={10}` (línea 192) — una estrella rellena a 10 px es un borrón.

### 1.7 La sombra de texto que no ayuda y sí estorba

```ts
textShadowColor: 'rgba(0,0,0,0.15)', textShadowRadius: 4,   // L365-367
```

Al 15 % de opacidad no aporta contraste medible (haría falta ~0,5 para que cuente en la percepción). Lo que sí hace es difuminar el borde de la letra: 30 px de Montserrat Bold con un halo negro al 15 % y radio 4 se ve **ligeramente sucio**. Es el peor de los dos mundos: cero beneficio de legibilidad, coste real de nitidez. Es el parche que se pone cuando el problema real —contraste 2,33:1— no se ha querido mirar.

### 1.8 Densidad y ritmo

`featuresCard`: `padding: 20, gap: 18` con filas de 44 px → un paso de 62 px repetido cinco veces sin variación. Es la métrica de una lista de ajustes. La sección de "esto es lo que acabas de comprar" tiene exactamente el mismo ritmo visual que la pantalla de preferencias de notificaciones.

El sistema de espaciado es incoherente además: el `scrollContent` usa gotera de **20** (L307), el `footer` usa **16** (L390). El borde izquierdo del botón dorado queda **4 px fuera** del borde izquierdo de la tarjeta. A esa escala se ve. Y el `starContainer` mete `marginVertical: 4` (L342) dentro de un contenedor cuyo `gap` es 12 → 16 px arriba y abajo de la estrella, rompiendo el ritmo de 12.

### 1.9 Seis radios, ninguna familia

28 (`heroWrapper`, L310) · 24 (`starCircle`, L354) · 24 (`featuresCard`, L380) · 14 (`featureIconWrap`, L385) · 50 (`premiumBadge`, L334) · 50 (`btnWrapper`, L392) — más 60 y 44 de los halos y los 22 del círculo del check.

Y hay un conflicto de forma flagrante: el `starCircle` es un **cuadrado redondeado de 72 px con radio 24** metido dentro de **dos halos circulares** de 88 y 120 px (`borderRadius: 44` y `60`, L343-352). Un cuadrado dentro de un círculo, con las cuatro esquinas del cuadrado asomando fuera del halo interior. Es el detalle que más "sin terminar" hace ver la pantalla.

### 1.10 Los círculos decorativos son invisibles y ensucian

```ts
decoCircle1: opacity 0.08, '#fff'          → 1,22:1 sobre la rampa
decoCircle2: opacity 0.05, '#fff'          → 1,09:1
decoCircle3: opacity 0.14, colors.primary  → sobre ámbar
```

Los dos primeros están por debajo del umbral de percepción sobre un fondo saturado: no se ven, solo añaden *banding* al degradado. El tercero es peor: un violeta (`#C084FC`) al 14 % sobre ámbar produce un **parche pardo sucio**, y está posicionado en `top: 20, left: 16` — exactamente detrás del badge, sin ninguna razón compositiva. Es ruido con coste de render.

### 1.11 Animación: viola tres reglas explícitas del proyecto y una del usuario

`CLAUDE.md` de este repo, regla 1: *"El movimiento decorativo NUNCA se anima desde JS. Todo efecto de fondo y toda animación en bucle pasa por `components/fx/FxLayer.tsx`. Prohibido `Animated.loop` con `useNativeDriver: false` para decoración."*

Esta pantalla tiene **tres `Animated.loop`**:
- `starPulse` + `haloOpacity` en paralelo (L77-88) — decoración pura.
- `shimmerLoop` en el CTA (L136-143) — decoración pura, y perpetuo: se repite cada 650 ms + 1800 ms de delay **para siempre**.

Todos usan `useNativeDriver: Platform.OS !== 'web'`, es decir **`false` en web** — exactamente el patrón que el `CLAUDE.md` documenta como causa de "1.440 escrituras del atributo `style` por segundo con la app en reposo".

Y el cleanup está mal: la línea 144 devuelve `shimmerLoop.stop()`, pero **el loop de `starPulse`/`haloOpacity` de la línea 88 nunca se detiene**. `CLAUDE.md`: *"todo `useEffect` que arranque una animación debe devolver su limpieza"*.

Encima, el halo que respira **es invisible**: blanco al 25 % sobre la rampa da **1,47:1**. Se está quemando un bucle de animación infinito, en JS en web, sin cleanup, para mover algo que nadie puede ver.

Y la coreografía de entrada contradice la preferencia global del usuario (*duraciones ≤150 ms, spring stiffness ≥300, stagger ≤20 ms, sin delays innecesarios*): duraciones de **340-400 ms**, stagger de **80 ms** (L112), y el CTA —la única acción posible de la pantalla— aparece en `delay(1080) + 400ms` = **1,48 segundos**. Un segundo y medio mirando una pantalla sin poder tocar nada.

Cero comprobación de `AccessibilityInfo.isReduceMotionEnabled()`. Para un usuario con sensibilidad vestibular esto es una estrella que late y dos halos que pulsan indefinidamente.

### 1.12 Robustez y fugas técnicas

- **`features` sin guarda (L163, L233).** `t('premiumWelcome.features', { returnObjects: true }) as string[]`. Si la clave falta o i18n no ha hidratado, devuelve un `string` y `.map` revienta → pantalla en blanco en el momento exacto de la conversión. Sin `Array.isArray`.
- **Índices sin módulo.** `accents[i % accents.length]` (L244-245) sí usa módulo, pero `FEATURE_ICONS[i]` (L245) y `featureAnims[i]` (L239-240) **no**. `featureAnims` está fijado a `[...Array(5)]` (L63). Hoy los tres locales tienen 5 features (verificado en `es/en/it`), así que no rompe — pero cualquier traducción o experimento que añada una sexta función crashea. Inconsistencia gratuita en la misma línea de código.
- **9 blancos hardcodeados.** L181, L182 (`'#fff'`), L192, L204, L282 (`color="#fff"`), L339, L364, L402 (`color: '#fff'`), L289 (`rgba(255,255,255,0.25)`), más `rgba(255,255,255,0.18)` L333, `0.5` L334, `0.25` L346, `0.3` L351, `0.85` L376. En un proyecto con 30 paletas y modo claro/oscuro.
- **Sombras al revés entre plataformas.** `starCircle` (L353-359): `shadowColor: gold` con `shadowOpacity: 0.55` → en iOS es un resplandor dorado **sobre fondo dorado**, invisible; en Android `elevation: 12` ignora `shadowColor` y pinta una **sombra negra**. La misma estrella tiene glow-nada en iOS y sombra dura en Android. `btnWrapper` (L391-396) es peor: define `shadowOffset`/`shadowOpacity: 0.45`/`shadowRadius: 18` **sin `shadowColor`** → negro por defecto, invisible sobre `#0F0B1E` en iOS, pero `elevation: 10` sí la dibuja en Android.
- **Bordes invisibles.** `borderColor: \`${colors.primary}22\`` con `borderWidth: 1.5` (L229, L380) → **1,24:1** sobre la superficie. Un borde y medio de píxel que no existe. El `borderTopColor: \`${colors.textPrimary}10\`` del footer (L262) da **1,13:1**: el separador tampoco existe. Y `surface #1E1430` sobre `background #0F0B1E` es **1,10:1**, así que la tarjeta tampoco se separa por sí sola: solo la sostiene una sombra que en iOS está al 8 % en color `primary` (violeta), o sea, casi nada.
- **`maxWidth` roto en el footer.** `scrollContent` tiene `maxWidth: 640, alignSelf: 'center'` (L307). `footer` (L390) **no tiene ninguno**. En web o tablet el contenido queda centrado a 640 px y el botón dorado se estira a todo el ancho de la ventana. Bug real y visible.
- **Dynamic Type rompe la maqueta.** Todos los `lineHeight` son números fijos (36 en L368, 21 en L376, 22 en L388) mientras `fontSize` sí escala con el ajuste de tamaño de texto del sistema. Al 200 % las líneas del título **se solapan**. Y `ctaBtn` tiene `height: 58` fija (L399) con icono + texto en fila: a escala grande el texto se corta.
- **Sin `accessibilityRole` / `accessibilityLabel`** en el `TouchableOpacity` del CTA (L269-275). `activeOpacity={1}` elimina además el feedback nativo de pulsación.
- **Error tragado en silencio.** `updateDoc(...).catch(() => {})` (L150): si falla la escritura de `premiumWelcomeSeen`, el usuario navega igual, la bandera se queda en `false` para siempre y no hay ni log. Verificado en `app/_layout.tsx:218-226`: como el disparador exige `prevWasPremium === false` estricto y `prevIsPremiumRef` arranca en `null`, **no** se re-muestra en el siguiente arranque en frío — pero sí volvería a saltar en cualquier transición free→premium posterior (una renovación que reescriba `isPremium`). Severidad media, no crítica.
- **Sin salida.** No hay cerrar, ni saltar, ni cabecera. El botón atrás de Android sale de la pantalla sin escribir la bandera.

### 1.13 Copy

- **"Tu cuenta está activa."** Es el lenguaje de una activación de SIM o de un aviso de facturación. Es *estado del sistema*, no *recompensa*. Es la frase de un email transaccional automático.
- **"Bienvenido al nivel completo de Spendia."** "Nivel completo" no significa nada concreto. Y "Bienvenido a" sobre una pantalla llamada "bienvenida" es tautología.
- **Los cinco nombres son etiquetas internas, no beneficios.** "Reporte con amigo" es incomprensible fuera del equipo. "Paleta de colores" y "Temas premium" **son la misma cosa dicha dos veces** — y por tanto el 40 % de la propuesta de valor de una compra son ajustes cosméticos, lo que diluye las dos funciones que sí valen dinero ("Presupuesto inteligente", "Gastos grupales"). Una pantalla de bienvenida premium que dedica dos de cinco líneas al selector de color está **infravendiendo lo que el usuario acaba de pagar**.
- **"Empezar a explorar"** es genérico y pospone el valor ("explora tú a ver qué encuentras") en lugar de entregarlo.

---

## 2. Contraste WCAG — pares reales del código

Todos los valores calculados con la fórmula WCAG 2.1 (la misma de `utils/contrast.ts`). Las capas semitransparentes están compuestas sobre su fondo real antes de medir. Umbrales: **4,5:1** texto normal, **3:1** texto grande (≥18,66 px negrita / ≥24 px normal) y componentes gráficos.

### Modo oscuro — rampa `#715610 → #A37C17 → #D5A21F → #FBBF24`

| Par (línea) | Frente | Fondo | Ratio | Umbral | Veredicto |
|---|---|---|---|---|---|
| `heroTitle` 30 px bold — parada 1 (L364/L44) | `#FFFFFF` | `#715610` | **6,91:1** | 3:1 | Pasa |
| `heroTitle` — parada 2 | `#FFFFFF` | `#A37C17` | **3,85:1** | 3:1 | Pasa raspando (falla AA normal) |
| `heroTitle` — parada 3 | `#FFFFFF` | `#D5A21F` | **2,33:1** | 3:1 | **FALLA** |
| `heroTitle` — parada 4 (donde cae de verdad) | `#FFFFFF` | `#FBBF24` | **1,67:1** | 3:1 | **FALLA GRAVE** |
| `heroSub` 14 px, `rgba(255,255,255,.85)` (L376) | `#F9F1DD` | `#D5A21F` | **2,07:1** | 4,5:1 | **FALLA GRAVE** |
| `heroSub` sobre el final de rampa | `#FEF5DE` | `#FBBF24` | **1,54:1** | 4,5:1 | **FALLA CRÍTICA** |
| Estrella 36 px `#fff` sobre `starCircle` claro (L203-204) | `#FFFFFF` | `#FDDC87` | **1,33:1** | 3:1 | **FALLA CRÍTICA** — el foco visual de la pantalla es invisible |
| Estrella sobre el extremo `gold` del círculo | `#FFFFFF` | `#FBBF24` | **1,67:1** | 3:1 | **FALLA GRAVE** |
| Halo blanco 25 % vs rampa (L346) | `#BA9D51` | `#A37C17` | **1,47:1** | 3:1 | Invisible — y está animado en bucle |
| Texto del badge sobre pill blanca 18 % (L333/339) | `#FFFFFF` | `#8B743B` | **4,51:1** | 4,5:1 | Pasa por 0,01 — y es texto de 10 px |
| Borde del badge 50 % (L334) | `#B8AB88` | `#715610` | **3,03:1** | 3:1 | Pasa raspando |
| **`ctaBtnText` 17 px bold — extremo oscuro** (L277/402) | `#FFFFFF` | `#A37C17` | **3,85:1** | **4,5:1** | **FALLA** (17 px bold < 18,66 px, no es texto grande) |
| **`ctaBtnText` — extremo claro** | `#FFFFFF` | `#FBBF24` | **1,67:1** | 4,5:1 | **FALLA CRÍTICA** — la mitad derecha del botón principal |
| `decoCircle1` blanco 8 % (L316) | `#7C6423` | `#715610` | **1,22:1** | — | Invisible |
| `decoCircle2` blanco 5 % (L321) | `#A88323` | `#A37C17` | **1,09:1** | — | Invisible |

### Modo claro — rampa `#9F6707 → #D08609 → #F59E0B → #FACA79`

En claro la rampa se invierte (L46) y **el extremo brillante queda abajo a la derecha**, justo donde vive el subtítulo.

| Par | Frente | Fondo | Ratio | Veredicto |
|---|---|---|---|---|
| `heroTitle` sobre `#F59E0B` | `#FFFFFF` | `#F59E0B` | **2,15:1** | **FALLA** |
| `heroTitle` sobre `goldLight` | `#FFFFFF` | `#FACA79` | **1,52:1** | **FALLA CRÍTICA** |
| `heroSub` .85 sobre `goldLight` | `#FEF7EB` | `#FACA79` | **1,43:1** | **FALLA CRÍTICA** — texto blanco sobre melocotón pálido |
| Estrella `#fff` sobre `starCircle` | `#FFFFFF` | `#FACA79` | **1,52:1** | **FALLA CRÍTICA** |
| `ctaBtnText` sobre `#F59E0B` | `#FFFFFF` | `#F59E0B` | **2,15:1** | **FALLA** |
| Texto del badge | `#FFFFFF` | `#B08234` | **3,45:1** | Falla AA (10 px) |

El comentario de la línea 40 dice: *"En claro arranca mas claro para que el texto blanco se lea."* Es exactamente al revés: al arrancar más claro, **termina** en `#FACA79` y el texto blanco baja a **1,43:1**. La medida contradice el comentario.

### Tarjeta de funciones — `lavender` dark (`surface #1E1430`)

| Par | Ratio | Veredicto |
|---|---|---|
| `featureText #F3EEFF` sobre `surface` | **15,43:1** | Excelente |
| Check `success #4ADE80` sobre `surface` | **10,06:1** | Pasa — y ese es el problema: es lo más contrastado de la tarjeta y no informa de nada |
| Icono `primary #C084FC` sobre su chip al 12,5 % | **5,43:1** | Pasa |
| Icono `warning #FBBF24` sobre su chip | **8,18:1** | Pasa |
| Icono `success #4ADE80` sobre su chip | **7,97:1** | Pasa |
| Icono `tertiary #E879F9` sobre su chip | **5,78:1** | Pasa |
| Icono `secondary #A78BFA` sobre su chip | **5,29:1** | Pasa |
| Borde `primary22` (13 %) vs `surface` (L229) | **1,24:1** | Invisible |
| `surface` vs `background` | **1,10:1** | La tarjeta no se separa del fondo |
| Borde superior del footer `textPrimary10` (L262) | **1,13:1** | Invisible |

### Tarjeta — `deepWater` dark (paleta por defecto, `surface #162428`)

| Par | Ratio | Veredicto |
|---|---|---|
| `featureText #EEF6F8` | **14,56:1** | Excelente |
| Check `success #00A896` | **5,35:1** | Pasa |
| Icono `primary #00BCD4` sobre chip | **5,56:1** | Pasa |
| Icono `success #00A896` sobre chip | **4,43:1** | Falla por poco |
| **`secondary` vs `success`** | **1,00:1** | **Son el mismo hex `#00A896`** — filas 3 y 5 idénticas, y el check también |

### Referencia de remediación

Si se conserva el oro, la tinta correcta sobre `#FBBF24` es oscura, no blanca:

| Tinta | Sobre `#FBBF24` | Sobre `#F59E0B` |
|---|---|---|
| `colors.textPrimary` light `#1A2428` | **9,48:1** | **7,37:1** |
| `background` de la paleta violeta `#0F0B1E` | **11,57:1** | — |
| `#000000` | 12,58:1 | 9,78:1 |

Un CTA dorado con texto `#1A2428` pasa AAA. Un CTA dorado con texto blanco está en 1,67:1. La diferencia es una línea de código.

**Recuento:** de 21 pares medidos que involucran texto o iconografía significativa, **13 fallan** su umbral y **7 están por debajo de 2:1**. Un ratio de 1,33:1 (la estrella) es, funcionalmente, no dibujar nada.

---

## 3. El mensaje: qué debería decir vs. qué dice

### Lo que debería transmitir

Esta pantalla se ve **una sola vez en la vida del usuario**, en el segundo inmediatamente posterior a un pago. Es el momento de mayor duda post-compra que existe en el producto: *"¿he hecho bien?"*. Su trabajo, por orden:

1. **Confirmar sin fricción.** El pago funcionó. Cero ansiedad.
2. **Validar la decisión.** Devolverle al usuario la sensación de que ha subido de categoría — y hacerlo con densidad, no con brillo. En finanzas, "premium" se comunica con **precisión y calma**, no con purpurina. El lujo real en fintech es tipografía apretada, mucho aire, un solo acento y datos reales; no es un degradado ámbar.
3. **Entregar valor inmediato, no prometerlo.** La diferencia entre "ahora tienes presupuestos inteligentes" y **mostrar el primer presupuesto ya generado** es la diferencia entre un folleto y un producto.
4. **Dar un siguiente paso concreto.** No "explora": *"Ver tu presupuesto de agosto"*.
5. **Ser suya.** Un usuario que ha elegido la paleta `lavender` acaba de pagar por, entre otras cosas, poder elegir la paleta. Recibirlo con ámbar de alerta es contradecir la compra en el mismo acto.

Y por regla de pico-final: el pico debe ser **el reconocimiento**, y el final debe ser **entrar en la app con algo hecho**. No al revés.

### Lo que transmite hoy

- **"Se ha completado un trámite."** "Tu cuenta está activa" + cinco checks verdes = pantalla de confirmación de un formulario administrativo. Es la estética de un portal de la Seguridad Social con un degradado encima.
- **"Esto es una app gratuita con un plan de pago."** Los cinco checks son la columna derecha de una tabla comparativa de precios. Se le está enseñando al usuario **el argumentario de venta** *después* de que ya haya comprado. Ya no hay nada que convencer: hay que celebrar y entregar.
- **"Lo que has comprado son colores."** Dos de las cinco líneas son personalización cosmética. En una app de finanzas personales eso lee como que no había mucho más que poner.
- **"Cuidado."** El color dominante es el token `warning` de la app. Literalmente el color con el que se le avisa de que algo va mal.
- **"Esto no es tuyo."** El 70 % de la superficie ignora la paleta que el propio usuario configuró.
- **"Espera."** 1,48 s hasta que aparece el único botón, con una estrella latiendo. La sensación no es premio: es *carga*.
- **"Barato."** El degradado saturado de un solo tono, el shimmer perpetuo, el badge en versalitas trackeadas y la estrella con glow son el vocabulario visual de las apps de recompensas de casino y de las plantillas de "PRO UPGRADE" de los mercadillos de UI kits. La ironía es exacta: es la estética que se usa para vender algo barato, aplicada al momento en que el usuario ya ha pagado.

**El resumen:** debería decir *"buena decisión, mira lo que ya tienes"*. Dice *"trámite completado, aquí está la lista de lo que incluye tu plan"*.

---

## 4. Cinco direcciones de rediseño

Cinco mundos visuales distintos, no cinco dorados. Cada uno resuelve el problema de contraste **por construcción**, no con un parche. Todos conservan la verdad del producto (5 funciones, un CTA, una escritura a Firestore) y todos son implementables con lo que ya hay en el repo.

---

### Dirección A — «Recibo»
*Editorial financiero. El momento se registra, no se decora.*

**Idea en una frase.** Spendia no te felicita con confeti: te emite un comprobante, porque lo que acabas de hacer es una operación y esta app trata el dinero con seriedad.

**Color.** Elimina el degradado por completo. Fondo `colors.background` plano. **Un solo acento: `colors.primary`**, y solo en tres sitios (la cifra/sello, la línea de progreso, el CTA). El oro desaparece del sistema; si se quiere un guiño de "premium", es un **filete de 1 px** en `colors.primary` bajo la cabecera, nada más. Contraste resuelto de raíz: todo el texto es `textPrimary` (14,5:1) sobre superficie.

**Jerarquía tipográfica.** Escala real de cuatro pasos, alineada a la izquierda, sin centrado:
- **Micro-etiqueta** 11 px `Fonts.medium`, tracking 1,5, `textTertiary` — `PLAN PREMIUM · ACTIVO DESDE HOY`
- **Display** 40 px `Fonts.extraBold`, `lineHeight` 1,05, tracking −1 — *"Ya está."*
- **Cuerpo** 16 px `Fonts.regular`, `lineHeight` 1,5, `textSecondary`, ancho máximo 34 em
- **Dato** `Fonts.mono` (DMMono ya está en `config/fonts.ts` y no se usa aquí) para el número de confirmación y la fecha de renovación — es el detalle que hace que se lea como un documento financiero real.

**Las 5 funciones.** Un **libro mayor**: cinco filas separadas por filetes de 1 px en `colors.border`, cada una con un número ordinal en mono a la izquierda (`01`–`05`), el nombre en 16 px semibold, y **una línea de beneficio en 13 px `textSecondary` debajo** — que es donde por fin se explica qué es "Reporte con amigo". Sin chips de color. Sin checks. El orden es la jerarquía: `01` es lo más valioso.

**Qué siente el usuario.** Respeto. "Esta gente sabe lo que hace con mi dinero." Es la dirección menos emocionante y la más creíble; convierte la duda post-compra en confianza en lugar de taparla con brillo.

---

### Dirección B — «Interruptor»
*No te cuento lo que compraste. Te lo enciendo delante.*

**Idea en una frase.** Cada función premium se presenta como un fragmento **funcionando de verdad** con los datos del usuario, así que la pantalla no es un folleto: es la primera vez que usa lo que ha pagado.

**Color.** Sin degradado y sin oro. El fondo es `colors.background`; cada módulo vive en `surfaceElevated` con borde `colors.border` al 100 % (no al 13 %). El color **solo aparece dentro de los datos**: la barra de presupuesto en `primary`, el donut de gastos con la escala categórica real de la app, la fila de swatches mostrando las paletas de verdad. Es decir, el color codifica información — cumple la regla de `dataviz` que hoy se incumple. Cero color decorativo.

**Jerarquía tipográfica.** Dominan los **números**, no los titulares:
- Cabecera compacta: 22 px `Fonts.bold` en una sola línea — *"Premium activo"*, con un punto de 8 px en `colors.success` al lado (ahí sí significa "estado activo").
- Dentro de cada módulo: **etiqueta** 12 px `Fonts.semiBold` `textSecondary` uppercase, **dato** 28 px `Fonts.mono` `textPrimary`, **glosa** 13 px regular.
- El título nunca compite con el dato: el dato siempre es más grande.

**Las 5 funciones.** Cinco **tarjetas de previsualización viva** en un bento de dos columnas asimétrico (2 grandes + 3 pequeñas), no una lista:
1. *Presupuesto inteligente* → barra real con el gasto del mes en curso.
2. *Gastos grupales* → tres avatares apilados y un saldo real.
3. *Reporte con amigo* → miniatura del gráfico comparativo (renombrado a algo comprensible).
4. *Paleta de colores* → fila de swatches con la paleta activa marcada.
5. *Temas premium* → se **fusiona con la 4**, liberando un hueco para una quinta función que sí valga dinero.
Cada tarjeta es pulsable y navega directamente a esa función: la pantalla deja de ser un callejón y se convierte en un router.

**Qué siente el usuario.** Potencia inmediata. "Ya lo tengo, y ya funciona." Es la dirección que mejor combate el arrepentimiento de compra, porque sustituye la promesa por la evidencia.

---

### Dirección C — «Umbral»
*Atmósfera de la paleta del propio usuario. Una frase cada vez.*

**Idea en una frase.** La pantalla es un espacio, no un documento: un campo de color a sangre construido con **la paleta que el usuario eligió**, en el que el mensaje aparece pausadamente y luego se aparta.

**Color.** Cero oro. Se usa lo que `config/palettes.ts` **ya tiene y esta pantalla ignora**: `gradientDark`/`gradientLight` (tres paradas de la paleta activa) y `auroraBlobs` (seis pares por paleta). Con `lavender` es un campo violeta profundo `#0F0B1E → #1A0F2E → #140B28` con blobs `#C084FC/#3B0764`; con `deepWater` es azul abisal. El texto va en `textPrimary` sobre las zonas más oscuras del campo, siempre por encima de 12:1, porque el fondo **es** oscuro en dark y claro en light por definición del token. El contraste deja de ser un riesgo.

**Jerarquía tipográfica.** Una sola voz, muy grande, mucho aire:
- **Display** 44 px `Fonts.extraBold`, `lineHeight` 1,0, centrado ópticamente en el tercio superior.
- Nada más compite: el subtítulo es 15 px `Fonts.regular` `textSecondary` y aparece a 24 px de distancia.
- Ratio display/cuerpo ≈ 2,9× (hoy es 2,1× con tres tamaños intermedios que lo aplanan).

**Las 5 funciones.** No hay lista. Hay **cinco palabras** que aparecen y se asientan en una única línea de texto fluido, como un pie de página del espacio: *presupuestos · grupos · informes · temas · paletas*, en 13 px `Fonts.medium` con `textTertiary`, separadas por puntos medios. La información completa vive en la app, no aquí. La pantalla se queda con **una sola idea**.

**Implementación.** El movimiento del campo pasa por `FxLayer` con `frames` declarativos (cumpliendo la regla 1 de `CLAUDE.md`), y reutiliza `AppBackground` / `useFrozenPhase`, que ya existen. Ninguna animación en JS, ningún `Animated.loop`.

**Qué siente el usuario.** Amplitud, calma, "he cruzado a otro lado". Es la dirección más emocional sin ser infantil, y la única que hace que la pantalla **se vea distinta para cada uno de los 30 usuarios de paleta distinta** — que es, literalmente, una de las cosas que acaba de comprar.

---

### Dirección D — «Sello»
*Un objeto. Nada más.*

**Idea en una frase.** Toda la pantalla es un solo elemento gráfico enorme y una sola frase corta, con el resto de la superficie vacía a propósito, porque la seguridad no necesita adornos.

**Color.** **Un plano sólido, sin degradado**: `#0B0B0C` casi negro en dark, `#F7F6F3` hueso en light — deliberadamente neutro, para que el único color de la pantalla sea el objeto. El objeto es un **monolito** en `colors.primary` (o el monograma de Spendia) de 200 px, plano, sin sombra, sin glow, sin pulso. El oro reduce su papel a **una única palabra** y a un filete de 1 px: `PREMIUM` en 11 px con tracking 4 bajo el objeto. Un acento del 2 % del área en vez del 70 %.

**Jerarquía tipográfica.** Dos extremos y nada en medio — la escala más agresiva de las cinco:
- **Display** 56 px `Fonts.extraBold`, tracking −2, dos palabras máximo: *"Ya eres Premium."*
- **Micro** 11 px `Fonts.medium`, tracking 4, uppercase, `textTertiary`.
- Ratio 5,1×. No existe ningún tamaño intermedio: la ausencia de niveles medios **es** el gesto de lujo.

**Las 5 funciones.** No hay lista, ni chips, ni checks. Hay **una frase corrida** en 15 px `Fonts.regular` `textSecondary` con `lineHeight` 1,6, ancho máximo 32 em, en la que las cinco funciones van en negrita dentro del texto: *"Incluye **presupuestos inteligentes**, **gastos grupales**, **informes comparados**, y **todos los temas y paletas** de la app."* Una sola línea de lectura en lugar de cinco unidades de escaneo. Se lee en tres segundos y no pesa nada.

**Qué siente el usuario.** Estatus por contención. Es la dirección más arriesgada de las cinco y la que más se distancia de "app de finanzas genérica": el vacío comunica seguridad, y el contraste entre 56 px y 11 px comunica intención. Falla si el equipo se pone nervioso y empieza a rellenar el hueco.

---

### Dirección E — «Sobre»
*Una tarjeta física que llega, se posa, y se abre una sola vez.*

**Idea en una frase.** Se conserva la celebración que la pantalla actual persigue y no consigue, pero se concentra en **un único gesto físico irrepetible** en lugar de repartirla en siete elementos que laten para siempre.

**Color.** El héroe es una **tarjeta** (formato de tarjeta bancaria, 1,586:1) en `colors.primary` con una textura sutil, no un rectángulo de fondo. El oro sobrevive **solo como canto metálico**: un borde de 1,5 px con un degradado `goldDeep → gold → goldDeep` a lo largo del filo de la tarjeta, que capta la luz al girar. Eso es 4 px de oro en lugar de 310 px, y el oro por fin hace lo que el oro hace bien: **un borde**, no un fondo. Todo el texto de la tarjeta va en tinta oscura sobre `primary` o clara sobre `primary`, según lo que devuelva `readableOn()` — la función que ya existe.

**Jerarquía tipográfica.** La de una tarjeta física:
- Nombre del usuario en 18 px `Fonts.semiBold` con tracking 0,5 (como el relieve de una tarjeta).
- `PREMIUM` en 12 px `Fonts.bold`, tracking 3.
- Fecha de alta en `Fonts.mono` 12 px, la única aparición de mono, en la esquina inferior — el detalle que vende la metáfora.
- Fuera de la tarjeta: un titular de 26 px `Fonts.bold` y nada más.

**Las 5 funciones.** Van **al dorso de la tarjeta**. Un toque la voltea (`rotateY`, 420 ms, un solo eje) y las cinco funciones aparecen ahí, en 14 px, en dos columnas compactas, sin iconos de color y sin checks. La lista deja de ocupar la mitad inferior de la pantalla: se convierte en un descubrimiento opcional. La mitad inferior queda para el CTA y para respirar.

**Motion.** Una entrada de resorte (`stiffness ≥ 300`, alineado con la preferencia del usuario), una escalera háptica de dos golpes (`Light` al posarse, `Medium` al voltear), **un** destello que recorre el canto **una sola vez** y se detiene. Nada en bucle. Nada respirando. El CTA está disponible desde el frame 1: la animación no bloquea la acción.

**Qué siente el usuario.** Alegría breve y luego calma — que es exactamente la curva emocional correcta para el pico-final. Es la dirección más "producto de consumo" de las cinco y la que mejor se comparte en captura de pantalla.

---

### Cómo se diferencian de verdad

| | A · Recibo | B · Interruptor | C · Umbral | D · Sello | E · Sobre |
|---|---|---|---|---|---|
| **Color dominante** | Ninguno (papel) | Los datos | La paleta del usuario | Un plano neutro | `primary` en un objeto |
| **Papel del oro** | Eliminado | Eliminado | Eliminado | Una palabra | 1,5 px de canto |
| **Estructura** | Libro mayor | Bento asimétrico | Campo a sangre | Objeto + vacío | Tarjeta que gira |
| **Las 5 funciones** | Filas numeradas con glosa | Previsualizaciones vivas | Cinco palabras | Una frase corrida | Al dorso |
| **Contraste mín. estimado** | 14,5:1 | 12:1+ | 12:1+ | 15:1+ | ≥4,5:1 por `readableOn` |
| **Motion** | Ninguno | Micro-entradas | Campo `FxLayer` | Ninguno | Un gesto, una vez |
| **Emoción** | Confianza | Potencia | Amplitud | Estatus | Alegría |
| **Riesgo** | Frío | Complejidad de datos | Poco contenido | Vacío mal leído | Metáfora manida si se hace flojo |

---

## 5. Recomendación

### **Dirección B — «Interruptor», con el sistema tipográfico de A.**

**Por qué B:**

1. **Ataca la causa, no el síntoma.** El problema de esta pantalla no es que el dorado esté mal elegido: es que **decora en lugar de demostrar**. Cualquier dirección que siga siendo "icono + etiqueta + adorno" hereda el problema aunque cambie el color. B es la única que sustituye la afirmación por la evidencia.
2. **Es una app de finanzas.** El material nativo de Spendia son cifras, barras y categorías. Construir la pantalla premium con ese material la hace **inconfundiblemente de este producto** — resuelve el veredicto de especificidad de diseño, que hoy es el peor de la auditoría: la pantalla actual podría pertenecer a cualquier app con un plan de pago, sin cambiar un píxel.
3. **Resuelve el contraste por construcción.** Sin degradado no hay fondo variable, y sin fondo variable no hay texto blanco a 1,67:1. Los 13 pares que fallan hoy desaparecen porque desaparece su causa, no porque se les ponga una sombra encima.
4. **Resuelve el problema de las paletas correctamente.** El color pasa a codificar datos con los tokens de la paleta activa, así que la pantalla vuelve a ser del usuario — sin depender del único token (`warning`) que es fijo en las 30 paletas.
5. **Convierte un callejón sin salida en un punto de partida.** Cinco tarjetas pulsables que llevan a las cinco funciones eliminan la pregunta "¿y ahora qué?" y hacen que el CTA deje de ser la única salida. El valor se entrega en la misma pantalla en lugar de posponerse a un "explora".
6. **Fuerza la conversación de producto que hay que tener.** No se pueden previsualizar cinco funciones si dos son la misma. B obliga a fusionar "Paleta de colores" + "Temas premium" y a encontrar una quinta función real — un arreglo de **propuesta de valor**, no de maquetación, que ninguna de las otras cuatro direcciones obliga a hacer.
7. **Es la más barata de hacer accesible y traducible.** Módulos independientes con texto corto y ancho flexible sobreviven a Dynamic Type al 200 % y al alemán; un display de 56 px (D) o un titular centrado de 44 px (C) no.

**Por qué el sistema tipográfico de A y no el suyo propio:** B, por sí sola, tiende al *dashboard*, y un dashboard no celebra nada. Importando de A la escala de cuatro pasos, la alineación a izquierda, el uso de `Fonts.mono` para las cifras y el filete de 1 px como único separador, B gana la formalidad de documento financiero que hace que se lea como **algo valioso** y no como la pestaña de estadísticas. La combinación da: densidad de dashboard + compostura de estado de cuenta.

**Segunda opción:** **C — Umbral**, si el equipo prioriza el impacto emocional y la diferenciación por encima de la utilidad. Es la única que hace que la pantalla se vea genuinamente distinta para cada paleta, reutiliza infraestructura ya construida (`gradientDark`, `auroraBlobs`, `FxLayer`, `AppBackground`) y por tanto es la más rápida de implementar de las cinco.

**La que no recomiendo:** ninguna variante que conserve el degradado ámbar a pantalla completa. No hay ajuste de opacidad, sombra de texto ni cambio de paradas que lleve texto blanco sobre `#FBBF24` por encima de 3:1 — el máximo teórico es 1,67:1. Mientras el oro sea el **fondo**, el texto encima no puede ser blanco, y un titular en tinta oscura sobre un plano ámbar de 310 px es precisamente la estética de banner publicitario que hay que abandonar.

---

## Apéndice — Correcciones no negociables, sea cual sea la dirección

Estas son de código, aplican con cualquiera de las cinco, y varias son de una línea.

**P0 — bloqueantes**
1. Ningún texto blanco sobre `warning`. Si sobrevive alguna superficie dorada, la tinta se decide con `readableOn(bg, [colors.textPrimary, '#FFFFFF'])` — ya existe en `utils/contrast.ts:39`. Sobre `#FBBF24`, `#1A2428` da **9,48:1**.
2. Detener el `Animated.loop` de `starPulse`/`haloOpacity` en el cleanup del `useEffect` (hoy solo se detiene `shimmerLoop`, L144). Mover todo bucle decorativo a `FxLayer` — regla 1 de `CLAUDE.md`.
3. Respetar `AccessibilityInfo.isReduceMotionEnabled()`: sin él, dos pulsos infinitos sin escapatoria.

**P1 — antes de publicar**
4. Guarda en `features`: `const features = Array.isArray(raw) ? raw : []` (L163), y módulo en `FEATURE_ICONS[i % FEATURE_ICONS.length]` (L245) igual que ya se hace con `accents`.
5. `maxWidth: 640, alignSelf: 'center'` también en `styles.footer` (L390), y unificar la gotera a 20 px (hoy 16 vs 20).
6. `lineHeight` relativo al `fontSize` escalado, o `allowFontScaling` controlado: al 200 % el título se solapa y el CTA de `height: 58` (L399) recorta el texto.
7. `accessibilityRole="button"` y `accessibilityLabel` en el CTA (L269).
8. `shadowColor` explícito en `btnWrapper` (falta, L391-396) y coherencia iOS/Android en `starCircle` (L353-359): hoy son dos componentes distintos según la plataforma.
9. El CTA no debe esperar 1,48 s (L128). Disponible desde el primer frame; la coreografía se acorta a stagger ≤20 ms y duraciones ≤150 ms según la preferencia global.

**P2 — calidad**
10. Bordes visibles: `primary22` da 1,24:1 (L229) y el separador del footer 1,13:1 (L262). O se suben a ≥3:1 o se eliminan; hoy solo consumen render.
11. Eliminar los tres `decoCircle` (L315-329): 1,09–1,22:1, invisibles, y el tercero produce un parche pardo en claro.
12. Eliminar `textShadow` del título (L365-367): no aporta contraste y resta nitidez.
13. Retirar la columna de checks (L248-250): cinco marcas idénticas, cero información, máximo contraste de la tarjeta.
14. Unificar los radios a la escala del sistema (hoy 14/24/28/50 + halos) y resolver el cuadrado-dentro-de-círculo del `starCircle` (L343-354).
15. Reescribir el copy: los cinco nombres son etiquetas internas y dos son la misma función. `updateDoc(...).catch(() => {})` (L150) debería al menos registrar el fallo.
16. Corregir los comentarios de las líneas 30-32, 39-41 y 40: afirman una independencia de paleta y una legibilidad en modo claro que las mediciones desmienten.
