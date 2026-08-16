# Diseño: Editor de Paletas de Color — Spendiapp

---

## 1. Diagnóstico de las 48 paletas actuales

### Son realmente repetitivas

Sí, y hay una causa estructural: el grupo `pastel` (16 paletas) es una copia del grupo `classic` (16 paletas) con el modo oscuro **idéntico token por token**. `deepWaterPastel` y `deepWater` comparten los mismos valores de `background`, `surface`, `border`, `textPrimary`, `textSecondary` en dark. La única diferencia es el `primary` en light (pastel más claro). Para cualquier usuario que use la app en modo oscuro, ambas versiones son indistinguibles.

Además hay zonas cromáticas sobrepobladas:

| Familia | Paletas en esa zona | Problema |
|---|---|---|
| Cian/azul | deepWater, ocean, arctic, nordic, slate, aurora + sus 5 pasteles | 11 paletas, 3 de ellas (slatePastel, nordicPastel, oceanPastel) tienen `previewColors` que se confunden incluso en la rejilla |
| Verde | forest, mint, jade, citrus, moss + forestPastel, mintPastel | 7 paletas; mint y forest comparten casi el mismo rango de matiz; jade dark == forest dark |
| Rosa/rojo cálido | rose, sakura, cottonCandy, hotMagenta + sus pasteles | sakura y rose son el mismo rojo-rosa con diferente saturación; sakuraPastel y rosePastel son prácticamente idénticas |
| Cálido naranja | sunset, ember, peach, mocha, tangerine, solarFlare + pastel de cada uno | peachPastel, mochaPastel y emberPastel forman un bloque de tres cremas cálidas casi indistinguibles |
| Púrpura | midnight, lavender, electricViolet, neon | midnight y lavender solo se diferencian en 15° de matiz |

### Recorte propuesto: de 48 a 32 paletas

**Eliminar 16 (en negrita el motivo):**

| Eliminar | Se solapa con |
|---|---|
| `deepWaterPastel` | deepWater (dark idéntico; light: primary demasiado cercano) |
| `oceanPastel` | ocean + slatePastel (tres azules pastel casi iguales) |
| `nordicPastel` | nordic + slatePastel |
| `mintPastel` | forestPastel (mismo fondo oscuro, primaries verdes a 10° de diferencia) |
| `jade` | forest en dark mode (background idéntico `#04140E` vs `#0A1A0D`, surface idéntico) |
| `lavender` | midnight (primaries a 15° de matiz, auroraBlobs iguales) |
| `sakura` | rose (F472B6 vs E11D48, misma familia cálido-rosa) |
| `sakuraPastel` | rosePastel (ambas son rosa+amarillo pastel) |
| `sunsetPastel` | emberPastel (FBBF24+FCA5A5 vs FCA5A5+FDBA74, misma gama) |
| `peachPastel` | emberPastel (FED7AA+FDE68A+FECACA — prácticamente idéntica a ember pastel) |
| `mochaPastel` | peach (misma crema cálida; dark mode idéntico al de mocha) |
| `cottonCandyPastel` | cottonCandy (mismos tokens en dark; light prácticamente igual con primaries pastel) |
| `infrared` | tangerine (rojo-naranja+violeta vs naranja-pink+azul; se solapan en la rejilla) |
| `slatePastel` | slate (dark idéntico; el único cambio en light es 2 puntos de saturación) |
| `lavenderPastel` | midnightPastel (ambas son violeta muy claro + rosa; DDD6FE vs E9D5FF, indiferenciables) |
| `forestPastel` | mint + mintPastel (tres verdes medios pastel sin diferencia perceptible para el ojo) |

**Paletas que quedan (32):**

`classic` recortado (10): deepWater, sunset, forest, midnight, rose, ocean, ember, slate, aurora, mocha

`pastel` recortado (6): rosePastel, midnightPastel, emberPastel, auroraPastel, peach, cottonCandy

`bold` completo (8): citrus, neon, wine, arctic, jade → reemplazar jade por una que ya se eliminó no, jade sale; quedan citrus, neon, wine, arctic, sandstone, graphite, moss + nordic

`neon` completo (8): cyberpunk, electricViolet, acidLime, solarFlare, hotMagenta, electricBlue, tangerine, infrared → quitar infrared; quedan 7 + reponer con una custom si hace falta

Conteo final (32 del sistema + N custom del usuario).

---

## 2. El editor de paletas

### 2.1 Qué elige el usuario y qué se deriva

El principio: un usuario no puede razonar en términos de 60 tokens. Pero sí puede razonar en términos de **un color principal y un estado de ánimo**.

**Inputs del usuario (3 valores + 2 opciones):**

| Input | Tipo | Descripción |
|---|---|---|
| `primaryHue` | número 0–360 | El color central de la paleta. Todo lo demás sale de aquí. |
| `secondaryMode` | enum | Cómo se elige el secundario: `analogous` (+30°), `complementary` (+180°), `triadic` (+120°) |
| `feel` | enum | `vivid` (S alto, contraste máximo) vs `soft` (S reducido, aspecto pastel) |
| Nombre | string | Máx. 24 caracteres |
| Modo de vista previa | toggle | Ver la derivación en claro u oscuro |

Con esos 5 controles se genera un `PaletteDefinition` completo.

### 2.2 Algoritmo de derivación

Función: `derivePalette(input: DerivePaletteInput): PaletteDefinition`
Archivo nuevo: `utils/derivePalette.ts`

```
DerivePaletteInput {
  primaryHue: number        // 0–360
  secondaryMode: 'analogous' | 'complementary' | 'triadic'
  feel: 'vivid' | 'soft'
  name: string
  id: string                // generado como uuid o 'custom_' + timestamp
}
```

**Paso 1 — Colores base de las tres familias:**

```
feel vivid:  primaryS = 70, primaryL = 48
feel soft:   primaryS = 45, primaryL = 60

primary   = HSL(H, primaryS, primaryL)
primaryDark  = HSL(H, primaryS+5, primaryL-14)
primaryLight = HSL(H, primaryS-25, primaryL+34) // tinte muy claro

secondaryH = H + (analogous:30 | complementary:180 | triadic:120)
secondary   = HSL(secondaryH, primaryS-10, primaryL+3)

tertiaryH  = H + (analogous:60 | complementary:210 | triadic:240)
tertiary    = HSL(tertiaryH, primaryS-15, primaryL+6)
```

**Paso 2 — Fondos y superficies:**

```
// LIGHT
background          = HSL(H, 8, 99)      // blanco teñido sutilmente
backgroundSecondary = HSL(H, 10, 96)
surface             = #FFFFFF
surfaceSecondary    = HSL(H, 12, 95)
surfaceElevated     = HSL(H, 9, 97)

// DARK
background          = HSL(H, 18, 7)
backgroundSecondary = HSL(H, 18, 9)
surface             = HSL(H, 18, 10)
surfaceSecondary    = HSL(H, 18, 13)
surfaceElevated     = HSL(H, 18, 14)
surfaceOverlay      = HSL(H, 18, 17)
```

**Paso 3 — Textos:**

```
// LIGHT
textPrimary = HSL(H, 25, 10)   // casi negro, teñido por el matiz

// DARK
textPrimary   = HSL(H, 15, 94)
textSecondary = HSL(H, 12, 65)
textTertiary  = HSL(H, 10, 58)
textInverse   = textPrimary(light)
```

**Paso 4 — Bordes, inputs:**

```
// LIGHT
border           = primaryLight
borderFocus      = primary
inputBackground  = backgroundSecondary
inputBorder      = HSL(H, primaryS-30, primaryL+20)

// DARK: escalar ~4–5 puntos de L sobre surface
border           = HSL(H, 20, surface_L+5)
borderFocus      = primary_dark
inputBackground  = surface
inputBorder      = HSL(H, 20, surface_L+7)
```

**Paso 5 — Gradientes:**

```
gradientDark  = [background_dark, backgroundSecondary_dark, HSL(H+10, 20, 11)]
gradientLight = ['#FFFFFF', backgroundSecondary_light, primaryLight]
```

**Paso 6 — Aurora blobs (6 pares por modo):**

```
dark blobs: pares de (primary, primaryDark), (secondary, secondaryDark) y (tertiary, tertiaryDark)
           rotando en 6 combinaciones

light blobs: versiones muy tenues (primaryLight + versiones ±10° de S/L)
```

**Paso 7 — previewColors:**

```
previewColors = [primary, secondary, tertiary]
```

**Paso 8 — Tokens semánticos fijos:**

Los tokens de `FIXED_LIGHT` y `FIXED_DARK` se copian directamente (error, warning, expense, overlay, etc.). Son invariantes por diseño y la app los necesita consistentes entre todas las paletas.

```
success = secondary si secondary es verde (H en 90–160°), sino #16A34A (light) / #22C55E (dark)
info    = primary
```

### 2.3 Garantías de legibilidad

Después de derivar, antes de guardar, se ejecutan estas validaciones usando las funciones existentes en `utils/contrast.ts`:

| Par | Ratio mínimo | Acción si falla |
|---|---|---|
| `textPrimary` sobre `background` | 7:1 | Bajar L de textPrimary (acercar a negro/blanco) |
| `textSecondary` sobre `background` | 4.5:1 | Ídem |
| `onPrimary` sobre `primary` | 4.5:1 | Si blanco no llega, cambiar onPrimary a textPrimary(light) del dark mode |
| `primary` sobre `background` (solo como texto/icono) | 4.5:1 | Llamar a `readableTint(primary, background)` del utils existente |
| `borderFocus` sobre `inputBackground` | 3:1 | Ajustar L del borderFocus |

El editor muestra un indicador visual (badge verde/rojo) por cada par mientras el usuario mueve los sliders. No bloquea guardar, pero advierte si algún ratio está por debajo.

### 2.4 El selector de color

**Sin librerías nuevas.** `react-native-svg` ya está en el proyecto.

Componente: `components/HueSelector.tsx`

Estructura:
1. **Rueda de matiz** (SVG, 220×220px): círculo dividido en 360 segmentos de 1° cada uno, renderizado como un arco SVG policromático. Un thumb circular blanco indica el matiz seleccionado. El usuario arrastra el thumb por el arco o toca cualquier punto de la rueda. Implementado con `PanResponder` (RN) + event listeners (web). La rueda es solo lectura del matiz — no mezcla S/L en el mismo control para no confundir.

2. **Slider de saturación** (debajo de la rueda): barra horizontal con degradado del color gris al color puro al matiz elegido. Touch/drag nativo con `PanResponder`.

3. **Slider de luminosidad**: barra de negro → color puro → blanco.

4. **Campo hex** (opcional, para usuarios avanzados): `TextInput` que acepta `#RRGGBB`. Actualiza los sliders al perder el foco.

5. **Preview**: un rectángulo grande (80×48 px) con el color elegido, con el texto "Aa" encima usando `onPrimary` derivado. Muestra si el texto se lee bien en tiempo real.

**Controles de modo secundario/terciario:**
`AppSegmentedControl` con las tres opciones de `secondaryMode`. Debajo se muestran tres muestras pequeñas con los colores derivados (primary / secondary / tertiary) para que el usuario vea la paleta completa sin scroll.

### 2.5 Vista previa en vivo

Reutilizar `PersonalizationCanvas` existente (el mismo que usa el capítulo Color). Recibe el `PaletteDefinition` derivado como prop en tiempo real. Mientras el usuario mueve los sliders, el canvas se actualiza. La derivación es síncrona (solo operaciones HSL), sin debounce.

Un toggle "Claro / Oscuro" encima del canvas permite ver ambos modos. No requiere ThemeContext — el canvas recibe los colores directamente como prop.

### 2.6 Gestión de paletas (CRUD)

**Crear:** botón "Nueva paleta" abre `app/palette-editor.tsx` sin id (modo creación).

**Editar:** tocar una paleta custom abre el editor con su id (modo edición). Los sliders se inicializan extrayendo el HSL del `primary` almacenado.

**Duplicar:** acción contextual (long press o swipe) sobre una paleta custom, o sobre cualquier paleta del sistema. Duplicar una del sistema crea una copia editable.

**Borrar:** acción contextual con confirmación via `AppDialog` (el patrón ya establecido en el proyecto). Si se borra la paleta activa, la app cambia a `deepWater` automáticamente antes de confirmar la acción. El `AppDialog` lo advierte explícitamente.

**Nombrar:** `TextInput` en la cabecera del editor, placeholder "Mi paleta". Máx. 24 chars. El nombre se muestra en la rejilla de paletas igual que las del sistema.

**Límite:** 10 paletas custom por usuario (premium). El botón "Nueva paleta" muestra un estado deshabilitado con `AppDialog` explicativo si se llega al límite.

**Persistencia:** `users/{uid}/customPalettes: CustomPaletteRecord[]` en Firestore. Al abrir la app, se sincronizan y se fusionan con las del sistema. El `ThemeContext` mantiene `customPalettes` como estado separado.

---

## 3. Integración en el capítulo Color

### Arquitectura actual (chapter === 'color' en personalization.tsx):

```
1. LooksStrip (combinaciones preconfiguradas)
2. PaletteGrid (rejilla del sistema: classic / pastel / bold / neon)
```

### Cambio propuesto:

```
1. LooksStrip  (sin cambio)
2. PaletteGrid del sistema  (sin cambio en UI; en el fondo se recortan 16 paletas)
3. ── separador ──
4. Sección "Mis paletas":
   - Label: "MIS PALETAS" (mismo estilo chartGroupLabel)
   - Si hay paletas custom: rejilla horizontal con las tarjetas (mismo componente PaletteGrid)
   - Botón "Crear paleta" siempre visible al final de esta sección
     → onPress: router.push('/palette-editor')
```

El `PaletteGrid` ya acepta `paletteId` + `setPaletteId`. Se extiende para recibir también `customPalettes: CustomPaletteRecord[]` y pintarlas antes del botón de crear. Las tarjetas custom tienen una acción adicional de long press (editar / duplicar / borrar).

**Acceso al editor:** solo desde esta sección del capítulo Color. No hay acceso directo desde el Home u otras pantallas (post-MVP se puede añadir un shortcut en el perfil).

---

## 4. Alcance por fases

### MVP — construible en un sprint (~3 días de trabajo)

**Alcance:**
- `utils/derivePalette.ts` — función completa de derivación (input: 3 valores; output: PaletteDefinition)
- `utils/derivePalette.test.ts` — tests de los 5 pares de contraste críticos
- `components/HueSelector.tsx` — rueda SVG + 2 sliders + campo hex + preview Aa
- `app/palette-editor.tsx` — pantalla completa con `ScreenTransition`, canvas en vivo, CRUD completo
- Extensión de `ThemeContext` para `customPalettes: CustomPaletteRecord[]` y selección por id dinámico (string, no solo `PaletteId`)
- `hooks/useUserProfile.ts` — `updateCustomPalettes()` con sync a Firestore
- Extensión de `PaletteGrid.tsx` — sección "Mis paletas" + botón crear
- Claves i18n nuevas (es/en/it) para todos los textos del editor

**No incluye:**
- El recorte de las 16 paletas redundantes (requiere análisis de usuarios activos; se hace en sprint separado)
- Compartir paletas con otros usuarios
- Import/export (JSON o URL de paleta)
- Fine-tuning avanzado token a token (ajustar manualmente `surface`, `border`, etc.)
- Override manual del modo oscuro de una paleta custom

### Post-MVP (sprint siguiente)

1. **Recorte de paletas**: retirar las 16 identificadas. Añadir migration: si un usuario tenía una de las paletas eliminadas activa, migrar al equivalente más cercano (ver tabla de solapamiento).

2. **Override oscuro**: un toggle "Personalizar modo oscuro por separado" en el editor que desbloquea un segundo conjunto de sliders para derivar los tokens dark de forma independiente.

3. **Import/export**: botón "Compartir paleta" que genera una URL corta con los 3 parámetros (hue, secondaryMode, feel) codificados en base64. Abre el editor prellenado al seguir el enlace.

4. **Fine-tuning avanzado**: sección colapsable "Ajuste fino" al final del editor que muestra los tokens derivados como lista editable, con indicador de contraste por cada uno. Solo para usuarios que quieran control total.

---

## 5. Archivos relevantes

| Archivo | Acción |
|---|---|
| `utils/derivePalette.ts` | Crear nuevo |
| `components/HueSelector.tsx` | Crear nuevo |
| `app/palette-editor.tsx` | Crear nuevo |
| `context/ThemeContext.tsx` | Extender: `customPalettes`, selección por string id, `addCustomPalette`, `updateCustomPalette`, `removeCustomPalette` |
| `hooks/useUserProfile.ts` | Añadir `updateCustomPalettes(uid, palettes)` |
| `components/PaletteGrid.tsx` | Extender: sección custom + botón crear |
| `config/palettes.ts` | No tocar en MVP. Post-MVP: eliminar las 16 listadas y añadir migration map |
| `app/personalization.tsx` | Mínimo: pasar `customPalettes` a `PaletteGrid`. El botón "Crear" y la navegación viven dentro de `PaletteGrid`, no en esta pantalla |

---

## Notas de implementación

**HSL ↔ HEX:** implementar en `utils/derivePalette.ts` sin dependencias externas. Las fórmulas de conversión HSL→RGB son triviales (3 operaciones por canal). El código de `contrast.ts` ya tiene `rgbOf` y `hexOf` que se pueden reutilizar.

**`PaletteId` type:** las paletas custom tienen `id: string` (no `PaletteId`). En `ThemeContext`, el tipo de `paletteId` debe ampliarse a `PaletteId | string`. En `PALETTE_MAP` se añade una función helper `getPalette(id: string): PaletteDefinition | undefined` que busca primero en el mapa del sistema y luego en `customPalettes`.

**Aurora blobs custom:** la generación de 6 pares funciona bien en automático; el usuario no necesita tocarlos. Pero visualmente es el elemento que más diferencia una paleta custom de una del sistema (las del sistema tienen blobs cuidados a mano). El algoritmo puede generar blobs mediocres. Mitigación: los 6 pares rotan entre primary/secondary/tertiary en 3 niveles de luminosidad, que es exactamente lo que hacen las paletas del sistema para la familia `aurora`. Es suficiente para MVP.

**Regla de animación del CLAUDE.md:** el `HueSelector` no usa `Animated.loop`. El thumb de la rueda se mueve solo en respuesta a gestos del usuario. No hay decoración animada en el editor.

**Regla de vista previa:** según `feedback_show_visual_proposals.md`, los mockups van a `docs/*.html` y se abren con `open`. El presente documento es la especificación; los mockups visuales son un paso posterior si el equipo los pide.
