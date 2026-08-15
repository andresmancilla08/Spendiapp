# Errores Conocidos

### Modal de novedades no aparece
- **Síntoma:** tras deploy no sale WhatsNew. **Causa:** `package.json` y `app.json` con versiones distintas. **Solución:** bump ambos al mismo valor antes de `npm run deploy`.

### Google Sign-In: loading infinito (nativo)
- **Síntoma:** queda cargando al iniciar sesión con Google en nativo. **Causa:** config Firebase/GCloud (SHA, client IDs). **Solución:** fixes aplicados + pendientes; ver memoria `project_spendia_google_auth`.

### Datos sensibles
- **A propósito:** se guardan en secure-store, no en AsyncStorage plano.

### Personalización: 13 previews animados simultáneos (resuelto en v2.57.0)
- **Síntoma:** la sección "Fondo animado" era el peor caso de consumo de la app.
- **Causa real:** cada tarjeta renderizaba el efecto REAL y animado — unos 144 elementos en movimiento a la vez, cada uno con su blur.
- **Solución:** `FxFrozen` (contexto de `components/fx/FxLayer.tsx`) congela en su primer fotograma todo el subárbol; solo se anima la miniatura seleccionada.

### El móvil se calentaba con la app abierta (resuelto en v2.57.0)
- **Síntoma:** el teléfono se calentaba usando Spendia, sobre todo en el Home.
- **Causa real:** tres a la vez, todas de implementación, no de diseño. (1) Los 13 efectos animaban desde JS con `useNativeDriver: false` → 1.440 escrituras de `style` por segundo en reposo. (2) 13 capas con `filter: blur()` que se animaban, cubriendo 2,95 pantallas → la GPU rehacía el desenfoque cada frame. (3) `BalanceCard` volcaba tres animaciones en bucle al estado de React con `addListener` → re-render completo del gráfico 60 veces por segundo, para siempre.
- **Solución:** ver las decisiones de 2026-08-15. Medido después: 0 mutaciones de estilo, 0 capas de blur, CPU en reposo indistinguible del ruido.
- **Cómo medirlo otra vez:** Chrome headless por CDP contra el bundle de producción, viewport 390×844 y CPU 4×. Contar mutaciones del atributo `style` con un `MutationObserver` y capas con `filter` por `getComputedStyle`. **Ojo:** el service worker sirve el bundle viejo desde caché — hay que borrar el perfil de Chrome entre medidas o se comparan dos builds idénticos sin darse cuenta.

### Bucles de animación sin limpieza (resuelto en v2.57.0)
- **Síntoma:** ninguno visible; consumo que no se explicaba por lo que había en pantalla.
- **Causa real:** `Skeleton` y el punto "en vivo" de `ExchangeRateChips` arrancaban un `Animated.loop` infinito sin `return` de limpieza en su `useEffect`. Cada componente desmontado dejaba su bucle corriendo. El Home muestra unos quince skeletons mientras carga.
- **Solución:** ambos pasan por `FxLayer`, que limpia siempre.

### Contactos no cargan en ningún lado (resuelto)
- **Síntoma:** los amigos no aparecen en `friends`, ni en compartir gasto / enviar ingreso (muestra "no tienes amigos"), ni en `friend-report`; a veces spinner pegado.
- **Causa real:** el commit M-1 (`4a3fa76`) movió los datos públicos del perfil a la colección `publicProfiles` (único doc legible por otros usuarios) y la rellenaba SOLO en el login de cada usuario (`syncPublicProfile`). Sin trigger server-side ni backfill: cualquier contacto que no volvió a entrar tras ese deploy no tiene doc en `publicProfiles` → `getPublicProfile()` devuelve `null` → el amigo se pinta vacío o se descarta. El cliente NO puede auto-sanar: las reglas prohíben leer el doc `users` de otro usuario.
- **Bug secundario:** `SharedExpenseSection`/`SentIncomeSection` cargaban perfiles con `for...of` + `await` secuencial → una lectura lenta colgaba el spinner.
- **Solución aplicada (2026-07-25):** (1) hook `useFriendProfiles` que carga en paralelo, es resiliente (placeholder si falta perfil, no descarta) y tiene red de seguridad de 8s; (2) **backfill ya ejecutado** — 6/6 usuarios espejados a `publicProfiles` vía `functions/scripts/backfillPublicProfiles.js` (Admin SDK + ADC); (3) `updateUserDisplayName` sincroniza los cambios de nombre a `users` + `publicProfiles` desde el cliente.
- **CERRADO (2026-07-25, plan Blaze):** el usuario activó Blaze y se desplegó el trigger `mirrorPublicProfile` (onWrite `users/{uid}`→`publicProfiles`) + el onCall `backfillPublicProfiles`. El espejo ahora es 100% server-side; ya no depende del login ni de `updateUserDisplayName`. (Histórico: mientras el proyecto estuvo en Spark, el deploy de functions fallaba con Secret Manager 403 y se usó el script Admin SDK + sync cliente como puente.)

### Personalización: sync Firestore es last-write-wins POR TIMESTAMP (resuelto)
- **Síntoma histórico:** las prefs de gráfico/fondo "no se aplicaban" — cada recarga las revertía.
- **Causa real:** el debounce de 800ms se cancelaba al desmontar (últimos cambios nunca se escribían) y PaletteLoader aplicaba el doc remoto viejo encima de lo local fresco.
- **Solución aplicada (be63871):** cada escritura lleva `updatedAt` + flush al desmontar; el arranque solo aplica lo remoto si `remoteTs > localTs` (clave local `@spendiapp_personalization_synced_at`).

### `localeFor is not defined` — pantallas y reportes crasheaban (resuelto)
- **Síntoma:** al abrir el **detalle de una transacción** la pantalla se caía; el **reporte entre amigos** se caía al seleccionar un amigo o al generar; ídem la fecha de meta cumplida y los 4 generadores de PDF/imagen. Se atribuyó al fix de contactos porque salió justo después (v2.41.1 → v2.41.2).
- **Causa real:** el commit de i18n `5fd0c74` introdujo llamadas a `localeFor()` en 10 archivos **sin importar la función** de `utils/dateLocale` → `ReferenceError` en runtime. El bundler no falla: solo revienta al ejecutar.
- **Por qué no lo cazó TypeScript:** `npx tsc --noEmit` **crashea** en este repo con `RangeError: Maximum call stack size exceeded`. Hay que correrlo con más pila.
- **Solución (2026-07-29):** imports añadidos + `npm run typecheck` (`node --stack-size=10000 ./node_modules/typescript/lib/tsc.js --noEmit`). **Correr `npm run typecheck` antes de cada deploy**: los 3 errores restantes (`JSX` namespace ×2, `getReactNativePersistence`) son preexistentes y esperados.

### Editar un gasto compartido fallaba con "no se pudo guardar" (resuelto)
- **Síntoma:** el dueño edita un gasto compartido (monto/fecha/categoría/participantes) y sale error de guardado; nada se actualiza, ni su propia copia.
- **Causa real:** `edit-transaction` propaga los cambios a los mirrors de todos los participantes en un `writeBatch`, pero `firestore.rules` solo permitía `write` sobre `transactions` cuando `resource.data.userId == auth.uid`. El mirror del amigo pertenece al amigo → regla denegada → el batch entero se rechaza (atómico).
- **Solución (2026-07-29):** regla `allow update` para el dueño del compartido (`resource.data.isShared && resource.data.sharedOwnerUid == auth.uid`), con `userId` y `sharedOwnerUid` inmutables. Desplegada a prod.

### Borrar un gasto compartido lanzaba `deleteDoc is not defined` (resuelto)
- **Causa real:** `hooks/useSharedTransactions.ts` usaba `deleteDoc` sin importarlo desde `firebase/firestore` (desde `841e2c1`). Mismo patrón que `localeFor`.
- **Solución (2026-07-29):** import añadido. Lo detecta `npm run typecheck`.

### Notificaciones sin traducción / sin icono (resuelto)
- **Síntoma:** `sent_income_delete_request` (pedir borrar un ingreso recibido) se mostraba como la clave cruda; `external_participant_joined` nunca llegaba.
- **Causa real:** el primero no existía en `NotificationType`, ni en los mapas de icono/color/ruta, ni en `locales/*.json`. El segundo lo denegaban las reglas: el tipo no estaba en la lista permitida y su `data` no traía `fromUserId` (la regla exige `data.fromUserId == auth.uid`), lo que además abortaba el `deleteDoc` del `pendingExternalLinks` → se reprocesaba en cada login.
- **Solución (2026-07-29):** tipo, mapas, rutas y claves es/en/it añadidos; `fromUserId` en el payload; tipo permitido en reglas; el `addDoc` va en try/catch para no bloquear la limpieza del link.

### La categoría del amigo salía como un id crudo (resuelto)
- **Síntoma:** en un gasto compartido o un ingreso enviado, el amigo veía como categoría algo tipo `aB3xKq9ZmN0pQrSt`.
- **Causa real:** se copiaba tal cual la categoría del dueño al doc del amigo. Si era personalizada, el amigo no tiene ese doc en `categories` (son privados) → el label caía al id.
- **Solución (2026-07-29):** `categoryForOtherUser()` en los 3 puntos de escritura (`createSharedTransaction`, `createSentIncome`, propagación de `edit-transaction`) + `categoryLabel()` y las filas de historial/detalle ahora muestran "Otro" localizado en vez del id (cubre los mirrors ya escritos, que no se migran).

### Editar un cobro compartido (income_claim) invertía el tipo del amigo (resuelto)
- **Síntoma:** tras editar un "te debe", la copia del amigo pasaba de egreso a ingreso y su balance quedaba al revés.
- **Causa real:** la propagación de `edit-transaction` escribía el `type` del dueño en TODOS los mirrors, sin replicar la inversión que sí hace `createSharedTransaction` (`income_claim` → el no-owner es `expense`).
- **Solución (2026-07-29):** el mirror ajeno de un `income_claim` se fuerza a `expense` al editar.

### Barra de estado blanca en la PWA de iOS (resuelto)
- **Síntoma:** en la app instalada en iOS, la franja superior (hora/batería) se veía **blanca** aunque la app estuviera en modo oscuro.
- **Causa real:** `AppBackground` ya actualizaba `theme-color` dinámicamente, pero **iOS ignora `theme-color` en apps instaladas**: ahí manda `apple-mobile-web-app-status-bar-style`, que estaba en `default` (= barra blanca fija). Ese meta se lee al arrancar y solo acepta 3 valores; no se puede cambiar por modo en caliente.
- **Solución (2026-07-29):** `black-translucent` en `+html.tsx` **y** en `scripts/patch-html.js` → la webview se extiende bajo la barra y la pinta `AppBackground` (con `viewport-fit=cover`, ya presente, y las `SafeAreaView` de cada pantalla desplazando el contenido).
- **Actualización (2026-08-04):** se quitó la banda (`body::before` + `--spendia-statusbar-bg`), que pasó por dos versiones — teñida con `colors.primaryDark` y neutra — y en las dos cortaba la pantalla justo encima del header. Hoy la zona segura la pinta el fondo de la app, sin capa intermedia; ver `decisiones.md`.
- **OJO al probar:** iOS cachea el `<head>` de la app instalada. Tras el deploy hay que **cerrar la app del todo** (swipe) y reabrir; si no cambia, **borrarla de la pantalla de inicio y volver a instalarla**.
- **Invariante:** toda pantalla nueva debe usar `SafeAreaView` (o `insets.top`) en la raíz. Sin eso su contenido queda **debajo de la hora**. Auditado 2026-07-29: solo `app/index.tsx` no lo usa, y es un placeholder vacío.
- **Nota (corregida 2026-08-04):** `app/+html.tsx` no se aplica **en ningún sitio**, ni en `expo start --web` ni en el export: requiere `web.output: "static"` y `app.json` no lo declara (por defecto es `single`). Medido pidiendo el HTML al dev server: 1390 bytes, la plantilla pelada de Expo, sin manifest, sin `apple-mobile-web-app-status-bar-style` y sin `viewport-fit=cover`. **Todo el `<head>` real lo inyecta `scripts/patch-html.js` durante `npm run export`.**
- **Consecuencia al probar:** en `expo start` la barra de estado y el home indicator SIEMPRE se van a ver mal (sin `viewport-fit=cover` el viewport ni siquiera llega a los bordes, así que iOS pinta blanco arriba y abajo). Para probar la PWA hay que servir `dist/` — p.ej. `npm run export && python3 -m http.server 8090 --directory dist` — y añadir ESA url a la pantalla de inicio.

### Acentos "dinámicos" del gráfico: casi siempre verdes (resuelto)
- **Síntoma:** con "Dinámico" / "Línea dinámica" / "Contenido dinámico" el gráfico del Home no cambiaba de color aunque el mes fuera malo. En Personalización sí se veía cambiar (verde↔rojo).
- **Causa real:** la regla comparaba `values[último] < values[0]`, o sea el mes mostrado contra el **primer mes de la serie (6 meses atrás)** — no contra el mes anterior, que es lo que promete el texto de la sección ("verde si tu balance sube este mes, rojo si baja"). Consecuencias: en una cuenta nueva `values[0]` vale 0, así que cualquier balance ≥ 0 daba verde para siempre; y un mes que se hundía después de cinco buenos también daba verde. Solo una caída sostenida de 6 meses lo ponía rojo. En Personalización no se notaba porque la vista previa **finge** el cambio alternando cada 6s.
- **Solución (2026-07-29):** `utils/chartTrend.isTrendUp()` — mes mostrado vs mes anterior, fuente única para el color (`resolveChartAccent`) y para el crossfade de `BalanceCard`. Módulo sin imports de React Native para poder testearlo: `npx tsx utils/chartTrend.test.ts`.

### Otros dos hallazgos de Personalización (resueltos el mismo día)
- **`chartAccent` remoto sin validar** (`app/_layout.tsx`): era la única pref que se aplicaba sin comprobar contra su lista de valores. Un acento viejo o retirado entraba al contexto y `resolveChartAccent` caía a `colors.primary` → "el acento elegido no se aplica". Ahora valida contra `CHART_ACCENT_VALUES` como sus hermanas.
- **Las vistas previas ignoraban reduce-motion:** animaban siempre, mientras el gráfico real del Home usa `useProMotion().animate`. Con "Reducir movimiento" activo el usuario elegía una animación que en su Home nunca se movía. Ahora las previas reciben `motion` y el demo del crossfade dinámico no arranca.
- **Nota (por diseño, no es bug):** el acento activo ya no se oculta de la parrilla. La lista deduplica acentos que resuelven al mismo color en la paleta activa (en `deepWater`, `secondary === success`), y si el acento elegido caía en ese filtro desaparecía y ninguna opción quedaba marcada.
- **Nota (por diseño):** los colores del donut de categorías son fijos (`constants/categoryColors.ts`) — no siguen la paleta ni el acento, a propósito, para que las categorías se distingan entre sí.

## Texto sobre fondo tintado: medir, no asumir
- **Síntoma:** un chip/badge que se lee perfecto en la paleta por defecto queda ilegible en otra (pastel), o la categoría de una fila "pagada" casi desaparece.
- **Causa real:** dos capas. (1) Las paletas pastel tienen `primary`/`secondary` clarísimos: usarlos como color de TEXTO da 1.5-2.4:1. (2) La fila pagada del historial cambia el fondo a `primaryLight`, y ahí `textTertiary` (y en light también `textSecondary`) cae por debajo de 4.5:1 aunque sobre `surface` pasara.
- **Solución:** `utils/txRelation.ts` → `readableOn(bg, candidates)` elige el primer candidato que llega a 4.5:1 (y el de mayor contraste si ninguno llega); `readableChipText` mezcla el tinte sobre el fondo REAL de la fila, no sobre `surface`. Para tonos medios donde ni el texto claro ni el oscuro pasan (deepWater light `secondary`), el relleno del notch cae al tono oscuro. Comprobado en `utils/txRelation.test.ts` (`npx tsx utils/txRelation.test.ts`).

## En gastos compartidos a cuotas, `amount` YA es tu cuota-parte
- **Síntoma:** "de $12.334" debajo de una cuota de "$12.333" — una etiqueta que parece el total del grupo pero es un gemelo redondeado de tu propia cuota.
- **Causa real:** en cuotas, `useSharedTransactions` amortiza sobre la base del participante y escribe en `amount` la cuota que te toca, mientras `sharedAmount` calcula lo mismo por división plana (doble redondeo). En gastos compartidos SIN cuotas es al revés: `amount` es el total del grupo y `sharedAmount` tu parte.
- **Solución:** el card solo usa `sharedAmount` (y solo entonces muestra "de $total") cuando `!isInstallment`. En cuotas se muestra `amount` tal cual. El total real de una compra a cuotas compartida no existe como campo hoy.

### El detalle afirmaba datos del mes antes de tenerlos (resuelto)
- **Síntoma:** al abrir el detalle, durante un instante decía «es tu único movimiento de Comida en julio» y «Comida · 0% del mes» aunque hubiera diez.
- **Causa real:** los módulos de contexto, categoría y otros-movimientos se calculan con `useTransactions(uid, viewYear, viewMonth)`, que empieza con la lista vacía. Con lista vacía, `catCount` es 0 y el porcentaje 0.
- **Solución:** todo módulo que dependa del mes está detrás de `!monthLoading`, y el porcentaje de la tesela de categoría solo se pinta si `monthTotal > 0`. Regla general: **ninguna frase con un número se muestra antes de tener el número**.

### `addMonths` devolvía el día 1 y «próxima cuota» mentía (resuelto)
- **Síntoma:** en una compra a cuotas del día 22, el pie del héroe decía «PRÓXIMA 1 ago».
- **Causa real:** `addMonths` normaliza al primer día del mes (lo que necesitan los chips de mes) y se estaba reutilizando para calcular la fecha de la próxima cuota.
- **Solución:** `utils/detailFacts.nextMonthSameDay()` conserva el día y lo recorta si no existe (31 ene → 28 feb). Cubierto en `npx tsx utils/detailFacts.test.ts`.

### En un compartido A CUOTAS no existe el total del grupo
- **A propósito:** el detalle de un gasto compartido dice «tu parte de $X» solo cuando NO es a cuotas. En cuotas, `amount` ya es tu cuota (ver la nota de `sharedCalc`) y el total real de la compra del grupo no existe como campo, así que el subtítulo pasa a «Cuota 3 de 12 · entre 3 personas». Si algún día se guarda ese total, ahí es donde se muestra.

### Claves i18n huérfanas: ahora hay un chequeo
- **Síntoma histórico:** una clave inexistente se pinta cruda en pantalla y nadie lo nota (el bundler no falla).
- **Herramienta:** `node scripts/check-i18n-keys.js [ruta]` extrae cada `t('...')` de `app/` y `components/` y verifica que exista en es/en/it (entendiendo las formas plurales `_one`/`_other`), y que los tres idiomas tengan el mismo juego de claves. Correrlo antes de cada deploy junto con `npm run typecheck`.
- **Ojo con `count`:** pasarle `count` a `t()` activa la pluralización de i18next y busca `clave_one`/`clave_other`. Si el número es solo un dato (personas, movimientos), el marcador se llama `n`/`people`; si el plural importa de verdad, se crean las dos formas en los tres idiomas.

### `adjustsFontSizeToFit` no hace nada en web (recurrente)
- **Síntoma:** cifras largas truncadas ("−$1.234.567..." ) en la ficha héroe del detalle y en el balance.
- **Causa real:** react-native-web no implementa `adjustsFontSizeToFit`/`minimumFontScale`. Spendiapp es PWA web, así que la propiedad es decorativa.
- **Solución:** escalar por longitud del string (`amountLabel.length <= 12 ? 40 : …`), como ya hacía `components/BalanceCard.tsx`. Aplicado en `app/transaction-detail.tsx`. Quedan pendientes `figValue` del mismo archivo y `summaryCardValue` del home.

### En PWA iOS standalone, `100dvh` se queda corto (resuelto)
- **Síntoma:** en algunos iPhone, una franja del color del canvas debajo de la tab bar — blanca y muy visible en modo claro.
- **Causa real:** `#root` medía `100dvh`, que en standalone excluye el inset del home indicator en varios modelos, así que el root no cubría el viewport.
- **Solución:** `#root { position: fixed; inset: 0; height: auto }` en `scripts/patch-html.js` (y espejado en `app/+html.tsx`). No depende de la medida del viewport.

### El `<head>` de producción NO sale de `app/+html.tsx`
- **A propósito (y trampa habitual):** el export estático de Expo ignora `+html.tsx`; lo que se despliega lo genera `scripts/patch-html.js`. Si un meta, un estilo global o el `<noscript>` no aparecen en producción, es que se tocó solo el `.tsx`.

### Los `.test.ts` de `utils/` no corren con Jest
- **A propósito:** son scripts con `assert`, se ejecutan con `npx tsx utils/<archivo>.test.ts`. El repo no tiene runner de Jest configurado; lanzar `npx jest` falla con "must contain at least one test" y no significa que algo esté roto.

### Canvas: la familia "Montserrat" no existe (resuelto)
- **Síntoma:** el reporte compartido salía en Helvetica aunque se pidiera Montserrat, y las píldoras quedaban mal dimensionadas.
- **Causa real:** `expo-font` registra una familia POR PESO con el nombre de la clave (`Montserrat_700Bold`), no una familia "Montserrat" con pesos. `ctx.font = '700 13px Montserrat'` cae al fallback sin avisar.
- **Solución:** en `utils/generateFriendReportImage.ts`, `font()` elige la familia por peso desde `config/fonts.ts`, y `ensureFonts()` las carga antes de medir.

### El documento y la pantalla se pintan con tonos distintos a propósito
- **A propósito:** los dos salen de la MISMA paleta del usuario (`utils/friendReportColors`), pero el documento es siempre oscuro y la pantalla sigue el modo activo, así que cada uno ajusta el tono a su fondo con `readableTint`. Que el hex no coincida no es una divergencia.
- **Y el lado ajeno no siempre es `tertiary`:** en nordic, mint, peachPastel o mochaPastel el `tertiary` está a 12-30 puntos (sobre 441) del `primary` y los dos lados se veían como uno. `otherToken` baja por `secondary`, `success`, `info`… hasta el primero que se distinga.

### `navigator.share` no admite `await` antes de llamarse (resuelto)
- **Síntoma:** en la PWA de iOS, "Compartir" abría el PNG en el visor de Safari en vez de la hoja del sistema.
- **Causa real:** el handler hacía `await fetch(objectURL)` para reconstruir los `File`. iOS invalida la activación del gesto en cuanto hay un await, `navigator.share` lanza `NotAllowedError` y el código caía al fallback de descarga.
- **Solución:** los `File` se construyen sincrónicamente desde el `blob` que ya está en memoria. Regla general: nada de awaits entre el toque y `navigator.share`.

### `useWindowDimensions` dentro de un `Modal` mide una ventana falsa (resuelto)
- **Síntoma:** la previsualización del reporte salía a un tercio de su tamaño.
- **Causa real:** el ancho se calculaba con `useWindowDimensions()` desde dentro del modal, que en web devolvía ~180px.
- **Solución:** el tamaño lo pone el layout — `width: '100%'`, `maxWidth` y `aspectRatio`. En un modal, no medir la ventana con JS.

### Descargar en la PWA: `image/png` abre el visor, `octet-stream` guarda
- **A propósito:** `handleDownload` crea un blob `application/octet-stream` aunque el archivo sea PNG. Con el tipo real, el navegador (iOS sobre todo) navega al blob y muestra el visor en lugar de guardar en Descargas.

### La regla del dinero compartido (leer antes de tocar importes)
- **Sin cuotas:** el documento de cada participante trae `amount` = TOTAL del grupo y `sharedAmount` = SU parte.
- **A cuotas:** trae `amount` = SU cuota ya amortizada sobre su porcentaje. `sharedAmount` es un gemelo por división plana que se desvía en la cuota que absorbe el residuo.
- **`income_claim`:** se reclama entero, nunca se divide.
- Para "cuánto vale esto para el dueño del documento" siempre `utils/sharedCalc.effectiveAmount`. Para "cuánto le toca al otro" en cuotas hay que **reescalar por MI porcentaje** (`amount * suPct / miPct`), nunca aplicar el suyo sobre mi cuota.
- Este malentendido apareció en seis sitios distintos (reporte entre amigos, ficha del movimiento, previo y editor de edición, desglose del historial, reporte anual). Gates: `npx tsx utils/friendReportInstallments.test.ts` y `utils/friendReportModel.test.ts`.

### Una cuota nunca es un gasto fijo (resuelto)
- **Síntoma:** un compartido a cuotas creado con el interruptor de "gasto fijo" encendido aparecía cada mes, indefinidamente, con el importe equivocado; inflaba balance, categorías, presupuestos y tendencia.
- **Causa real:** la rama propia de `add-transaction` forzaba `isFixed: false`, la compartida dejaba pasar el valor del formulario, y la Query 2 de `useTransactions` clona como fijo todo lo que tenga `isFixed: true`.
- **Solución:** `createSharedTransaction` fuerza `isFixed: false` en las cuotas, la Query 2 descarta `isInstallment` y `utils/migrateFixedInstallments` repara los documentos ya escritos.

### Las copias virtuales de un fijo tienen que llevar su reparto
- **A propósito:** un gasto fijo es UN documento; sus mensualidades se generan en cliente. Cada sitio que las genere debe copiar `isShared`, `sharedAmount` e `isInstallment`, o `effectiveAmount` contará el total del grupo. Le pasaba a `useReportGenerator` (el año salía al doble) y le pasaba a `useTransactions` con las cuotas.

### El long-press no es una vía de acción (resuelto en Metas)
- **Síntoma:** en Metas no se podía eliminar ni editar nada.
- **Causa real:** eliminar solo existía como `onLongPress` de la tarjeta. En la PWA de iOS ese gesto lo intercepta Safari (menú de sistema / selección) y con ratón nadie lo descubre; para VoiceOver, simplemente no existía. Editar no estaba implementado (`useGoals` no tenía `updateGoal`).
- **Solución:** la tarjeta abre `components/GoalSheet` y todas las acciones son botones visibles con `accessibilityRole`/`accessibilityLabel`. Regla general: **ninguna acción puede vivir solo en un gesto**; el long-press vale como atajo, nunca como única vía. Quedan con el mismo patrón viejo `app/(tabs)/budget.tsx:366` y `app/expense-groups.tsx:243`.

### El color de señal no puede caer a gris (`accentInk` vs `readableTint`)
- **A propósito:** en Metas y en el reporte de amigos las tintas de señal (barra de progreso, cifra ahorrada, badge "LOGRADA", chip activo) usan `readableTint`, no `accentInk`. `accentInk` es correcto para texto de acento, pero su último recurso es `textSecondary`: el badge de logro salía **gris** en modo oscuro y el chip activo perdía el cian. `readableTint` conserva el tono y solo lo acerca al blanco o al negro hasta alcanzar el ratio.
- **Y cada tinta se mide contra el fondo que tiene DEBAJO:** sobre una pastilla `#RRGGBB1E` compuesta hay que medir el color resultante, no la superficie. Medido contra la superficie, el ícono de editar daba 1,70:1 en las paletas pastel.


### `width: '100%'` + `marginHorizontal` desborda el contenedor (resuelto)
- **Síntoma:** en Personalización, la pastilla de capítulos (Color · Fondo · Datos · Detalle) salía de borde a borde, sin los 16px laterales que sí respetan el lienzo y la lista de abajo.
- **Causa real:** el estilo mezclaba `width: '100%'` con `marginHorizontal: 16`. En flexbox el ancho ya es el 100% del padre y las márgenes se suman **por fuera**: el control medía padre + 32px.
- **Solución:** el margen lateral lo pone un contenedor con `paddingHorizontal` (patrón de `canvasWrap`), y el control no lleva `width`/`margin`. Regla general: para alinear con el resto de la pantalla se usa **padding del contenedor**, nunca `margin` sobre un hijo al 100%.

### El chrome del sistema (barra de estado) hay que fijarlo ANTES de que React monte (resuelto)
- **Síntoma:** en modo oscuro la franja superior del dispositivo salía blanca (con la hora en negro) en vez de negra.
- **Causa real:** el único que escribía `theme-color` y `--spendia-statusbar-bg` era `AppBackground`, ya montado React. El sistema pinta esa franja al **lanzar** la app, con el `theme_color` estático del manifest (era `#00ACC1`) o con su blanco por defecto; el cambio posterior por JS llega tarde o lo ignora.
- **Solución:** un script inline en el `<head>` (en `app/+html.tsx` **y** en `scripts/patch-html.js`, son dos pipelines: dev y export) lee `@spendiapp_theme` de `localStorage` y fija meta + variable CSS antes del primer pintado; `theme_color` del manifest y `web.themeColor` de `app.json` quedan neutros (`#000000`). `AppBackground` sigue manteniéndolo sincronizado al cambiar de tema en caliente.
- **Lo que NO arregla:** iOS congela `apple-mobile-web-app-status-bar-style` en el momento de "Añadir a pantalla de inicio". Un icono instalado antes del cambio a `black-translucent` sigue con la barra opaca del sistema hasta que se reinstala el acceso directo.

### Un `<Text>` con nombre de ícono imprime el nombre (resuelto)
- **Síntoma:** en el Home, la tarjeta "Top category" mostraba el texto `tools-kitchen` en lugar de un ícono.
- **Causa real:** `InsightItem.icon` estaba tipado como `string` con el comentario "emoji" y se pintaba en un `<Text>`. Tres tarjetas pasaban emoji y la cuarta pasaba una clave del catálogo Tabler, que el `<Text>` imprimió tal cual.
- **Solución:** `icon: AppIconName` y render con `<AppIcon>`; las cuatro tarjetas usan íconos Tabler. El tipo es ahora el que impide la repetición — un nombre inválido no compila.
- **Referencia de blindaje:** `components/CategoryIcon.tsx` es el patrón correcto para un icono que puede llegar como clave o como emoji legado: clave del catálogo → Tabler, algo que no sea `[a-z0-9-]+` → emoji, resto → ícono de "Otro". Nunca imprime la clave.

### La franja del sistema sale con el color de la paleta — es a propósito
- **Síntoma:** el `theme-color` está en negro y la barra de estado sale, por ejemplo, azul oscuro en modo oscuro.
- **Causa real:** lo que se ve ahí es `--spendia-app-bg` (fondo de `html`/`body`, visible en la franja y en el rubber band), no el `theme-color`.
- **Estado (2026-08-04):** buscado. Desde el cambio de la zona segura, `--spendia-app-bg` y el `theme-color` valen los dos `topBackgroundColor(gradientColors[0], isDark)` — el color real del borde superior del fondo — para que el chrome del sistema no corte la pantalla con un neutro. Entre 2026-07-29 y esa fecha fueron neutros (`#000000` / `#FFFFFF`); si aparece un neutro hoy, es el fallback del primer arranque, antes de que `AppBackground` cachee `@spendia_chrome`.

### El lienzo de Personalización se encoge con el dedo, no por umbral (resuelto)
- **Síntoma:** al bajar en Personalización, la vista previa de arriba cambiaba de golpe: en un fotograma pasaba del lienzo de 292 px a la barra de 64.
- **Causa real:** `collapsed` era un booleano con histéresis (96 px / 44 px) que **sustituía un componente por otro**. No había transición: había relevo.
- **Solución:** la altura y las dos opacidades se interpolan sobre un `Animated.Value` alimentado por el scroll (`Animated.event`, `useNativeDriver: false` — `height` no la puede animar el hilo nativo). Los tramos de opacidad se solapan (43-60 px) para que se lea como un cruce. El alto del capítulo va en su propio `Animated.Value` con un `timing` de 140 ms, porque cambiar de capítulo también cambia el alto (292 ↔ 196) y ese salto se veía igual de brusco. Queda un booleano, `barTouchable`, pero solo decide `pointerEvents`: no repinta nada visible.
- **Con "reducir movimiento" el lienzo no se encoge** (mismo criterio que el header del Home) y la barra no se monta.

### Presupuesto tenía su propio catálogo de categorías (resuelto)
- **Síntoma:** las categorías de Presupuesto salían con emoji (🍽️, 🚗…) mientras el resto de la app usaba íconos Tabler, y su nombre siempre en castellano aunque la app estuviera en inglés o italiano.
- **Causa real:** `app/(tabs)/budget.tsx` declaraba su propia `DEFAULT_EXPENSE_CATEGORIES` con emojis y nombres fijos, en paralelo a `DEFAULT_CATEGORIES` de `constants/categories.ts`.
- **Solución:** la lista se deriva del catálogo oficial y el nombre pasa por `categoryLabel`. El chip del diálogo pintaba el icono en un `<Text>` (mismo fallo que "tools-kitchen" en el Home): ahora usa `CategoryIcon`, que además sigue entendiendo el emoji guardado en los presupuestos antiguos.

### `getReactNativePersistence` no existe en los tipos web de Firebase (resuelto)
- **Síntoma:** `typecheck` fallaba con TS2305 en `config/firebase.ts` (firebase 12).
- **Causa real:** ese símbolo solo lo declara la entrada React Native del SDK (`@firebase/auth/dist/index.rn.d.ts`); resolviendo `firebase/auth` para web no existe.
- **Solución:** se lee del módulo en runtime con un tipo explícito (`import * as firebaseAuth`), y si no está, se cae a `browserLocalPersistence`. Sin `@ts-ignore`.
- **`JSX.Element` como tipo de retorno ya no compila** (React 19 retiró el namespace global): se quita la anotación y se deja inferir, o se usa `React.JSX.Element`.

### Nunca animar `height` contra el scroll (resuelto, segunda vez)
- **Síntoma:** en Personalización, subiendo y bajando, la vista previa se trababa y acababa dejando de responder.
- **Causa real:** dos fallos juntos. (1) La altura del lienzo se interpolaba contra `scrollY` con `useNativeDriver: false`, así que **cada fotograma de scroll recalculaba el layout** del lienzo entero, con sus SVG animados dentro. (2) Los nodos de `interpolate`/`Animated.add` se creaban **en cada render** y se iban acumulando sobre el mismo `scrollY` — y el `setState` que había dentro del `listener` del scroll provocaba justo esos renders. Degradación progresiva, no un fallo puntual.
- **Solución:** el lienzo **viaja dentro del ScrollView**, así que su desplazamiento lo hace el propio scroller. Lo único animado son `opacity` y `translateY`/`scale` (propiedades de compositor, `useNativeDriver: true`), y las interpolaciones se crean **una vez** en un `useMemo` con el alto del capítulo como dependencia. La barra compacta se superpone en `position: absolute` con `overflow: hidden`: fuera de rango queda recortada, así que no se ve ni recibe toques, y ya no hace falta ningún estado para `pointerEvents`.
- **Regla:** contra el scroll, solo transform y opacity. Cualquier propiedad que dispare layout (`height`, `width`, `margin`, `padding`, `top`) se anima en un `timing` puntual, nunca atada al gesto.

### Desinstalar un paquete se llevó `@expo/vector-icons` (resuelto)
- **Síntoma:** tras `npm uninstall` de seis dependencias sin uso, el `typecheck` falló con TS2307 en `context/ToastContext.tsx`: no encontraba `@expo/vector-icons`.
- **Causa real:** ese módulo nunca estuvo en `package.json`. Se resolvía como **dependencia transitiva** de los paquetes desinstalados, así que el import funcionaba por accidente. Al limpiar el árbol, desapareció.
- **Solución:** no reinstalarlo — el único uso era el icono del toast, y la regla del proyecto es que **todo icono va por `AppIcon` (Tabler)**. Se migró a `AppIcon` y la dependencia sobra. Los cuatro nombres (`checkmark-circle`, `close-circle`, `information-circle`, `warning`) existen igual en `ICON_MAP`, así que fue cambiar import, tipo (`AppIconName`) y etiqueta.
- **Regla:** un import que no aparece en `package.json` es una bomba de relojería. Tras cualquier `uninstall`, pasar `typecheck` **y** `npm run export`: el bundler puede seguir resolviendo lo que TypeScript ya no ve.

### Un stub `.web` es la variante de plataforma, no un fichero huérfano
- **Síntoma:** un detector de módulos sin importar señaló `hooks/useBiometrics.web.ts` como muerto, porque nadie escribe `.web` en un import.
- **Causa real:** Metro resuelve `fichero.web.ts` automáticamente en builds web frente a `fichero.ts`. Borrar **solo** el `.web` es lo peor que se puede hacer: web pasaría a cargar la variante nativa. O se van los dos o no se va ninguno.
- **Regla:** ante un `*.web.ts` / `*.native.ts` / `*.ios.ts`, tratar el grupo como una unidad.

### Una paleta fuera de `PALETTE_GROUPS` no se ve (resuelto)
- **Síntoma:** las ocho paletas neón estaban en `PALETTES`, con nombre en los tres idiomas y pasando los tests de contraste… y no aparecían en Personalización.
- **Causa real:** el selector no recorre `PALETTES`: pinta `PALETTE_GROUPS`, que lista los ids **a mano**. Una paleta que no esté en ningún grupo existe en el código y es invisible en la app, sin ningún error.
- **Solución:** `PALETTE_GROUPS` se movió a `config/palettes.ts` (con los datos, no en el componente) y `utils/reportPalette.test.ts` exige ahora las dos direcciones: toda paleta en algún grupo, y todo id citado por un grupo existente.
- **Cómo auditar i18n y estilos huérfanos:** claves definidas vs. usadas contando `t('literal')`, prefijos de plantilla (`` t(`x.${v}`) ``), plurales de i18next (`_one`/`_other`) y claves en variables (`titleKey: '…'`). Para estilos, leer el nombre real de cada `StyleSheet.create` (hay hojas que no se llaman `styles`: `palCardStyles`, `skeletonStyles`) antes de buscar `hoja.clave`. Y el `typecheck` es la red: un `styles.X` inexistente no compila.
- **Los falsos positivos mandan en la auditoría i18n:** un detector que solo busca `t('clave.exacta')` marcó 60 huérfanas y solo 12 lo eran. Los otros 48 se usan de formas que no son una llamada literal: arrays leídos con `returnObjects` o por índice (`history.months`, `upgrade.benefits`), plurales de i18next donde el código cita la base sin sufijo (`friends.list.count` → `count_one`/`count_other`), y hojas que viajan dentro de un objeto de configuración de diálogo (`dialogs.emailTaken.primary`). Antes de borrar una clave, comprobar la hoja **y** su padre en todo el repo (`.ts/.tsx/.js/.json/.html`, no solo las carpetas de código), y cruzar la lista de prefijos dinámicos con `grep -E "t\(\`[^\`]*\\\$\{"`. Por eso `scripts/check-i18n-keys.js` **no** falla por huérfanas: en esta dirección el detector no es fiable y rompería el build por nada; sí falla por claves usadas que no existen y por paridad es/en/it.

### Un ID de modelo de Gemini con versión caduca en silencio y se lleva tres endpoints (resuelto)
- **Síntoma:** "escanear factura" fallaba **siempre** con el toast genérico de error. También la categorización IA y el insight del mes, sin que nadie lo notara: los tres caen a un fallback silencioso.
- **Causa real:** `api/ocr.js`, `api/categorize.js` y `api/insight.js` fijaban `gemini-2.0-flash`. Ese modelo se quedó **sin cuota en el tier gratuito** → Gemini devuelve `429 RESOURCE_EXHAUSTED` (`quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier`), el `catch` se lo tragaba y el endpoint respondía `502` genérico. `gemini-2.5-flash` tampoco vale: `404 no longer available to new users`.
- **Segunda causa, escondida detrás de la primera:** los modelos flash actuales **piensan** antes de responder y los *thinking tokens* salen del mismo `maxOutputTokens`. Con `gemini-flash-latest` y los 300 tokens que tenía el OCR: 286 de pensamiento, 10 de respuesta → `finishReason: MAX_TOKENS` → JSON truncado → 502 otra vez. Cambiar solo el nombre del modelo **no** arreglaba nada.
- **Solución:** `api/_gemini.js` centraliza la llamada con una cadena de dos intentos — `gemini-flash-lite-latest` (no piensa, 512 tokens, JSON directo) y `gemini-flash-latest` (2048 tokens de margen) — y reintenta si el `parse` rechaza la respuesta. Loguea `status` + cuerpo del error de Gemini, y propaga `429` al cliente para que el usuario lea "límite de hoy" y no "no pude leer el recibo".
- **Reglas:** (1) usar siempre alias `-latest`, nunca un ID versionado. (2) Al elegir `maxOutputTokens`, contar los thinking tokens o usar un modelo `-lite`. (3) `node scripts/check-ai-endpoints.mjs` ejercita los tres endpoints contra la API real; correrlo cuando algo de IA se comporte raro. (4) Un `catch` que no loguea el status convierte un fallo de cuota en un misterio: los tres endpoints estaban rotos y en producción no había ni una pista.

### El modelo `-lite` extrae bien y concluye mal (resuelto)
- **Síntoma:** el insight del mes decía "proyectas un gasto de 7,2M al mes, **muy por debajo de tus ingresos**" con 4M de ingresos, y con chip `tone: pos`. La proyección numérica era correcta; la conclusión, del revés.
- **Causa real:** `gemini-flash-lite-latest` no piensa antes de responder. Para extraer datos de una imagen o clasificar una palabra es perfecto (y es el primer eslabón de `api/_gemini.js` por eso), pero comparar proyección contra ingresos y decidir si es buena o mala señal necesita razonamiento.
- **Solución:** `generate({ reasoningFirst: true })` invierte la cadena para ese endpoint — `gemini-flash-latest` (2048 tokens, piensa) primero y `-lite` como red. En `insight.js` también subió el timeout a 15s: pensar tarda 4-9s. De paso, el prompt declara el límite de 16 caracteres del `chip.label`, que `parseInsight` recorta sin avisar (salían "Proy. $7,2M gast" y "Proyección: $7.2").
- **Regla:** elegir el eslabón por el trabajo, no por el precio. Extraer/clasificar → `-lite`. Concluir, comparar o proyectar → `reasoningFirst`. El check `insight: detecta el sobregasto proyectado` cubre justo este caso.

### El `100lvh` del root cortaba la interfaz por abajo en unos iPhone y en otros no (resuelto)
- **Síntoma:** en un iPhone 14 Pro Max la tab bar salía cortada por la mitad y el botón "Guardar" de Nueva transacción quedaba medio fuera de pantalla. En otros dispositivos, la misma versión se veía perfecta. Nada en el código de esas pantallas explicaba la diferencia.
- **Causa real:** `#root` estaba fijado a `height: 100lvh` (en `app/+html.tsx` **y** en `scripts/patch-html.js`, que es el que genera el HTML de producción). `lvh` es el viewport *large* — el alto con las barras retráctiles del navegador ocultas — y en iOS standalone resuelve a `screen.height`, que puede ser ~60pt MAYOR que el viewport visible (medido en un iPhone 17: `innerHeight` 820 vs `100lvh` 874). Como el root es `position: fixed` y la página no scrollea, esos ~60pt de interfaz quedaban **fuera de la pantalla, sin forma de alcanzarlos**. Cuánto se perdía dependía del modelo y de la versión de iOS: de ahí que unos lo vieran y otros no.
- **Por qué se puso `lvh`:** para tapar la franja del home indicator, que con `dvh` quedaba al descubierto. Eso ya no hace falta: `AppBackground` pinta el **degradado completo** en `--spendia-app-bg` sobre `html`/`body`, y el fondo del elemento raíz se propaga al canvas entero. La franja empata sola.
- **Solución (2026-08-15):** `#root` → `height: 100%` + `height: 100dvh` en los dos archivos. `dvh` sigue el viewport dinámico y nunca se pasa.
- **Regla:** el root JAMÁS mide la pantalla física. Cualquier unidad que pueda ser mayor que el viewport visible (`lvh`, `vh` en iOS, `screen.height`) esconde interfaz debajo del borde. Si hay que pintar hasta el borde físico, es trabajo del **canvas** (`background` en `html`), no de la caja que contiene la UI.

### Cada pantalla inventaba su propio hueco para la tab bar (resuelto)
- **Síntoma:** en Inicio el bloque "Gastos por categoría" quedaba debajo del FAB sin poder apartarse (el scroll ya estaba en su tope); en Ajustes y Presupuesto la última fila quedaba bajo la barra.
- **Causa real:** el `paddingBottom` del scroll estaba a ojo y distinto en cada pantalla — 40, 56, 110, 120 — cuando la barra ocupa 68 + separación, y el FAB 56 más. Los que se quedaban cortos tapaban contenido.
- **Solución:** `TAB_BAR_SPACE` (en `components/AppTabBar.tsx`) y `FAB_BOTTOM`/`FAB_SPACE` (en `components/FloatingActions.tsx`) son la única fuente; las seis pantallas de `(tabs)` las importan.
- **Ojo:** son constantes y **no** suman `insets.bottom` a propósito. El wrapper de la barra ya se separa del borde con ese inset y las pantallas lo aplican en su `<SafeAreaView>`: sumarlo otra vez deja un hueco muerto de 34pt.

### El botón "Guardar" gris no le decía a nadie qué faltaba (resuelto)
- **Síntoma:** un usuario reportó que no podía guardar y no entendía por qué. Le faltaba la descripción — pero "¿En qué lo usaste?" era solo un *placeholder*, no una etiqueta, y el aviso vivía al pie del formulario en `textTertiary` de 11px, lejos del campo.
- **Causa real:** tres reglas de formulario incumplidas a la vez (ver `ux-guidelines`): placeholder usado como etiqueta, error colocado lejos del campo que lo causa, y campos obligatorios sin marcar. Encima, el botón deshabilitado no tenía salida: pulsarlo no hacía nada.
- **Solución (2026-08-15):** `components/FormField.tsx` (`FieldLabel` con punto de obligatorio + `FieldError` con icono y `role=alert`), la lista `missing` como fuente única de lo que falta, y un botón que **nunca se deshabilita por datos incompletos**: se queda en su variante secundaria, dice qué falta ("Escribe en qué lo usaste" / "Faltan 2 datos") y al pulsarlo lleva al campo y lo enfoca. Aplicado a `add-transaction` y `edit-transaction`.
- **Los campos solo se marcan en rojo tras un intento de guardar** (`attempted`), nunca al abrir: regañar con el formulario vacío es hostil.
- **Contraste:** el texto del botón en espera usa `accentInk(colors,'primary',surfaceSecondary)` y los errores `readableTint(colors.error, background)`. Con los tokens crudos, modo claro daba 2.46:1 y 3.76:1 — ilegibles.
