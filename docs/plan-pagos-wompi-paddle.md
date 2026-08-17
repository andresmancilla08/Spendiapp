# Plan de cobro del Premium — Wompi (Colombia) + Paddle (resto del mundo)

**Fecha:** 2026-08-17 · **Base:** 2.63.4 · **Alcance:** PWA web únicamente

---

## 0. Decisión y por qué

| Mercado | Pasarela | Motivo |
|---|---|---|
| **Colombia** | **Wompi** (Bancolombia) | Es la única vía razonable para cobrar a un colombiano: tarjetas **+ PSE + Nequi + botón Bancolombia**. Sin PSE se pierde una parte grande de la conversión |
| **Resto del mundo** | **Paddle** | *Merchant of record*: factura en su nombre y liquida el IVA/VAT de cada país. Sin eso, vender a la UE obliga a registrarse para el IVA en 27 jurisdicciones |

**Lo que este plan NO cubre:** Android e iOS. Ahí el premium se desbloquea dentro de la app, así que Google y Apple exigen su propia facturación (Play Billing / StoreKit) y cualquier pasarela externa es motivo de rechazo. Esa vía es RevenueCat y va en un plan aparte.

### Diferencia fiscal que cambia el trabajo

- Con **Paddle** el vendedor es Paddle. No emites factura al cliente final; recibes liquidaciones.
- Con **Wompi** el vendedor eres tú. Eso arrastra **facturación electrónica DIAN** e IVA colombiano. Wompi procesa el pago, no factura por ti.

> Interpretación informativa, no asesoría fiscal. Confirmar con contador antes de cobrar el primer peso.

---

## 1. Arquitectura

```
                    ┌──────────────┐
   Colombia ───────▶│ Wompi        │──┐
                    └──────────────┘  │   webhook firmado
                    ┌──────────────┐  ├──▶ Cloud Function ──▶ Firestore
   Resto    ───────▶│ Paddle       │──┘   (verifica firma)     users/{uid}
                    └──────────────┘                            isPremium
                                                                     │
                                              onSnapshot ◀───────────┘
                                                   │
                                            App (3 plataformas)
```

**Firestore sigue siendo la única fuente de verdad de `isPremium`.** Ya funciona así (`app/_layout.tsx`, listener del doc de usuario), y la app reacciona en tiempo real sin tocar nada.

### ⚠️ El detalle que rompe todo si se olvida

Existe un trigger antimanipulación (`detectPremiumTampering`, `functions/src/index.ts:322`) que **revierte cualquier concesión de `isPremium` que no venga marcada** con `_srv: true`. Los webhooks de pago DEBEN escribir esa marca o la activación se deshará sola a los pocos segundos. Es exactamente el fallo que ya sufrió el panel de administración.

```ts
await userRef.set({ _srv: true, isPremium: true, premiumExpiry, ... }, { merge: true });
```

---

## 2. Fase 0 — Cuentas y papeles

- [ ] **Wompi:** cuenta de comercio en Bancolombia. Requiere RUT, cámara de comercio o persona natural con RUT, y cuenta bancaria a nombre del titular
- [ ] Wompi: obtener las cuatro claves — pública y privada de **sandbox**, pública y privada de **producción**
- [ ] Wompi: obtener el **secreto de integridad** (firma del checkout) y el **secreto de eventos** (firma del webhook). Son distintos
- [ ] **Paddle:** cuenta de vendedor. Verificación de identidad y del dominio `spendia.co`
- [ ] Paddle: entorno **Sandbox** activo y separado del de producción
- [ ] Paddle: crear el producto «Spendia Premium» con dos precios — mensual y anual
- [ ] Paddle: configurar precios por moneda o dejar la conversión automática
- [ ] **Facturación electrónica DIAN** para las ventas por Wompi: proveedor tecnológico y resolución de numeración
- [ ] Confirmar con contador el tratamiento del IVA en el servicio digital
- [ ] Actualizar `app/terms.tsx`: condiciones de pago, renovación, reembolsos, quién es el vendedor en cada caso
- [ ] Actualizar `app/privacy.tsx`: Wompi y Paddle como encargados del tratamiento, y qué datos reciben

---

## 3. Fase 1 — Backend común

- [ ] **Colección `premiumSubscriptions/{uid}`** con el estado real de la suscripción:
  ```
  provider: 'wompi' | 'paddle'
  providerRef: string          // id de transacción o de suscripción
  plan: 'monthly' | 'annual'
  status: 'pending' | 'active' | 'past_due' | 'canceled' | 'expired'
  currentPeriodEnd: Timestamp
  amount: number
  currency: 'COP' | 'USD' | ...
  createdAt / updatedAt: Timestamp
  ```
- [ ] **Colección `paymentEvents/{eventId}`** para **idempotencia**: antes de procesar un webhook, comprobar que ese `eventId` no está ya escrito. Las dos pasarelas reenvían eventos y sin esto se duplican activaciones
- [ ] Función `activatePremium(uid, {plan, provider, providerRef, periodEnd})` — escribe `users/{uid}` con `_srv: true`, `isPremium: true`, `premiumExpiry` y `premiumSince`, más el doc de `premiumSubscriptions`
- [ ] Función `deactivatePremium(uid, reason)` — `isPremium: false` con `_srv: true`
- [ ] **Cron diario** que expire las suscripciones vencidas (`currentPeriodEnd < hoy` y no renovadas). Ya hay `onSchedule` en el proyecto para copiar el patrón
- [ ] Reglas de Firestore: `premiumSubscriptions` y `paymentEvents` **solo lectura para el dueño, escritura solo desde Admin SDK**
- [ ] Registrar los secretos con `defineSecret` como ya se hace con `RESEND_API_KEY`

---

## 4. Fase 2 — Wompi (Colombia)

### Cobro

- [ ] Endpoint `api/checkout-wompi` que genere:
  - `reference` única por intento (p. ej. `uid_plan_timestamp`)
  - `amountInCents` — **Wompi trabaja en centavos**: $9.900 → `990000`
  - `currency: 'COP'`
  - **firma de integridad**: SHA-256 de `reference + amountInCents + currency + secretoIntegridad`
- [ ] Integrar el **Checkout Web** de Wompi (redirección o widget) con esos datos y `redirectUrl` de vuelta a la app
- [ ] Habilitar los métodos: tarjeta, **PSE**, **Nequi**, botón Bancolombia
- [ ] Pantalla de retorno: leer el estado y mostrar «procesando» mientras el webhook confirma — **no activar premium desde el cliente**

### Webhook

- [ ] Cloud Function `wompiWebhook` (HTTP):
  - [ ] Verificar el **checksum** del evento: SHA-256 de las propiedades indicadas en `signature.properties` + `timestamp` + secreto de eventos
  - [ ] Rechazar con 401 si no coincide. Nunca confiar en el cuerpo sin verificar
  - [ ] Idempotencia por id de transacción
  - [ ] `APPROVED` → `activatePremium` con `periodEnd` = hoy + 1 mes o + 1 año
  - [ ] `DECLINED` / `VOIDED` / `ERROR` → dejar registro, no activar
  - [ ] Responder 200 rápido; el trabajo pesado va después de responder

### Renovación — el punto flojo de Wompi

Wompi **no gestiona suscripciones automáticas** como Paddle. Tres salidas, hay que elegir una:

- [ ] **(a) Cobro manual recurrente:** tokenizar el medio de pago (`payment_source`) y lanzar el cargo desde un cron cada periodo. Más trabajo y requiere habilitar esa capacidad en la cuenta
- [ ] **(b) Sin renovación automática:** el usuario paga un periodo y recibe aviso por correo antes de vencer, con enlace para renovar. Es lo más simple y honesto, y encaja con lo que ya dice la UI («cancelas cuando quieras»)
- [ ] **(c) Solo plan anual en Colombia:** una compra al año, fricción mínima de gestión

> Recomendación: **(b)** para lanzar, y (a) más adelante si la retención lo justifica. El correo de aviso puede reutilizar la infraestructura de Resend que ya existe.

---

## 5. Fase 3 — Paddle (resto del mundo)

- [ ] Cargar **Paddle.js** solo cuando el usuario no es de Colombia
- [ ] Inicializar con el token de cliente y el entorno correcto (`sandbox` / `production`)
- [ ] Abrir el checkout con el `priceId` del plan y `customData: { uid }` — **imprescindible para saber a qué usuario activar**
- [ ] Pasar el email del usuario para que Paddle no lo pida otra vez
- [ ] Cloud Function `paddleWebhook` (HTTP):
  - [ ] Verificar la cabecera **`Paddle-Signature`** (HMAC-SHA256 sobre `ts:body` con el secreto del endpoint)
  - [ ] Idempotencia por `event_id`
  - [ ] `subscription.activated` / `subscription.updated` → activar con `currentPeriodEnd` del payload
  - [ ] `subscription.canceled` → marcar `canceled`, mantener premium **hasta fin de periodo**
  - [ ] `subscription.past_due` → avisar, sin cortar inmediatamente
  - [ ] `transaction.completed` → registrar el pago
- [ ] Enlace al **portal de cliente de Paddle** para que el usuario gestione o cancele su suscripción sin escribirte

> Los nombres exactos de eventos y la versión de la API hay que confirmarlos en la documentación de Paddle Billing el día de la implementación: cambian entre versiones.

---

## 6. Fase 4 — Enrutado y pantallas

- [ ] Detección de país: por `Intl.DateTimeFormat().resolvedOptions().timeZone` y/o cabecera de geolocalización de Vercel, con **selector manual** como salida (un turista o un colombiano fuera del país no deben quedar bloqueados)
- [ ] Reescribir `app/upgrade.tsx` con la dirección elegida (`docs/up3-final.html`): dos planes arriba con el −33 % del anual, y los nueve módulos con miniatura real
- [ ] Corregir la lista de funciones: hoy vende «Reportes PDF ilimitados» y «Notificaciones inteligentes», que **no existen**
- [ ] Mostrar el precio en la moneda correcta según pasarela (COP en Wompi, moneda local en Paddle)
- [ ] **Retirar `app/payment-qr.tsx`** del flujo — el cobro manual por Nequi y WhatsApp deja de tener sentido y es el bloqueador de las tiendas
- [ ] Estado «procesando pago» mientras llega el webhook, con reintento y salida si tarda
- [ ] Pantalla de gestión: plan actual, fecha de renovación, cómo cancelar
- [ ] Reescribir `app/premium-welcome.tsx` con la opción C (`docs/pw-c1.html`)

---

## 7. Fase 5 — Pruebas

- [ ] Wompi sandbox: tarjeta aprobada, tarjeta rechazada, PSE, Nequi
- [ ] Paddle sandbox: alta, renovación, cancelación, fallo de cobro
- [ ] **Webhook duplicado**: enviar el mismo evento dos veces y comprobar que solo activa una vez
- [ ] **Webhook con firma inválida**: debe responder 401 y no tocar nada
- [ ] Comprobar que `detectPremiumTampering` **no revierte** la activación (es decir, que `_srv: true` está puesto)
- [ ] Expiración: adelantar `currentPeriodEnd` a ayer y verificar que el cron quita el premium
- [ ] Verificar que la app refleja el cambio **en tiempo real** por el `onSnapshot` existente
- [ ] Probar el flujo completo en la PWA instalada, no solo en el navegador

---

## 8. Fase 6 — Lanzamiento

- [ ] Secretos de producción en Firebase Functions y en Vercel
- [ ] URLs de webhook registradas en los paneles de Wompi y Paddle
- [ ] Alertas en Grafana o en los logs de Functions para webhooks fallidos
- [ ] Panel de administración: ver suscripciones y su estado (spendia-admin ya tiene la sección de premium)
- [ ] Correo de confirmación de compra (Resend ya está montado)
- [ ] Correo de aviso antes de vencer — imprescindible con la opción (b) de Wompi
- [ ] Registrar en `docs/contexto/decisiones.md` la elección de pasarelas

---

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| Activar premium desde el cliente | **Nunca.** Solo el webhook verificado activa. El cliente únicamente muestra «procesando» |
| Webhook duplicado → doble periodo | Idempotencia por id de evento en `paymentEvents` |
| El honeypot revierte la activación | `_srv: true` en toda escritura. Verificado en pruebas |
| Wompi sin recurrencia | Elegir la opción (b) y avisar por correo antes de vencer |
| Fiscalidad colombiana | Facturación electrónica DIAN resuelta antes de cobrar |
| Precio en COP para extranjeros | Enrutado por país + selector manual |
| Pagar dos veces por dos vías | Comprobar suscripción activa antes de abrir cualquier checkout |

---

## 10. Estimación

| Fase | Trabajo |
|---|---|
| 0 · Cuentas y papeles | 2–5 días de espera, poco trabajo propio |
| 1 · Backend común | 2 días |
| 2 · Wompi | 3 días |
| 3 · Paddle | 2 días |
| 4 · Pantallas | 2 días |
| 5 · Pruebas | 2 días |
| 6 · Lanzamiento | 1 día |

**Unas dos semanas de desarrollo**, con la Fase 0 arrancando ya porque sus esperas no dependen de nosotros.
