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

### Personalización: sync Firestore es last-write-wins POR TIMESTAMP (resuelto)
- **Síntoma histórico:** las prefs de gráfico/fondo "no se aplicaban" — cada recarga las revertía.
- **Causa real:** el debounce de 800ms se cancelaba al desmontar (últimos cambios nunca se escribían) y PaletteLoader aplicaba el doc remoto viejo encima de lo local fresco.
- **Solución aplicada (be63871):** cada escritura lleva `updatedAt` + flush al desmontar; el arranque solo aplica lo remoto si `remoteTs > localTs` (clave local `@spendiapp_personalization_synced_at`).
