# Errores Conocidos

### Modal de novedades no aparece
- **Síntoma:** tras deploy no sale WhatsNew. **Causa:** `package.json` y `app.json` con versiones distintas. **Solución:** bump ambos al mismo valor antes de `npm run deploy`.

### Google Sign-In: loading infinito (nativo)
- **Síntoma:** queda cargando al iniciar sesión con Google en nativo. **Causa:** config Firebase/GCloud (SHA, client IDs). **Solución:** fixes aplicados + pendientes; ver memoria `project_spendia_google_auth`.

### Datos sensibles
- **A propósito:** se guardan en secure-store, no en AsyncStorage plano.

### Personalización: 10 previews animados simultáneos
- **Síntoma:** posible jank al abrir la sección "Fondo animado" en dispositivos modestos (10 efectos en vivo + fondo global, todos `useNativeDriver:false`).
- **Causa real:** los previews renderizan el efecto REAL (fidelidad > coste); decisión consciente.
- **Solución (si duele):** renderizar estático todo salvo la tarjeta seleccionada/visible.

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
- **Solución (2026-07-29):** `black-translucent` en `+html.tsx` **y** en `scripts/patch-html.js` → la webview se extiende bajo la barra y la pinta `AppBackground` (con `viewport-fit=cover`, ya presente, y las `SafeAreaView` de cada pantalla desplazando el contenido). Contrapartida: la hora va **siempre en blanco**, así que en modo claro (todos los `gradientLight` arrancan en `#FFFFFF`) la banda se tiñe con `colors.primaryDark` vía `body::before` + la variable CSS `--spendia-statusbar-bg` que escribe `AppBackground`.
- **OJO al probar:** iOS cachea el `<head>` de la app instalada. Tras el deploy hay que **cerrar la app del todo** (swipe) y reabrir; si no cambia, **borrarla de la pantalla de inicio y volver a instalarla**.
- **Invariante:** toda pantalla nueva debe usar `SafeAreaView` (o `insets.top`) en la raíz. Sin eso su contenido queda **debajo de la hora**. Auditado 2026-07-29: solo `app/index.tsx` no lo usa, y es un placeholder vacío.
- **Nota:** `+html.tsx` NO se emite en el export estático (solo aplica en `expo start --web`); lo que se publica lo inyecta `scripts/patch-html.js`. Cualquier tag de `<head>` hay que tocarlo en **los dos** archivos.
