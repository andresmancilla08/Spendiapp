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
