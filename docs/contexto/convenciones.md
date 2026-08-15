# Convenciones

## Estilo
- TypeScript. Componentes funcionales + hooks. i18next para todo texto.

## Patrones que SÍ usamos
- **i18n total:** todo texto visible usa `t()`. Datos en el idioma activo.
- Animaciones rápidas (≤150ms). Botones pill, colores primario/secundario coherentes (ver patrón global de UI).
- Confirmaciones con AppDialog; toasts post-acción. Validar UI con el equipo visual.
- **Card de transacción (home + historial) — 3 zonas fijas:** (1) fila principal `icono[+notch de relación] · título[+Fijo] / categoría[+chip de tarjeta] · columna de importe[+ "de $total"]`; (2) pie de relación (`TxRelationTier`) SOLO si la transacción tiene relación social: **sin fondo ni borde propios e indentado hasta el título** (`indent` = padding + ícono + gap → 70 en historial, 74 en home), con el nombre del amigo en negrita. Una franja a ancho completo con fondo propio se lee como barra ENTRE dos tarjetas y no se sabe a cuál pertenece — ese fue el rechazo de v2.43.0. La columna de importe nunca lleva `flex: 1` ni chips: si compite con la meta, el nombre se trunca (bug de v2.42.0). Toda la relación social se resuelve en `components/TxRelation.tsx` (`useTxRelation`), nunca inline por pantalla.
- **Todo agregado de dinero pasa por `effectiveAmount(tx)`** (`utils/sharedCalc.ts`): balance, tendencia, presupuesto, desglose por categoría, reportes y la propia fila. Sumar `tx.amount` a pelo cuenta el total del grupo en gastos compartidos y descuadra el balance contra las filas. Las únicas excepciones legítimas son los formularios (editar/duplicar guardan el total) y `friend-report`, que calcula deudas con su propia lógica de porcentajes.
- **Franja superior del Home (`components/HomeHeader.tsx`) — dos estados sobre altura fija (70px):** al abrir, avatar con el anillo del % gastado a la izquierda + nombre + línea de contexto; al bajar, barra compacta con el mismo anillo, nombre y mes. El colapso se ata al scroll con `opacity`/`transform` (nunca `height`: no corre en el hilo nativo) desde un `Animated.ScrollView`. Con reduce-motion **no** se colapsa. La campana se renderiza UNA vez fuera de las dos capas: duplicarla monta dos `NotificationBell` y dos suscripciones a Firestore. El card de balance no se toca desde aquí.
- **Color de texto sobre tinte:** en chips/badges tintados no asumir que `primary`/`primaryDark` se lee — las paletas pastel dan 1.5:1. Medir y caer a `textPrimary` (patrón `readableOn` en `components/TxRelation.tsx`).
- **Animación:** todo movimiento decorativo por `components/fx/FxLayer.tsx`; bordes difusos con `SoftOrb`, nunca `filter: blur()` animado; ningún valor de animación pasa por el estado de React. Ver CLAUDE.md → «Animación — Reglas obligatorias».

## Patrones PROHIBIDOS
- Strings hardcodeados.
- **`Animated.loop` con `useNativeDriver: false` para decoración** — en web eso interpola en JS y escribe estilos inline en cada frame (se midieron 1.440 escrituras/s en reposo). Usar `FxLayer`.
- **`filter: blur()` sobre una capa que se anima** — la GPU rehace el desenfoque en cada frame. Usar un degradado radial.
- **`animatedValue.addListener(v => setState(v))`** — re-renderiza el componente entero 60 veces por segundo.
- **`useEffect` que arranca una animación sin devolver su limpieza** — deja el bucle vivo tras desmontar.
- **Fechas/meses hardcodeados:** prohibido arrays `['Enero',...]` o `toLocaleDateString('es-CO', ...)`. Usar SIEMPRE `utils/dateLocale.ts`: `getMonthNames(i18n.language)` para nombres de mes, `formatDate/formatTime(date, opts)` (o `localeFor()` como locale) para que la fecha siga al idioma activo (es→es-CO, en→en-US, it→it-IT). Los números (`toLocaleString('es-CO')`) se dejan en es-CO a propósito (formato COP).
- **Paridad i18n:** toda clave nueva va a los 3 locales (es/en/it) — verificar con el script de auditoría (round-trip JSON idéntico). Claves dinámicas `t(\`x.${var}\`)` deben cubrir TODOS los valores del dominio.

## Tests
- Hay scripts sueltos (`test_logic.js`, `test_generateUserName.ts`). No hay suite formal; se valida a mano.
- **Rendimiento:** se mide con Chrome headless por CDP contra el bundle de producción (viewport 390×844, CPU 4×), contando mutaciones del atributo `style` y capas con `filter`. Borrar el perfil de Chrome entre medidas: el service worker sirve el bundle viejo desde caché y compararías dos builds idénticos.

## Commits
- Commit tras cada ajuste. Deploy solo con permiso.

## Responsive: anchos y flotantes

La app se ve en móvil, tablet y navegador de escritorio. El lienzo lo limita
`ScreenBackground` (720 px en tablet, 960 en desktop), pero **eso no es el ancho
del contenido**: cada pantalla pone su propio tope.

- **Contenido de una pantalla:** el `contentContainerStyle` del scroll lleva
  `width: '100%', maxWidth: N, alignSelf: 'center'`. `N` = 640 para formularios y
  listas simples, 768 para pantallas de datos (Home, Historial, informes). Ninguna
  pantalla nueva se queda sin tope: en desktop, un CTA `width: '100%'` sin tope mide
  ~900 px.
- **Flotantes (FAB, botón fijo al fondo):** van dentro de `components/FloatingActions`,
  que los mete en la MISMA columna que el contenido y la tab bar (640/560). Nunca
  `position: absolute` con `right: 20` o `left: 20 / right: 20` a pelo — contra la
  ventana, el FAB acaba pegado al borde del navegador y el botón fijo se estira.
- **Hojas y modales:** `width: '100%', maxWidth: 768` y centrado. Si la capa que la
  contiene es un `position: absolute` con `left/right: 0`, el centrado se hace con
  `alignItems: 'center'` en la capa, no con márgenes en la hoja.
- **Nunca `width: '100%'` junto a `marginHorizontal`:** el ancho ya es el 100% del
  padre y las márgenes suman por fuera; el elemento desborda el doble del margen.
  Para separar de los bordes se usa `paddingHorizontal` en el contenedor.
- **Verificación:** capturas reales a 390 / 834 / 1440 px antes de dar por terminada
  cualquier pantalla. Aviso: Chrome headless con `--window-size` puede calcular el
  layout a otro ancho y recortar la imagen; si el resultado de móvil sale desplazado,
  es la herramienta, no la app.
