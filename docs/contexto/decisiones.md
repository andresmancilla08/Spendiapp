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

### El dueño de un gasto compartido puede actualizar los mirrors — Vigente
- **Qué:** `firestore.rules` permite `update` sobre `transactions` al dueño del compartido (`isShared && sharedOwnerUid == auth.uid`), con `userId` y `sharedOwnerUid` inmutables.
- **Por qué:** editar un gasto compartido propaga a la copia de cada participante en un solo batch; sin esta regla el batch entero se denegaba. No amplía el privilegio real: el dueño ya podía crear y borrar esos mirrors.
- **Descartado:** Cloud Function con Admin SDK para la propagación (más latencia y coste para una operación que las reglas ya pueden acotar); limitar los campos editables en la regla (se puede endurecer si algún día el owner deja de ser de confianza).

### `npm run typecheck` obligatorio antes de deploy — Vigente
- **Qué:** `node --stack-size=10000 ./node_modules/typescript/lib/tsc.js --noEmit`.
- **Por qué:** `tsc --noEmit` a secas crashea (stack overflow) en este repo, así que nadie tipaba; eso dejó pasar a producción dos `ReferenceError` por identificadores sin importar (`localeFor`, `deleteDoc`).

### Categoría "segura" al escribir en la cuenta de otro usuario — Vigente
- **Qué:** todo doc que se crea para OTRO usuario (mirror de gasto compartido, ingreso recibido) pasa la categoría por `utils/sharedCategory.categoryForOtherUser(id, type)`: si no es una de `DEFAULT_CATEGORIES`, o es por defecto pero del tipo equivocado (`food` en un ingreso), se escribe `other`. El dueño conserva su categoría original.
- **Por qué:** las categorías personalizadas son docs privados en `categories` y las reglas solo permiten leer las propias → un id ajeno no resuelve a nada en la app del amigo y se pintaba como texto crudo. No se puede validar contra las categorías del amigo desde el cliente (ni se debe: es su dato privado), así que el criterio es "solo se propaga lo que existe para todos".
- **Descartado:** copiar también el nombre/emoji de la categoría al mirror (duplica datos que luego se desincronizan y mete una categoría fantasma en la cuenta del amigo); crear la categoría en la cuenta del amigo (invasivo, y las reglas lo prohíben).

### Card de transacción en 3 zonas + relación social centralizada — Vigente
- **Qué:** el card del home y del historial se reordenó en fila principal + franja inferior (`TxRelationTier`). La relación social (gasto compartido, cobro, ingreso enviado/recibido) sale de la columna derecha y vive en la franja, a ancho completo; el ícono de categoría lleva un notch con las iniciales del amigo (`TxRelationNotch`); en gastos compartidos el importe grande es TU parte y el total va como línea secundaria ("de $600.000"). Todo se resuelve en `components/TxRelation.tsx`; se borró `components/SharedExpenseChip.tsx`.
- **Por qué:** con el chip en la columna derecha esa columna necesitaba `flex: 1` y competía con la meta → el chip invadía la línea del chip de tarjeta y el nombre del amigo se truncaba a "Compartido con Be…". En la franja el chip tiene todo el ancho: ningún nombre se corta, ni con textos de i18n el doble de largos.
- **Descartado:** dejar el chip arriba con `maxWidth` mayor (sigue robando ancho al importe); meter también el chip de tarjeta en la franja (una franja con solo la tarjeta queda huérfana; se verificó en render); partir el label del chip para poner el nombre en negrita (el nombre no siempre va al final: `sharedWithMore`/`owesYouMore` lo llevan en medio → habría que parsear el string traducido); barra de proporción tu-parte/total en la fila (ruido inconsistente: solo la tendrían algunas filas).

### `effectiveAmount` como única fuente del importe propio — Vigente
- **Qué:** `utils/sharedCalc.effectiveAmount(tx)` devuelve lo que la transacción vale PARA EL DUEÑO DEL DOC: `sharedAmount` en gastos compartidos sin cuotas, `amount` en todo lo demás (incluidas cuotas, donde `amount` ya es la cuota amortizada del participante). Lo usan la fila del home y del historial, el detalle, el balance del mes (`useTransactions`), la tendencia (`useMonthlyTrend`), el presupuesto, el desglose por categoría y los reportes anuales.
- **Por qué:** la fila mostraba tu parte mientras `useTransactions` sumaba `amount` — el total del grupo — así que el balance del mes no cuadraba con la suma de las filas. `useReportGenerator` ya tenía este helper inline (sin la excepción de cuotas): se unificó y se le añadió esa excepción.
- **Semántica que esto fija:** el balance cuenta lo que te CORRESPONDE, no lo que desembolsaste. El dueño que paga $600.000 de un gasto al 33% ve $200.000 en su balance; los $400.000 por cobrar viven en el reporte por amigo (`friend-report`, cálculo propio por porcentajes, deliberadamente fuera de este helper).
- **Descartado:** que el balance sume el total del grupo (contradice la fila y los reportes, que ya contaban tu parte); calcular la parte al leer de Firestore y sobrescribir `amount` (rompe editar/duplicar, que necesitan el total real).
