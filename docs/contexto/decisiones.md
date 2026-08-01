# Decisiones

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

### La zona segura de iOS es neutra, no de marca — Vigente
- **Qué:** con `apple-mobile-web-app-status-bar-style: black-translucent`, la franja de la barra de estado (`body::before`, alto `env(safe-area-inset-top)`) se pinta blanca en modo claro y negra en oscuro. Lo escribe `AppBackground` en `--spendia-statusbar-bg`.
- **Por qué:** antes se teñía con `colors.primaryDark`, así que cada paleta metía una banda de color sobre el reloj del sistema. Neutro funciona igual en las 31 paletas y no compite con el contenido.
- **Ojo:** el CSS que llega a producción es el de `scripts/patch-html.js`, no el de `app/+html.tsx` (ese solo aplica a `expo start`). Todo cambio de `<head>` o de CSS global hay que hacerlo en LOS DOS.

### SEO: la ficha de búsqueda se arma en el post-build — Vigente
- **Qué:** `scripts/patch-html.js` escribe título y descripción con intención de búsqueda, canonical, `robots`, Open Graph completo, Twitter card y JSON-LD `SoftwareApplication`, y sustituye el `<noscript>` de Expo por una descripción real del producto. En `public/`: `robots.txt`, `sitemap.xml`, `og-image.png` (1200×630) e iconos 192/512 reales.
- **Por qué:** Expo escribía el título y la descripción de `app.json` (pensados para la ficha de la app) y ningún metadato social; el manifest declaraba 192/512 apuntando al PNG de 1024.
- **Descartado:** renderizado estático de `/privacy` y `/terms` (la app es SPA; el rewrite manda todo a `index.html`) y un landing pre-hidratación en el build — el `spendiaReady` que debía ocultarlo no lo emite nadie, así que solo habría añadido 6 s de pantalla de marca.
