# Convenciones

## Estilo
- TypeScript. Componentes funcionales + hooks. i18next para todo texto.

## Patrones que SÍ usamos
- **i18n total:** todo texto visible usa `t()`. Datos en el idioma activo.
- Animaciones rápidas (≤150ms). Botones pill, colores primario/secundario coherentes (ver patrón global de UI).
- Confirmaciones con AppDialog; toasts post-acción. Validar UI con el equipo visual.
- **Card de transacción (home + historial) — 3 zonas fijas:** (1) fila principal `icono[+notch de relación] · título[+Fijo] / categoría[+chip de tarjeta] · columna de importe[+ "de $total"]`; (2) pie de relación (`TxRelationTier`) SOLO si la transacción tiene relación social: **sin fondo ni borde propios e indentado hasta el título** (`indent` = padding + ícono + gap → 70 en historial, 74 en home), con el nombre del amigo en negrita. Una franja a ancho completo con fondo propio se lee como barra ENTRE dos tarjetas y no se sabe a cuál pertenece — ese fue el rechazo de v2.43.0. La columna de importe nunca lleva `flex: 1` ni chips: si compite con la meta, el nombre se trunca (bug de v2.42.0). Toda la relación social se resuelve en `components/TxRelation.tsx` (`useTxRelation`), nunca inline por pantalla.
- **Todo agregado de dinero pasa por `effectiveAmount(tx)`** (`utils/sharedCalc.ts`): balance, tendencia, presupuesto, desglose por categoría, reportes y la propia fila. Sumar `tx.amount` a pelo cuenta el total del grupo en gastos compartidos y descuadra el balance contra las filas. Las únicas excepciones legítimas son los formularios (editar/duplicar guardan el total) y `friend-report`, que calcula deudas con su propia lógica de porcentajes.
- **Color de texto sobre tinte:** en chips/badges tintados no asumir que `primary`/`primaryDark` se lee — las paletas pastel dan 1.5:1. Medir y caer a `textPrimary` (patrón `readableOn` en `components/TxRelation.tsx`).
- Seguridad: secure-store para datos sensibles; biometría para acceso.

## Patrones PROHIBIDOS
- Strings hardcodeados · guardar datos sensibles fuera de secure-store.
- **Fechas/meses hardcodeados:** prohibido arrays `['Enero',...]` o `toLocaleDateString('es-CO', ...)`. Usar SIEMPRE `utils/dateLocale.ts`: `getMonthNames(i18n.language)` para nombres de mes, `formatDate/formatTime(date, opts)` (o `localeFor()` como locale) para que la fecha siga al idioma activo (es→es-CO, en→en-US, it→it-IT). Los números (`toLocaleString('es-CO')`) se dejan en es-CO a propósito (formato COP).
- **Paridad i18n:** toda clave nueva va a los 3 locales (es/en/it) — verificar con el script de auditoría (round-trip JSON idéntico). Claves dinámicas `t(\`x.${var}\`)` deben cubrir TODOS los valores del dominio.

## Tests
- Hay scripts sueltos (`test_logic.js`, `test_generateUserName.ts`). TODO: no hay suite formal; validar a mano web + iOS.

## Commits
- Commit tras cada ajuste. Deploy solo con permiso.
