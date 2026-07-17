# Security Audit Report — Spendiapp — 2026-07-16

**Auditor:** Sherlock (security-expert)
**Riesgo global:** **MEDIO-ALTO**
**Stack auditado:** Expo/React Native + Web PWA · Firebase Auth · Firestore · Cloud Functions (v2) · Vercel (API rates) · Resend
**Estándares:** OWASP Top 10 2021, OWASP MASVS, CWE, CVSS 3.1, GDPR (contexto fintech)

> Interpretación informativa de seguridad, no asesoría legal/regulatoria vinculante. Los puntos de PII/GDPR deben validarse con Sergio Gutiérrez / compliance.

## Resumen ejecutivo

| Severidad | Cantidad | SLA |
|-----------|----------|-----|
| CRÍTICO | 0 | — |
| ALTO | 2 | < 1 semana |
| MEDIO | 5 | < 1 mes |
| BAJO | 3 | Backlog |

**Postura general: sólida.** El proyecto tiene controles maduros poco comunes: honeypots (colecciones + functions), auto-revert de manipulación de campos premium, protección de campos sensibles por `diff()`, OTP con `randomInt` cripto-seguro + cap de 3 intentos + expiry, mensajes de auth genéricos (sin enumeración de usuarios), `.env` fuera de git, Storage totalmente cerrado. Los hallazgos son de **autorización granular** y **anti-abuso**, no de fundamentos rotos.

---

## ALTOS

### [A-1] Ausencia de Firebase App Check — sin atestación de cliente
**CVSS:** 7.4 (AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:L/A:H) · **CWE-306 / OWASP A07:2021**
**Dónde:** todo el backend (`onCall` functions + Firestore).

No hay App Check (`enforceAppCheck`, App Attest / Play Integrity / reCAPTCHA). Con la API key pública de Firebase (que es pública por diseño), cualquiera puede scriptear un cliente y llamar functions/Firestore fuera de la app. Esto **amplifica todos los hallazgos de abuso** de abajo (spam de OTP, spam de notificaciones, abuso de `pendingExternalLinks`, brute-force de PIN) volviéndolos automatizables a escala.

**Fix:** habilitar App Check (iOS: App Attest, Android: Play Integrity, Web: reCAPTCHA Enterprise) y `enforceAppCheck: true` en las `onCall`. Es el control con mayor retorno para una fintech.

### [A-2] `pendingExternalLinks` — autorización rota por clave controlada
**CVSS:** 7.1 (AV:N/AC:L/PR:L/UI:R/S:U/C:L/I:H/A:N) · **CWE-639 / OWASP A01:2021**
**Dónde:** `firestore.rules` (match `pendingExternalLinks/{email}`) + `hooks/useUserProfile.ts:claimExternalLinks`.

La regla `create` no valida que `email` (la clave del doc) pertenezca a quien llama:
```
allow create: if request.auth != null
  && request.resource.data.keys().hasOnly(['links','email','createdAt'])
  && request.resource.data.links is list;   // ← nunca comprueba token.email == email
```
`update` solo exige que `email` no cambie → cualquiera puede **inyectar links en el doc pendiente de otro email**. Al hacer login la víctima, `claimExternalLinks` la agrega (`arrayUnion(uid)`) como participante de `sharedTransactions` elegidos por el atacante y dispara notificaciones. Resultado: asociación forzada a gastos compartidos ajenos / contaminación de datos / vector de ingeniería social.

**Fix:**
```
match /pendingExternalLinks/{email} {
  allow read:   if request.auth != null && request.auth.token.email == email;
  allow create: if request.auth != null
    && request.auth.token.email == email            // ← dueño del email
    && request.resource.data.keys().hasOnly(['links','email','createdAt'])
    && request.resource.data.links is list;
  allow update: if request.auth != null && request.auth.token.email == email;
  allow delete: if false;
}
```
Idealmente, mover la creación de estos links a una Cloud Function con Admin SDK (validando propiedad del `sharedId`), no desde cliente.

---

## MEDIOS

### [M-1] `users` — lectura de perfil completo por cualquier autenticado (PII)
**CVSS:** 5.3 · **CWE-200 / OWASP A01** — `firestore.rules` (`allow get: if request.auth != null`).
Cualquier usuario logueado puede leer el doc completo de cualquier otro (incluye `fullName` = nombre real). Los UIDs se filtran vía friendships/sharedTransactions/notifications, así que un co-participante puede resolver nombre real de otros. **Relevante para GDPR.**
**Fix:** exponer solo campos públicos. Dos opciones: (a) subcolección `users/{uid}/public` con `userName/photoURL/displayName` y dejar el doc raíz solo para el dueño; (b) restringir `get` a `uid == self` o relación de amistad existente.

### [M-2] `sharedTransactions` — cualquier participante reescribe todo
**CVSS:** 5.4 · **CWE-284** — `firestore.rules`.
`update, delete: if uid in resource.data.participantUids` permite a cualquier participante modificar `participantUids`, `ownerUid` y montos → secuestro de grupo, expulsar al owner, alterar cifras.
**Fix:** validar en `update` que `participantUids` y `ownerUid` no cambien salvo por el owner (`request.auth.uid == resource.data.ownerUid`), y acotar campos mutables con `diff().affectedKeys()`.

### [M-3] `notifications` — creación hacia cualquier destinatario, sin rate limit
**CVSS:** 5.3 · **CWE-770 / OWASP A04** — `firestore.rules`.
Un autenticado puede crear notificaciones a cualquier `toUserId` (tipo en whitelist, `data.fromUserId` = self). Vector de spam/phishing (ej. falso `sent_income` "recibiste $X"). Sin límite de frecuencia. Renderizado en RN `Text` → sin XSS, pero sí ingeniería social.
**Fix:** crear notificaciones sensibles vía Cloud Function/trigger, no por cliente; añadir rate limit. Verificar que el cliente nunca renderice `data.*` como HTML en la PWA.

### [M-4] `sendPinResetOtp` — sin rate limit (email bombing / coste)
**CVSS:** 5.3 · **CWE-799 / OWASP A04** — `functions/src/index.ts:22`.
Sin límite de envíos: cada llamada reescribe `pin_resets` con OTP nuevo y `attempts:0` y dispara un email Resend. Permite bombardear el inbox de una víctima y quemar cuota de Resend. El brute-force del OTP sigue acotado (3 intentos/OTP, no legible), pero el abuso de envío no.
**Fix:** rate limit por email+IP (p. ej. máx. 1 cada 60s, 5/hora) usando el `createdAt` existente; combinar con App Check [A-1].

### [M-5] PIN de 4 dígitos como credencial de Firebase Auth
**CVSS:** 4.8 · **CWE-521 / OWASP MASVS-AUTH** — `functions/src/index.ts:146` (`password: newPin + '00'`).
El secreto real es un PIN de 4 dígitos (entropía 10⁴) con sufijo constante `'00'`. El login `signInWithPassword` es brute-forceable sin App Check y confiando solo en el anti-abuso implícito de Firebase.
**Fix:** habilitar App Check [A-1], considerar bloqueo por dispositivo con backoff exponencial tras N fallos, y valorar PIN de 6 dígitos.

---

## BAJOS

### [B-1] Dependencias con CVEs (build/dev)
`npm audit`: 19 vulns (2 críticas `websocket-driver`, 3 altas `ws`). Están en cadenas de **@expo/cli** (build-time), no en el bundle de producción ni en functions runtime. Riesgo real bajo, pero correr `npm audit fix` y revisar que no rompa Expo.

### [B-2] `transactions` update sin validación de campos
`allow read, write: if uid == resource.data.userId` deja al dueño flipear `isShared/sharedOwnerUid/isSentIncome/sentByUid`. Impacto limitado (read gated por `userId`). Acotar campos mutables con `diff()`.

### [B-3] OTP en claro en `pin_resets`
Guardado en texto plano; mitigado porque la colección es Admin-SDK-only y expira en 10 min. Hashear el OTP sería defensa en profundidad.

---

## Checklist de remediación (prioridad)
- [~] [A-1] Descartado por decisión (2026-07-16): no se implementa App Check
- [x] [A-2] `pendingExternalLinks` exige `token.email == email` — **desplegado a prod**
- [x] [M-1] PII de `users` movida a colección `publicProfiles`; `users` get/list solo self — **desplegado a prod** (ver nota de transición)
- [x] [M-2] `sharedTransactions`: `ownerUid` inmutable salvo owner — **desplegado a prod** (bloqueo de `participantUids` pendiente, requiere Function)
- [ ] [M-3] Notificaciones sensibles vía Function + rate limit
- [~] [M-4] Rate limit en `sendPinResetOtp` — **código aplicado**, deploy BLOQUEADO por billing (plan Spark → Secret Manager 403)
- [ ] [M-5] Evaluar PIN 6 dígitos + lockout por dispositivo
- [ ] [B-1] `npm audit fix` (deps de build)
- [ ] [B-2] Acotar campos mutables en `transactions`
- [ ] [B-3] Hashear OTP en reposo

### Nota de transición M-1
`publicProfiles` se puebla en cada login (`createUserProfile` → `syncPublicProfile`), sin
Cloud Function de backfill (bloqueada por billing). Los usuarios existentes que aún no
han vuelto a entrar no tendrán doc público: sus tarjetas de amigo mostrarán `…` hasta su
próximo login (los consumidores ya son null-safe). Ídem la unicidad de `userName`: puede
haber una colisión transitoria hasta que todos migren. Se auto-sana con el uso normal.
