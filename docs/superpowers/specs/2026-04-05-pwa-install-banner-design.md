# PWA Install Banner — Design Spec

**Goal:** Mostrar un banner persistente en el home que incentive al usuario a instalar Spendiapp como PWA, con soporte para el flujo completo de instalación en iOS y Android.

---

## Comportamiento

- Solo visible en `Platform.OS === 'web'`
- Se oculta automáticamente si la app ya está en modo standalone (`window.matchMedia('(display-mode: standalone)').matches` o `navigator.standalone === true` en iOS)
- Persistente: no se puede cerrar, desaparece solo cuando se instala
- Posición: entre el greeting y el balance card en el home scroll

## Flujo por plataforma

**Android / Chrome:** El browser dispara el evento `beforeinstallprompt`. Al tocar el banner se llama `prompt()` en ese evento para abrir el diálogo nativo de instalación. Cuando el usuario acepta, el banner desaparece.

**iOS Safari:** No existe `beforeinstallprompt`. Al tocar el banner se abre un `AppDialog` con instrucciones paso a paso:
1. Tocar el botón de compartir (ícono Share)
2. Seleccionar "Añadir a pantalla de inicio"
3. Confirmar

**Detección post-instalación:** Al instalar en Android, el evento `appinstalled` del browser elimina el banner. En iOS, la detección es al montar: si `standalone === true`, el banner nunca se muestra.

## Visual

Card idéntica en estructura a `noCardsBanner` existente en el home:
- `backgroundColor: colors.tertiaryLight`
- `borderLeftColor: colors.tertiary`
- Ícono: `download-outline` de Ionicons
- Texto: título + subtítulo (i18n)
- Chevron derecho

## Archivos

| Archivo | Acción |
|---------|--------|
| `hooks/usePwaInstall.ts` | Nuevo — detección standalone, captura `beforeinstallprompt`, expone `canInstall`, `isStandalone`, `install()` |
| `components/PwaInstallBanner.tsx` | Nuevo — card visual, usa `usePwaInstall` |
| `app/(tabs)/index.tsx` | Modificar — insertar `<PwaInstallBanner />` entre greeting y balance card |
| `locales/es.json` | Modificar — claves `pwaInstall.*` |
| `locales/en.json` | Modificar — claves `pwaInstall.*` |
| `locales/it.json` | Modificar — claves `pwaInstall.*` |

## i18n keys

```json
"pwaInstall": {
  "title": "Instala Spendiapp",
  "subtitle": "Agrégala a tu pantalla de inicio",
  "dialogTitle": "Cómo instalar",
  "dialogStep1": "Toca el botón compartir",
  "dialogStep2": "Selecciona \"Añadir a pantalla de inicio\"",
  "dialogStep3": "Toca \"Añadir\" para confirmar",
  "dialogButton": "Entendido"
}
```
