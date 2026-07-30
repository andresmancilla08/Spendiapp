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
