---
name: visual-team
description: Equipo visual de Spendia. Úsalo para cualquier rediseño, propuesta de pantalla, mockup o auditoría visual del proyecto. Encierra las cuatro leyes que salieron de un fallo real el 2026-08-26, cuando se entregaron cinco mockups rotos que nadie había mirado renderizados.
---

# Equipo visual — Spendia

Cuatro leyes. Ninguna es opinable. Salieron de una entrega concreta que el usuario
rechazó con razón: cinco pantallas de login con los cuatro estados pintados a la vez,
tres inputs apilados, dieciocho celdas de PIN y tres botones superpuestos.

---

## Ley 1 · Nadie opina sin haber visto los píxeles

**Prohibido enseñar un mockup que no se haya renderizado y mirado.** No "leído el
código y parece bien": abierto, capturado y observado con visión.

El bucle, sin atajos:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars \
  --screenshot=/ruta/captura.png --window-size=1600,1100 \
  --virtual-time-budget=3000 \
  "file:///ruta/al/mockup.html"
```

Después se LEE la captura con la herramienta Read (es una imagen, se ve). Si algo
está superpuesto, cortado, duplicado o vacío, se arregla y se vuelve a capturar.
Se repite hasta que la captura esté limpia. **Solo entonces** se le enseña al usuario.

Una captura por cada estado y por cada pantalla. Si hay 4 estados y 5 direcciones,
son 20 comprobaciones, no una.

## Ley 2 · Las direcciones divergen a propósito

Cinco agentes con el mismo brief producen cinco variaciones del mismo mockup. Pasó:
tres de cinco salieron "tarjeta/terminal, DM Mono en los labels, lima como aprobado".

Al repartir el trabajo, cada dirección recibe **un eje propio** y una **lista de
recursos ya tomados que tiene prohibido usar**. Ejes que no se solapan:

| Eje | Qué gobierna la pantalla |
|---|---|
| Estructura | dónde vive cada cosa: una por pantalla, todo en una tarjeta, panel fijo… |
| Tipografía | la voz: display enorme, mono total, una sola familia… |
| Color | dónde aparece la marca y dónde no |
| Materia | textura, relieve, papel, cristal, plano absoluto |
| Claridad | contraste medido, targets, lectura, copy |

El brief de cada agente debe incluir, literal: *"Estos recursos ya están tomados por
otra dirección, NO los uses: …"*. Sin esa lista, convergen.

## Ley 3 · La entrega va por archivo

Los agentes devuelven texto final vacío con demasiada frecuencia. Se les pide desde
el primer mensaje que escriban su entregable con `Write` en una ruta concreta del
scratchpad, y que respondan solo `escrito`. Luego se leen los archivos.

## Ley 4 · En un mockup, el estado se conmuta por JS

La causa técnica del desastre: las reglas de estado (`.only-empty{display:none}`,
especificidad 0,1,0) perdían contra las de componente (`.d1 .cell{display:grid}`,
0,2,0). Todos los estados quedaban visibles a la vez.

**Nunca** se conmutan estados con clases que compiten en especificidad. Se marca cada
variante con un atributo y se conmuta por estilo en línea, que gana siempre:

```html
<div data-st="filled">…</div>
<div data-st="empty">…</div>
```

```js
function setState(s){
  document.querySelectorAll('[data-st]').forEach(el => {
    el.style.display = el.dataset.st.split(' ').includes(s) ? '' : 'none';
  });
}
```

`el.style.display = ''` devuelve el control a la hoja de estilos, así que el
`display:flex` o `display:grid` del componente sigue funcionando. `revert` NO sirve:
descarta todas las declaraciones de autor y deja el `display` del user-agent.

---

## Fuente de verdad del proyecto

- Paleta: `config/colors.ts` (`LightColors` / `DarkColors`). 30 paletas de usuario en
  `config/palettes.ts` — nunca hardcodear un hex derivado, sale de `utils/contrast.ts`.
- Tipografías: `config/fonts.ts` — Montserrat 400/500/600/700/800 y DM Mono 400/500.
  Son las que la app ya carga: un mockup con otra fuente miente.
- Iconos: Tabler vía `components/AppIcon.tsx`. Nunca emoji en producción.
- Animación: ≤150ms, spring stiffness ≥300, stagger ≤20ms. Nada de blur sobre una
  capa que se mueve. Ver `CLAUDE.md` del proyecto.
- Los mockups viven en `docs/*.html` y se abren con `open`. Las capturas del
  scratchpad son para que las mire el agente, no el usuario.

## Datos de contraste ya medidos (2026-08-26)

No hay que recalcularlos, pero sí respetarlos:

| Par | Ratio | Veredicto |
|---|---|---|
| `#00BCD4` sobre blanco | 2.30:1 | ✗ no vale para texto ni para el relleno del CTA |
| `#00ACC1` sobre blanco | 2.74:1 | ✗ |
| `#007A8A` con blanco encima | 5.06:1 | ✓ es el teal accesible |
| `#DDE8EA` sobre `#F5F9FA` | 1.18:1 | ✗ borde invisible; usar `#6B939A` (3.16:1) |
| `#6B7280` sobre blanco | 4.83:1 | ✓ |

Consecuencia viva en la app: `accentInk` no encuentra ningún teal legible y pinta el
enlace "¿Olvidaste tu PIN?" en gris. No es un bug del mockup, es de producción.
