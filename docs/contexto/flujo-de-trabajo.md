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

## Backfill de publicProfiles (contactos)
⚠️ Proyecto en plan **Spark** → no se pueden desplegar Cloud Functions (Secret Manager 403). Por eso:
- **En Spark (situación actual):** correr el backfill con Admin SDK + ADC (no el onCall):
  ```bash
  node functions/scripts/backfillPublicProfiles.js   # requiere gcloud/firebase login
  ```
  La sincronización continua la cubre el cliente: `updateUserDisplayName` (edición de nombre) y `syncPublicProfile` (en cada login).
- **Si se activa Blaze:** `firebase deploy --only functions` publica el trigger `mirrorPublicProfile` (espejo automático en cada write de `users/{uid}`) y el onCall `backfillPublicProfiles`; a partir de ahí no hace falta el script ni el sync manual del cliente.
