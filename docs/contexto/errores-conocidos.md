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
- **Solución aplicada:** (1) trigger `mirrorPublicProfile` (onWrite `users/{uid}` → espeja a `publicProfiles`) = fuente de verdad permanente, ya no depende del login del amigo; (2) `backfillPublicProfiles` (onCall admin, one-time) para los existentes; (3) hook `useFriendProfiles` que carga en paralelo, es resiliente (placeholder si falta perfil, no descarta) y tiene red de seguridad de 8s. **Requiere desplegar functions y ejecutar el backfill una vez** (ver flujo-de-trabajo).

### Personalización: sync Firestore es last-write-wins POR TIMESTAMP (resuelto)
- **Síntoma histórico:** las prefs de gráfico/fondo "no se aplicaban" — cada recarga las revertía.
- **Causa real:** el debounce de 800ms se cancelaba al desmontar (últimos cambios nunca se escribían) y PaletteLoader aplicaba el doc remoto viejo encima de lo local fresco.
- **Solución aplicada (be63871):** cada escritura lleva `updatedAt` + flush al desmontar; el arranque solo aplica lo remoto si `remoteTs > localTs` (clave local `@spendiapp_personalization_synced_at`).
