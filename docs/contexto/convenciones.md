# Convenciones

## Estilo
- TypeScript. Componentes funcionales + hooks. i18next para todo texto.

## Patrones que SÍ usamos
- **i18n total:** todo texto visible usa `t()`. Datos en el idioma activo.
- Animaciones rápidas (≤150ms). Botones pill, colores primario/secundario coherentes (ver patrón global de UI).
- Confirmaciones con AppDialog; toasts post-acción. Validar UI con el equipo visual.
- Seguridad: secure-store para datos sensibles; biometría para acceso.

## Patrones PROHIBIDOS
- Strings hardcodeados · guardar datos sensibles fuera de secure-store.

## Tests
- Hay scripts sueltos (`test_logic.js`, `test_generateUserName.ts`). TODO: no hay suite formal; validar a mano web + iOS.

## Commits
- Commit tras cada ajuste. Deploy solo con permiso.
