# Plan de salida a App Store y Google Play

**Fecha:** 2026-08-15 · **Versión base:** 2.56.0 · **Objetivo:** publicar Spendia como app
nativa en iOS y Android

## Veredicto en una frase

La parte técnica está casi resuelta — Spendia ya es Expo SDK 55 / React Native 0.83, no
hay que reescribir nada. Lo que bloquea la publicación es **de negocio y de cumplimiento**,
no de código: el cobro del premium por QR manual hace que App Store rechace la app, no
existe borrado de cuenta dentro de la app, y tres funciones están escritas contra
`canvas` del navegador y no arrancarán en nativo.

---

## 1. Punto de partida: mejor de lo esperado

| Elemento | Estado |
|---|---|
| Framework | Expo SDK 55 · RN 0.83.6 · expo-router — **nativo desde el día uno** |
| `eas.json` | Ya configurado (development / preview / production) |
| Proyecto EAS | `6e07df40-6b55-4723-b95a-ffc3f85f0596`, owner `mancilla08` |
| Bundle ID iOS | `com.spendiapp` — ya declarado |
| Package Android | `com.spendiapp` — ya declarado |
| Esquema de URL | `spendiapp://` + esquema OAuth de Google |
| Persistencia de sesión | `getReactNativePersistence(AsyncStorage)` — correcto para RN |
| Google Sign-In | Rama nativa vía `expo-auth-session` ya implementada |
| Iconos | `icon.png`, adaptive icon Android (fondo/frente/mono), splash |
| `ios/` y `android/` | En `.gitignore` → generación nativa continua, EAS hace el prebuild |

**No hay que portar la app.** Hay que cerrar brechas.

---

## 2. Bloqueadores

### B1 — El premium se cobra por QR y WhatsApp · BLOQUEANTE, App Store y Play

`app/payment-qr.tsx` muestra una llave de Nequi (`@Mancilla124`) y remite a un teléfono de
administración para confirmar el pago manualmente.

App Store Review Guideline 3.1.1: el contenido y las funciones digitales que se desbloquean
dentro de la app deben venderse con In-App Purchase. Google Play Billing exige lo
equivalente. Una pantalla que envía al usuario a pagar por fuera es motivo de rechazo
directo, y suele serlo ya en la primera revisión.

> Las reglas de enlace a pago externo han cambiado por vía judicial y regulatoria y varían
> por territorio. Antes de decidir, hay que verificar la política vigente para Colombia y
> España en el momento del envío. Esto es una lectura informativa, no asesoría legal.

**Opciones:**

| Opción | Coste | Consecuencia |
|---|---|---|
| **A. IAP con RevenueCat** *(recomendada)* | 2–3 días | Comisión 15 % (Small Business / primer millón). Suscripciones, restauración de compras y prueba gratuita resueltas. Funciona en ambas tiendas con una sola integración |
| B. IAP nativo sin intermediario | 5–8 días | Sin coste de terceros; hay que construir validación de recibos, restauración y renovaciones a mano |
| C. Publicar v1 sin premium en móvil | 0 días | Desbloquea el lanzamiento ya, pero se renuncia al ingreso en el canal nativo y hay que retirar la pantalla de QR del build |

Recomendación: **A**. Retirar `payment-qr` del build nativo (puede seguir en la PWA) y
mantener el estado premium en Firestore como fuente de verdad, alimentado por los webhooks
de RevenueCat contra una Cloud Function — el proyecto ya tiene `functions/`.

### B2 — No hay borrado de cuenta dentro de la app · BLOQUEANTE, ambas tiendas

No existe `deleteUser` ni flujo de eliminación en todo el código. Apple lo exige desde
2022 (Guideline 5.1.1(v)) y Google Play desde 2024, con la particularidad de que Google
pide **además** una ruta web accesible sin instalar la app.

Alcance: borrar la cuenta de Firebase Auth, sus documentos de Firestore, y decidir qué pasa
con los gastos compartidos donde participan otras personas. Estimación: 2 días, la mayor
parte en el barrido de datos relacionados y en la reautenticación previa que Firebase exige.

### B3 — Tres funciones escritas contra `canvas` del navegador · BLOQUEANTE de paridad

| Fichero | Líneas | Qué hace |
|---|---:|---|
| `utils/generateAnnualReportImage.ts` | 816 | Informe anual como imagen |
| `utils/generateFriendReportImage.ts` | 767 | Informe de amigo como imagen |
| `utils/scanReceipt.ts` | 98 | Captura y compresión de recibo |

Usan `document.createElement('canvas')`, `getContext('2d')`, `canvas.toBlob` y
`new window.Image()`. En nativo no existe ninguna de esas APIs: la pantalla fallará al
invocarlas.

`scanReceipt` es fácil: `expo-image-picker` + `expo-image-manipulator`, medio día.

Los dos generadores de informes (1 583 líneas de dibujo 2D) tienen tres caminos:

1. **Renderizar en servidor** — una Cloud Function con canvas de Node reutiliza el código
   de dibujo casi tal cual y sirve a web y a nativo por igual. Es la vía que menos código
   duplica. 3–4 días.
2. **`@shopify/react-native-skia`** — API de dibujo equivalente, funciona en web y nativo.
   Buen resultado, pero hay que traducir las 1 583 líneas. 5–7 días.
3. **Ocultar la función en nativo en la v1** — 1 hora, y se pierde paridad con la PWA.

Recomendación: **1** para los informes, **expo-image-picker** para el recibo.

### B4 — Falta alternativa de inicio de sesión en iOS · BLOQUEANTE, App Store

La app ofrece Google Sign-In. La Guideline 4.8 obliga a ofrecer junto a él una opción de
inicio de sesión equivalente que limite la recolección de datos; Sign in with Apple la
cumple. `expo-apple-authentication` + `signInWithCredential` de Firebase: 1 día.

---

## 3. Requisitos no bloqueantes pero obligatorios

| # | Requisito | Coste |
|---|---|---|
| R1 | Cuenta Apple Developer — 99 USD/año, alta y verificación pueden tardar días | 1 día + espera |
| R2 | Cuenta Google Play Console — 25 USD pago único; las cuentas nuevas de particular requieren prueba con testers antes de producción | 1 día + espera |
| R3 | `PrivacyInfo.xcprivacy` y etiquetas de privacidad de App Store | 1 día |
| R4 | Formulario Data Safety de Google Play | medio día |
| R5 | Capturas de pantalla por tamaño de dispositivo, iconos de tienda, textos y palabras clave | 2 días |
| R6 | Política de privacidad y términos en URL pública — ya existen como pantallas (`app/privacy.tsx`, `app/terms.tsx`), hay que exponerlas como web | medio día |
| R7 | Pausar animaciones en segundo plano — ver auditoría de rendimiento, C5. En web el navegador congela `rAF`; en nativo no hay ese salvavidas y drena batería con la app minimizada | incluido en P0.4 |
| R8 | Push notifications con `expo-notifications` — hoy las notificaciones son solo in-app vía Firestore. No bloquea, pero es la mitad del valor de una app instalada | 2 días |

---

## 4. Calendario

Asumiendo un desarrollador a tiempo completo y que las altas de cuenta arrancan **hoy**,
porque son las que tienen esperas que no dependen de nosotros.

| Semana | Trabajo | Hito |
|---|---|---|
| **0** | Alta de Apple Developer y Play Console (R1, R2). En paralelo: P0 de la auditoría de rendimiento | Cuentas en trámite |
| **1** | RevenueCat + IAP (B1). Sign in with Apple (B4) | Primer build de EAS instalado en un dispositivo real |
| **2** | Borrado de cuenta (B2). `scanReceipt` nativo. Informes en Cloud Function (B3) | Paridad de funciones con la PWA |
| **3** | Push (R8). Privacidad, Data Safety, manifiestos (R3, R4, R6). Capturas y fichas (R5) | Build de producción listo |
| **4** | TestFlight y pista interna de Play. Corrección de lo que salga en dispositivo real | Beta con usuarios reales |
| **5** | Envío a revisión en ambas tiendas | En revisión |
| **6** | Respuesta a observaciones de revisión | **Publicadas** |

**Cinco a seis semanas hasta estar en las tiendas**, con la semana 6 como colchón para el
rechazo de la primera revisión, que conviene dar por descontado.

Si "las siguientes semanas" significa dos o tres, la única forma de llegar es la opción
**C** de B1 (sin premium en el móvil) combinada con la opción **3** de B3 (informes
ocultos en nativo). Eso reduce el camino crítico a B2 + B4 + requisitos de tienda: unas
tres semanas, a cambio de lanzar sin ingresos y sin paridad.

---

## 5. Decisiones que hay que tomar

1. **Cobro del premium en móvil** — IAP con RevenueCat (recomendado), IAP a mano, o
   lanzar sin premium. Decide el calendario más que ninguna otra cosa.
2. **Informes anuales y de amigo en nativo** — servidor, Skia, u ocultarlos en la v1.
3. **Ambas tiendas a la vez, o Android primero.** Play suele revisar más rápido y su
   pista interna permite iterar antes; salir primero en Android da un ciclo de aprendizaje
   real antes de exponerse a la revisión de Apple.
4. **Qué pasa con la PWA.** Recomendación: se queda. Es el canal de captación sin fricción
   y el sitio donde el pago no paga comisión. La app nativa se posiciona como el canal de
   uso diario.

---

## 6. Orden de ejecución sugerido

El rendimiento va primero, y no por perfeccionismo: una app que calienta el teléfono
recibe reseñas de una estrella desde el primer día, y en nativo desaparece el salvavidas
del navegador que hoy congela las animaciones en segundo plano. Los P0 de la auditoría son
prerrequisito del lanzamiento, no una mejora posterior.

```
Semana 0   P0 rendimiento  ─┬─  altas de cuentas (en paralelo, no bloquean)
Semana 1   B1 IAP          ─┴─  B4 Sign in with Apple
Semana 2   B2 borrado      ───  B3 informes + recibo
Semana 3   R3–R6 tiendas   ───  R8 push
Semana 4   TestFlight / pista interna
Semana 5   Envío a revisión
```
