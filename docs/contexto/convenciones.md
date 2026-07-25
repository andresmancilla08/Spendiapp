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
- **Fechas/meses hardcodeados:** prohibido arrays `['Enero',...]` o `toLocaleDateString('es-CO', ...)`. Usar SIEMPRE `utils/dateLocale.ts`: `getMonthNames(i18n.language)` para nombres de mes, `formatDate/formatTime(date, opts)` (o `localeFor()` como locale) para que la fecha siga al idioma activo (es→es-CO, en→en-US, it→it-IT). Los números (`toLocaleString('es-CO')`) se dejan en es-CO a propósito (formato COP).
- **Paridad i18n:** toda clave nueva va a los 3 locales (es/en/it) — verificar con el script de auditoría (round-trip JSON idéntico). Claves dinámicas `t(\`x.${var}\`)` deben cubrir TODOS los valores del dominio.

## Tests
- Hay scripts sueltos (`test_logic.js`, `test_generateUserName.ts`). TODO: no hay suite formal; validar a mano web + iOS.

## Commits
- Commit tras cada ajuste. Deploy solo con permiso.
