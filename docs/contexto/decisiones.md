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
