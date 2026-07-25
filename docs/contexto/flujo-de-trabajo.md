# Flujo de Trabajo

## Antes de tocar código
- Leer `docs/contexto/` y memorias. Revisar si la lógica va en `functions/` o cliente.

## Implementar cambios
1. Editar. Todo texto con `t()`. Datos sensibles → secure-store.
2. UI: validar con el equipo visual.
3. `git commit` tras cada ajuste.

## Checklist "terminado"
- [ ] Sin strings hardcodeados. [ ] Validado web + iOS. [ ] Equipo visual firmó (si UI). [ ] Commit hecho.

## Deploy (solo con permiso)
1. WhatsNew (solo features visibles).
2. **Bump `package.json` Y `app.json` al mismo valor.**
3. `npm run deploy` (export + `vercel --prod`). Si tocas `firestore.rules`: `firebase deploy --only firestore:rules`.

## Deploy de Cloud Functions + backfill de publicProfiles (one-time)
Necesario tras el fix de "contactos no cargan" (ver errores-conocidos). Orden:
1. `firebase deploy --only functions` — publica el trigger `mirrorPublicProfile` y `backfillPublicProfiles`.
2. Ejecutar el backfill UNA vez (usuario admin, `isAdmin: true`), desde consola del cliente o script:
   ```js
   import { getFunctions, httpsCallable } from 'firebase/functions';
   await httpsCallable(getFunctions(), 'backfillPublicProfiles')();
   // → { written, total }
   ```
3. Verificar que la colección `publicProfiles` tiene un doc por usuario. A partir de aquí el trigger lo mantiene solo.
