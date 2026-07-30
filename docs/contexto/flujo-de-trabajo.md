# Flujo de Trabajo

## Antes de tocar código
- Leer `docs/contexto/` y memorias. Revisar si la lógica va en `functions/` o cliente.

## Implementar cambios
1. Editar. Todo texto con `t()`. Datos sensibles → secure-store.
2. UI: validar con el equipo visual.
3. `git commit` tras cada ajuste.

## Checklist "terminado"
- [ ] `npm run typecheck` sin errores nuevos (solo los 3 preexistentes). [ ] Sin strings hardcodeados. [ ] Validado web + iOS. [ ] Equipo visual firmó (si UI). [ ] Commit hecho.

> `npx tsc --noEmit` a secas **crashea** (stack overflow): usa siempre `npm run typecheck`.

## Deploy (solo con permiso)
1. WhatsNew (solo features visibles).
2. **Bump `package.json` Y `app.json` al mismo valor.**
3. `npm run typecheck` (bloqueante).
4. `npm run deploy` (export + `vercel --prod`). Si tocas `firestore.rules`: `firebase deploy --only firestore:rules`.

## publicProfiles (contactos) — plan Blaze desde 2026-07-25
El proyecto está en **Blaze**. El trigger `mirrorPublicProfile` (onWrite `users/{uid}`→`publicProfiles`) ya está desplegado y mantiene el espejo automáticamente; no hay que hacer nada manual.
- Redeploy del trigger si se toca: `firebase deploy --only functions` (o `--only functions:mirrorPublicProfile`).
- Backfill manual (solo si hiciera falta re-sincronizar todo): `node functions/scripts/backfillPublicProfiles.js` (Admin SDK + ADC) o el onCall `backfillPublicProfiles` (usuario `isAdmin`).
