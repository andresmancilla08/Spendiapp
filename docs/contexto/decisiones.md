# Decisiones

### El movimiento decorativo NUNCA se anima desde JS — Vigente (CRÍTICA, 2026-08-15)
- **Qué:** los fondos no se mueven (ver la decisión siguiente). Para el movimiento decorativo que SÍ queda —el pulso del skeleton, el punto "en vivo"— se usa `components/fx/FxLayer.tsx`: en web emite animación CSS (`animationKeyframes` de react-native-web), que ejecuta el compositor; en nativo, `Animated` con `useNativeDriver: true`. Prohibido `Animated.loop` con `useNativeDriver: false` para decoración.
- **Por qué:** medido sobre el bundle de producción, el patrón anterior generaba 1.440 escrituras del atributo `style` por segundo con la app EN REPOSO en la pantalla de login, y 19× más CPU que con reduce-motion. Era la causa principal de que la app calentara el teléfono.
- **Descartado:** subir todo a `useNativeDriver: true` sin más — en web ese driver no existe y solo produce un aviso; y `react-native-reanimated`, que habría añadido una dependencia grande para lo que resuelven unos keyframes.

### Los fondos están QUIETOS, y por eso conservan su desenfoque — Vigente (CRÍTICA, 2026-08-15)
- **Qué:** los 13 efectos mantienen su geometría, sus degradados y su `filter: blur()` originales. Lo único que se retiró es el movimiento: `hooks/useFrozenPhase.ts` congela el valor animado en un punto del ciclo en vez de recorrerlo.
- **Por qué:** lo caro nunca fue el desenfoque en sí, sino REHACERLO en cada frame porque debajo algo cambiaba. Con el efecto quieto, el blur se pinta una vez y el compositor reutiliza la capa. Medido: 0 mutaciones de estilo por segundo y 0 % de CPU en reposo, con las 13 capas de blur intactas.
- **Punto de congelado:** un tercio del ciclo (`FROZEN_AT = 0.3`), no el pico. Casi todos los efectos interpolan la opacidad valle → pico → valle: en el arranque quedarían apagados, y en el pico compiten con el texto de encima.
- **Descartado (y revertido):** sustituir el blur por degradados radiales. Se probó y ROMPIÓ las formas — cuadrados, anillos concéntricos y bandas con bordes rectos. Un degradado no reproduce un blur gaussiano: hicieron falta tres correcciones y aun así no era fiel. El diagnóstico era correcto; la solución se pasó de alcance.
- **Consecuencia:** el ajuste "Velocidad del fondo" ya no tiene efecto sobre el movimiento.

### El valor de una animación nunca pasa por el estado de React — Vigente (CRÍTICA, 2026-08-15)
- **Qué:** prohibido `animatedValue.addListener(({value}) => setState(value))`. Los valores viajan por `Animated` hasta la propiedad, o por keyframes. Para atributos SVG, `Animated.createAnimatedComponent(Path)`.
- **Por qué:** `BalanceCard` lo hacía en tres bucles infinitos: re-renderizaba el gráfico entero —muestreo de curva y SVG incluidos— 60 veces por segundo mientras el Home estuviera abierto. Era el mayor foco de calor de la pantalla.
- **Excepción legítima:** un contador numérico que se muestra como texto (el balance del Home) necesita el estado, y es transitorio, no un bucle.

### El movimiento se pausa fuera de foco — Vigente (2026-08-15)
- **Qué:** `hooks/useIsActive.ts` (store de módulo con `useSyncExternalStore`, un solo par de listeners para toda la app) apaga los efectos con la app en segundo plano.
- **Por qué:** en web el navegador congela `requestAnimationFrame` y tapaba el problema. En iOS y Android no hay ese salvavidas: sin esto, el fondo drenaría batería con la app minimizada.

### Ahorro de batería es preferencia LOCAL — Vigente (2026-08-15)
- **Qué:** `batterySaver` en ThemeContext se guarda en AsyncStorage y NO se sincroniza a Firestore, a diferencia del resto de Personalización.
- **Por qué:** depende del teléfono en el que estés, no de la cuenta.

### El bundle web sigue siendo único — En revisión (2026-08-15)
- **Qué:** 8,5 MB en un solo archivo (~2,7 s de CPU al arrancar con throttle 4×). `web.output: "static"` lo dividiría por rutas.
- **Por qué no se ha hecho:** `vercel.json` reescribe todo a `/index.html` (arquitectura SPA) y `scripts/patch-html.js` solo parchea ese fichero. Es un cambio de despliegue, no un ajuste.

### Bump sincronizado package.json + app.json — Vigente (CRÍTICA)
- **Qué:** antes de `npm run deploy`, bump de `package.json` Y `app.json` al MISMO valor.
- **Por qué:** si no coinciden, el modal de novedades (WhatsNew) no aparece.

### Cloud Functions para lógica server — Vigente
- **Qué:** `functions/` para lógica que no debe vivir en cliente.
- **Descartado:** backend propio separado.

### publicProfiles sincronizado por trigger (no por login) — Vigente
- **Qué:** `publicProfiles/{uid}` (userName/displayName/photoURL — único perfil legible por otros) se mantiene con el trigger `mirrorPublicProfile` (onWrite `users/{uid}`). Es la fuente de verdad server-side. `backfillPublicProfiles` (onCall admin) rellena los existentes una sola vez.
- **Por qué:** poblarlo solo en el login de cada usuario dejaba a los contactos que no volvían a entrar sin doc → invisibles en toda la app (ver errores-conocidos). El cliente no puede rellenarlo por otro usuario (reglas). 
- **Descartado:** backfill 100% en cliente (imposible por reglas); denormalizar el perfil dentro del doc `friendship` (más invasivo y no cubre amistades existentes).

### Biometría + secure-store — Vigente
- **Por qué:** app financiera; proteger acceso y datos sensibles.

### Google Sign-In nativo — Bajo revisión
- **Qué:** bug de loading infinito en Google Sign-In nativo; fixes aplicados y pendientes en Firebase/GCloud. Ver memoria del proyecto.

### Fondo animado global persistente (AppBackground) — Vigente (INVARIANTE)
- **Qué:** el fondo (gradiente + efecto animado) vive UNA vez en `app/_layout.tsx` (`components/AppBackground.tsx`), detrás del Stack; las pantallas del Stack usan `contentStyle: transparent` y `ScreenBackground` es solo wrapper responsive + StatusBar (salvo login, que fuerza fondo local vía `auroraIntensity`).
- **Por qué:** montar el fondo por pantalla reiniciaba todas las animaciones al navegar (parpadeo/intermitencia). Además el scrim dark (`DARK_SCRIM`, rgba(0,0,0,0.7)) va DEBAJO de los efectos — encima los aplastaba y en dark no se veían.
- **INVARIANTE:** si algún día se agrega `presentation: 'modal'` o animaciones de transición al Stack, la pantalla anterior se verá a través del contenido transparente — habrá que dar fondo opaco a esa pantalla puntual.
- **Descartado:** fondo por pantalla (intermitencia), efectos encima del contenido (ensucian texto).

### El dueño de un gasto compartido puede actualizar los mirrors — Vigente
- **Qué:** `firestore.rules` permite `update` sobre `transactions` al dueño del compartido (`isShared && sharedOwnerUid == auth.uid`), con `userId` y `sharedOwnerUid` inmutables.
- **Por qué:** editar un gasto compartido propaga a la copia de cada participante en un solo batch; sin esta regla el batch entero se denegaba. No amplía el privilegio real: el dueño ya podía crear y borrar esos mirrors.
- **Descartado:** Cloud Function con Admin SDK para la propagación (más latencia y coste para una operación que las reglas ya pueden acotar); limitar los campos editables en la regla (se puede endurecer si algún día el owner deja de ser de confianza).

### `npm run typecheck` obligatorio antes de deploy — Vigente
- **Qué:** `node --stack-size=10000 ./node_modules/typescript/lib/tsc.js --noEmit`.
- **Por qué:** `tsc --noEmit` a secas crashea (stack overflow) en este repo, así que nadie tipaba; eso dejó pasar a producción dos `ReferenceError` por identificadores sin importar (`localeFor`, `deleteDoc`).

### Categoría "segura" al escribir en la cuenta de otro usuario — Vigente
- **Qué:** todo doc que se crea para OTRO usuario (mirror de gasto compartido, ingreso recibido) pasa la categoría por `utils/sharedCategory.categoryForOtherUser(id, type)`: si no es una de `DEFAULT_CATEGORIES`, o es por defecto pero del tipo equivocado (`food` en un ingreso), se escribe `other`. El dueño conserva su categoría original.
- **Por qué:** las categorías personalizadas son docs privados en `categories` y las reglas solo permiten leer las propias → un id ajeno no resuelve a nada en la app del amigo y se pintaba como texto crudo. No se puede validar contra las categorías del amigo desde el cliente (ni se debe: es su dato privado), así que el criterio es "solo se propaga lo que existe para todos".
- **Descartado:** copiar también el nombre/emoji de la categoría al mirror (duplica datos que luego se desincronizan y mete una categoría fantasma en la cuenta del amigo); crear la categoría en la cuenta del amigo (invasivo, y las reglas lo prohíben).

### Card de transacción en 3 zonas + relación social centralizada — Vigente
- **Qué:** el card del home y del historial se reordenó en fila principal + franja inferior (`TxRelationTier`). La relación social (gasto compartido, cobro, ingreso enviado/recibido) sale de la columna derecha y vive en la franja, a ancho completo; el ícono de categoría lleva un notch con las iniciales del amigo (`TxRelationNotch`); en gastos compartidos el importe grande es TU parte y el total va como línea secundaria ("de $600.000"). Todo se resuelve en `components/TxRelation.tsx`; se borró `components/SharedExpenseChip.tsx`.
- **Por qué:** con el chip en la columna derecha esa columna necesitaba `flex: 1` y competía con la meta → el chip invadía la línea del chip de tarjeta y el nombre del amigo se truncaba a "Compartido con Be…". En la franja el chip tiene todo el ancho: ningún nombre se corta, ni con textos de i18n el doble de largos.
- **Descartado:** dejar el chip arriba con `maxWidth` mayor (sigue robando ancho al importe); meter también el chip de tarjeta en la franja (una franja con solo la tarjeta queda huérfana; se verificó en render); partir el label del chip para poner el nombre en negrita (el nombre no siempre va al final: `sharedWithMore`/`owesYouMore` lo llevan en medio → habría que parsear el string traducido); barra de proporción tu-parte/total en la fila (ruido inconsistente: solo la tendrían algunas filas).

### `effectiveAmount` como única fuente del importe propio — Vigente
- **Qué:** `utils/sharedCalc.effectiveAmount(tx)` devuelve lo que la transacción vale PARA EL DUEÑO DEL DOC: `sharedAmount` en gastos compartidos sin cuotas, `amount` en todo lo demás (incluidas cuotas, donde `amount` ya es la cuota amortizada del participante). Lo usan la fila del home y del historial, el detalle, el balance del mes (`useTransactions`), la tendencia (`useMonthlyTrend`), el presupuesto, el desglose por categoría y los reportes anuales.
- **Por qué:** la fila mostraba tu parte mientras `useTransactions` sumaba `amount` — el total del grupo — así que el balance del mes no cuadraba con la suma de las filas. `useReportGenerator` ya tenía este helper inline (sin la excepción de cuotas): se unificó y se le añadió esa excepción.
- **Semántica que esto fija:** el balance cuenta lo que te CORRESPONDE, no lo que desembolsaste. El dueño que paga $600.000 de un gasto al 33% ve $200.000 en su balance; los $400.000 por cobrar viven en el reporte por amigo (`friend-report`, cálculo propio por porcentajes, deliberadamente fuera de este helper).
- **Descartado:** que el balance sume el total del grupo (contradice la fila y los reportes, que ya contaban tu parte); calcular la parte al leer de Firestore y sobrescribir `amount` (rompe editar/duplicar, que necesitan el total real).

### El Home saluda una vez y luego cede el sitio — Vigente
- **Qué:** la franja superior del Home es `components/HomeHeader.tsx`: avatar a la izquierda con un anillo que lleva el % gastado, nombre y una línea de contexto ("89% gastado · quedan 12 días"). Al hacer scroll se contrae en una barra compacta con el mismo anillo, el nombre y el mes. Desaparecieron el kicker de hora (`home.kickerMorning` y sus variantes, junto con `home.greetingMorning`… — claves borradas de los 3 locales) y el bloque de subtítulo + pill que abría el ScrollView: su contenido es ahora la línea de contexto del header.
- **Por qué:** el kicker cambiaba por reloj, no por dato — decoración que costaba una línea entera. El pill repetía en color lo que la frase ya decía en texto. Y el % pasa al anillo del avatar para que sobreviva al colapso sin repetirse como número: la señal viaja con la foto.
- **Detalles que no son negociables:** el colapso usa `opacity`/`transform` (RN no anima `height` en el hilo nativo) y con reduce-motion no se colapsa — se queda expandido, sin perder información; la campana se renderiza una sola vez fuera de las dos capas (duplicarla monta dos suscripciones de no leídas); el color de la línea de contexto se mide con `utils/contrast.readableOn` porque el ámbar/rojo del pill no llega a 4.5:1 como texto sobre fondo claro; si no hay `pillVisible` (sin ingresos y gastos a la vez) no hay anillo y la línea cae a la frase de siempre.
- **Descartado:** 6 variantes que solo movían el pill de sitio (rechazadas por tímidas); el saludo grande permanente (se abre decenas de veces al día); el header que muestra avatares de amigos o el saldo social (buena idea, pero cambia el foco del Home y se guardó para más adelante); animar la coreografía de entrada en cada foco de la tab.

### Detalle de transacción: un módulo por hecho, no una lista de campos — Vigente
- **Qué:** `app/transaction-detail.tsx` se rediseñó por completo. La pantalla es una **ficha héroe** (kicker + cifra 40px + línea de contexto + pie de tres cifras + **barra de progreso de 3px pegada al borde inferior**) con un **sello rotado** que marca el estado (cuota, fijo, mes cerrado, entre N, te deben, le debes, recibido, enviado, de X), y debajo módulos que solo existen si su dato existe: teselas (fecha, categoría, repite / creado por), **tarjeta** (logo real vía `BankLogo` + gastado en esa tarjeta este mes + día de corte + nº de movimientos), **plan de cuotas** e **historial del fijo** en chips de mes, **personas** (avatares + pill de reparto), **contexto**, **la categoría en el mes** con barra, **otros movimientos** de la categoría o de la persona (cada fila abre su detalle) y **nota**.
- **Por qué:** la versión anterior era una lista `label/valor` donde la fecha pesaba lo mismo que un reparto entre tres personas, con dos tercios de pantalla vacíos en un gasto simple y cuatro fallos de contraste medidos en modo claro. El dato existía en el modelo y la vista no lo usaba: cuánto resta de una compra a cuotas, cuánto llevas en la categoría, el día de corte de la tarjeta.
- **Regla de composición:** un módulo por hecho. Sin cuotas no hay sello, ni pie de cifras, ni barra; sin tarjeta las teselas se reparten el ancho; sin gente no hay ficha de reparto. Nunca se muestra un porcentaje mientras el mes carga (antes se afirmaba «0% del mes» y «es tu único movimiento»).
- **Descartado, y por qué:** el tiquete perforado con leader dots (inconfundible, pero se alejaba del resto de la app y dejaba 110px muertos); la línea de tiempo vertical con nodos (exigía datos que no existen); el anillo de progreso de cuotas (probado y rechazado: pesaba más que la cifra); la mini-tarjeta de plástico con degradado — era una **tarjeta falsa**, cuando la app ya tiene 17 logos reales en `assets/banks/` y el color de marca de cada banco en `config/banks.ts`; DM Mono para las cifras (está cargada en `_layout` pero **no se usa en ningún componente**: la app es Montserrat, y las cifras alinean igual con `fontVariant: ['tabular-nums']`).
- **Lo que NO se tocó:** toda la lógica de borrado por alcance (fijos, cuotas, compartidos, mirrors) y de edición/duplicado quedó intacta; solo cambió su presentación (el selector de alcance y la confirmación pasan de 12px y botones de 8px a ancho completo con radios de 20px y botones de 52px).

### Tintas medidas en vez de hex por paleta (`utils/detailInk`) — Vigente
- **Qué:** el detalle no fija colores de texto: los deriva. `inkOn(bg, base)` conserva el tono y lo oscurece o aclara por escalones hasta pasar 4.5:1; `inkOnFill` elige la tinta de un botón con fondo de marca; `blend` compone los tintes translúcidos a color SÓLIDO para poder medirlos; `amountInk` acepta 3:1 solo si la escalera no alcanza.
- **Por qué:** con hex fijos el rediseño se leía en `deepWater` oscuro y se rompía en el resto. Medido: `expense` sobre superficie clara 2,78:1, blanco sobre el cian de marca 2,30:1, la lima de la nota 1,70:1, y en las paletas pastel la barra de progreso quedaba en 1,04:1 sobre su carril (invisible). Son 32 paletas × 2 modos: mantener excepciones a mano no es viable.
- **Verificación:** `npx tsx utils/detailInk.test.ts` recorre las 32 paletas en ambos modos y mide 1088 pares texto/fondo. Es un gate: si una tinta baja del mínimo, falla.
- **Pendiente de decisión del usuario:** `onPrimary` es `#FFFFFF` en toda la app y sobre el cian de marca da 2,30:1 (dark) y 2,74:1 (light) — afecta a cualquier botón primario y al **FAB del home**, que como ícono tampoco llega a 3:1. En el detalle ya se corrige localmente con `inkOnFill`; llevarlo a la paleta global es un cambio visible de marca y no se aplicó sin luz verde.

### `accentInk`: el color de marca solo se usa como texto si se lee — Vigente
- **Qué:** `utils/contrast.accentInk(colors, tone, bg)` devuelve el token de la paleta (`primary`, `tertiary`, `success`, `warning`…) cuando alcanza 4.5:1 sobre el fondo indicado; si no, baja a la variante `*Dark` del mismo tono y, en último término, a `textSecondary`. Se usa para TEXTO e iconos pequeños. Fondos, barras, gráficos y cifras héroe siguen con el token crudo.
- **Por qué:** medido sobre las 31 paletas (`config/palettes.ts`), en modo claro `tertiary` falla en 31/31 y `primary` en 27/31 al usarse como texto sobre `surface` — las pastel bajan a 1.1:1. En oscuro no hay problema (mínimo 5.52:1). Mantener excepciones por paleta no es viable.
- **Token añadido:** `warningDark` (`#B45309` claro / `#F59E0B` oscuro) para que el dorado de Premium siga siendo dorado y legible en vez de caer a gris.
- **Relación con `detailInk`:** `utils/detailInk` es el mismo principio aplicado al detalle de movimiento (escalera de oscurecimiento conservando el tono). `accentInk` es la versión simple para el resto de la app: elige entre tokens que ya existen, no genera colores nuevos.
- **Estado de la migración:** aplicado en home, historial, perfil, tarjetas, herramientas, presupuesto e InsightBanner. La lista de puntos pendientes está en `docs/auditoria-visual-2026-08-01.md`.

### La zona segura de iOS la pinta el fondo de la app — Vigente (2026-08-04)
- **Qué:** no hay banda. Se eliminó el `body::before` de alto `env(safe-area-inset-top)` y la variable `--spendia-statusbar-bg`: con `apple-mobile-web-app-status-bar-style: black-translucent` la webview ya se extiende bajo la barra de estado, así que el gradiente **y el efecto animado** de `AppBackground` la cubren igual que el resto de la pantalla. El `theme-color` (chrome de Android) y el canvas `html/body` (`--spendia-app-bg`) toman el color real del borde superior del fondo: `topBackgroundColor(gradientColors[0], isDark)` en `AppBackground`, que aplica al primer stop del gradiente la mezcla con `DARK_SCRIM` (×0.3) cuando el modo oscuro lo superpone.
- **Por qué:** la banda neutra (blanca en claro, negra en oscuro) cortaba la pantalla en seco justo encima del header — abajo el fondo llega al borde y arriba no. El color, además, ya no compite con nada: es exactamente el que tiene la app debajo.
- **Descartado:** teñir la banda con `colors.primaryDark` (versión de 2026-07-29: metía una banda de marca sobre el reloj) y mantenerla neutra (versión intermedia).
- **Arranque sin parpadeo:** `AppBackground` cachea el color en `localStorage['@spendia_chrome']`; el script del `<head>` lo lee antes de que React monte y solo cae al neutro por modo en el primer arranque, cuando aún no conoce la paleta.
- **Contrapartida conocida:** el color del reloj lo decide iOS y no se puede fijar por CSS. Coincide con el modo del **sistema**, no con el de la app: forzar tema oscuro en Spendia con el iPhone en claro (o al revés) puede dejarlo con poco contraste sobre la zona segura.
- **Ojo:** el único `<head>` que existe es el de `scripts/patch-html.js`. `app/+html.tsx` está muerto (necesita `web.output: "static"`, que no está declarado) — se sigue editando en paralelo por si algún día se activa, pero nada de lo que hay ahí llega al navegador, ni en dev. Ver `errores-conocidos.md`.

### SEO: la ficha de búsqueda se arma en el post-build — Vigente
- **Qué:** `scripts/patch-html.js` escribe título y descripción con intención de búsqueda, canonical, `robots`, Open Graph completo, Twitter card y JSON-LD `SoftwareApplication`, y sustituye el `<noscript>` de Expo por una descripción real del producto. En `public/`: `robots.txt`, `sitemap.xml`, `og-image.png` (1200×630) e iconos 192/512 reales.
- **Por qué:** Expo escribía el título y la descripción de `app.json` (pensados para la ficha de la app) y ningún metadato social; el manifest declaraba 192/512 apuntando al PNG de 1024.
- **Descartado:** renderizado estático de `/privacy` y `/terms` (la app es SPA; el rewrite manda todo a `index.html`) y un landing pre-hidratación en el build — el `spendiaReady` que debía ocultarlo no lo emite nadie, así que solo habría añadido 6 s de pantalla de marca.

### Las categorías usan un catálogo de iconos, no emoji — Vigente
- **Qué:** `Category.icon` guarda la clave de un catálogo curado de 180 iconos Tabler (`constants/categoryIconData.ts` = datos; `constants/categoryIcons.ts` = componentes). Al escribir el nombre de la categoría, `utils/suggestIcon` elige icono: primero la tabla de palabras (175 grupos, español latinoamericano y marcas locales), luego Gemini **restringido al catálogo** vía `api/suggest-icon.js` (su respuesta se valida; si no está, se descarta) y, si nada encaja, `FALLBACK_ICON` = el icono de "Otro". El usuario puede cambiarlo en `components/IconPicker` (buscador + 12 familias).
- **Por qué:** el emoji lo pintaba el sistema operativo — tamaño, peso y color fuera de control, imposible teñirlo con la paleta y con aspecto distinto en cada plataforma. Además la regla del proyecto es que todo icono de UI sea Tabler.
- **Migración:** `hooks/useCategories` traduce en un batch los emoji guardados (`EMOJI_TO_ICON`, 250 entradas) la primera vez que llegan las categorías de la sesión; lo no mapeado cae a "Otro". `components/CategoryIcon` sigue pintando cualquier emoji que llegue (mirror de otro usuario, doc sin migrar).
- **Por qué el catálogo está partido en dos archivos:** los componentes de Tabler arrastran react-native, y el sugeridor y su test corren en Node (`npx tsx utils/suggestIcon.test.ts`). Los datos van aparte para que el gate se pueda ejecutar.
- **Descartado:** los ~6.200 iconos de Tabler (picker inservible y varios MB de bundle) y dejar que la IA devolviera texto libre (inventaba nombres que no existen).
- **Ojo con las palabras cortas:** las keywords de ≤3 letras ('d1', 'ara', 'gym') se buscan como palabra completa; como subcadena, "ahorro pARA el viaje" se convertía en supermercado.

### Reporte con amigos: "Cara a cara" y tres formatos de documento — Vigente
- **Qué:** la pantalla trata la relación como sujeto —dos identidades con color propio, una balanza que se inclina hacia quien debe, el saldo como tipografía dominante y los movimientos a cada lado de un eje—. Al compartir se abre directamente la previsualización, donde se cambia de pieza sobre la pieza real: `chat` 1080×1080 (sobrevive a la miniatura de WhatsApp), `story` 1080×1920 y `sheet` de alto variable con el detalle, paginada.
- **Por qué tres piezas:** el mismo mes no se cuenta igual en la miniatura de un chat que en una story o en una hoja que alguien va a revisar. Coste asumido: son tres composiciones distintas que dibujar en Canvas 2D, no tres recortes de una.
- **`utils/friendReportModel.ts` es la pieza clave:** pantalla y generador leen el MISMO modelo. Antes cada uno repetía el reparto por porcentajes y podían contradecirse. Gate: `npx tsx utils/friendReportModel.test.ts`.
- **Cuotas (dinero, ojo):** en un compartido a cuotas, `useSharedTransactions` guarda en cada documento la cuota YA amortizada sobre el porcentaje de ese participante — no el total del grupo. Para saber lo que debe la otra persona hay que reescalar por MI porcentaje (`amount * suPct / miPct`), no aplicar el suyo sobre mi cuota: en un 50/50 eso daba la mitad de la mitad. Cubierto en el test.
- **Instagram:** no permite publicar en historias desde la web. El formato story se genera y se comparte por la hoja del sistema o se guarda; la interfaz lo dice en vez de prometer un botón que no existe.
- **Descartado:** las otras cuatro direcciones de previsualización (hoja inferior, documento en línea, interruptores, pantalla de envío) están documentadas con mockups en `docs/reporte-amigos-cara-a-cara.html`.

### El color de los dos lados sale de la paleta del usuario — Vigente
- **Qué:** `utils/friendReportColors` es la única fuente de color del reporte, para la pantalla y para el documento. `primary` es el lado propio; el ajeno es `tertiary` o, si en esa paleta se parece demasiado, el primer token que se distinga (`secondary`, `success`, `info`…). `readableTint` acerca cada tono al blanco o al negro solo hasta pasar el ratio (4,5:1 texto, 3:1 rellenos) sobre su fondo, sin convertirlo en gris. El documento se genera con `reportPalette(activePalette.colors.dark)`: siempre oscuro, porque se lee en un chat ajeno, pero con SU color.
- **Por qué:** estaban quemados el cian y el lima de Deep Water para las 32 paletas — el usuario elegía tema y su reporte seguía siendo de otro. Y no basta con leer el token crudo: en claro `tertiary` falla en 31/31 paletas como texto.
- **Por qué no `accentInk`:** su último recurso es `textSecondary`, un gris. Con dos identidades enfrentadas, dos grises legibles se leen como el mismo lado. `readableTint` conserva el tono, que es lo que porta el significado.
- **Verificación:** `npx tsx utils/reportPalette.test.ts` — 32 paletas × claro/oscuro + documento; mide contraste de cada lado, de las tintas sobre los avatares y la DISTANCIA de color entre los dos lados (el contraste no vale para eso: dos tonos opuestos con la misma luminancia dan 1,05:1 y se distinguen perfectamente).
- **Descartado:** una tabla de pares de color por paleta (32 × 2 modos escritos a mano) y girar el matiz para inventar el color ajeno (salía de la paleta).

### Compartir el reporte: sin hoja de formato previa — Vigente
- **Qué:** el botón "Compartir" abre la previsualización y genera la pieza; el formato se cambia en el segmento que la propia vista ya tiene arriba. "Compartir" invoca la hoja nativa (`navigator.share` con los `File` ya en memoria) y el botón de descarga guarda el archivo directamente.
- **Por qué:** la hoja "¿Para dónde va?" preguntaba lo mismo que la vista siguiente. Un paso menos y ninguna decisión perdida.
- **Ojo (ver errores conocidos):** entre el toque y `navigator.share` no puede haber `await`, y la descarga necesita un blob `application/octet-stream`.

### Metas: la lista informa, la hoja actúa — Vigente
- **Qué:** la tarjeta de una meta solo muestra estado (nombre, `62% · faltan X`, lo ahorrado, barra) y un chevron. Tocarla abre `components/GoalSheet`, que es el único sitio donde se actúa: aportar (input + tres atajos calculados sobre lo que falta, el último **completa la meta al céntimo**), editar (lápiz), eliminar (papelera) y, si ya está cumplida, reabrir. Editar reutiliza el diálogo de crear con otro título y otro CTA; eliminar sigue con `AppDialog` + toast.
- **Por qué:** eliminar existía SOLO como `onLongPress` sobre la tarjeta —invisible, imposible de descubrir con lector de pantalla y, en la PWA de iOS, interceptado por Safari— y editar no existía en ninguna parte. Tres acciones no caben en una tarjeta de 68 px sin sacrificar las cifras.
- **Descartado:** los dos botones ícono en la fila al estilo `cards.tsx` (ocupan justo el sitio de las cifras: una tarjeta de dinero se quedaba sin el dinero), un CTA "Aportar" repetido en cada fila (ruido en una lista de seis metas) y el aporte desplegable dentro de la lista (rompe el ritmo y deja editar/eliminar igual de escondidos). Swipe-to-delete descartado por regla: nada de gestos horizontales en el contenido principal.
- **Área táctil:** los botones ícono son 44×44 reales con la pastilla de 36 dentro. El patrón de `cards.tsx` (34×34 sin `hitSlop`) se queda corto para WCAG/HIG.
- **Verificación:** `npx tsx utils/goalsContrast.test.ts` mide 832 pares en las 32 paletas × claro/oscuro, **incluido el estado activo del chip**, y exige que las tintas de señal NO caigan a gris.
- **`updateGoal` recalcula el estado:** bajar el objetivo por debajo de lo ahorrado completa la meta; subirlo por encima la reactiva y borra `completedAt`. Vive en el hook para que el documento nunca tenga un `status` que contradiga sus cifras.


### El fondo animado va DESENFOCADO por defecto — Vigente
- **Qué:** el efecto de fondo (no el degradado, que es el que aporta el color) se pinta a través de un contenedor con `filter: blur()` — helper `backgroundBlurStyle` en `components/AppBackground.tsx`. Cuatro niveles (`none`/`soft`/`medium`/`strong` = 0/6/14/26 px) **por modo**: claro y oscuro se ajustan por separado, como el propio efecto. Por defecto `medium`. Se elige en Personalización → Fondo, y viaja en la cuenta (`personalization.backgroundBlur{Light,Dark}`).
- **Por qué:** los efectos de trazo fino y alto contraste (orbs, constellation, topography, spotlight) cruzaban las tarjetas y el texto: círculos y líneas nítidas por encima de las cifras. Desenfocado, el fondo aporta atmósfera y deja de competir. Se elige por modo porque el mismo efecto necesita más desenfoque sobre un fondo claro que sobre uno oscuro.
- **Descartado:** bajar la opacidad del efecto (mata el color, no la nitidez del trazo); `BlurView` de `expo-blur` sobre el fondo (desenfoca por `backdrop-filter` todo lo que hay detrás y añade su propio tinte, imposible de igualar entre las 40 paletas); un único nivel global (el usuario quiere claro y oscuro independientes).
- **El contenedor se sobredimensiona** con `inset` negativo de `2 × px`: un blur deja translúcido el borde del propio elemento y sin ese sangrado se veía una orla clara en los cuatro lados. Todos los contenedores que lo usan tienen `overflow: hidden`.
- **Coste:** un `filter` a pantalla completa sobre una animación continua obliga al compositor a recomponer cada frame. Si algún dispositivo va justo, el usuario tiene `none` a un toque.

### Ningún ícono de la UI es un emoji — Vigente
- **Qué:** todo ícono de interfaz sale de `AppIcon` (Tabler). Los emojis solo sobreviven donde son **dato del usuario**: el emoji que elige para una meta, un grupo de gastos o una categoría creada a mano (`EmojiPicker`, `CategoryIcon`).
- **Por qué:** el emoji cambia de forma en cada sistema, no respeta el grosor de trazo elegido en Personalización ni el color del tema, y no escala con el resto de la iconografía. Además, un `<Text>` que espera un emoji imprime el literal si le llega un nombre de ícono — así apareció "tools-kitchen" escrito en el Home.

### Familia neón: ocho paletas generadas por matiz, no elegidas a ojo — Vigente
- **Qué:** `cyberpunk`, `electricViolet`, `acidLime`, `solarFlare`, `hotMagenta`, `electricBlue`, `tangerine` e `infrared` (48 paletas en total). Se generan con `scripts/genNeonPalettes.ts`: se declara el matiz de primary/secondary/tertiary y el script deriva los ~40 tokens ajustando la luminosidad **por contraste medido**, no a ojo.
- **Por qué:** el catálogo estaba escorado. Medido sobre el matiz del `primary` en oscuro: 16 de 40 paletas eran cian o verde, no había **ninguna** amarilla y el único azul era `slate`, apagado. El usuario lo describió como "veo mucho verde y azul".
- **En oscuro el neón es el `primary`**; en claro el mismo matiz se oscurece hasta 4,8:1 sobre blanco. Un amarillo o un lima legibles sobre blanco son necesariamente oscuros, y oscurecerlos en su propio matiz da **mostaza y oliva sucios**: por eso `solarFlare`, `acidLime` y `tangerine` declaran `hLight` y desplazan el matiz unos grados solo en claro (45→34, 78→98, 22→14). El modo claro de esas tres es cálido/intenso, no neón — y eso es deliberado.
- **Descartado:** dejar el `primary` claro y vibrante en modo claro con tinta oscura encima. Los botones quedarían espectaculares, pero cualquier sitio que use `colors.primary` como texto sobre blanco (hay muchos) bajaría a ~2:1. La accesibilidad manda sobre el efecto.
- **Verificación:** `npx tsx utils/reportPalette.test.ts`, `utils/goalsContrast.test.ts` (1248 pares) y `utils/detailInk.test.ts` (1632 pares) pasan con las 48. Y la hoja de contactos `docs/paletas-neon.html` para mirar los píxeles en ambos modos.

### Toda llamada a Gemini pasa por `/api` — Vigente (INVARIANTE)
- **Qué:** los cinco usos de IA (`ocr`, `categorize`, `insight`, `suggest-icon`) viven en funciones de Vercel y comparten `api/_gemini.js`. El cliente nunca ve la key: solo existe `GEMINI_API_KEY` (server), no `EXPO_PUBLIC_GEMINI_API_KEY`.
- **Por qué:** la sugerencia de icono llamaba a Gemini desde el cliente con `EXPO_PUBLIC_GEMINI_API_KEY`. Esa env no estaba en Vercel, así que **la IA de iconos nunca corrió en producción** (siempre caía al fallback) y definirla habría publicado la key en el bundle web, donde cualquiera puede leerla.
- **Cómo queda el catálogo:** `api/suggest-icon.js` no guarda copia de los 180 iconos: los recibe en el body (`constants/categoryIconData.ts` sigue siendo la única fuente de verdad), filtra las claves por forma `^[a-z0-9-]{2,40}$` y valida la respuesta contra la lista recibida; el cliente revalida con `isCategoryIcon`.
- **INVARIANTE:** ninguna llamada a `generativelanguage.googleapis.com` desde código de cliente. Si hace falta un uso nuevo de IA, se añade un endpoint en `/api` con `generate()`.
- **Descartado:** duplicar el catálogo en el server (se desincroniza a la primera categoría nueva) y pasar la key al cliente vía env pública.
