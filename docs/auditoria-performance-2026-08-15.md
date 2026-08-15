# Auditoría de rendimiento — por qué Spendia calienta el móvil

**Fecha:** 2026-08-15 · **Versión auditada:** 2.56.0 · **Build medido:** `dist/` de producción

## Veredicto en una frase

No es el movimiento: es **cómo está implementado** el movimiento. Los fondos y los
gráficos animan desde JavaScript en el hilo principal y aplican `filter: blur()` sobre
capas que cambian cada frame — el peor patrón posible para GPU y batería en móvil.
Quitar los efectos apagaría el calor, pero también el diferenciador visual de Spendia.
La recomendación es **reimplementar el motor, no borrar los efectos**.

---

## 1. Mediciones (no estimaciones)

Método: bundle real de producción (`dist/`) servido en local, Chrome headless vía CDP,
viewport 390×844 @3x, CPU throttling 4× (aproxima un móvil de gama media frente a un
Mac Apple Silicon). Pantalla medida: **login** — la más simple de la app, solo monta
`AuroraBackground` (6 blobs). El Home es estrictamente peor.

Scripts: `scratchpad/measure.mjs`, `mutations.mjs`, `boot.mjs` (sesión 2026-08-15).

### 1.1 CPU en reposo — A/B con y sin animación

El A/B es limpio: mismo bundle, misma pantalla; la única diferencia es emular
`prefers-reduced-motion: reduce`, que la app ya respeta y apaga el efecto.

| Métrica (ventana de 15 s en reposo) | Con animación | Sin animación |
|---|---:|---:|
| CPU total (`TaskDuration`) | 1,082 s | 0,057 s |
| Tiempo de script | 0,737 s | 0,000 s |
| % de un core (throttle 4×) | **7,2 %** | 0,4 % |

**19× más CPU sin que el usuario toque nada.** Y `ScriptDuration` pasa de 0 a 0,74 s:
hay JavaScript ejecutándose de forma continua e indefinida en una pantalla estática.

### 1.2 El trabajo por frame

| Medición (pantalla de login, 5 s) | Valor |
|---|---:|
| Mutaciones del atributo `style` | 7 200 |
| **Mutaciones por segundo** | **1 440** |
| Frames por segundo (rAF) | 60 |
| Nodos que mutan | 6 (los blobs de Aurora) |
| Mutaciones por nodo y frame | 4 |
| **Capas con `filter: blur()` simultáneas** | **13** |
| **Superficie desenfocada** | **970 000 px = 2,95 × la pantalla** |

Cada escritura al atributo `style` invalida el estilo del nodo. Como esos nodos llevan
`filter: blur()`, cada invalidación obliga a la GPU a **re-ejecutar el desenfoque** sobre
esa capa. Se está redibujando casi tres pantallas completas de blur, 60 veces por
segundo, en la pantalla más simple de la app.

### 1.3 Arranque

| Medición | Valor |
|---|---:|
| Bundle JS único | 8,1 MB sin comprimir · 1,37 MB gzip |
| **CPU de script hasta el primer render** (throttle 4×) | **2,72 s** |
| CPU total hasta el primer render | 3,90 s |

Un solo bundle, sin división por rutas. El parse + eval quema un core durante ~3 s en
cada arranque en frío. Ese es el primer pico de calor; los efectos mantienen la meseta.

---

## 2. Causas raíz

### C1 — `useNativeDriver: false` en todas las animaciones · CRÍTICO

Todos los loops usan `useNativeDriver: false`. En web eso significa que cada frame RN Web
interpola en JS y escribe estilos inline en el DOM (las 1 440 escrituras/s medidas). En
nativo será peor: cruza el puente en cada frame.

Ficheros: `hooks/usePhasedLoop.ts:25,31`, `components/AuroraBackground.tsx:38`,
`ParticlesBackground.tsx:86-87`, `BalanceCard.tsx:200,289-290,309-317,335-336`,
y los 13 `*Background.tsx`.

### C2 — `filter: blur()` sobre capas animadas · CRÍTICO

| Componente | Blur |
|---|---|
| `AppBackground.tsx:176` (radial) | `blur(120px)` a pantalla completa |
| `SpotlightBackground.tsx:74` | `blur(90px)` |
| `MeshBackground.tsx:33` | `blur(28px)` |
| `GrainBackground.tsx:63` | `blur(26px)` |
| `FlowBackground.tsx:73` | `blur(22px)` |
| `RaysBackground.tsx:63` | `blur(16px)` |
| `WavesBackground.tsx:70` | `blur(9px)` |
| `AuroraBackground.tsx:92` | `blur(7px)` × 6 blobs |
| `AppBackground.tsx:71` | blur global configurable **encima** del anterior |

El blur global de Personalización se aplica *sobre* el efecto, que ya lleva su propio
blur: desenfoque anidado sobre contenido en movimiento. Un blur gaussiano es multi-paso;
animado y a pantalla completa es la operación más cara que se puede pedir a la GPU de un
móvil.

### C3 — `setState` de React en cada frame · CRÍTICO

```
components/BalanceCard.tsx:306   drawAnim.addListener(({ value: v }) => setDrawT(v));
components/BalanceCard.tsx:332   tideAnim.addListener(({ value: v }) => setTideT(v));
components/BalanceCard.tsx:199   growAnim.addListener(({ value: v }) => setT(v));
```

Dentro de `Animated.loop` infinitos. Cada frame dispara un `setState` que **re-renderiza
todo el componente del gráfico** — con sus `useMemo` de paths, el muestreo de la curva y
el SVG completo — 60 veces por segundo, para siempre, mientras el Home esté abierto.
Este es el mayor foco de calor del Home.

`HomeHeader.tsx:91` hace lo correcto (un `setState` solo al cruzar el umbral) y sirve de
contraejemplo: el patrón bueno ya existe en el código.

### C4 — Personalización monta los 13 efectos a la vez · CRÍTICO

`app/personalization.tsx:751` mapea `BACKGROUND_STYLES` y cada tarjeta renderiza un
`BackgroundEffect` real y animado (`:92`), más el `PersonalizationCanvas` con otro efecto,
más la sparkline animada, más el fondo global de la app.

Elementos animados si están todos montados:

| Efecto | Elems | Efecto | Elems |
|---|---:|---|---:|
| Starfield | 46 | Topography | 11 |
| Particles | 34 | Orbs | 6 |
| Bokeh | 18 | Aurora | 6 |
| Rays / Constellation / Spotlight / Waves / Mesh / Flow / Grain | ~22 | | |

**≈ 144 elementos animados simultáneos**, cada uno con su blur. Extrapolando las 4
escrituras por elemento y frame: del orden de **24 000 escrituras de estilo por segundo**.
Es el peor caso absoluto de la app.

### C5 — Nada se pausa cuando la app no está visible · ALTO

Cero apariciones de `AppState`, `visibilitychange` o `document.hidden` en todo el
código. En web el navegador congela `rAF` en pestaña oculta y salva la situación; en
nativo (iOS/Android) **no** habrá ese salvavidas y los loops seguirán vivos en segundo
plano.

### C6 — Bundle único de 8,1 MB · ALTO

`app.json` no fija `web.output`, así que Expo Router exporta una SPA de un solo bundle.
Con `"output": "static"` divide por ruta y el arranque solo paga lo que la pantalla usa.

### C7 — Movimiento perpetuo sin propósito · MEDIO

`PremiumTabBar.tsx:60-72`: loop infinito de "respiración" (escala 1 → 1,045) en la barra
de pestañas, con `useNativeDriver: false` en web. Animación en bucle que no comunica
nada y nunca termina.

### C8 — 30 listeners de Firestore · MEDIO

30 `onSnapshot` en 12 hooks. Firestore los multiplexa sobre una conexión, así que el
coste de red es contenido, pero cada emisión provoca re-render. Conviene revisar cuáles
pueden ser lecturas puntuales en vez de suscripciones vivas.

### C9 — `appId` de Firebase equivocado en web · BAJO

`config/firebase.ts:15-17` elige entre iOS y Android; en web cae en el de Android, así
que las métricas de la PWA se atribuyen mal. Una línea.

---

## 3. Plan de corrección

Orden por relación impacto/coste. Los P0 atacan >80 % del calor medido.

### P0 — 2 a 3 días

**P0.1 · Sacar los fondos del hilo de JS.**
En web, reescribir los 13 efectos como `@keyframes` CSS puras sobre `transform` y
`opacity`: el compositor las ejecuta sin JS y sin recalcular estilo. En nativo,
`useNativeDriver: true` (obliga a limitarse a `transform`/`opacity`, que es justo lo que
animan hoy). Elimina las 1 440 escrituras/s.

**P0.2 · Eliminar el blur animado.**
Un blob desenfocado es un `radial-gradient` con parada suave — mismo resultado visual,
coste GPU cercano a cero, y se compone una sola vez. Donde el blur sea imprescindible,
aplicarlo a una capa **estática** y animar solo un padre con `transform`. Retirar el blur
anidado del blur global.

**P0.3 · Quitar los `setState` por frame de `BalanceCard`.**
`drawT`/`tideT`/`t` deben viajar por `Animated` hasta la propiedad, no por estado React.
Para los paths, `Animated.createAnimatedComponent(Path)` de `react-native-svg`; para
opacidades, animar el contenedor. React deja de re-renderizar 60 veces por segundo.

**P0.4 · Pausar fuera de foco.**
Un hook único (`useIsActive`) sobre `AppState` + `visibilitychange` que detenga todos los
loops. Imprescindible antes de publicar en tiendas.

### P1 — 2 a 3 días

**P1.1 · Personalización: solo el efecto seleccionado se anima.** El resto, primer frame
estático (o un PNG). Corta el peor caso de 144 elementos a los de un solo efecto.

**P1.2 · Quitar la "respiración" de la tab bar.** Movimiento perpetuo sin función.

**P1.3 · `web.output: "static"` en `app.json`.** División por rutas; el arranque deja de
pagar los 8,1 MB completos.

**P1.4 · Ajuste "Ahorro de batería"** en Personalización, junto a intensidad y velocidad:
apaga efecto y blur, deja el degradado. Hoy solo se consigue activando reduce-motion en
todo el sistema.

### P2 — oportunista

- Revisar los 30 `onSnapshot`: convertir a lectura puntual los que no necesiten vivir.
- Corregir el `appId` de web (C9).
- Presupuesto de rendimiento en CI: fallar si el bundle inicial supera un umbral.

### Criterio de aceptación

Repetir `measure.mjs` y `mutations.mjs`. Objetivos:

| Métrica | Hoy | Objetivo |
|---|---:|---:|
| CPU en reposo (login, throttle 4×) | 7,2 % | < 1 % |
| Mutaciones de estilo por segundo | 1 440 | < 60 |
| Superficie con blur animado | 2,95 pantallas | 0 |
| CPU de script al arranque | 2,72 s | < 1,2 s |

---

## 4. La decisión que hay que tomar

**¿Quitar los movimientos del fondo y los gráficos?** No.

El calor no viene de que haya animación: viene de animar por JS y de desenfocar en cada
frame. Los mismos efectos, ejecutados en el compositor y sin blur animado, cuestan una
fracción de lo que cuestan hoy. Los fondos configurables son parte de la propuesta
premium de Spendia; borrarlos es pagar con producto una factura que es técnica.

Lo que sí conviene cambiar de producto, aparte del motor:

1. **Efecto apagado por defecto en móvil**, activable desde Personalización. Quien lo
   quiera, lo enciende; quien no, no paga batería por una decisión que no tomó.
2. **Ajuste explícito de ahorro de batería** (P1.4).
3. **Los gráficos animan una vez al entrar y se detienen.** El loop infinito de
   "trazo vivo" y "marea" no añade información después del primer ciclo.
