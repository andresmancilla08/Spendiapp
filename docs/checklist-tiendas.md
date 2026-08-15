# Checklist de publicación — App Store y Google Play

Lista de trabajo ejecutable. Marca conforme avances. El análisis y las
alternativas están en [plan-ios-android-2026-08-15.md](./plan-ios-android-2026-08-15.md).

Leyenda: 🔴 bloquea la publicación · 🟡 obligatorio pero no bloquea la revisión ·
🟢 mejora

---

## Fase 0 · Empezar hoy (tienen espera externa)

- [ ] 🔴 **Alta en Apple Developer Program** — 99 USD/año. La verificación de
      identidad puede tardar varios días; si es cuenta de empresa, exige D-U-N-S
      y tarda más
- [ ] 🔴 **Alta en Google Play Console** — 25 USD, pago único
- [ ] 🔴 Verificar en Play Console si la cuenta cae en el requisito de **prueba
      cerrada previa** (cuentas personales nuevas: 12 testers durante 14 días
      antes de poder publicar en producción). Determina el calendario entero
- [ ] 🟡 Decidir el nombre en tienda y reservarlo en ambas
- [ ] 🟡 Confirmar que `com.spendiapp` está libre en ambas tiendas

## Fase 1 · Rendimiento (prerrequisito, no opcional)

- [x] Fondos fuera del hilo de JS — 1.440 escrituras de estilo/s → 0
- [x] Blur animado eliminado — 13 capas → 0
- [x] `setState` por frame de los gráficos eliminado
- [x] Pausa con la app en segundo plano (`useIsActive`)
- [x] Personalización: solo se anima la miniatura seleccionada
- [x] Ajuste de ahorro de batería
- [ ] 🟡 **División del bundle por rutas** (`web.output: "static"`). Hoy son
      8,5 MB en un solo archivo y ~2,7 s de CPU al arrancar. Exige rehacer el
      catch-all de `vercel.json`, `scripts/patch-html.js` y revisar el service
      worker: es un cambio de despliegue, no un ajuste
- [ ] 🟡 Medir en un **dispositivo físico** (Android de gama media e iPhone) con
      la app instalada, no solo en el navegador

## Fase 2 · Bloqueadores de tienda

### B1 · Cobro del premium 🔴

- [ ] Decidir vía: RevenueCat *(recomendada)* · IAP a mano · v1 sin premium
- [ ] Crear productos de suscripción en App Store Connect
- [ ] Crear productos de suscripción en Play Console
- [ ] Integrar el SDK y la pantalla de compra
- [ ] Botón **«Restaurar compras»** — Apple lo exige explícitamente
- [ ] Webhook de RevenueCat → Cloud Function → estado premium en Firestore
      (Firestore sigue siendo la fuente de verdad)
- [ ] Retirar `app/payment-qr.tsx` del build nativo (puede seguir en la PWA)
- [ ] Probar compra, renovación y cancelación en sandbox de ambas tiendas
- [ ] Comprobar que un usuario que ya pagó por la PWA conserva su premium en la
      app nativa

### B2 · Borrado de cuenta 🔴

- [ ] Pantalla de eliminación con confirmación explícita
- [ ] Reautenticación previa (Firebase la exige para operaciones sensibles)
- [ ] Borrar el usuario de Firebase Auth
- [ ] Borrar sus documentos de Firestore (transacciones, categorías, tarjetas,
      metas, presupuestos, recurrentes, perfil)
- [ ] **Decidir qué pasa con los gastos compartidos** donde participan otras
      personas — no se pueden borrar sin afectar a terceros
- [ ] Ruta web de eliminación accesible sin instalar la app (la exige Google)
- [ ] Documentar el flujo en la política de privacidad

### B3 · Funciones escritas contra `canvas` del navegador 🔴

- [ ] `utils/scanReceipt.ts` → `expo-image-picker` + `expo-image-manipulator`
- [ ] Decidir vía para los informes: Cloud Function *(recomendada)* · Skia ·
      ocultar en v1
- [ ] `utils/generateAnnualReportImage.ts` (816 líneas)
- [ ] `utils/generateFriendReportImage.ts` (767 líneas)
- [ ] Barrer el resto del código en busca de `window` / `document` /
      `localStorage` sin guarda de plataforma
- [ ] Abrir **todas** las pantallas en un dispositivo real y comprobar que
      ninguna revienta por una API de navegador

### B4 · Inicio de sesión 🔴

- [ ] `expo-apple-authentication` + `signInWithCredential`
- [ ] Botón de Apple con el estilo que exige la guía de Apple
- [ ] Probar el caso «ocultar mi correo» (Apple devuelve un alias relay)
- [ ] Verificar que Google Sign-In nativo funciona en dispositivo real, en iOS
      y en Android

## Fase 3 · Requisitos de ficha y privacidad

- [ ] 🔴 `PrivacyInfo.xcprivacy` con las razones de uso de API declaradas
- [ ] 🔴 Etiquetas de privacidad de App Store (qué datos se recogen y para qué)
- [ ] 🔴 Formulario **Data safety** de Google Play
- [ ] 🔴 Política de privacidad y términos en URL pública — ya existen como
      pantallas (`app/privacy.tsx`, `app/terms.tsx`), falta exponerlas como web
- [ ] 🔴 Capturas por tamaño: iPhone 6,9" y 6,5"; Android teléfono; tablet si se
      declara compatibilidad (`supportsTablet: true` está activo)
- [ ] 🟡 Icono de tienda 1024×1024 sin transparencia ni esquinas redondeadas
- [ ] 🟡 Textos de ficha: nombre, subtítulo, descripción, novedades, palabras
      clave — en español e inglés
- [ ] 🟡 Categoría, clasificación por edad y cuestionario de contenido
- [ ] 🟡 Cuenta de prueba para el equipo de revisión (con datos ficticios)
- [ ] 🟢 Vídeo de presentación

## Fase 4 · Build y pruebas

- [ ] 🔴 `eas build --profile preview` instalado en un Android real
- [ ] 🔴 `eas build --profile preview` instalado en un iPhone real
- [ ] 🔴 Repasar los 19 flujos principales en dispositivo: alta, entrada,
      registrar gasto, gasto compartido, tarjetas, metas, presupuestos,
      recurrentes, informes, personalización, premium
- [ ] 🟡 Splash e icono nativos correctos en ambas plataformas
- [ ] 🟡 Deep links `spendiapp://` funcionando
- [ ] 🟡 Comprobar que el fondo animado **no drena batería con la app
      minimizada** (`useIsActive`) — medir con la app 30 min en segundo plano
- [ ] 🟡 Modo oscuro y claro revisados en dispositivo, no solo en navegador
- [ ] 🟢 `expo-notifications` para push
- [ ] 🔴 TestFlight con testers reales
- [ ] 🔴 Pista interna de Play con testers reales

## Fase 5 · Envío

- [ ] Subir versión de producción a App Store Connect (`eas submit`)
- [ ] Subir AAB a Play Console (`eas submit`)
- [ ] Rellenar «Novedades de esta versión» en ambas
- [ ] Responder a las observaciones de la revisión
- [ ] Publicar

## Post-lanzamiento

- [ ] 🟡 Mantener la PWA como canal de captación — y como el sitio donde el pago
      no paga comisión
- [ ] 🟡 Registro de fallos en producción (Crashlytics o equivalente)
- [ ] 🟡 Proceso para responder reseñas
- [ ] 🟢 Automatizar `eas build` en CI

---

## Decisiones pendientes

| # | Decisión | Recomendación |
|---|---|---|
| 1 | Cobro del premium en móvil | RevenueCat con IAP |
| 2 | Informes anuales y de amigo en nativo | Renderizar en Cloud Function |
| 3 | Orden de salida | Android primero: revisión más rápida y pista interna para iterar |
| 4 | Futuro de la PWA | Se queda |
