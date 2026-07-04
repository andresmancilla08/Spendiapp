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

### Personalización: sync Firestore es last-write-wins
- **Síntoma:** prefs guardadas desde otro dispositivo pueden pisarse si se edita con datos locales viejos.
- **Causa real:** el useEffect de sync en personalization.tsx escribe el mapa completo (debounce 800ms); la hidratación local y la de Firestore corren en paralelo.
- **Solución (si duele):** sincronizar desde los handlers de interacción, no desde useEffect.
