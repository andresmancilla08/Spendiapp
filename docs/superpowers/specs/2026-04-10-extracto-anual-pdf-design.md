# Extracto Anual PDF — Declaración de Renta

**Fecha:** 2026-04-10
**App:** Spendiapp
**Stack:** React Native (Expo Router) + Firebase Firestore + i18n (es/en/it) + jspdf
**Scope:** Generación de reporte PDF anual para declaración de renta, con visualizador in-app, descarga y compartir.

---

## Objetivo

Permitir al usuario generar un extracto PDF de todos sus movimientos del año seleccionado, con diseño acorde a la identidad visual de Spendiapp. El PDF incluye resumen financiero, desglose por categoría y listado completo de transacciones. El usuario puede visualizarlo in-app y descargarlo o compartirlo en su dispositivo.

---

## Arquitectura

### Archivos nuevos

```
app/reports.tsx                        ← Pantalla principal (acceso desde Profile)
hooks/useReportGenerator.ts            ← Carga txns de un año completo desde Firestore
utils/generateAnnualPDF.ts             ← Función pura: datos → Uint8Array PDF (jspdf)
components/ReportViewer.tsx            ← Viewer full-screen + acciones (compartir/guardar)
components/ReportYearPicker.tsx        ← Selector horizontal de años disponibles
```

### Archivos modificados

```
app/(tabs)/profile.tsx                 ← Añade botón "Generar extracto" → /reports
hooks/useTransactions.ts               ← Extiende soporte para filtro por año completo
locales/{es,en,it}.json               ← Keys i18n para toda la feature
```

### Dependencias nuevas

```
jspdf                  → generación PDF cross-platform
expo-file-system       → guardar PDF en el dispositivo (ya puede estar instalado)
expo-sharing           → share sheet nativo
expo-print             → (opcional fallback iOS/Android)
```

---

## Flujo de usuario

```
Profile
  └─ Botón "Generar extracto anual"
       └─ reports.tsx
            ├─ ReportYearPicker (selecciona año: 2025 | 2024 | ...)
            ├─ Botón "Generar PDF"
            │    ├─ useReportGenerator (carga txns año completo)
            │    ├─ generateAnnualPDF (genera PDF blob)
            │    └─ Abre ReportViewer (modal full-screen)
            └─ ReportViewer
                 ├─ WebView/iframe con blob URL del PDF
                 ├─ Botón Compartir → expo-sharing share sheet
                 ├─ Botón Guardar → expo-file-system Descargas
                 └─ Botón Cerrar
```

---

## Hook: `useReportGenerator`

```ts
interface ReportData {
  userName: string
  year: number
  generatedAt: Date
  totalIncome: number
  totalExpenses: number
  balance: number
  byCategory: CategorySummary[]
  transactions: ReportTransaction[]
}

interface CategorySummary {
  category: string        // nombre de la categoría
  emoji: string
  count: number           // número de transacciones
  total: number           // suma de montos
  type: 'expense' | 'income' | 'both'
}

interface ReportTransaction {
  date: Date
  description: string
  category: string
  emoji: string
  amount: number
  type: 'expense' | 'income'
  cardName?: string       // nombre de la tarjeta si existe
}

// Años disponibles = años únicos de las transacciones del usuario
// Se excluyen transacciones isFixed virtuales (solo reales)
// Ordenadas cronológicamente dentro del PDF
```

---

## Diseño del PDF

### Colores (modo siempre claro en PDF)

```
Primary:    #00ACC1  (encabezados, líneas divisorias, totales)
Secondary:  #00897B  (acentos de ingresos)
Expense:    #E53935  (gastos)
Text dark:  #1A1A2E
Text gray:  #6B7280
Background: #F8FAFB
White:      #FFFFFF
```

### Estructura de páginas

```
┌──────────────────────────────────────────────┐
│ ████████████████████  HEADER  ████████████   │  ← banda primary #00ACC1
│  SPENDIAPP             Extracto Anual 2025   │
│  Juan García            Colombia · COP        │
│  Generado el 10 de abril de 2026             │
├──────────────────────────────────────────────┤
│                                              │
│  RESUMEN DEL AÑO                             │  ← sección con fondo #F8FAFB
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Ingresos │  │  Gastos  │  │ Balance  │   │
│  │ $12.5M   │  │  $8.2M   │  │ $4.3M   │   │
│  └──────────┘  └──────────┘  └──────────┘   │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  DESGLOSE POR CATEGORÍA                      │
│  Categoría      Transacciones    Total        │
│  ─────────────────────────────────────────   │
│  🍔 Comida           34       -$1.200.000    │
│  🚗 Transporte       21         -$800.000    │
│  💊 Salud             8         -$350.000    │
│  ...                                         │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  MOVIMIENTOS (Enero — Diciembre 2025)        │
│  Fecha    Descripción    Categoría   Monto   │
│  ─────────────────────────────────────────   │
│  15 Ene   Rappi          🍔 Comida  -$45.000 │
│  18 Ene   Salario        💰 Ingreso +$3.5M   │
│  ...      (paginación automática)            │
│                                              │
├──────────────────────────────────────────────┤
│  Generado por Spendiapp · Este documento es  │  ← footer en todas las páginas
│  un extracto informativo. Consulte a su       │
│  contador para su declaración oficial.        │
└──────────────────────────────────────────────┘
```

### Tipografía

- Fuente: Helvetica (built-in jspdf, sans problemas de embedding)
- Título: 18pt bold
- Secciones: 11pt bold
- Cuerpo: 9pt regular
- Footer: 7pt gray

### Paginación

- El header aparece solo en página 1
- El footer aparece en todas las páginas con número de página
- Las tablas de movimientos paginarán automáticamente con `autoTable` (jspdf-autotable)

---

## Componente: `ReportViewer`

```
Modal full-screen (sin tab bar)
├── Header: "Extracto 2025" + botón X (cerrar)
├── Área central:
│    ├── Web/PWA: <iframe src={blobUrl} />
│    └── Mobile: WebView con base64 data URI
└── Toolbar inferior (3 botones):
     ├── Compartir (expo-sharing → share sheet)
     ├── Guardar  (expo-file-system → Documentos/Spendiapp/)
     └── (sin botón imprimir — fuera de scope)
```

**Cross-platform:**
- Web: `URL.createObjectURL(blob)` → iframe
- Android: `FileSystem.writeAsStringAsync` (base64) → `Sharing.shareAsync`
- iOS PWA: misma ruta web (iframe en WebView nativo del browser)

---

## Selector de año: `ReportYearPicker`

- Scroll horizontal de chips con los años únicos encontrados en las transacciones del usuario
- Si no hay transacciones de un año, ese año no aparece
- Año seleccionado por defecto: año anterior (ej. en 2026 → selecciona 2025 por defecto)
- Formato: "2025", "2024", ...

---

## i18n — Keys nuevas

```json
{
  "reports": {
    "title": "Extracto anual",
    "subtitle": "Declaración de renta",
    "selectYear": "Selecciona el año",
    "generate": "Generar PDF",
    "generating": "Generando...",
    "share": "Compartir",
    "save": "Guardar",
    "close": "Cerrar",
    "savedTo": "Guardado en Documentos",
    "saveError": "Error al guardar",
    "shareError": "Error al compartir",
    "pdfTitle": "Extracto Anual {{year}}",
    "pdfSummary": "Resumen del año",
    "pdfByCategory": "Desglose por categoría",
    "pdfMovements": "Movimientos",
    "pdfGeneratedBy": "Generado por Spendiapp",
    "pdfDisclaimer": "Este documento es un extracto informativo. Consulte a su contador para su declaración oficial.",
    "income": "Ingresos",
    "expenses": "Gastos",
    "balance": "Balance",
    "transactions": "transacciones",
    "noTransactions": "Sin transacciones para este año"
  }
}
```

---

## Acceso desde Profile

En `app/(tabs)/profile.tsx`:
- Nueva fila en la sección de herramientas/configuración: icono de documento + "Generar extracto anual" → `router.push('/reports')`

---

## Consideraciones técnicas

1. **Rendimiento**: Si el año tiene >500 transacciones, el PDF puede demorar 2-3s. Se muestra spinner con texto "Generando...".
2. **Moneda**: Todos los montos en COP formateados como `$X.XXX.XXX` (formato colombiano).
3. **Transacciones compartidas**: Se incluyen en el monto del usuario (el `sharedAmount` ya calculado, no el monto total).
4. **Cuotas**: Se muestra cada cuota individualmente con su descripción original (ej: "Netflix (2/12)").
5. **Gastos fijos virtuales**: Se excluyen del reporte — solo transacciones reales en Firestore.
6. **Sin dark mode en el PDF**: El PDF siempre usa paleta clara para imprimibilidad.

---

## Out of scope

- Reporte mensual o trimestral (solo anual por ahora)
- Filtros por categoría o tarjeta dentro del reporte
- Comparación año vs año
- Exportación a CSV/Excel
- Firma digital o validación fiscal oficial
