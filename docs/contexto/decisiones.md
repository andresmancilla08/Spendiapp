# Decisiones

### Bump sincronizado package.json + app.json — Vigente (CRÍTICA)
- **Qué:** antes de `npm run deploy`, bump de `package.json` Y `app.json` al MISMO valor.
- **Por qué:** si no coinciden, el modal de novedades (WhatsNew) no aparece.

### Cloud Functions para lógica server — Vigente
- **Qué:** `functions/` para lógica que no debe vivir en cliente.
- **Descartado:** backend propio separado.

### Biometría + secure-store — Vigente
- **Por qué:** app financiera; proteger acceso y datos sensibles.

### Google Sign-In nativo — Bajo revisión
- **Qué:** bug de loading infinito en Google Sign-In nativo; fixes aplicados y pendientes en Firebase/GCloud. Ver memoria del proyecto.
